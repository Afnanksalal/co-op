use tauri::{AppHandle, Emitter};

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
    let old_provider = state.model_settings.provider.clone();
    let old_ollama_model = state.model_settings.ollama_model.clone();
    let old_openai_model = state.model_settings.openai_model.clone();
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

    let provider_changed = settings.provider != old_provider
        || settings.ollama_model != old_ollama_model
        || settings.openai_model != old_openai_model;

    state.model_settings = settings.clone();
    save_state(&app, &state)?;

    if provider_changed {
        let handle = app.clone();
        let reindex_settings = settings;
        tauri::async_runtime::spawn(async move {
            crate::knowledge_store::reindex_stale_embeddings(&handle, &reindex_settings).await;
            let _ = handle.emit(
                "provider-changed",
                "AI provider updated. File search index refresh was started automatically.",
            );
        });
    }

    Ok(to_response(load_or_create_state(&app)?))
}
