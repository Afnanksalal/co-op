use chrono::Utc;
use serde::Serialize;
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

use crate::graph::graph_context;
use crate::guardrails::{guardrail_policy_prompt, validate_business_input, validate_model_output};
use crate::memory::{memory_context_from_store, remember_business_event};
use crate::providers::call_model;
use crate::knowledge_store::document_context_for_app;
use crate::research::research_context_for_business;
use crate::storage::{load_or_create_state, require_usable_activation, save_state, to_response};
use crate::types::{ChatMessageRecord, ChatRequest, ChatSession, DesktopStateResponse};
use crate::validation::{validate_chat_request, validate_read_only};
use crate::workflows::workspace_context;

const CHAT_PROGRESS_EVENT: &str = "chat-progress";

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ChatProgressEvent {
    session_id: String,
    sequence: u8,
    stage: &'static str,
    title: &'static str,
    detail: &'static str,
    created_at: String,
}

#[tauri::command]
pub async fn run_agent_chat(
    app: AppHandle,
    request: ChatRequest,
) -> Result<DesktopStateResponse, String> {
    validate_chat_request(&request)?;
    let guardrail_decision =
        validate_business_input("Ask", &request.agent_type, request.message.trim())?;
    let mut state = load_or_create_state(&app)?;
    require_usable_activation(&state)?;
    let settings = validate_read_only(&state.model_settings)?;

    let now = Utc::now().to_rfc3339();
    let session_id = request
        .session_id
        .clone()
        .filter(|id| !id.trim().is_empty())
        .unwrap_or_else(|| Uuid::new_v4().to_string());
    emit_chat_progress(
        &app,
        &session_id,
        1,
        "request",
        "Understanding the request",
        "Classifying the business area, review needs, and source requirements.",
    );
    let session_index = state
        .chat_sessions
        .iter()
        .position(|session| session.id == session_id);
    if session_index.is_none() {
        state.chat_sessions.insert(
            0,
            ChatSession {
                id: session_id.clone(),
                title: request.message.chars().take(64).collect(),
                agent_type: request.agent_type.clone(),
                messages: Vec::new(),
                a2a_enabled: request.a2a_enabled,
                rag_enabled: request.rag_enabled,
                research_enabled: request.research_enabled,
                council_mode: request.council_mode.clone(),
                created_at: now.clone(),
                updated_at: now.clone(),
            },
        );
    }

    let index = state
        .chat_sessions
        .iter()
        .position(|session| session.id == session_id)
        .ok_or_else(|| "Chat session was not created".to_string())?;
    state.chat_sessions[index].messages.push(ChatMessageRecord {
        id: Uuid::new_v4().to_string(),
        role: "user".to_string(),
        content: request.message.trim().to_string(),
        agent_type: Some(request.agent_type.clone()),
        created_at: now.clone(),
    });

    let conservative_system_prompt = format!(
        "{}\n\n{}",
        agent_prompt(&request.agent_type),
        guardrail_policy_prompt(&request.agent_type, true, true)
    );
    
    let initial_budget = crate::context_manager::calculate_char_budget(
        settings.max_run_tokens,
        conservative_system_prompt.chars().count() + request.message.chars().count() + 100
    );
    
    let max_web_chars = (initial_budget as f64 * 0.40) as usize;
    let max_local_chars = (initial_budget as f64 * 0.20) as usize;
    
    let mut remaining_chars = initial_budget;

    let workspace_text = workspace_context(&state.workspace);
    let graph_text = graph_context(&state);
    let mut context = format!("Startup workspace:\n{}\n\n{}", workspace_text, graph_text);
    remaining_chars = remaining_chars.saturating_sub(context.chars().count());

    emit_chat_progress(
        &app,
        &session_id,
        2,
        "company",
        "Loading company context",
        "Using the saved profile, recent work, and business memory.",
    );

    let mut local_context = String::new();
    if request.rag_enabled {
        emit_chat_progress(
            &app,
            &session_id,
            3,
            "files",
            "Checking saved files",
            "Looking for private documents that match this question.",
        );
        let rag = document_context_for_app(&app, &settings, &request.message).await?;
        if !rag.is_empty() && crate::guardrails::is_safe_context(&rag) {
            local_context.push_str(&rag);
        }
    }

    emit_chat_progress(
        &app,
        &session_id,
        4,
        "memory",
        "Checking remembered facts",
        "Finding useful local notes without exposing hidden prompts or keys.",
    );
    let memory = memory_context_from_store(&app, &settings, &request.message).await?;
    if !memory.is_empty() && crate::guardrails::is_safe_context(&memory) {
        if !local_context.is_empty() {
            local_context.push_str("\n\n");
        }
        local_context.push_str(&memory);
    }
    
    if !local_context.is_empty() {
        let truncated_local = crate::context_manager::truncate_text_to_budget(&local_context, max_local_chars);
        context.push_str(&truncated_local);
        remaining_chars = remaining_chars.saturating_sub(truncated_local.chars().count());
    }

    let web_required = match guardrail_decision.web_intent {
        crate::guardrails::WebIntent::Yes => true,
        crate::guardrails::WebIntent::No => false,
        crate::guardrails::WebIntent::Uncertain => {
            crate::guardrails::resolve_web_intent(&settings, &request.message).await
        }
    };
    let use_web = request.research_enabled || web_required;
    let mut source_context_attached = false;
    
    if use_web {
        emit_chat_progress(
            &app,
            &session_id,
            5,
            "sources",
            "Searching live sources",
            "Finding current sources and filtering unrelated results.",
        );
        let research = match research_context_for_business(
            &settings,
            &state.workspace,
            &request.message,
            &request.agent_type,
            10,
        )
        .await
        {
            Ok(res) => res,
            Err(e) => {
                eprintln!("Web research failed, continuing without context: {}", e);
                String::new()
            }
        };
        
        let safe_research = if crate::guardrails::is_safe_context(&research) { research } else { String::new() };
        let truncated_research = crate::context_manager::truncate_text_to_budget(&safe_research, max_web_chars);
        
        if !truncated_research.trim().is_empty() {
            source_context_attached = true;
            emit_chat_progress(
                &app,
                &session_id,
                6,
                "source-fit",
                "Parsing source fit",
                "Attaching only sources that match the company and the question.",
            );
            context.push_str("\n\nLive research context:\n");
            context.push_str(&truncated_research);
            remaining_chars = remaining_chars.saturating_sub(truncated_research.chars().count() + 30);
        }
    }

    let history = crate::context_manager::truncate_chat_history(&state.chat_sessions[index].messages, remaining_chars);
    
    let prompt = format!(
        "{context}\n\nConversation:\n{history}\n\nUser: {}",
        request.message
    );
    let system_prompt = format!(
        "{}\n\n{}",
        agent_prompt(&request.agent_type),
        guardrail_policy_prompt(&request.agent_type, web_required, source_context_attached)
    );
    emit_chat_progress(
        &app,
        &session_id,
        7,
        "draft",
        "Preparing the answer",
        "Combining company context, sources, and the selected advisor style.",
    );
    let mut answer = call_model(&settings, &system_prompt, &prompt, Some(0.2)).await?;

    if request.a2a_enabled {
        emit_chat_progress(
            &app,
            &session_id,
            8,
            "second-check",
            "Running an extra check",
            "Looking for important cross-functional gaps without repeating the answer.",
        );
        let critique = call_model(
            &settings,
            "You are a second Co-Op advisor. Review the draft answer and return only material missing cross-functional concerns. Do not restate or rewrite the draft. If there are no material additions, answer exactly: No material additions.",
            &format!("Agent: {}\nDraft:\n{}", request.agent_type, answer),
            Some(0.7),
        )
        .await?;
        answer = append_review_section(answer, "Additional checks", critique);
    }

    if matches!(
        request.council_mode.as_str(),
        "review_only" | "full_council"
    ) {
        emit_chat_progress(
            &app,
            &session_id,
            9,
            "review",
            "Reviewing risk",
            "Checking missing facts, decisions, and next actions.",
        );
        let review = call_model(
            &settings,
            "You are Co-Op's final reviewer. Return only decision risks, missing facts, or concrete next actions that are not already covered. Do not restate the answer. If there are no material additions, answer exactly: No material additions.",
            &format!("Agent: {}\nDraft:\n{}", request.agent_type, answer),
            Some(0.6),
        )
        .await?;
        answer = append_review_section(answer, "Review notes", review);
    }

    validate_model_output(&answer, web_required, source_context_attached)?;
    emit_chat_progress(
        &app,
        &session_id,
        10,
        "save",
        "Saving the response",
        "Recording the answer locally so the next chat has useful context.",
    );
    let memory_title = state.chat_sessions[index].title.clone();
    let memory_content = format!(
        "Owner asked: {}\nCo-Op answered: {}",
        request.message.trim(),
        answer.trim()
    );
    state.chat_sessions[index].messages.push(ChatMessageRecord {
        id: Uuid::new_v4().to_string(),
        role: "assistant".to_string(),
        content: answer,
        agent_type: Some(request.agent_type),
        created_at: Utc::now().to_rfc3339(),
    });
    state.chat_sessions[index].updated_at = Utc::now().to_rfc3339();
    state.chat_sessions[index].a2a_enabled = request.a2a_enabled;
    state.chat_sessions[index].rag_enabled = request.rag_enabled;
    state.chat_sessions[index].research_enabled = use_web;
    state.chat_sessions[index].council_mode = request.council_mode;
    let _ = remember_business_event(
        &app,
        &mut state,
        "conversation",
        &memory_title,
        &memory_content,
        "ask",
        0.72,
    );
    save_state(&app, &state)?;
    emit_chat_progress(
        &app,
        &session_id,
        11,
        "ready",
        "Ready",
        "The answer is saved in this local conversation.",
    );
    Ok(to_response(state))
}

