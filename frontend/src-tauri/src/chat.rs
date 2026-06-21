use chrono::Utc;
use serde::Serialize;
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

use crate::graph::graph_context;
use crate::guardrails::{guardrail_policy_prompt, validate_business_input, validate_model_output};
use crate::memory::{memory_context_from_store, remember_business_event};
use crate::providers::call_model;
use crate::rag::document_context_from_store;
use crate::research::{requires_live_web_research, research_context_for_business};
use crate::storage::{load_or_create_state, require_usable_activation, save_state, to_response};
use crate::types::{ChatMessageRecord, ChatRequest, ChatSession, DesktopStateResponse};
use crate::validation::{validate_chat_request, validate_model_settings};
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
    let mut settings = state.model_settings.clone();
    validate_model_settings(&mut settings)?;

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

    let mut context = format!(
        "Startup workspace:\n{}\n\n",
        workspace_context(&state.workspace)
    );
    context.push_str(&graph_context(&state));
    emit_chat_progress(
        &app,
        &session_id,
        2,
        "company",
        "Loading company context",
        "Using the saved profile, recent work, and business memory.",
    );
    if request.rag_enabled {
        emit_chat_progress(
            &app,
            &session_id,
            3,
            "files",
            "Checking saved files",
            "Looking for private documents that match this question.",
        );
        let rag = document_context_from_store(&app, &request.message)?;
        if !rag.is_empty() {
            context.push_str(&rag);
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
    let memory = memory_context_from_store(&app, &request.message)?;
    if !memory.is_empty() {
        context.push_str(&memory);
    }
    let web_required = guardrail_decision.web_required
        || requires_live_web_research(&request.agent_type, &request.message);
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
        let research = research_context_for_business(
            &settings,
            &state.workspace,
            &request.message,
            &request.agent_type,
        )
        .await?;
        if !research.trim().is_empty() {
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
            context.push_str(&research);
        }
    }

    let history = recent_history(&state.chat_sessions[index]);
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
    let mut answer = call_model(&settings, &system_prompt, &prompt).await?;

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
            &answer,
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
    "legal" => "You are Co-Op Legal. Give business-friendly legal operations guidance, mark attorney-review items, and avoid pretending to be counsel.",
    "finance" => "You are Co-Op Finance. Focus on runway, unit economics, forecasting, cash controls, and investor-grade assumptions.",
    "investor" => "You are Co-Op Investor. Focus on fundraising strategy, investor fit, narratives, diligence, and term risks.",
    "competitor" => "You are Co-Op Market. Use live web evidence for competitors and alternatives. Separate direct competitors, indirect alternatives, and irrelevant companies.",
    "sales" => "You are Co-Op Sales. Focus on ICP, outreach, pipeline, objections, qualification, and conversion.",
    _ => "You are Co-Op Operations. Turn ambiguous business work into clear decisions, tasks, risks, and owners.",
  }
  .to_string()
}

fn recent_history(session: &ChatSession) -> String {
    let mut messages = session.messages.clone();
    let keep = crate::constants::MAX_CHAT_HISTORY_MESSAGES;
    if messages.len() > keep {
        messages = messages[messages.len() - keep..].to_vec();
    }
    messages
        .iter()
        .map(|message| format!("{}: {}", message.role, message.content))
        .collect::<Vec<String>>()
        .join("\n")
}

fn append_review_section(answer: String, heading: &str, addition: String) -> String {
    let trimmed = addition.trim();
    if trimmed.is_empty()
        || trimmed.eq_ignore_ascii_case("no material additions")
        || trimmed.eq_ignore_ascii_case("no material additions.")
    {
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
    }
}
