use chrono::Utc;
use tauri::AppHandle;
use uuid::Uuid;

use crate::graph::graph_context;
use crate::providers::call_model;
use crate::rag::document_context_from_store;
use crate::research::research_context;
use crate::storage::{load_or_create_state, require_usable_activation, save_state, to_response};
use crate::types::{ChatMessageRecord, ChatRequest, ChatSession, DesktopStateResponse};
use crate::validation::{validate_chat_request, validate_model_settings};
use crate::workflows::workspace_context;

#[tauri::command]
pub async fn run_agent_chat(
    app: AppHandle,
    request: ChatRequest,
) -> Result<DesktopStateResponse, String> {
    validate_chat_request(&request)?;
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
    if request.rag_enabled {
        let rag = document_context_from_store(&app, &request.message)?;
        if !rag.is_empty() {
            context.push_str(&rag);
        }
    }
    if request.research_enabled {
        let research = research_context(&settings, &request.message).await?;
        if !research.trim().is_empty() {
            context.push_str("\n\nLive research context:\n");
            context.push_str(&research);
        }
    }

    let history = recent_history(&state.chat_sessions[index]);
    let prompt = format!(
        "{context}\n\nConversation:\n{history}\n\nUser: {}",
        request.message
    );
    let mut answer = call_model(&settings, &agent_prompt(&request.agent_type), &prompt).await?;

    if request.a2a_enabled {
        let critique = call_model(
      &settings,
        "You are a second Co-Op advisor. Review the draft answer and add missing cross-functional concerns.",
      &format!("Agent: {}\nDraft:\n{}", request.agent_type, answer),
    )
    .await?;
        answer = format!("{answer}\n\nSecond look:\n{critique}");
    }

    if matches!(
        request.council_mode.as_str(),
        "review_only" | "full_council"
    ) {
        let review = call_model(
      &settings,
      "You are Co-Op's final reviewer. Identify decision risk, missing facts, and concrete next actions.",
      &answer,
    )
    .await?;
        answer = format!("{answer}\n\nReview notes:\n{review}");
    }

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
    state.chat_sessions[index].research_enabled = request.research_enabled;
    state.chat_sessions[index].council_mode = request.council_mode;
    save_state(&app, &state)?;
    Ok(to_response(state))
}

fn agent_prompt(agent_type: &str) -> String {
    match agent_type {
    "legal" => "You are Co-Op Legal. Give business-friendly legal operations guidance, mark attorney-review items, and avoid pretending to be counsel.",
    "finance" => "You are Co-Op Finance. Focus on runway, unit economics, forecasting, cash controls, and investor-grade assumptions.",
    "investor" => "You are Co-Op Investor. Focus on fundraising strategy, investor fit, narratives, diligence, and term risks.",
    "competitor" => "You are Co-Op Competitor. Focus on market positioning, competitive intelligence, differentiation, and monitoring.",
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
