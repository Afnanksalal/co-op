use reqwest::Url;

use crate::constants::{
    MAX_DOCUMENT_LENGTH, MAX_EMAIL_BODY_LENGTH, MAX_EMAIL_SUBJECT_LENGTH, MAX_MODEL_NAME_LENGTH,
    MAX_OBJECTIVE_LENGTH, MAX_RUN_TOKENS, MIN_RUN_TOKENS,
};
use crate::types::{
    CampaignRequest, CapTableRequest, ChatRequest, DocumentRequest, LeadRequest, ModelSettings,
    StartupProfile, WorkflowRequest,
};

pub fn sanitize_http_base_url(
    value: &str,
    allow_private_http: bool,
    strip_cloud_api_prefix: bool,
    label: &str,
) -> Result<String, String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err(format!("{label} is required"));
    }

    let mut url = Url::parse(trimmed).map_err(|_| format!("{label} must be a valid URL"))?;
    let scheme = url.scheme();
    if scheme != "https" && scheme != "http" {
        return Err(format!("{label} must use http or https"));
    }

    if !url.username().is_empty() || url.password().is_some() {
        return Err(format!("{label} must not include credentials"));
    }

    if scheme == "http"
        && (!allow_private_http || !is_private_http_host(url.host_str().unwrap_or_default()))
    {
        return Err(format!(
            "{label} must use https outside localhost or private network addresses"
        ));
    }

    url.set_query(None);
    url.set_fragment(None);

    let mut rendered = url.to_string().trim_end_matches('/').to_string();
    if strip_cloud_api_prefix {
        for suffix in ["/api/v1", "/api/v1/"] {
            if rendered.ends_with(suffix) {
                rendered.truncate(rendered.len() - suffix.trim_end_matches('/').len());
                rendered = rendered.trim_end_matches('/').to_string();
            }
        }
    }

    Ok(rendered)
}

pub fn validate_model_settings(settings: &mut ModelSettings) -> Result<(), String> {
    settings.provider = settings.provider.trim().to_string();
    settings.council_mode = settings.council_mode.trim().to_string();
    settings.ollama_model = settings.ollama_model.trim().to_string();
    settings.openai_model = settings.openai_model.trim().to_string();
    settings.research_provider = settings.research_provider.trim().to_string();
    settings.email_provider = settings.email_provider.trim().to_string();
    settings.email_from = settings.email_from.trim().to_string();
    settings.email_from_name = settings.email_from_name.trim().to_string();
    settings.ollama_base_url =
        sanitize_http_base_url(&settings.ollama_base_url, true, false, "Ollama URL")?;
    settings.openai_base_url = sanitize_http_base_url(
        &settings.openai_base_url,
        true,
        false,
        "OpenAI-compatible URL",
    )?;
    settings.firecrawl_base_url =
        sanitize_http_base_url(&settings.firecrawl_base_url, true, false, "Firecrawl URL")?;
    settings.max_run_tokens = settings
        .max_run_tokens
        .clamp(MIN_RUN_TOKENS, MAX_RUN_TOKENS);

    if !matches!(settings.provider.as_str(), "ollama" | "openai_compatible") {
        return Err("Unsupported model provider".to_string());
    }
    if !matches!(
        settings.council_mode.as_str(),
        "off" | "review_only" | "high_risk_only" | "full_council"
    ) {
        return Err("Unsupported council mode".to_string());
    }
    if settings.research_provider != "firecrawl" {
        settings.research_provider = "firecrawl".to_string();
    }
    if !matches!(
        settings.email_provider.as_str(),
        "none" | "resend" | "sendgrid"
    ) {
        return Err("Unsupported email provider".to_string());
    }
    if settings.ollama_model.is_empty() || settings.ollama_model.len() > MAX_MODEL_NAME_LENGTH {
        return Err(
            "Ollama model name is required and must be 128 characters or fewer".to_string(),
        );
    }
    if settings.openai_model.is_empty() || settings.openai_model.len() > MAX_MODEL_NAME_LENGTH {
        return Err(
            "OpenAI-compatible model name is required and must be 128 characters or fewer"
                .to_string(),
        );
    }
    if settings.provider == "openai_compatible"
        && settings
            .openai_api_key
            .as_deref()
            .map(str::trim)
            .unwrap_or("")
            .is_empty()
    {
        return Err("Provider API key is required for OpenAI-compatible routing".to_string());
    }
    if settings
        .firecrawl_api_key
        .as_deref()
        .map(str::trim)
        .unwrap_or("")
        .is_empty()
    {
        return Err("Web search key is required for source-backed business research".to_string());
    }
    if settings.email_provider != "none" {
        if settings
            .email_api_key
            .as_deref()
            .map(str::trim)
            .unwrap_or("")
            .is_empty()
        {
            return Err(
                "Email provider API key is required before sending campaign emails".to_string(),
            );
        }
        if !looks_like_email(&settings.email_from) {
            return Err(
                "A valid sender email is required before sending campaign emails".to_string(),
            );
        }
    }

    Ok(())
}