fn emit_chat_progress(
    app: &AppHandle,
    session_id: &str,
    sequence: u8,
    stage: &'static str,
    title: &'static str,
    detail: &'static str,
) {
    let _ = app.emit(
        CHAT_PROGRESS_EVENT,
        ChatProgressEvent {
            session_id: session_id.to_string(),
            sequence,
            stage,
            title,
            detail,
            created_at: Utc::now().to_rfc3339(),
        },
    );
}

fn agent_prompt(agent_type: &str) -> String {
    match agent_type {
    "legal" => "\
You are Co-Op Legal, the owner's business-legal operations advisor. \
Give practical, business-friendly guidance on contracts, compliance, IP, employment, and regulatory questions. \
You are not a licensed attorney — clearly flag items that require attorney review with [ATTORNEY REVIEW]. \
Structure your answer with: Quick Answer, Legal Considerations, Attorney-Review Items, Risks, and Recommended Actions. \
For short questions, use only the sections that apply.",

    "finance" => "\
You are Co-Op Finance, the owner's financial operations advisor. \
Focus on runway, burn rate, unit economics, forecasting, cash controls, and investor-grade assumptions. \
Show your math when numbers are involved. Separate confirmed metrics from estimates. \
Structure your answer with: Quick Answer, Numbers and Assumptions, Cash Impact, Risks, and Next Step. \
For short questions, use only the sections that apply.",

    "investor" => "\
You are Co-Op Investor, the owner's fundraising strategy advisor. \
Focus on fundraising readiness, investor fit, narrative construction, diligence preparation, and term sheet risks. \
Separate what the company can prove today from what still needs evidence. \
Structure your answer with: Quick Answer, Investor Fit, Narrative Gaps, Diligence Risks, and Recommended Actions. \
For short questions, use only the sections that apply.",

    "competitor" => "\
You are Co-Op Market, the owner's competitive intelligence advisor. \
Use attached web evidence to identify and classify competitors. For each named company, state whether it is a direct competitor, indirect alternative, or not a real competitor, and explain why in one sentence. \
Do not list companies without evidence from the attached sources. \
Structure your answer with: Quick Answer, Direct Competitors, Indirect Alternatives, Positioning Gaps, and Next Step. \
For short questions, use only the sections that apply.",

    "sales" => "\
You are Co-Op Sales, the owner's sales and pipeline advisor. \
Focus on ideal customer profile, outreach strategy, pipeline health, objection handling, qualification criteria, and conversion tactics. \
Ground advice in the company's actual stage, product, and target market. \
Structure your answer with: Quick Answer, ICP Fit, Pipeline Assessment, Objections and Responses, and Recommended Actions. \
For short questions, use only the sections that apply.",

    _ => "\
You are Co-Op Operations, the owner's general business advisor. \
Turn ambiguous business questions into clear decisions, tasks, and owners. \
When multiple paths exist, compare tradeoffs and recommend one. \
Structure your answer with: Quick Answer, Key Decisions, Tasks and Owners, Risks, and Next Step. \
For short questions, use only the sections that apply.",
  }
  .to_string()
}

