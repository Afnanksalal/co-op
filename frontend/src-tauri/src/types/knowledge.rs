use chrono::Utc;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
pub struct KnowledgeDocument {
    pub id: String,
    pub title: String,
    pub source: String,
    pub content: String,
    pub chunk_count: usize,
    pub chunks: Vec<KnowledgeChunk>,
    pub created_at: String,
}

impl Default for KnowledgeDocument {
    fn default() -> Self {
        Self {
            id: String::new(),
            title: String::new(),
            source: String::new(),
            content: String::new(),
            chunk_count: 0,
            chunks: Vec::new(),
            created_at: Utc::now().to_rfc3339(),
        }
    }
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

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeGraphNode {
    pub id: String,
    pub label: String,
    pub node_type: String,
    pub summary: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeGraphEdge {
    pub id: String,
    pub source: String,
    pub target: String,
    pub relationship: String,
    pub weight: f32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeGraphSnapshot {
    pub generated_at: String,
    pub nodes: Vec<KnowledgeGraphNode>,
    pub edges: Vec<KnowledgeGraphEdge>,
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
