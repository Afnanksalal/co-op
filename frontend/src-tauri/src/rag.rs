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
    const TARGET_WORDS: usize = 180;
    const MAX_WORDS: usize = 260;
    const OVERLAP_WORDS: usize = 32;

    let normalized = normalize_text(content);
    if normalized.is_empty() {
        return Vec::new();
    }

    let mut segments = Vec::new();
    for sentence in split_sentences(&normalized) {
        let words = sentence.split_whitespace().collect::<Vec<_>>();
        if words.len() > MAX_WORDS {
            segments.extend(
                words
                    .chunks(TARGET_WORDS)
                    .map(|chunk| chunk.join(" "))
                    .collect::<Vec<_>>(),
            );
        } else if !sentence.is_empty() {
            segments.push(sentence);
        }
    }

    let mut chunks = Vec::new();
    let mut current = String::new();
    let mut current_words = 0usize;

    for segment in segments {
        let segment_words = word_count(&segment);
        if current_words > 0 && current_words + segment_words > MAX_WORDS {
            chunks.push(current.trim().to_string());
            let overlap = trailing_words(&current, OVERLAP_WORDS);
            current = overlap;
            current_words = word_count(&current);
        }
        if !current.is_empty() {
            current.push(' ');
        }
        current.push_str(&segment);
        current_words += segment_words;

        if current_words >= TARGET_WORDS {
            chunks.push(current.trim().to_string());
            let overlap = trailing_words(&current, OVERLAP_WORDS);
            current = overlap;
            current_words = word_count(&current);
        }
    }

    if current_words > 0 {
        let last = current.trim().to_string();
        if chunks.last().map(|chunk| chunk != &last).unwrap_or(true) {
            chunks.push(last);
        }
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

pub(crate) fn tokenize(content: &str) -> Vec<String> {
    let base_tokens = content
        .to_lowercase()
        .split(|char: char| !char.is_ascii_alphanumeric())
        .filter(|token| token.len() > 2 && !is_stop_word(token))
        .map(ToString::to_string)
        .collect::<Vec<_>>();

    let mut tokens = Vec::with_capacity(base_tokens.len() * 2);
    for token in base_tokens {
        tokens.push(token.clone());
        tokens.extend(
            business_synonyms(&token)
                .iter()
                .map(|value| value.to_string()),
        );
    }
    tokens
}

fn normalize_text(content: &str) -> String {
    content
        .replace("\r\n", "\n")
        .replace('\r', "\n")
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>()
        .join("\n")
}

fn split_sentences(content: &str) -> Vec<String> {
    let mut sentences = Vec::new();
    let mut buffer = String::new();
    for character in content.chars() {
        buffer.push(character);
        if matches!(character, '.' | '!' | '?' | '\n') {
            let sentence = buffer.trim();
            if !sentence.is_empty() {
                sentences.push(sentence.to_string());
            }
            buffer.clear();
        }
    }
    let remaining = buffer.trim();
    if !remaining.is_empty() {
        sentences.push(remaining.to_string());
    }
    sentences
}

fn trailing_words(content: &str, count: usize) -> String {
    let words = content.split_whitespace().collect::<Vec<_>>();
    let start = words.len().saturating_sub(count);
    words[start..].join(" ")
}

fn word_count(content: &str) -> usize {
    content.split_whitespace().count()
}

fn is_stop_word(token: &str) -> bool {
    matches!(
        token,
        "the"
            | "and"
            | "for"
            | "with"
            | "from"
            | "this"
            | "that"
            | "are"
            | "was"
            | "were"
            | "have"
            | "has"
            | "had"
            | "not"
            | "but"
            | "you"
            | "your"
            | "our"
            | "their"
            | "into"
            | "about"
            | "after"
            | "before"
            | "over"
            | "under"
            | "between"
            | "within"
            | "without"
    )
}

fn business_synonyms(token: &str) -> &'static [&'static str] {
    match token {
        "cash" => &["runway", "burn", "finance"],
        "runway" => &["cash", "burn", "finance"],
        "burn" => &["runway", "cash", "spend"],
        "sales" => &["pipeline", "revenue", "customers"],
        "pipeline" => &["sales", "leads", "deals"],
        "customer" | "customers" => &["buyer", "buyers", "client", "clients"],
        "client" | "clients" => &["customer", "customers", "buyer"],
        "pricing" => &["price", "revenue", "monetization"],
        "legal" => &["contract", "compliance", "risk"],
        "contract" | "contracts" => &["legal", "agreement", "compliance"],
        "investor" | "investors" => &["fundraising", "capital", "diligence"],
        "fundraising" => &["investor", "capital", "raise"],
        "marketing" => &["positioning", "campaign", "growth"],
        "outreach" => &["email", "campaign", "prospecting"],
        "operations" => &["process", "workflow", "sop"],
        _ => &[],
    }
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

    #[test]
    fn chunking_keeps_overlap_and_splits_large_documents() {
        let content = (0..520)
            .map(|index| format!("word{index}"))
            .collect::<Vec<_>>()
            .join(" ");
        let chunks = chunk_text(&content);

        assert!(chunks.len() >= 3);
        assert!(chunks
            .iter()
            .all(|chunk| chunk.split_whitespace().count() <= 260));
        assert!(chunks[1].contains("word"));
    }

    #[test]
    fn tokenizer_adds_business_synonyms_and_removes_noise() {
        let tokens = tokenize("The cash plan for customers");

        assert!(tokens.contains(&"cash".to_string()));
        assert!(tokens.contains(&"runway".to_string()));
        assert!(tokens.contains(&"buyer".to_string()));
        assert!(!tokens.contains(&"the".to_string()));
    }
}
