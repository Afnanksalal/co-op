use serde::Deserialize;

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
pub struct MemoryRequest {
    pub memory_type: String,
    pub title: String,
    pub content: String,
    pub source: String,
    #[serde(default)]
    pub pinned: bool,
    #[serde(default)]
    pub confidence: Option<f32>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemorySearchRequest {
    pub query: String,
    pub limit: Option<usize>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResearchRequest {
    pub query: String,
    #[serde(default = "default_research_type")]
    pub research_type: String,
    #[serde(default = "default_research_depth")]
    pub depth: String,
    pub save_to_rag: bool,
}

fn default_research_type() -> String {
    "market_scan".to_string()
}

fn default_research_depth() -> String {
    "standard".to_string()
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

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
pub struct PitchDeckRequest {
    pub title: String,
    pub deck_notes: String,
    pub file_name: Option<String>,
    pub file_mime_type: Option<String>,
    pub file_data_base64: Option<String>,
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