pub fn validate_workspace(profile: &StartupProfile) -> Result<(), String> {
    if profile.company_name.trim().len() < 2 {
        return Err("Company name is required".to_string());
    }
    if !matches!(
        profile.stage.trim(),
        "idea" | "prototype" | "mvp" | "beta" | "launched" | "growth" | "scale"
    ) {
        return Err("Unsupported company stage".to_string());
    }
    if !profile.website.trim().is_empty()
        && !profile.website.starts_with("http://")
        && !profile.website.starts_with("https://")
    {
        return Err("Website must start with http:// or https://".to_string());
    }
    if profile
        .cofounder_count
        .map(|count| count > 50)
        .unwrap_or(false)
    {
        return Err("Co-founder count must be 50 or fewer".to_string());
    }
    if profile
        .monthly_revenue
        .map(|value| value.is_sign_negative())
        .unwrap_or(false)
    {
        return Err("Monthly revenue cannot be negative".to_string());
    }
    if profile
        .total_raised
        .map(|value| value.is_sign_negative())
        .unwrap_or(false)
    {
        return Err("Total raised cannot be negative".to_string());
    }
    if profile
        .founded_year
        .map(|year| !(1900..=2100).contains(&year))
        .unwrap_or(false)
    {
        return Err("Founded year must be between 1900 and 2100".to_string());
    }
    if profile.problem.trim().len() < 10 && profile.description.trim().len() < 10 {
        return Err("Add a problem statement or company description".to_string());
    }
    if profile.solution.trim().len() < 10 && profile.tagline.trim().len() < 5 {
        return Err("Add a solution summary or clear tagline".to_string());
    }
    Ok(())
}

pub fn validate_workflow_request(request: &WorkflowRequest) -> Result<(), String> {
    let workflow_type = request.workflow_type.trim();
    if !matches!(
        workflow_type,
        "operations" | "finance" | "legal" | "sales" | "strategy"
    ) {
        return Err("Unsupported workflow type".to_string());
    }

    validate_objective("Workflow objective", &request.objective)
}

pub fn validate_chat_request(request: &ChatRequest) -> Result<(), String> {
    validate_chat_message(&request.message)?;
    if !matches!(
        request.agent_type.as_str(),
        "operations" | "legal" | "finance" | "investor" | "competitor" | "sales"
    ) {
        return Err("Unsupported agent type".to_string());
    }
    if !matches!(
        request.council_mode.as_str(),
        "off" | "review_only" | "high_risk_only" | "full_council"
    ) {
        return Err("Unsupported council mode".to_string());
    }
    Ok(())
}

pub fn validate_chat_message(message: &str) -> Result<(), String> {
    validate_objective("Chat message", message)
}

pub fn validate_objective(label: &str, value: &str) -> Result<(), String> {
    let trimmed = value.trim();
    if trimmed.len() < 3 {
        return Err(format!("{label} must be at least 3 characters"));
    }
    if trimmed.len() > MAX_OBJECTIVE_LENGTH {
        return Err(format!(
            "{label} must be {MAX_OBJECTIVE_LENGTH} characters or fewer"
        ));
    }
    Ok(())
}

pub fn validate_document_request(request: &DocumentRequest) -> Result<(), String> {
    if request.title.trim().len() < 2 {
        return Err("Document title is required".to_string());
    }
    let content = request.content.trim();
    if content.len() < 20 {
        return Err("Document content must be at least 20 characters".to_string());
    }
    if content.len() > MAX_DOCUMENT_LENGTH {
        return Err(format!(
            "Document content must be {MAX_DOCUMENT_LENGTH} characters or fewer"
        ));
    }
    Ok(())
}

