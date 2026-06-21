use chrono::Utc;
use tauri::AppHandle;
use uuid::Uuid;

use crate::constants::MAX_MEMORIES;
use crate::guardrails::validate_business_input;
use crate::memory_store::{
    list_memory_summaries, memory_context_for_app, search_business_memories, store_business_memory,
};
use crate::storage::{load_or_create_state, require_usable_activation, save_state, to_response};
use crate::types::{
    BusinessMemory, DesktopState, DesktopStateResponse, MemoryRequest, MemorySearchRequest,
    MemorySearchResult, StartupProfile,
};
use crate::validation::validate_objective;

const MAX_MEMORY_CONTENT_LENGTH: usize = 12_000;
const MAX_MEMORY_TITLE_LENGTH: usize = 160;

#[tauri::command]
pub fn save_business_memory(
    app: AppHandle,
    request: MemoryRequest,
) -> Result<DesktopStateResponse, String> {
    validate_memory_request(&request)?;
    validate_business_input(
        "Memory",
        &request.memory_type,
        &format!("{}\n{}", request.title, request.content),
    )?;
    let mut state = load_or_create_state(&app)?;
    require_usable_activation(&state)?;
    let memory = memory_from_request(request);
    store_business_memory(&app, &memory)?;
    refresh_state_memories(&app, &mut state);
    save_state(&app, &state)?;
    Ok(to_response(state))
}

#[tauri::command]
pub fn search_business_memory(
    app: AppHandle,
    request: MemorySearchRequest,
) -> Result<Vec<MemorySearchResult>, String> {
    validate_objective("Memory search", &request.query)?;
    let state = load_or_create_state(&app)?;
    require_usable_activation(&state)?;
    search_business_memories(&app, &request.query, request.limit.unwrap_or(8))
}

pub fn memory_context_from_store(app: &AppHandle, query: &str) -> Result<String, String> {
    memory_context_for_app(app, query)
}

pub fn remember_business_event(
    app: &AppHandle,
    state: &mut DesktopState,
    memory_type: &str,
    title: &str,
    content: &str,
    source: &str,
    confidence: f32,
) -> Result<(), String> {
    let title = title.trim();
    let content = redact_sensitive_lines(content);
    if title.len() < 2 || content.trim().len() < 10 {
        return Ok(());
    }
    let now = Utc::now().to_rfc3339();
    let memory = BusinessMemory {
        id: Uuid::new_v4().to_string(),
        memory_type: normalize_memory_type(memory_type),
        title: truncate_chars(title, MAX_MEMORY_TITLE_LENGTH),
        content: truncate_chars(&content, MAX_MEMORY_CONTENT_LENGTH),
        source: truncate_chars(source.trim(), 120),
        confidence: confidence.clamp(0.0, 1.0),
        pinned: false,
        created_at: now.clone(),
        updated_at: now,
    };
    store_business_memory(app, &memory)?;
    refresh_state_memories(app, state);
    Ok(())
}

pub fn remember_workspace_profile(
    app: &AppHandle,
    state: &mut DesktopState,
    profile: &StartupProfile,
) -> Result<(), String> {
    let company = profile.company_name.trim();
    if company.is_empty() {
        return Ok(());
    }
    let content = format!(
        "Company: {}\nStage: {}\nMarket: {}\nCustomers: {}\nProblem: {}\nSolution: {}\nCurrent goals: {}",
        company,
        empty_dash(&profile.stage),
        empty_dash(&first_non_empty(&[&profile.sector, &profile.industry])),
        empty_dash(&profile.target_customers),
        empty_dash(&profile.problem),
        empty_dash(&profile.solution),
        empty_dash(&profile.goals),
    );
    remember_business_event(
        app,
        state,
        "profile",
        company,
        &content,
        "company profile",
        0.95,
    )
}

fn validate_memory_request(request: &MemoryRequest) -> Result<(), String> {
    let memory_type = normalize_memory_type(&request.memory_type);
    if memory_type != request.memory_type.trim() && !request.memory_type.trim().is_empty() {
        return Err("Unsupported memory type".to_string());
    }
    let title = request.title.trim();
    if title.len() < 2 {
        return Err("Memory title is required".to_string());
    }
    if title.len() > MAX_MEMORY_TITLE_LENGTH {
        return Err(format!(
            "Memory title must be {MAX_MEMORY_TITLE_LENGTH} characters or fewer"
        ));
    }
    let content = request.content.trim();
    if content.len() < 10 {
        return Err("Memory needs a useful note".to_string());
    }
    if content.len() > MAX_MEMORY_CONTENT_LENGTH {
        return Err(format!(
            "Memory must be {MAX_MEMORY_CONTENT_LENGTH} characters or fewer"
        ));
    }
    Ok(())
}

fn memory_from_request(request: MemoryRequest) -> BusinessMemory {
    let now = Utc::now().to_rfc3339();
    BusinessMemory {
        id: Uuid::new_v4().to_string(),
        memory_type: normalize_memory_type(&request.memory_type),
        title: request.title.trim().to_string(),
        content: redact_sensitive_lines(&request.content),
        source: request.source.trim().to_string(),
        confidence: request.confidence.unwrap_or(0.82).clamp(0.0, 1.0),
        pinned: request.pinned,
        created_at: now.clone(),
        updated_at: now,
    }
}

fn refresh_state_memories(app: &AppHandle, state: &mut DesktopState) {
    if let Ok(memories) = list_memory_summaries(app, MAX_MEMORIES) {
        state.memories = memories;
    }
}

fn normalize_memory_type(value: &str) -> String {
    match value.trim() {
        "profile" | "decision" | "risk" | "preference" | "customer" | "research" | "plan"
        | "conversation" | "note" => value.trim().to_string(),
        _ => "note".to_string(),
    }
}

fn redact_sensitive_lines(content: &str) -> String {
    content
        .replace("\r\n", "\n")
        .replace('\r', "\n")
        .lines()
        .map(|line| {
            let lower = line.to_lowercase();
            if [
                "api key",
                "apikey",
                "secret",
                "token",
                "password",
                "authorization",
                "bearer ",
            ]
            .iter()
            .any(|term| lower.contains(term))
            {
                "[redacted sensitive line]".to_string()
            } else {
                line.trim_end().to_string()
            }
        })
        .collect::<Vec<_>>()
        .join("\n")
        .trim()
        .to_string()
}

fn truncate_chars(value: &str, max: usize) -> String {
    if value.chars().count() <= max {
        return value.to_string();
    }
    value
        .chars()
        .take(max.saturating_sub(3))
        .collect::<String>()
        + "..."
}

fn first_non_empty(values: &[&str]) -> String {
    values
        .iter()
        .map(|value| value.trim())
        .find(|value| !value.is_empty())
        .unwrap_or("")
        .to_string()
}

fn empty_dash(value: &str) -> String {
    if value.trim().is_empty() {
        "-".to_string()
    } else {
        value.trim().to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sensitive_memory_lines_are_redacted() {
        let content = redact_sensitive_lines("Decision: save key\nAPI key: sk-secret");

        assert!(content.contains("Decision: save key"));
        assert!(!content.contains("sk-secret"));
    }

    #[test]
    fn manual_memory_validation_rejects_empty_notes() {
        let request = MemoryRequest {
            memory_type: "decision".to_string(),
            title: "Ok".to_string(),
            content: "short".to_string(),
            source: "manual".to_string(),
            pinned: false,
            confidence: None,
        };

        assert!(validate_memory_request(&request).is_err());
    }
}
