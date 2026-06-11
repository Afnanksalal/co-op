use tauri::AppHandle;

use crate::secrets::persist_model_secrets;
use crate::storage::{load_or_create_state, save_state, to_response};
use crate::types::{DesktopStateResponse, ModelSettings};
use crate::validation::{normalize_email_secret, validate_model_settings};

#[tauri::command]
pub fn save_model_settings(
    app: AppHandle,
    mut settings: ModelSettings,
) -> Result<DesktopStateResponse, String> {
    let mut state = load_or_create_state(&app)?;
    settings.openai_api_key = normalize_email_secret(
        settings.openai_api_key,
        state.model_settings.openai_api_key.clone(),
    );
    settings.firecrawl_api_key = normalize_email_secret(
        settings.firecrawl_api_key,
        state.model_settings.firecrawl_api_key.clone(),
    );
    settings.email_api_key = normalize_email_secret(
        settings.email_api_key,
        state.model_settings.email_api_key.clone(),
    );
    validate_model_settings(&mut settings)?;
    persist_model_secrets(&app, &state.install_id, &settings)?;
    state.model_settings = settings;
    save_state(&app, &state)?;
    Ok(to_response(load_or_create_state(&app)?))
}
