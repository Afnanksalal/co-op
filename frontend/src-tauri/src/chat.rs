use chrono::Utc;
use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter, Manager};
use uuid::Uuid;

use crate::constants::MAX_CHAT_SESSIONS;
use crate::graph::graph_context;
use crate::guardrails::{
    classify_question_type, guardrail_policy_prompt, validate_business_input, validate_model_output,
    QuestionType,
};
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

pub struct ChatCancelFlag(pub AtomicBool);

impl Default for ChatCancelFlag {
    fn default() -> Self {
        Self(AtomicBool::new(false))
    }
}

fn check_cancel(app: &AppHandle) -> Result<(), String> {
    let flag = app.state::<ChatCancelFlag>();
    if flag.0.load(Ordering::SeqCst) {
        Err("Chat cancelled.".to_string())
    } else {
        Ok(())
    }
}

#[tauri::command]
pub async fn cancel_chat(app: AppHandle) -> Result<(), String> {
    let flag = app.state::<ChatCancelFlag>();
    flag.0.store(true, Ordering::SeqCst);
    Ok(())
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
    // Reset cancel flag at start of each chat
    let cancel_flag = app.state::<ChatCancelFlag>();
    cancel_flag.0.store(false, Ordering::SeqCst);
    eprintln!("[DIAG] run_agent_chat: research_enabled={}, rag_enabled={}, agent_type={}", request.research_enabled, request.rag_enabled, request.agent_type);
    
    if !crate::guardrails::message_has_business_context(&request.message.to_lowercase())
        && crate::guardrails::resolve_off_topic(&settings, &request.message).await
    {
        return Err("Co-Op is intentionally scoped to business tasks and therefore cannot assist with personal requests or non-business topics.".to_string());
    }

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
    let question_type = classify_question_type(&request.message);
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
                is_pinned: false,
            },
        );
        state.chat_sessions.truncate(MAX_CHAT_SESSIONS);
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
        agent_prompt(&request.agent_type, question_type),
        guardrail_policy_prompt(&request.agent_type, true, true)
    );
    
    let initial_budget = crate::context_manager::calculate_input_context_budget(
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
    }
    
    if !local_context.is_empty() {
        let truncated_local = crate::context_manager::truncate_text_to_budget(&local_context, max_local_chars);
        context.push_str(&truncated_local);
        remaining_chars = remaining_chars.saturating_sub(truncated_local.chars().count());
    }

    let mut use_web = request.research_enabled;
    let web_required = if use_web {
        match guardrail_decision.web_intent {
            crate::guardrails::WebIntent::Yes => true,
            crate::guardrails::WebIntent::No => false,
            crate::guardrails::WebIntent::Uncertain => {
                crate::guardrails::resolve_web_intent(&settings, &request.message).await
            }
        }
    } else {
        matches!(guardrail_decision.web_intent, crate::guardrails::WebIntent::Yes)
    };
    
    // Auto-enable web research when guardrails say it's required and Firecrawl is configured,
    // even if the user's toggle was off (prevents toggle-sync bugs from blocking needed research)
    let firecrawl_ready = settings.firecrawl_api_key
        .as_deref()
        .map(|k| !k.trim().is_empty())
        .unwrap_or(false)
        && settings.research_provider == crate::constants::DEFAULT_RESEARCH_PROVIDER;
    eprintln!("[DIAG] web_required={}, use_web={}, firecrawl_ready={}, research_provider={}, firecrawl_key_present={}", 
        web_required, use_web, firecrawl_ready, settings.research_provider,
        settings.firecrawl_api_key.is_some());
    if web_required && !use_web && firecrawl_ready {
        eprintln!("[INFO] Auto-enabling web research: guardrails flagged web_required but toggle was off");
        use_web = true;
    }
    
    let mut source_context_attached = false;
    
    let mut web_error: Option<String> = None;
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
                web_error = Some(e.to_string());
                emit_chat_progress(
                    &app,
                    &session_id,
                    5,
                    "sources-failed",
                    "Web search unavailable",
                    "Web search failed. See terminal for error; continuing with local knowledge.",
                );
                String::new()
            }
        };
        let safe_research = if crate::guardrails::is_safe_context(&research) {
            research
        } else {
            eprintln!("[DIAG] Web context was dropped by guardrails::is_safe_context! This is why it failed.");
            web_error = Some("Web research results contained security terms that triggered the safety filter. Since your company analyzes security risks, the competitors' websites triggered the prompt-attack guardrail!".to_string());
            String::new()
        };
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

    eprintln!("[DIAG] use_web={}, web_required={}, source_context_attached={}, max_web_chars={}", use_web, web_required, source_context_attached, max_web_chars);

    let history = if state.chat_sessions[index].messages.len() > 1 {
        let prior_messages = &state.chat_sessions[index].messages[..state.chat_sessions[index].messages.len() - 1];
        crate::context_manager::truncate_chat_history(prior_messages, remaining_chars)
    } else {
        String::new()
    };
    
    let conversation_section = if history.trim().is_empty() {
        String::new()
    } else {
        format!("\n\nPrior Conversation History:\n{}\n", history)
    };

    let prompt = format!(
        "{context}{conversation_section}\n\nCurrent User Request:\n{}",
        request.message
    );
    // Graceful degradation: if web sources were needed but not attached, explain why
    let system_prompt = if web_required && !source_context_attached {
        let inference_hint = if use_web {
            if let Some(err) = &web_error {
                format!(
                    "Web sources were required for this question, but the live Web Research attempt failed with the following error: {err}. \
                     State clearly to the user that you attempted to search the web but could not retrieve external information due to an error, \
                     and tell them EXACTLY what the error was so they can fix it (e.g. rate limit, invalid key, or no credits). \
                     Do not invent or guess external facts."
                )
            } else {
                "Web sources were required for this question, but the live Web Research attempt failed or returned no results. \
                 State clearly to the user that you attempted to search the web but could not retrieve external information, \
                 and suggest they check their Firecrawl API key in the Model Settings. \
                 Do not invent or guess external facts.".to_string()
            }
        } else {
            "Web sources were required for this question, but Web Research is turned off in the chat Options. \
             State clearly to the user that you cannot look up outside market data, competitor pricing, or live facts because Web Research is disabled, \
             and inform them that they can toggle on 'Use web research' in the chat Options if they want external information. \
             Do not invent or guess external facts.".to_string()
        };
        format!(
            "{}\n\n{}\n\n{}",
            agent_prompt(&request.agent_type, question_type),
            inference_hint,
            guardrail_policy_prompt(&request.agent_type, false, false)
        )
    } else {
        format!(
            "{}\n\n{}",
            agent_prompt(&request.agent_type, question_type),
            guardrail_policy_prompt(&request.agent_type, web_required, source_context_attached)
        )
    };
    emit_chat_progress(
        &app,
        &session_id,
        7,
        "draft",
        "Preparing the answer",
        "Combining company context, sources, and the selected advisor style.",
    );
    check_cancel(&app)?;
    let mut answer = call_model(&settings, &system_prompt, &prompt, Some(0.2)).await?;

    if request.a2a_enabled && (question_type == QuestionType::Planning || question_type == QuestionType::Brainstorming) {
        check_cancel(&app)?;
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
            "You are a second Co-Op advisor. Review the draft answer and return only material missing cross-functional concerns that are grounded in the company's actual profile, stage, and context. Do not mention teams (security team, compliance team, IT team, development team) unless the company profile indicates they exist. Do not add generic corporate recommendations. Do not restate or rewrite the draft. If there are no material additions, answer exactly: No material additions.",
            &format!("Agent: {}\nDraft:\n{}", request.agent_type, answer),
            Some(0.7),
        )
        .await?;
        answer = append_review_section(answer, "Additional checks", critique);
    }

    if matches!(
        request.council_mode.as_str(),
        "review_only" | "full_council"
    ) && (question_type == QuestionType::Planning || question_type == QuestionType::Brainstorming) {
        check_cancel(&app)?;
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
            "You are Co-Op's final reviewer. Return only decision risks, missing facts, or concrete next actions that are not already covered and are grounded in the company's actual profile and context. Do not mention teams, tools, services, or platforms that are not present in the company profile. Do not invent organizational structure. Do not restate the answer. If there are no material additions, answer exactly: No material additions.",
            &format!("Agent: {}\nDraft:\n{}", request.agent_type, answer),
            Some(0.6),
        )
        .await?;
        answer = append_review_section(answer, "Review notes", review);
    }

    validate_model_output(&answer, web_required, source_context_attached, web_required && !source_context_attached)?;
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
    if request.rag_enabled {
        remember_business_event(
            &app,
            &mut state,
            "conversation",
            &memory_title,
            &memory_content,
            "ask",
            0.72,
        );
    }
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

