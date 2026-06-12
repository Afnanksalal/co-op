use serde::{Deserialize, Serialize};

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