pub fn validate_lead_request(request: &LeadRequest) -> Result<(), String> {
    if !matches!(request.lead_type.as_str(), "person" | "company") {
        return Err("Lead type must be person or company".to_string());
    }
    if request.name.trim().is_empty() && request.company_name.trim().is_empty() {
        return Err("Lead requires a person name or company name".to_string());
    }
    if !request.email.trim().is_empty() && !looks_like_email(&request.email) {
        return Err("Lead email is invalid".to_string());
    }
    Ok(())
}

pub fn validate_campaign_request(request: &CampaignRequest) -> Result<(), String> {
    if request.name.trim().len() < 2 {
        return Err("Campaign name is required".to_string());
    }
    if !matches!(request.mode.as_str(), "single_template" | "ai_personalized") {
        return Err("Campaign mode must be single_template or ai_personalized".to_string());
    }
    if !matches!(request.target_lead_type.as_str(), "person" | "company") {
        return Err("Campaign target lead type must be person or company".to_string());
    }
    if request.subject_template.len() > MAX_EMAIL_SUBJECT_LENGTH {
        return Err(format!(
            "Campaign subject template must be {MAX_EMAIL_SUBJECT_LENGTH} characters or fewer"
        ));
    }
    if request.body_template.len() > MAX_EMAIL_BODY_LENGTH {
        return Err(format!(
            "Campaign body template must be {MAX_EMAIL_BODY_LENGTH} characters or fewer"
        ));
    }
    if request.mode == "single_template"
        && (request.subject_template.trim().is_empty() || request.body_template.trim().is_empty())
    {
        return Err(
            "Subject and body templates are required for single-template campaigns".to_string(),
        );
    }
    if request.mode == "ai_personalized" && request.campaign_goal.trim().len() < 5 {
        return Err("Campaign goal is required for AI-personalized campaigns".to_string());
    }
    Ok(())
}

pub fn validate_cap_table(request: &CapTableRequest) -> Result<(), String> {
    let total = request.founder_ownership_percent
        + request.investor_ownership_percent
        + request.option_pool_percent;
    if !(0.0..=100.0).contains(&request.founder_ownership_percent)
        || !(0.0..=100.0).contains(&request.investor_ownership_percent)
        || !(0.0..=100.0).contains(&request.option_pool_percent)
    {
        return Err("Ownership percentages must be between 0 and 100".to_string());
    }
    if total > 100.0 {
        return Err("Ownership percentages cannot exceed 100%".to_string());
    }
    if request.post_money_valuation < 0.0 {
        return Err("Post-money valuation cannot be negative".to_string());
    }
    Ok(())
}

pub fn normalize_email_secret(value: Option<String>, current: Option<String>) -> Option<String> {
    match value {
        Some(secret) => {
            let normalized = normalize_secret_input(&secret);
            if normalized.is_empty() {
                current
            } else {
                Some(normalized)
            }
        }
        None => current,
    }
}

fn normalize_secret_input(value: &str) -> String {
    let mut normalized = value
        .trim()
        .trim_matches('"')
        .trim_matches('\'')
        .trim()
        .to_string();

    if let Some((key, secret)) = normalized.split_once('=') {
        let key = key.trim().to_ascii_uppercase();
        if matches!(
            key.as_str(),
            "API_KEY"
                | "OPENAI_API_KEY"
                | "XAI_API_KEY"
                | "FIRECRAWL_API_KEY"
                | "RESEND_API_KEY"
                | "SENDGRID_API_KEY"
        ) {
            normalized = secret
                .trim()
                .trim_matches('"')
                .trim_matches('\'')
                .trim()
                .to_string();
        }
    }

    if let Some(secret) = normalized
        .strip_prefix("Bearer ")
        .or_else(|| normalized.strip_prefix("bearer "))
    {
        normalized = secret.trim().to_string();
    }

    normalized
}

pub fn looks_like_email(value: &str) -> bool {
    let trimmed = value.trim();
    let parts: Vec<&str> = trimmed.split('@').collect();
    parts.len() == 2
        && !parts[0].is_empty()
        && parts[1].contains('.')
        && !parts[1].starts_with('.')
        && !parts[1].ends_with('.')
}

