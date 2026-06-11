use chrono::{DateTime, Utc};
use std::{fs, path::PathBuf};
use tauri::{AppHandle, Manager};

use crate::constants::{
    MAX_ALERTS, MAX_BOOKMARKS, MAX_CAMPAIGNS, MAX_CAMPAIGN_EMAILS, MAX_CAP_TABLES,
    MAX_CHAT_SESSIONS, MAX_DOCUMENTS, MAX_INTEGRATIONS, MAX_LEADS, MAX_PITCH_DECKS,
    MAX_RESEARCH_RUNS, MAX_STORED_WORKFLOW_RUNS, STATE_FILE, STATE_SCHEMA_VERSION,
};
use crate::secrets::{hydrate_activation_secret, hydrate_model_secrets};
use crate::types::{
    default_investors, ActivationState, ActivationStateView, DesktopState, DesktopStateResponse,
    ModelSettingsView,
};

pub fn load_or_create_state(app: &AppHandle) -> Result<DesktopState, String> {
    let path = state_path(app)?;
    if !path.exists() {
        let state = DesktopState::default();
        save_state(app, &state)?;
        return Ok(state);
    }

    let content = fs::read_to_string(&path)
        .map_err(|error| format!("Failed to read local state: {error}"))?;
    let mut state = serde_json::from_str::<DesktopState>(&content)
        .map_err(|error| format!("Local state is corrupt: {error}"))?;
    repair_state(&mut state);
    hydrate_activation_secret(&state.install_id, &mut state.activation);
    hydrate_model_secrets(&state.install_id, &mut state.model_settings);
    Ok(state)
}

pub fn save_state(app: &AppHandle, state: &DesktopState) -> Result<(), String> {
    let path = state_path(app)?;
    let mut persisted = state.clone();
    normalize_for_persistence(&mut persisted);
    let content = serde_json::to_string_pretty(&persisted)
        .map_err(|error| format!("Failed to serialize local state: {error}"))?;
    let tmp_path = path.with_extension("json.tmp");
    fs::write(&tmp_path, content)
        .map_err(|error| format!("Failed to write local state: {error}"))?;
    fs::rename(&tmp_path, &path)
        .or_else(|_| {
            fs::remove_file(&path).ok();
            fs::rename(&tmp_path, &path)
        })
        .map_err(|error| format!("Failed to replace local state atomically: {error}"))
}

pub fn to_response(state: DesktopState) -> DesktopStateResponse {
    let is_usable = state
        .activation
        .as_ref()
        .map(|activation| is_activation_usable(activation, Utc::now()))
        .unwrap_or(false);

    DesktopStateResponse {
        install_id: state.install_id,
        activation: state.activation.as_ref().map(ActivationStateView::from),
        model_settings: ModelSettingsView::from(&state.model_settings),
        workflow_runs: state.workflow_runs,
        workspace: state.workspace,
        chat_sessions: state.chat_sessions,
        documents: state.documents,
        research_runs: state.research_runs,
        leads: state.leads,
        campaigns: state.campaigns,
        campaign_emails: state.campaign_emails,
        investors: state.investors,
        alerts: state.alerts,
        pitch_decks: state.pitch_decks,
        cap_tables: state.cap_tables,
        bookmarks: state.bookmarks,
        integrations: state.integrations,
        is_usable,
    }
}

pub fn is_activation_usable(activation: &ActivationState, now: DateTime<Utc>) -> bool {
    if activation.status != "active" {
        return false;
    }

    if let Some(expires_at) = &activation.expires_at {
        if parse_rfc3339(expires_at)
            .map(|expires| expires <= now)
            .unwrap_or(true)
        {
            return false;
        }
    }

    parse_rfc3339(&activation.offline_grace_ends_at)
        .map(|grace_ends| grace_ends > now)
        .unwrap_or(false)
}

pub fn parse_rfc3339(value: &str) -> Option<DateTime<Utc>> {
    DateTime::parse_from_rfc3339(value)
        .ok()
        .map(|date| date.with_timezone(&Utc))
}

fn state_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Failed to resolve app data directory: {error}"))?;
    fs::create_dir_all(&dir)
        .map_err(|error| format!("Failed to create app data directory: {error}"))?;
    Ok(dir.join(STATE_FILE))
}

fn repair_state(state: &mut DesktopState) {
    state.schema_version = STATE_SCHEMA_VERSION;
    if state.install_id.trim().is_empty() {
        state.install_id = uuid::Uuid::new_v4().to_string();
    }
    if state.investors.is_empty() {
        state.investors = default_investors();
    }
}

fn normalize_for_persistence(state: &mut DesktopState) {
    state.schema_version = STATE_SCHEMA_VERSION;
    state.workflow_runs.truncate(MAX_STORED_WORKFLOW_RUNS);
    state.chat_sessions.truncate(MAX_CHAT_SESSIONS);
    state.documents.truncate(MAX_DOCUMENTS);
    state.research_runs.truncate(MAX_RESEARCH_RUNS);
    state.leads.truncate(MAX_LEADS);
    state.campaigns.truncate(MAX_CAMPAIGNS);
    state.campaign_emails.truncate(MAX_CAMPAIGN_EMAILS);
    state.alerts.truncate(MAX_ALERTS);
    state.pitch_decks.truncate(MAX_PITCH_DECKS);
    state.cap_tables.truncate(MAX_CAP_TABLES);
    state.bookmarks.truncate(MAX_BOOKMARKS);
    state.integrations.truncate(MAX_INTEGRATIONS);
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Duration;

    fn activation(
        grace: DateTime<Utc>,
        expires_at: Option<DateTime<Utc>>,
        status: &str,
    ) -> ActivationState {
        ActivationState {
            activation_token: "coop_act_test".to_string(),
            customer_email: "ops@example.com".to_string(),
            plan: "team".to_string(),
            status: status.to_string(),
            expires_at: expires_at.map(|date| date.to_rfc3339()),
            features: vec!["local_data".to_string()],
            offline_grace_ends_at: grace.to_rfc3339(),
            last_heartbeat_at: Utc::now().to_rfc3339(),
            machine_fingerprint: "fingerprint".to_string(),
            cloud_base_url: crate::constants::DEFAULT_CLOUD_URL.to_string(),
        }
    }

    #[test]
    fn usable_activation_requires_active_status_and_future_grace() {
        let now = Utc::now();
        let active = activation(now + Duration::days(3), None, "active");
        let expired_grace = activation(now - Duration::seconds(1), None, "active");
        let suspended = activation(now + Duration::days(3), None, "suspended");

        assert!(is_activation_usable(&active, now));
        assert!(!is_activation_usable(&expired_grace, now));
        assert!(!is_activation_usable(&suspended, now));
    }

    #[test]
    fn usable_activation_respects_license_expiry() {
        let now = Utc::now();
        let active = activation(
            now + Duration::days(3),
            Some(now + Duration::hours(1)),
            "active",
        );
        let expired = activation(
            now + Duration::days(3),
            Some(now - Duration::seconds(1)),
            "active",
        );

        assert!(is_activation_usable(&active, now));
        assert!(!is_activation_usable(&expired, now));
    }
}
