use chrono::Utc;
use serde::{Deserialize, Serialize};

use crate::constants::{DEFAULT_OLLAMA_URL, MAX_RUN_TOKENS};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
pub struct ActivationState {
    #[serde(default, skip_serializing)]
    pub activation_token: String,
    pub customer_email: String,
    pub plan: String,
    pub status: String,
    pub expires_at: Option<String>,
    pub features: Vec<String>,
    pub offline_grace_ends_at: String,
    pub last_heartbeat_at: String,
    pub machine_fingerprint: String,
    pub cloud_base_url: String,
}

impl Default for ActivationState {
    fn default() -> Self {
        Self {
            activation_token: String::new(),
            customer_email: String::new(),
            plan: String::new(),
            status: String::new(),
            expires_at: None,
            features: Vec::new(),
            offline_grace_ends_at: String::new(),
            last_heartbeat_at: String::new(),
            machine_fingerprint: String::new(),
            cloud_base_url: crate::constants::DEFAULT_CLOUD_URL.to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivationStateView {
    pub customer_email: String,
    pub plan: String,
    pub status: String,
    pub expires_at: Option<String>,
    pub features: Vec<String>,
    pub offline_grace_ends_at: String,
    pub last_heartbeat_at: String,
    pub cloud_base_url: String,
}

impl From<&ActivationState> for ActivationStateView {
    fn from(value: &ActivationState) -> Self {
        Self {
            customer_email: value.customer_email.clone(),
            plan: value.plan.clone(),
            status: value.status.clone(),
            expires_at: value.expires_at.clone(),
            features: value.features.clone(),
            offline_grace_ends_at: value.offline_grace_ends_at.clone(),
            last_heartbeat_at: value.last_heartbeat_at.clone(),
            cloud_base_url: value.cloud_base_url.clone(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
pub struct ModelSettings {
    pub provider: String,
    pub ollama_base_url: String,
    pub ollama_model: String,
    pub openai_base_url: String,
    #[serde(default, skip_serializing)]
    pub openai_api_key: Option<String>,
    pub openai_model: String,
    pub council_mode: String,
    pub max_run_tokens: u32,
    pub research_provider: String,
    pub firecrawl_base_url: String,
    #[serde(default, skip_serializing)]
    pub firecrawl_api_key: Option<String>,
    pub email_provider: String,
    #[serde(default, skip_serializing)]
    pub email_api_key: Option<String>,
    pub email_from: String,
    pub email_from_name: String,
}

impl Default for ModelSettings {
    fn default() -> Self {
        Self {
            provider: "ollama".to_string(),
            ollama_base_url: DEFAULT_OLLAMA_URL.to_string(),
            ollama_model: "llama3.1".to_string(),
            openai_base_url: "https://api.openai.com/v1".to_string(),
            openai_api_key: None,
            openai_model: "gpt-4.1-mini".to_string(),
            council_mode: "review_only".to_string(),
            max_run_tokens: 12000,
            research_provider: "llm".to_string(),
            firecrawl_base_url: "https://api.firecrawl.dev".to_string(),
            firecrawl_api_key: None,
            email_provider: "none".to_string(),
            email_api_key: None,
            email_from: String::new(),
            email_from_name: String::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelSettingsView {
    pub provider: String,
    pub ollama_base_url: String,
    pub ollama_model: String,
    pub openai_base_url: String,
    pub openai_model: String,
    pub openai_api_key_saved: bool,
    pub council_mode: String,
    pub max_run_tokens: u32,
    pub research_provider: String,
    pub firecrawl_base_url: String,
    pub firecrawl_api_key_saved: bool,
    pub email_provider: String,
    pub email_api_key_saved: bool,
    pub email_from: String,
    pub email_from_name: String,
}

impl From<&ModelSettings> for ModelSettingsView {
    fn from(value: &ModelSettings) -> Self {
        Self {
            provider: value.provider.clone(),
            ollama_base_url: value.ollama_base_url.clone(),
            ollama_model: value.ollama_model.clone(),
            openai_base_url: value.openai_base_url.clone(),
            openai_model: value.openai_model.clone(),
            openai_api_key_saved: value
                .openai_api_key
                .as_deref()
                .map(has_secret)
                .unwrap_or(false),
            council_mode: value.council_mode.clone(),
            max_run_tokens: value.max_run_tokens,
            research_provider: value.research_provider.clone(),
            firecrawl_base_url: value.firecrawl_base_url.clone(),
            firecrawl_api_key_saved: value
                .firecrawl_api_key
                .as_deref()
                .map(has_secret)
                .unwrap_or(false),
            email_provider: value.email_provider.clone(),
            email_api_key_saved: value
                .email_api_key
                .as_deref()
                .map(has_secret)
                .unwrap_or(false),
            email_from: value.email_from.clone(),
            email_from_name: value.email_from_name.clone(),
        }
    }
}

fn has_secret(value: &str) -> bool {
    !value.trim().is_empty()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
pub struct StartupProfile {
    pub founder_name: String,
    pub founder_role: String,
    pub company_name: String,
    pub tagline: String,
    pub website: String,
    pub description: String,
    pub stage: String,
    pub industry: String,
    pub sector: String,
    pub location: String,
    pub country: String,
    pub city: String,
    pub operating_regions: String,
    pub team_size: String,
    pub cofounder_count: Option<u32>,
    pub target_customers: String,
    pub problem: String,
    pub solution: String,
    pub business_model: String,
    pub revenue_model: String,
    pub is_revenue: String,
    pub monthly_revenue: Option<f64>,
    pub funding_stage: String,
    pub total_raised: Option<f64>,
    pub traction: String,
    pub competitive_advantage: String,
    pub goals: String,
    pub founded_year: Option<u32>,
    pub launch_date: String,
    pub updated_at: String,
    pub onboarding_completed_at: Option<String>,
}

impl Default for StartupProfile {
    fn default() -> Self {
        Self {
            founder_name: String::new(),
            founder_role: "founder".to_string(),
            company_name: String::new(),
            tagline: String::new(),
            website: String::new(),
            description: String::new(),
            stage: "idea".to_string(),
            industry: String::new(),
            sector: "other".to_string(),
            location: String::new(),
            country: String::new(),
            city: String::new(),
            operating_regions: String::new(),
            team_size: String::new(),
            cofounder_count: None,
            target_customers: String::new(),
            problem: String::new(),
            solution: String::new(),
            business_model: String::new(),
            revenue_model: "not_yet".to_string(),
            is_revenue: "pre_revenue".to_string(),
            monthly_revenue: None,
            funding_stage: "bootstrapped".to_string(),
            total_raised: None,
            traction: String::new(),
            competitive_advantage: String::new(),
            goals: String::new(),
            founded_year: None,
            launch_date: String::new(),
            updated_at: Utc::now().to_rfc3339(),
            onboarding_completed_at: None,
        }
    }
}

impl ModelSettings {
    pub fn normalized_max_tokens(&self) -> u32 {
        self.max_run_tokens.min(MAX_RUN_TOKENS)
    }
}
