use chrono::Utc;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::constants::{DEFAULT_OLLAMA_URL, MAX_RUN_TOKENS, STATE_SCHEMA_VERSION};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
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
            email_from: "founder@example.com".to_string(),
            email_from_name: "Co-Op".to_string(),
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
pub struct StartupProfile {
    pub company_name: String,
    pub website: String,
    pub stage: String,
    pub industry: String,
    pub location: String,
    pub team_size: String,
    pub target_customers: String,
    pub problem: String,
    pub solution: String,
    pub business_model: String,
    pub traction: String,
    pub goals: String,
    pub updated_at: String,
}

impl Default for StartupProfile {
    fn default() -> Self {
        Self {
            company_name: String::new(),
            website: String::new(),
            stage: "idea".to_string(),
            industry: String::new(),
            location: String::new(),
            team_size: String::new(),
            target_customers: String::new(),
            problem: String::new(),
            solution: String::new(),
            business_model: String::new(),
            traction: String::new(),
            goals: String::new(),
            updated_at: Utc::now().to_rfc3339(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatSession {
    pub id: String,
    pub title: String,
    pub agent_type: String,
    pub messages: Vec<ChatMessageRecord>,
    pub a2a_enabled: bool,
    pub rag_enabled: bool,
    pub research_enabled: bool,
    pub council_mode: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessageRecord {
    pub id: String,
    pub role: String,
    pub content: String,
    pub agent_type: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeDocument {
    pub id: String,
    pub title: String,
    pub source: String,
    pub content: String,
    pub chunks: Vec<KnowledgeChunk>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeChunk {
    pub id: String,
    pub document_id: String,
    pub content: String,
    pub vector: Vec<f32>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    pub document_id: String,
    pub chunk_id: String,
    pub title: String,
    pub source: String,
    pub content: String,
    pub score: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResearchRun {
    pub id: String,
    pub query: String,
    pub provider: String,
    pub summary: String,
    pub sources: Vec<ResearchSource>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResearchSource {
    pub title: String,
    pub url: String,
    pub description: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Lead {
    pub id: String,
    pub lead_type: String,
    pub name: String,
    pub company_name: String,
    pub email: String,
    pub website: String,
    pub profile_url: String,
    pub platform: String,
    pub niche: String,
    pub location: String,
    pub description: String,
    pub lead_score: u8,
    pub status: String,
    pub source: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Campaign {
    pub id: String,
    pub name: String,
    pub mode: String,
    pub target_lead_type: String,
    pub subject_template: String,
    pub body_template: String,
    pub campaign_goal: String,
    pub tone: String,
    pub call_to_action: String,
    pub status: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CampaignEmail {
    pub id: String,
    pub campaign_id: String,
    pub lead_id: String,
    pub to: String,
    pub subject: String,
    pub body: String,
    pub status: String,
    pub provider_message: Option<String>,
    pub created_at: String,
    pub sent_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Investor {
    pub id: String,
    pub name: String,
    pub firm: String,
    pub stage: String,
    pub sectors: Vec<String>,
    pub geography: String,
    pub ticket_size: String,
    pub notes: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Alert {
    pub id: String,
    pub name: String,
    pub query: String,
    pub cadence: String,
    pub enabled: bool,
    pub last_result: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PitchDeckAnalysis {
    pub id: String,
    pub title: String,
    pub deck_notes: String,
    pub score: u8,
    pub analysis: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CapTableScenario {
    pub id: String,
    pub name: String,
    pub founder_ownership_percent: f64,
    pub investor_ownership_percent: f64,
    pub option_pool_percent: f64,
    pub post_money_valuation: f64,
    pub notes: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Bookmark {
    pub id: String,
    pub title: String,
    pub content: String,
    pub source: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IntegrationEndpoint {
    pub id: String,
    pub name: String,
    pub kind: String,
    pub base_url: String,
    pub enabled: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowRun {
    pub id: String,
    pub workflow_type: String,
    pub objective: String,
    pub provider: String,
    pub status: String,
    pub steps: Vec<String>,
    pub output: Option<String>,
    pub error: Option<String>,
    pub created_at: String,
    pub completed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopState {
    #[serde(default = "default_schema_version")]
    pub schema_version: u32,
    #[serde(default)]
    pub install_id: String,
    #[serde(default)]
    pub activation: Option<ActivationState>,
    #[serde(default)]
    pub model_settings: ModelSettings,
    #[serde(default)]
    pub workflow_runs: Vec<WorkflowRun>,
    #[serde(default)]
    pub workspace: StartupProfile,
    #[serde(default)]
    pub chat_sessions: Vec<ChatSession>,
    #[serde(default)]
    pub documents: Vec<KnowledgeDocument>,
    #[serde(default)]
    pub research_runs: Vec<ResearchRun>,
    #[serde(default)]
    pub leads: Vec<Lead>,
    #[serde(default)]
    pub campaigns: Vec<Campaign>,
    #[serde(default)]
    pub campaign_emails: Vec<CampaignEmail>,
    #[serde(default)]
    pub investors: Vec<Investor>,
    #[serde(default)]
    pub alerts: Vec<Alert>,
    #[serde(default)]
    pub pitch_decks: Vec<PitchDeckAnalysis>,
    #[serde(default)]
    pub cap_tables: Vec<CapTableScenario>,
    #[serde(default)]
    pub bookmarks: Vec<Bookmark>,
    #[serde(default)]
    pub integrations: Vec<IntegrationEndpoint>,
}

impl Default for DesktopState {
    fn default() -> Self {
        Self {
            schema_version: STATE_SCHEMA_VERSION,
            install_id: Uuid::new_v4().to_string(),
            activation: None,
            model_settings: ModelSettings::default(),
            workflow_runs: Vec::new(),
            workspace: StartupProfile::default(),
            chat_sessions: Vec::new(),
            documents: Vec::new(),
            research_runs: Vec::new(),
            leads: Vec::new(),
            campaigns: Vec::new(),
            campaign_emails: Vec::new(),
            investors: default_investors(),
            alerts: Vec::new(),
            pitch_decks: Vec::new(),
            cap_tables: Vec::new(),
            bookmarks: Vec::new(),
            integrations: Vec::new(),
        }
    }
}

fn default_schema_version() -> u32 {
    STATE_SCHEMA_VERSION
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopStateResponse {
    pub install_id: String,
    pub activation: Option<ActivationStateView>,
    pub model_settings: ModelSettingsView,
    pub workflow_runs: Vec<WorkflowRun>,
    pub workspace: StartupProfile,
    pub chat_sessions: Vec<ChatSession>,
    pub documents: Vec<KnowledgeDocument>,
    pub research_runs: Vec<ResearchRun>,
    pub leads: Vec<Lead>,
    pub campaigns: Vec<Campaign>,
    pub campaign_emails: Vec<CampaignEmail>,
    pub investors: Vec<Investor>,
    pub alerts: Vec<Alert>,
    pub pitch_decks: Vec<PitchDeckAnalysis>,
    pub cap_tables: Vec<CapTableScenario>,
    pub bookmarks: Vec<Bookmark>,
    pub integrations: Vec<IntegrationEndpoint>,
    pub is_usable: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivateRequest {
    pub license_key: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowRequest {
    pub workflow_type: String,
    pub objective: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatRequest {
    pub session_id: Option<String>,
    pub agent_type: String,
    pub message: String,
    pub a2a_enabled: bool,
    pub rag_enabled: bool,
    pub research_enabled: bool,
    pub council_mode: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentRequest {
    pub title: String,
    pub source: String,
    pub content: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchRequest {
    pub query: String,
    pub limit: Option<usize>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResearchRequest {
    pub query: String,
    pub save_to_rag: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscoverLeadsRequest {
    pub query: String,
    pub lead_type: String,
    pub max_leads: usize,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LeadRequest {
    pub lead_type: String,
    pub name: String,
    pub company_name: String,
    pub email: String,
    pub website: String,
    pub profile_url: String,
    pub platform: String,
    pub niche: String,
    pub location: String,
    pub description: String,
    pub lead_score: u8,
    pub status: String,
    pub source: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CampaignRequest {
    pub name: String,
    pub mode: String,
    pub target_lead_type: String,
    pub subject_template: String,
    pub body_template: String,
    pub campaign_goal: String,
    pub tone: String,
    pub call_to_action: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CampaignEmailRequest {
    pub campaign_id: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AlertRequest {
    pub name: String,
    pub query: String,
    pub cadence: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PitchDeckRequest {
    pub title: String,
    pub deck_notes: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CapTableRequest {
    pub name: String,
    pub founder_ownership_percent: f64,
    pub investor_ownership_percent: f64,
    pub option_pool_percent: f64,
    pub post_money_valuation: f64,
    pub notes: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BookmarkRequest {
    pub title: String,
    pub content: String,
    pub source: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IntegrationRequest {
    pub name: String,
    pub kind: String,
    pub base_url: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BusinessToolResult {
    pub id: String,
    pub tool_type: String,
    pub title: String,
    pub output: String,
    pub created_at: String,
}

pub fn default_investors() -> Vec<Investor> {
    [
        (
            "Sequoia Capital",
            "Sequoia",
            "seed-series-a",
            "AI, SaaS, fintech",
            "Global",
            "$500K-$15M",
        ),
        (
            "Andreessen Horowitz",
            "a16z",
            "seed-growth",
            "AI, infrastructure, consumer, crypto",
            "US/Global",
            "$1M-$50M",
        ),
        (
            "Accel",
            "Accel",
            "seed-series-b",
            "SaaS, enterprise, consumer",
            "US/EU/India",
            "$500K-$25M",
        ),
        (
            "Lightspeed Venture Partners",
            "Lightspeed",
            "seed-growth",
            "enterprise, consumer, fintech",
            "Global",
            "$500K-$30M",
        ),
        (
            "Index Ventures",
            "Index",
            "seed-growth",
            "SaaS, fintech, AI",
            "US/EU",
            "$500K-$40M",
        ),
        (
            "Bessemer Venture Partners",
            "Bessemer",
            "seed-growth",
            "cloud, cybersecurity, health",
            "US/India/Israel",
            "$500K-$30M",
        ),
        (
            "First Round Capital",
            "First Round",
            "pre-seed-seed",
            "B2B, consumer, marketplaces",
            "US",
            "$250K-$3M",
        ),
        (
            "Khosla Ventures",
            "Khosla",
            "seed-growth",
            "deeptech, AI, climate, health",
            "US/Global",
            "$500K-$25M",
        ),
        (
            "General Catalyst",
            "General Catalyst",
            "seed-growth",
            "healthcare, fintech, enterprise",
            "Global",
            "$500K-$50M",
        ),
        (
            "Greylock",
            "Greylock",
            "seed-series-b",
            "enterprise, AI, consumer",
            "US",
            "$500K-$25M",
        ),
        (
            "Founders Fund",
            "Founders Fund",
            "seed-growth",
            "frontier tech, aerospace, fintech",
            "US/Global",
            "$1M-$50M",
        ),
        (
            "NEA",
            "NEA",
            "seed-growth",
            "health, enterprise, consumer",
            "US/Global",
            "$500K-$50M",
        ),
        (
            "Battery Ventures",
            "Battery",
            "seed-growth",
            "software, industrial tech",
            "US/EU/Israel",
            "$500K-$30M",
        ),
        (
            "GV",
            "GV",
            "seed-growth",
            "life sciences, AI, enterprise",
            "US/EU",
            "$500K-$30M",
        ),
        (
            "Tiger Global",
            "Tiger Global",
            "growth",
            "internet, software, fintech",
            "Global",
            "$10M-$100M",
        ),
        (
            "Insight Partners",
            "Insight",
            "series-a-growth",
            "software, scaleups",
            "Global",
            "$5M-$100M",
        ),
        (
            "Y Combinator",
            "YC",
            "pre-seed-seed",
            "all sectors",
            "Global",
            "$125K-$500K",
        ),
        (
            "Antler",
            "Antler",
            "pre-seed",
            "all sectors",
            "Global",
            "$100K-$500K",
        ),
        (
            "Blume Ventures",
            "Blume",
            "seed-series-a",
            "India, SaaS, consumer, fintech",
            "India",
            "$250K-$5M",
        ),
        (
            "Elevation Capital",
            "Elevation",
            "seed-growth",
            "India, consumer, SaaS, fintech",
            "India",
            "$500K-$25M",
        ),
    ]
    .into_iter()
    .map(
        |(name, firm, stage, sectors, geography, ticket_size)| Investor {
            id: Uuid::new_v4().to_string(),
            name: name.to_string(),
            firm: firm.to_string(),
            stage: stage.to_string(),
            sectors: sectors
                .split(',')
                .map(|item| item.trim().to_string())
                .collect(),
            geography: geography.to_string(),
            ticket_size: ticket_size.to_string(),
            notes: "Seeded local investor record for offline matching.".to_string(),
        },
    )
    .collect()
}

impl ModelSettings {
    pub fn normalized_max_tokens(&self) -> u32 {
        self.max_run_tokens.min(MAX_RUN_TOKENS)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn desktop_state_serialization_excludes_secrets() {
        let mut state = DesktopState::default();
        state.model_settings.openai_api_key = Some("sk-openai-secret".to_string());
        state.model_settings.firecrawl_api_key = Some("fc-firecrawl-secret".to_string());
        state.model_settings.email_api_key = Some("email-provider-secret".to_string());
        state.activation = Some(ActivationState {
            activation_token: "coop_act_secret".to_string(),
            customer_email: "owner@example.com".to_string(),
            plan: "team".to_string(),
            status: "active".to_string(),
            expires_at: None,
            features: vec!["local_data".to_string()],
            offline_grace_ends_at: Utc::now().to_rfc3339(),
            last_heartbeat_at: Utc::now().to_rfc3339(),
            machine_fingerprint: "fingerprint".to_string(),
            cloud_base_url: "https://api.co-op.software".to_string(),
        });

        let serialized = serde_json::to_string(&state).expect("desktop state should serialize");

        assert!(!serialized.contains("sk-openai-secret"));
        assert!(!serialized.contains("fc-firecrawl-secret"));
        assert!(!serialized.contains("email-provider-secret"));
        assert!(!serialized.contains("coop_act_secret"));
    }
}
