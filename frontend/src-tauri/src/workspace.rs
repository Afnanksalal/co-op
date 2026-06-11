use chrono::Utc;
use tauri::AppHandle;

use crate::storage::{load_or_create_state, save_state, to_response};
use crate::types::{
    Bookmark, BookmarkRequest, DesktopStateResponse, IntegrationEndpoint, IntegrationRequest,
    StartupProfile,
};
use crate::validation::{sanitize_http_base_url, validate_workspace};

#[tauri::command]
pub fn save_workspace_profile(
    app: AppHandle,
    mut profile: StartupProfile,
) -> Result<DesktopStateResponse, String> {
    validate_workspace(&profile)?;
    profile.updated_at = Utc::now().to_rfc3339();
    let mut state = load_or_create_state(&app)?;
    state.workspace = profile;
    save_state(&app, &state)?;
    Ok(to_response(state))
}

#[tauri::command]
pub fn save_bookmark(
    app: AppHandle,
    request: BookmarkRequest,
) -> Result<DesktopStateResponse, String> {
    if request.title.trim().len() < 2 {
        return Err("Bookmark title is required".to_string());
    }
    if request.content.trim().len() < 3 {
        return Err("Bookmark content is required".to_string());
    }
    let mut state = load_or_create_state(&app)?;
    state.bookmarks.insert(
        0,
        Bookmark {
            id: uuid::Uuid::new_v4().to_string(),
            title: request.title.trim().to_string(),
            content: request.content.trim().to_string(),
            source: request.source.trim().to_string(),
            created_at: Utc::now().to_rfc3339(),
        },
    );
    save_state(&app, &state)?;
    Ok(to_response(state))
}

#[tauri::command]
pub fn save_integration(
    app: AppHandle,
    request: IntegrationRequest,
) -> Result<DesktopStateResponse, String> {
    if request.name.trim().len() < 2 {
        return Err("Integration name is required".to_string());
    }
    if !matches!(
        request.kind.as_str(),
        "mcp" | "webhook" | "notion" | "crm" | "custom"
    ) {
        return Err("Unsupported integration type".to_string());
    }
    let base_url = sanitize_http_base_url(&request.base_url, true, false, "Integration URL")?;
    let mut state = load_or_create_state(&app)?;
    state.integrations.insert(
        0,
        IntegrationEndpoint {
            id: uuid::Uuid::new_v4().to_string(),
            name: request.name.trim().to_string(),
            kind: request.kind,
            base_url,
            enabled: request.enabled,
            created_at: Utc::now().to_rfc3339(),
        },
    );
    save_state(&app, &state)?;
    Ok(to_response(state))
}