fn append_review_section(answer: String, heading: &str, addition: String) -> String {
    let trimmed = addition.trim();
    let lower = trimmed.to_lowercase();
    
    let is_empty_review = trimmed.is_empty()
        || lower.contains("no material additions")
        || lower.contains("nothing to add")
        || lower.contains("no additions")
        || lower.contains("the answer is comprehensive")
        || lower.contains("no further additions")
        || lower.contains("no additional notes")
        || lower.contains("no missing facts")
        || lower.contains("no modifications")
        || lower.contains("no changes needed")
        || (lower.len() < 25 && (
            lower.contains("looks good") || lower.contains("looks great") || lower.contains("looks fine")
        ));

    if is_empty_review {
        return answer;
    }

    format!("{answer}\n\n{heading}:\n{trimmed}")
}

#[cfg(test)]
mod tests {
    use super::append_review_section;

    #[test]
    fn review_sections_skip_empty_or_noop_reviews() {
        assert_eq!(
            append_review_section(
                "Answer".to_string(),
                "Review notes",
                "No material additions.".to_string()
            ),
            "Answer"
        );
        assert_eq!(
            append_review_section("Answer".to_string(), "Review notes", "  ".to_string()),
            "Answer"
        );
        assert_eq!(
            append_review_section(
                "Answer".to_string(),
                "Review notes",
                "I have nothing to add at this time.".to_string()
            ),
            "Answer"
        );
        assert_eq!(
            append_review_section(
                "Answer".to_string(),
                "Review notes",
                "Looks good!".to_string()
            ),
            "Answer"
        );
        assert_eq!(
            append_review_section(
                "Answer".to_string(),
                "Review notes",
                "The answer is comprehensive and covers all points.".to_string()
            ),
            "Answer"
        );
    }
}
