use chrono::Utc;
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use tauri::AppHandle;
use uuid::Uuid;

use crate::constants::RAG_VECTOR_DIMENSIONS;
use crate::knowledge_store::{
    document_context_for_app, list_document_summaries, search_store, store_document,
    to_document_summary,
};
use crate::storage::{load_or_create_state, require_usable_activation, save_state, to_response};
use crate::types::{
    DesktopStateResponse, DocumentRequest, KnowledgeChunk, KnowledgeDocument, SearchRequest,
    SearchResult,
};
use crate::validation::{validate_document_request, validate_objective};

#[tauri::command]
pub fn add_knowledge_document(
    app: AppHandle,
    request: DocumentRequest,
) -> Result<DesktopStateResponse, String> {
    validate_document_request(&request)?;
    let mut state = load_or_create_state(&app)?;
    require_usable_activation(&state)?;
    let document_id = Uuid::new_v4().to_string();
    let created_at = Utc::now().to_rfc3339();
    let chunks: Vec<KnowledgeChunk> = chunk_text(&request.content)
        .into_iter()
        .map(|content| KnowledgeChunk {
            id: Uuid::new_v4().to_string(),
            document_id: document_id.clone(),
            vector: embed_text(&content),
            content,
            created_at: created_at.clone(),
        })
        .collect();
    let document = KnowledgeDocument {
        id: document_id,
        title: request.title.trim().to_string(),
        source: request.source.trim().to_string(),
        content: request.content.trim().to_string(),
        chunk_count: chunks.len(),
        chunks,
        created_at,
    };
    store_document(&app, &document)?;
    state.documents = list_document_summaries(&app, crate::constants::MAX_DOCUMENTS)
        .unwrap_or_else(|_| vec![to_document_summary(&document)]);
    save_state(&app, &state)?;
    Ok(to_response(state))
}

#[tauri::command]
pub fn search_knowledge(
    app: AppHandle,
    request: SearchRequest,
) -> Result<Vec<SearchResult>, String> {
    validate_objective("Search query", &request.query)?;
    let state = load_or_create_state(&app)?;
    require_usable_activation(&state)?;
    search_store(&app, &request.query, request.limit.unwrap_or(5))
}

#[cfg(test)]
pub fn search_documents(
    documents: &[KnowledgeDocument],
    query: &str,
    limit: usize,
) -> Vec<SearchResult> {
    let query_vector = embed_text(query);
    let mut results = Vec::new();
    for document in documents {
        for chunk in &document.chunks {
            let score = cosine_similarity(&query_vector, &chunk.vector);
            if score > 0.0 {
                results.push(SearchResult {
                    document_id: document.id.clone(),
                    chunk_id: chunk.id.clone(),
                    title: document.title.clone(),
                    source: document.source.clone(),
                    content: chunk.content.clone(),
                    score,
                });
            }
        }
    }
    results.sort_by(|a, b| {
        b.score
            .partial_cmp(&a.score)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    results.truncate(limit.clamp(1, 20));
    results
}

pub fn document_context_from_store(app: &AppHandle, query: &str) -> Result<String, String> {
    document_context_for_app(app, query)
}

pub fn chunk_text(content: &str) -> Vec<String> {
    let words: Vec<&str> = content.split_whitespace().collect();
    if words.is_empty() {
        return Vec::new();
    }
    let mut chunks = Vec::new();
    let mut start = 0usize;
    let chunk_size = 220usize;
    let overlap = 40usize;
    while start < words.len() {
        let end = (start + chunk_size).min(words.len());
        chunks.push(words[start..end].join(" "));
        if end == words.len() {
            break;
        }
        start = end.saturating_sub(overlap);
    }
    chunks
}

pub fn embed_text(content: &str) -> Vec<f32> {
    let mut vector = vec![0.0; RAG_VECTOR_DIMENSIONS];
    for token in tokenize(content) {
        let mut hasher = DefaultHasher::new();
        token.hash(&mut hasher);
        let index = (hasher.finish() as usize) % RAG_VECTOR_DIMENSIONS;
        vector[index] += 1.0;
    }
    normalize(vector)
}

fn tokenize(content: &str) -> Vec<String> {
    content
        .to_lowercase()
        .split(|char: char| !char.is_ascii_alphanumeric())
        .filter(|token| token.len() > 2)
        .map(ToString::to_string)
        .collect()
}

fn normalize(mut vector: Vec<f32>) -> Vec<f32> {
    let magnitude = vector.iter().map(|value| value * value).sum::<f32>().sqrt();
    if magnitude > 0.0 {
        for value in &mut vector {
            *value /= magnitude;
        }
    }
    vector
}

#[cfg(test)]
fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    a.iter()
        .zip(b.iter())
        .map(|(left, right)| left * right)
        .sum()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn vector_search_ranks_related_chunks() {
        let document = KnowledgeDocument {
            id: "doc".to_string(),
            title: "Finance".to_string(),
            source: "test".to_string(),
            content: "runway burn revenue".to_string(),
            chunk_count: 1,
            chunks: vec![KnowledgeChunk {
                id: "chunk".to_string(),
                document_id: "doc".to_string(),
                content: "Monthly burn and runway planning".to_string(),
                vector: embed_text("Monthly burn and runway planning"),
                created_at: Utc::now().to_rfc3339(),
            }],
            created_at: Utc::now().to_rfc3339(),
        };

        let results = search_documents(&[document], "runway burn", 5);
        assert_eq!(results.len(), 1);
        assert!(results[0].score > 0.0);
    }
}