fn is_private_http_host(host: &str) -> bool {
    if host.eq_ignore_ascii_case("localhost") || host == "::1" || host.starts_with("127.") {
        return true;
    }
    if host.starts_with("10.") || host.starts_with("192.168.") {
        return true;
    }
    if let Some(rest) = host.strip_prefix("172.") {
        if let Some(second_octet) = rest
            .split('.')
            .next()
            .and_then(|part| part.parse::<u8>().ok())
        {
            return (16..=31).contains(&second_octet);
        }
    }
    false
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn url_validation_allows_local_http_and_rejects_public_http() {
        assert!(sanitize_http_base_url("http://localhost:11434", true, false, "Ollama").is_ok());
        assert!(sanitize_http_base_url("http://127.0.0.1:11434/", true, false, "Ollama").is_ok());
        assert!(sanitize_http_base_url("http://example.com", true, false, "Provider").is_err());
    }

    #[test]
    fn url_validation_strips_cloud_api_prefix() {
        let url =
            sanitize_http_base_url("https://api.example.com/api/v1", true, true, "Cloud").unwrap();

        assert_eq!(url, "https://api.example.com");
    }

    #[test]
    fn model_settings_are_valid_with_required_web_key() {
        let mut settings = ModelSettings {
            firecrawl_api_key: Some("fc-test".to_string()),
            ..ModelSettings::default()
        };

        assert!(validate_model_settings(&mut settings).is_ok());
    }

    #[test]
    fn model_settings_require_keys_for_external_provider_and_web_search() {
        let mut settings = ModelSettings {
            provider: "openai_compatible".to_string(),
            firecrawl_api_key: Some("fc-test".to_string()),
            ..ModelSettings::default()
        };
        assert!(validate_model_settings(&mut settings).is_err());

        let mut settings = ModelSettings::default();
        assert!(validate_model_settings(&mut settings).is_err());
    }

    #[test]
    fn old_assistant_only_research_setting_is_upgraded() {
        let mut settings = ModelSettings {
            research_provider: "llm".to_string(),
            firecrawl_api_key: Some("fc-test".to_string()),
            ..ModelSettings::default()
        };

        validate_model_settings(&mut settings).unwrap();

        assert_eq!(settings.research_provider, "firecrawl");
    }

    #[test]
    fn blank_secret_keeps_current_secret() {
        let secret = normalize_email_secret(Some("   ".to_string()), Some("saved-key".to_string()));

        assert_eq!(secret.as_deref(), Some("saved-key"));
    }

    #[test]
    fn pasted_secret_wrappers_are_removed_before_storage() {
        assert_eq!(
            normalize_email_secret(Some("Bearer xai-live-key".to_string()), None).as_deref(),
            Some("xai-live-key")
        );
        assert_eq!(
            normalize_email_secret(Some("XAI_API_KEY='xai-live-key'".to_string()), None).as_deref(),
            Some("xai-live-key")
        );
        assert_eq!(
            normalize_email_secret(Some("\"fc-live-key\"".to_string()), None).as_deref(),
            Some("fc-live-key")
        );
    }

    #[test]
    fn workspace_requires_business_context() {
        let profile = StartupProfile {
            company_name: "Co-Op".to_string(),
            problem: "Owners lack a local-first business control plane.".to_string(),
            solution: "A desktop business operating system with cloud licensing.".to_string(),
            ..StartupProfile::default()
        };

        assert!(validate_workspace(&profile).is_ok());
    }

    #[test]
    fn campaign_validation_rejects_dead_end_modes() {
        let request = CampaignRequest {
            name: "Launch".to_string(),
            mode: "sms".to_string(),
            target_lead_type: "company".to_string(),
            subject_template: "Hello".to_string(),
            body_template: "Body".to_string(),
            campaign_goal: "Book qualified calls".to_string(),
            tone: "direct".to_string(),
            call_to_action: "Book a call".to_string(),
        };

        assert!(validate_campaign_request(&request).is_err());
    }

    #[test]
    fn cap_table_rejects_impossible_ownership() {
        let request = CapTableRequest {
            name: "Seed".to_string(),
            founder_ownership_percent: 70.0,
            investor_ownership_percent: 25.0,
            option_pool_percent: 10.0,
            post_money_valuation: 5_000_000.0,
            notes: String::new(),
        };

        assert!(validate_cap_table(&request).is_err());
    }
}