fn agent_prompt(agent_type: &str, question_type: QuestionType) -> String {
    let capability_boundary = "\
CAPABILITY BOUNDARY: You are a text-based business advisor running inside the Co-Op desktop application. \
You have NO terminal access, NO ability to execute commands, NO access to live servers, databases, dashboards, or deployment infrastructure. \
You cannot open browsers, run scripts, or perform any system action. When a user asks you to perform a system action:
1. Explicitly state that Co-Op cannot execute that action.
2. Provide the exact steps or commands the user should execute themselves.
3. Clearly label your output as \"Instructions for the owner\" — not actions you performed.
Never present instructions as if you executed them. Never say \"I checked the logs\" or \"I restarted the server.\"";

    let grounding_rule = "\
STRICT GROUNDING & CONVERSATION RULES:
1. Grounding: You may ONLY reference facts that appear in the attached workspace context, company files, business memory, web sources, or the Prior Conversation History. Specifically:
- Do NOT invent hosting providers, deployment platforms, service names, or infrastructure details.
- Do NOT invent team names, departments, or organizational structures.
- Do NOT invent tools, dashboards, monitoring services, or third-party integrations.
- Do NOT present inferred information as fact. If you must infer, prefix with \"Assuming...\" or \"If [condition], then...\"
- When information is missing, say exactly what is missing instead of filling the gap.
2. Conversation Continuity: You have full access to the Prior Conversation History in this chat session.
- When the user asks what they asked previously, asks to summarize the conversation, or asks about earlier questions or responses (e.g. \"What have I asked you so far?\", \"What was the first thing I asked in this chat?\", \"Summarize our conversation so far\"), answer accurately by referencing the exact sequence of questions and answers from the Prior Conversation History.
- For follow-up questions, seamlessly use the context and answers established in earlier turns of the conversation.";

    let format_instruction = match question_type {
        QuestionType::Factual => "\
Answer in 1-3 sentences. Do NOT add sections for Known Facts, Assumptions, Risks, Review Notes, or Next Actions. \
If an assumption is critical, state it inline.",
        QuestionType::ActionRequest => "\
State whether Co-Op can perform this action (it cannot execute commands). Then list the exact steps the owner should take. \
Do NOT generate Key Decisions, Risks, or Assumptions sections.",
        QuestionType::Planning => "\
Structure your answer with: Quick Answer, Key Decisions, Tasks, Risks, and Next Step. \
For short questions, use only the sections that apply.",
        QuestionType::Brainstorming => "\
List 3-7 options with one-line tradeoffs each. Recommend one. Do NOT add Known Facts or Risk sections.",
        QuestionType::Comparison => "\
Create a comparison table or list. Classify each item. State evidence source. Do NOT add a planning framework.",
    };

    let role = match agent_type {
    "legal" => "\
You are Co-Op Legal, the owner's business-legal operations advisor. \
Give practical, business-friendly guidance on contracts, compliance, IP, employment, and regulatory questions. \
You are not a licensed attorney — clearly flag items that require attorney review with [ATTORNEY REVIEW].",

    "finance" => "\
You are Co-Op Finance, the owner's financial operations advisor. \
Focus on runway, burn rate, unit economics, forecasting, cash controls, and investor-grade assumptions. \
Show your math when numbers are involved. Separate confirmed metrics from estimates.",

    "investor" => "\
You are Co-Op Investor, the owner's fundraising strategy advisor. \
Focus on fundraising readiness, investor fit, narrative construction, diligence preparation, and term sheet risks. \
Separate what the company can prove today from what still needs evidence.",

    "competitor" => "\
You are Co-Op Market, the owner's competitive intelligence advisor. \
Use attached web evidence to identify and classify competitors. \
Group competitors by product category — do not mix different tool types in a single list. \
For each named company, state whether it is a direct competitor, indirect alternative, \
or not a real competitor, and cite the source that supports this classification. \
Do not list companies without evidence from the attached sources. \
Do not cite 'general market knowledge' as a source.",

    "sales" => "\
You are Co-Op Sales, the owner's sales and pipeline advisor. \
Focus on ideal customer profile, outreach strategy, pipeline health, objection handling, qualification criteria, and conversion tactics. \
Ground advice in the company's actual stage, product, and target market.",

    _ => "\
You are Co-Op Operations, the owner's general business advisor. \
Give practical, direct answers grounded in the company's actual profile and context. \
When multiple paths exist, compare tradeoffs and recommend one.",
  };

  format!(
      "{capability_boundary}\n\n{grounding_rule}\n\n{role} {format_instruction}"
  )
}

pub fn append_review_section(answer: String, heading: &str, addition: String) -> String {
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

    // Filter out generic corporate filler that isn't grounded in company context
    static GENERIC_FILLER: std::sync::OnceLock<Vec<regex::Regex>> = std::sync::OnceLock::new();
    let generic_filler = GENERIC_FILLER.get_or_init(|| vec![
        regex::Regex::new(r"(?i)(collaborat\w*|coordinat\w*|involv\w*|engag\w*|consult\w*|work\w*)( with)? (the|your|our) \w+ team").unwrap(),
        regex::Regex::new(r"(?i)enterprise-wide").unwrap(),
        regex::Regex::new(r"(?i)organizational alignment").unwrap(),
        regex::Regex::new(r"(?i)cross-functional alignment").unwrap(),
        regex::Regex::new(r"(?i)stakeholder alignment").unwrap(),
        regex::Regex::new(r"(?i)change management process").unwrap(),
        regex::Regex::new(r"(?i)siem integration").unwrap(),
        regex::Regex::new(r"(?i)siem system").unwrap(),
        regex::Regex::new(r"(?i)security information and event management").unwrap(),
        regex::Regex::new(r"(?i)compliance framework").unwrap(),
        regex::Regex::new(r"(?i)governance framework").unwrap(),
        regex::Regex::new(r"(?i)escalate to management").unwrap(),
        regex::Regex::new(r"(?i)seek executive sponsorship").unwrap(),
    ]);
    let filler_count: usize = generic_filler.iter().map(|p| p.find_iter(&lower).count()).sum();
    let sentence_count = trimmed.split(['.', '!', '?'])
        .filter(|s| !s.trim().is_empty())
        .count();
    // If more than half the content is generic filler, discard the whole section
    if sentence_count > 0 && filler_count > 0 && filler_count * 2 >= sentence_count {
        return answer;
    }

    format!("{answer}\n\n{heading}:\n{trimmed}")
}

#[tauri::command]
pub async fn delete_chat_session(
    app: AppHandle,
    session_id: String,
) -> Result<DesktopStateResponse, String> {
    let mut state = load_or_create_state(&app)?;
    state.chat_sessions.retain(|session| session.id != session_id);
    save_state(&app, &state)?;
    Ok(to_response(state))
}

#[tauri::command]
pub async fn pin_chat_session(
    app: AppHandle,
    session_id: String,
) -> Result<DesktopStateResponse, String> {
    let mut state = load_or_create_state(&app)?;
    if let Some(session) = state.chat_sessions.iter_mut().find(|s| s.id == session_id) {
        session.is_pinned = !session.is_pinned;
    }
    save_state(&app, &state)?;
    Ok(to_response(state))
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

    #[test]
    fn review_sections_filter_generic_corporate_filler() {
        // Generic filler about teams that don't exist in the profile
        let filler = "Consider collaborating with the security team to develop a comprehensive log review process. \
            Involve the development team in implementing automated monitoring. \
            Engage with the compliance team to ensure alignment with policies.";
        assert_eq!(
            append_review_section("Answer".to_string(), "Additional checks", filler.to_string()),
            "Answer"
        );
    }

    #[test]
    fn review_sections_keep_substantive_additions() {
        let substantive = "The proposed pricing does not account for enterprise volume discounts. \
            Consider adding a usage-based tier for customers processing more than 10,000 transactions per month.";
        let result = append_review_section("Answer".to_string(), "Review notes", substantive.to_string());
        assert!(result.contains("Review notes"));
        assert!(result.contains("volume discounts"));
    }
}
