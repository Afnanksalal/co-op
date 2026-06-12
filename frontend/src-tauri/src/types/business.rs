use chrono::Utc;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
pub struct PitchDeckAnalysis {
    pub id: String,
    pub title: String,
    pub deck_notes: String,
    pub source_file_name: Option<String>,
    pub slide_count: usize,
    pub score: u8,
    pub analysis: String,
    pub created_at: String,
}

impl Default for PitchDeckAnalysis {
    fn default() -> Self {
        Self {
            id: String::new(),
            title: String::new(),
            deck_notes: String::new(),
            source_file_name: None,
            slide_count: 0,
            score: 0,
            analysis: String::new(),
            created_at: Utc::now().to_rfc3339(),
        }
    }
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

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BusinessToolResult {
    pub id: String,
    pub tool_type: String,
    pub title: String,
    pub output: String,
    pub created_at: String,
}
