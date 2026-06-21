use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::{
    default_investors, ActivationState, ActivationStateView, Alert, Bookmark, BusinessMemory,
    Campaign, CampaignEmail, CapTableScenario, ChatSession, IntegrationEndpoint, Investor,
    KnowledgeDocument, Lead, ModelSettings, ModelSettingsView, PitchDeckAnalysis, ResearchRun,
    StartupProfile, WorkflowRun,
};
use crate::constants::STATE_SCHEMA_VERSION;

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
    pub memories: Vec<BusinessMemory>,
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
            memories: Vec::new(),
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
    pub memories: Vec<BusinessMemory>,
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
