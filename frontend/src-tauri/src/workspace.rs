use chrono::Utc;
use tauri::AppHandle;

use crate::storage::{load_or_create_state, require_usable_activation, save_state, to_response};
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
    normalize_workspace_profile(&mut profile);
    validate_workspace(&profile)?;
    profile.updated_at = Utc::now().to_rfc3339();
    let mut state = load_or_create_state(&app)?;
    require_usable_activation(&state)?;
    state.workspace = profile;
    save_state(&app, &state)?;
    Ok(to_response(state))
}

fn normalize_workspace_profile(profile: &mut StartupProfile) {
    profile.founder_name = trim(&profile.founder_name);
    profile.founder_role = trim_or(&profile.founder_role, "founder");
    profile.company_name = trim(&profile.company_name);
    profile.tagline = trim(&profile.tagline);
    profile.website = normalize_website(&profile.website);
    profile.description = trim(&profile.description);
    profile.stage = trim_or(&profile.stage, "idea");
    profile.industry = trim(&profile.industry);
    profile.sector = trim_or(&profile.sector, "other");
    profile.location = trim(&profile.location);
    profile.country = trim(&profile.country);
    profile.city = trim(&profile.city);
    profile.operating_regions = trim(&profile.operating_regions);
    profile.team_size = trim(&profile.team_size);
    profile.target_customers = trim(&profile.target_customers);
    profile.problem = trim(&profile.problem);
    profile.solution = trim(&profile.solution);
    profile.business_model = trim(&profile.business_model);
    profile.revenue_model = trim_or(&profile.revenue_model, "not_yet");
    profile.is_revenue = trim_or(&profile.is_revenue, "pre_revenue");
    profile.funding_stage = trim_or(&profile.funding_stage, "bootstrapped");
    profile.traction = trim(&profile.traction);
    profile.competitive_advantage = trim(&profile.competitive_advantage);
    profile.goals = trim(&profile.goals);
    profile.launch_date = trim(&profile.launch_date);
}

fn trim(value: &str) -> String {
    value.trim().to_string()
}

fn trim_or(value: &str, fallback: &str) -> String {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        fallback.to_string()
    } else {
        trimmed.to_string()
    }
}

fn normalize_website(value: &str) -> String {
    let trimmed = value.trim();
    if trimmed.is_empty() || trimmed.starts_with("http://") || trimmed.starts_with("https://") {
        trimmed.to_string()
    } else {
        format!("https://{trimmed}")
    }
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
    require_usable_activation(&state)?;
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

#[cfg(test)]
mod tests {
    use super::normalize_website;

    #[test]
    fn website_normalization_accepts_owner_friendly_domains() {
        assert_eq!(normalize_website("example.com"), "https://example.com");
        assert_eq!(
            normalize_website(" https://example.com "),
            "https://example.com"
        );
        assert_eq!(normalize_website(""), "");
    }
}
