use chrono::Utc;
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use tauri::AppHandle;
use uuid::Uuid;

use crate::constants::RAG_VECTOR_DIMENSIONS;
use crate::storage::{load_or_create_state, save_state, to_response};
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
    let document_id = Uuid::new_v4().to_string();
    let created_at = Utc::now().to_rfc3339();
    let chunks = chunk_text(&request.content)
        .into_iter()
        .map(|content| KnowledgeChunk {
            id: Uuid::new_v4().to_string(),
            document_id: document_id.clone(),
            vector: embed_text(&content),
            content,
            created_at: created_at.clone(),
        })
        .collect();
    state.documents.insert(
        0,
        KnowledgeDocument {
            id: document_id,
            title: request.title.trim().to_string(),
            source: request.source.trim().to_string(),
            content: request.content.trim().to_string(),
            chunks,
            created_at,
        },
    );
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
    Ok(search_documents(
        &state.documents,
        &request.query,
        request.limit.unwrap_or(5),
    ))
}

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

pub fn document_context(documents: &[KnowledgeDocument], query: &str) -> String {
    let results = search_documents(documents, query, 5);
    if results.is_empty() {
        return String::new();
    }
    let mut context = String::from("\n\nLocal RAG context:\n");
    for result in results {
        context.push_str(&format!(
            "- {} ({:.2}): {}\n",
            result.title, result.score, result.content
        ));
    }
    context
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
