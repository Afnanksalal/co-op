use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};
use sha2::{Digest, Sha256};
use std::collections::{HashMap, HashSet};
use serde::Serialize;
use tauri::{AppHandle, Emitter};

use crate::constants::MAX_DOCUMENTS;
use crate::rag::{chunk_text, embed_text_local, embed_texts_batch, tokenize};
use crate::types::{DesktopState, KnowledgeChunk, KnowledgeDocument, ModelSettings, SearchResult};

pub(crate) mod schema;

use schema::open_store;
#[cfg(test)]
use schema::{configure_connection, init_schema, table_has_column};

const MAX_SEARCH_CANDIDATES: usize = 768;
const MAX_CONTEXT_RESULTS: usize = 6;
const MAX_CONTEXT_CHARS: usize = 12_000;
const MAX_CONTEXT_RESULTS_PER_DOCUMENT: usize = 2;

pub fn store_document(app: &AppHandle, document: &KnowledgeDocument) -> Result<(), String> {
    let mut conn = open_store(app)?;
    store_document_with_conn(&mut conn, document)
}

pub fn list_document_summaries(
    app: &AppHandle,
    limit: usize,
) -> Result<Vec<KnowledgeDocument>, String> {
    let conn = open_store(app)?;
    list_document_summaries_with_conn(&conn, limit)
}

pub async fn search_store(
    app: &AppHandle,
    settings: &ModelSettings,
    query: &str,
    limit: usize,
) -> Result<Vec<SearchResult>, String> {
    let query_vector = crate::rag::embed_text(settings, query).await;
    let conn = open_store(app)?;
    search_with_conn(&conn, query, &query_vector, limit)
}

pub async fn document_context_for_app(app: &AppHandle, settings: &ModelSettings, query: &str) -> Result<String, String> {
    let results = search_store(app, settings, query, 5).await?;
    Ok(document_context_from_results(results))
}

pub fn migrate_legacy_documents(app: &AppHandle, state: &mut DesktopState) -> Result<(), String> {
    if state.documents.is_empty() {
        if let Ok(summaries) = list_document_summaries(app, MAX_DOCUMENTS) {
            if !summaries.is_empty() {
                state.documents = summaries;
            }
        }
        return Ok(());
    }

    let has_legacy_payload = state.documents.iter().any(|document| {
        !document.content.trim().is_empty()
            || document
                .chunks
                .iter()
                .any(|chunk| !chunk.content.trim().is_empty() || !chunk.vector.is_empty())
    });

    if has_legacy_payload {
        let mut conn = open_store(app)?;
        for document in state.documents.clone() {
            let normalized = normalize_document_for_store(document);
            store_document_with_conn(&mut conn, &normalized)?;
        }
    }

    if let Ok(summaries) = list_document_summaries(app, MAX_DOCUMENTS) {
        if !summaries.is_empty() {
            state.documents = summaries;
            return Ok(());
        }
    }

    state.documents = state
        .documents
        .iter()
        .map(to_document_summary)
        .collect::<Vec<_>>();
    Ok(())
}

pub fn to_document_summary(document: &KnowledgeDocument) -> KnowledgeDocument {
    KnowledgeDocument {
        id: document.id.clone(),
        title: document.title.clone(),
        source: document.source.clone(),
        content: String::new(),
        chunk_count: document.chunk_count.max(document.chunks.len()),
        chunks: Vec::new(),
        created_at: document.created_at.clone(),
    }
}

fn store_document_with_conn(
    conn: &mut Connection,
    document: &KnowledgeDocument,
) -> Result<(), String> {
    let content = normalize_content_for_storage(&document.content);
    let content_hash = content_hash(&content);
    let existing = existing_document_for_hash(conn, &content_hash, &document.id)?;
    let canonical_document_id = existing
        .as_ref()
        .map(|document| document.id.as_str())
        .unwrap_or(document.id.as_str());
    let created_at = existing
        .as_ref()
        .map(|document| document.created_at.as_str())
        .unwrap_or(document.created_at.as_str());
    let updated_at = Utc::now().to_rfc3339();
    let tx = conn
        .transaction()
        .map_err(|error| format!("Failed to start knowledge transaction: {error}"))?;
    tx.execute(
        "
        INSERT INTO knowledge_documents (
          id, title, source, content, content_hash, content_length, chunk_count, created_at, updated_at
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          source = excluded.source,
          content = excluded.content,
          content_hash = excluded.content_hash,
          content_length = excluded.content_length,
          chunk_count = excluded.chunk_count,
          updated_at = excluded.updated_at
        ",
        params![
            canonical_document_id,
            document.title,
            document.source,
            content.as_str(),
            content_hash.as_str(),
            content.chars().count() as i64,
            document.chunks.len() as i64,
            created_at,
            updated_at,
        ],
    )
    .map_err(|error| format!("Failed to store knowledge document: {error}"))?;
    tx.execute(
        "DELETE FROM knowledge_chunks_fts WHERE document_id = ?1",
        params![canonical_document_id],
    )
    .map_err(|error| format!("Failed to update knowledge search index: {error}"))?;
    tx.execute(
        "DELETE FROM knowledge_chunks WHERE document_id = ?1",
        params![canonical_document_id],
    )
    .map_err(|error| format!("Failed to replace knowledge chunks: {error}"))?;

    let mut token_cursor = 0usize;
    for (section_index, chunk) in document.chunks.iter().enumerate() {
        let token_count = token_count(&chunk.content);
        let token_start = token_cursor.saturating_sub(if section_index == 0 { 0 } else { 32 });
        let token_end = token_start + token_count;
        token_cursor = token_end;
        tx.execute(
            "
            INSERT INTO knowledge_chunks (
              id, document_id, section_index, content, vector, token_start, token_end, token_count, created_at, embedding_version
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 1)
            ",
            params![
                chunk.id,
                canonical_document_id,
                section_index as i64,
                chunk.content,
                vector_to_blob(&chunk.vector),
                token_start as i64,
                token_end as i64,
                token_count as i64,
                chunk.created_at,
            ],
        )
        .map_err(|error| format!("Failed to store knowledge chunk: {error}"))?;
        tx.execute(
            "
            INSERT INTO knowledge_chunks_fts (chunk_id, document_id, title, source, content)
            VALUES (?1, ?2, ?3, ?4, ?5)
            ",
            params![
                chunk.id,
                chunk.document_id,
                document.title,
                document.source,
                chunk.content,
            ],
        )
        .map_err(|error| format!("Failed to index knowledge chunk: {error}"))?;
    }

    tx.commit()
        .map_err(|error| format!("Failed to commit knowledge document: {error}"))
}

fn list_document_summaries_with_conn(
    conn: &Connection,
    limit: usize,
) -> Result<Vec<KnowledgeDocument>, String> {
    let mut stmt = conn
        .prepare(
            "
            SELECT id, title, source, chunk_count, created_at
            FROM knowledge_documents
            ORDER BY updated_at DESC, created_at DESC
            LIMIT ?1
            ",
        )
        .map_err(|error| format!("Failed to prepare knowledge summary query: {error}"))?;
    let rows = stmt
        .query_map(params![limit.clamp(1, MAX_DOCUMENTS) as i64], |row| {
            let chunk_count: i64 = row.get(3)?;
            Ok(KnowledgeDocument {
                id: row.get(0)?,
                title: row.get(1)?,
                source: row.get(2)?,
                content: String::new(),
                chunk_count: chunk_count.max(0) as usize,
                chunks: Vec::new(),
                created_at: row.get(4)?,
            })
        })
        .map_err(|error| format!("Failed to list knowledge documents: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Failed to read knowledge documents: {error}"))
}

fn search_with_conn(
    conn: &Connection,
    query: &str,
    query_vector: &[f32],
    limit: usize,
) -> Result<Vec<SearchResult>, String> {
    let query_terms = unique_tokens(query);
    let mut candidates = if let Some(fts_query) = build_fts_query(query) {
        search_candidates_with_fts(conn, &fts_query)?
    } else {
        Vec::new()
    };

    candidates = merge_candidates(candidates, recent_candidates(conn)?);

    if candidates.is_empty() || query_terms.is_empty() {
        return Ok(Vec::new());
    }

    let mut results = candidates
        .into_iter()
        .filter_map(|candidate| {
            let vector = blob_to_vector(&candidate.vector).ok()?;
            let semantic_score = cosine_similarity(query_vector, &vector).max(0.0);
            let lexical_score = lexical_match_score(&query_terms, &candidate);
            let metadata_score = metadata_match_score(&query_terms, &candidate);
            let fts_score = candidate.fts_rank.map(fts_rank_score).unwrap_or(0.0);
            let section_score = 1.0 / (1.0 + candidate.section_index as f32);
            let score = ((lexical_score * 0.45)
                + (semantic_score * 0.3)
                + (metadata_score * 0.13)
                + (fts_score * 0.08)
                + (section_score * 0.04))
                .clamp(0.0, 1.0);
            if score >= 0.20 {
                Some(SearchResult {
                    document_id: candidate.document_id,
                    chunk_id: candidate.chunk_id,
                    title: candidate.title,
                    source: candidate.source,
                    content: candidate.content,
                    score,
                })
            } else {
                None
            }
        })
        .collect::<Vec<_>>();

    results.sort_by(|left, right| {
        right
            .score
            .partial_cmp(&left.score)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    results.truncate(limit.clamp(1, 20));
    Ok(results)
}

fn search_candidates_with_fts(
    conn: &Connection,
    fts_query: &str,
) -> Result<Vec<SearchCandidate>, String> {
    let mut stmt = conn
        .prepare(
            "
            SELECT
              c.id,
              c.document_id,
              d.title,
              d.source,
              c.content,
              c.vector,
              c.section_index,
              bm25(knowledge_chunks_fts) AS fts_rank
            FROM knowledge_chunks_fts
            JOIN knowledge_chunks c ON c.id = knowledge_chunks_fts.chunk_id
            JOIN knowledge_documents d ON d.id = c.document_id
            WHERE knowledge_chunks_fts MATCH ?1
            ORDER BY fts_rank
            LIMIT ?2
            ",
        )
        .map_err(|error| format!("Failed to prepare knowledge search: {error}"))?;
    let rows = stmt
        .query_map(
            params![fts_query, MAX_SEARCH_CANDIDATES as i64],
            map_candidate,
        )
        .map_err(|error| format!("Failed to run knowledge search: {error}"))?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Failed to read knowledge search results: {error}"))
}

fn recent_candidates(conn: &Connection) -> Result<Vec<SearchCandidate>, String> {
    let mut stmt = conn
        .prepare(
            "
            SELECT
              c.id,
              c.document_id,
              d.title,
              d.source,
              c.content,
              c.vector,
              c.section_index,
              NULL AS fts_rank
            FROM knowledge_chunks c
            JOIN knowledge_documents d ON d.id = c.document_id
            ORDER BY d.updated_at DESC, c.section_index ASC
            LIMIT ?1
            ",
        )
        .map_err(|error| format!("Failed to prepare fallback knowledge search: {error}"))?;
    let rows = stmt
        .query_map(params![MAX_SEARCH_CANDIDATES as i64], map_candidate)
        .map_err(|error| format!("Failed to run fallback knowledge search: {error}"))?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Failed to read fallback knowledge search results: {error}"))
}

fn map_candidate(row: &rusqlite::Row<'_>) -> rusqlite::Result<SearchCandidate> {
    Ok(SearchCandidate {
        chunk_id: row.get(0)?,
        document_id: row.get(1)?,
        title: row.get(2)?,
        source: row.get(3)?,
        content: row.get(4)?,
        vector: row.get(5)?,
        section_index: row.get::<_, i64>(6)?.max(0) as usize,
        fts_rank: row.get::<_, Option<f64>>(7)?.map(|rank| rank as f32),
    })
}

fn normalize_document_for_store(mut document: KnowledgeDocument) -> KnowledgeDocument {
    document.content = normalize_content_for_storage(&document.content);
    if document.chunks.is_empty() && !document.content.trim().is_empty() {
        let created_at = if document.created_at.trim().is_empty() {
            Utc::now().to_rfc3339()
        } else {
            document.created_at.clone()
        };
        document.chunks = chunk_text(&document.content)
            .into_iter()
            .enumerate()
            .map(|(index, content)| KnowledgeChunk {
                id: format!("{}-{index}", document.id),
                document_id: document.id.clone(),
                vector: embed_text_local(&content),
                content,
                created_at: created_at.clone(),
            })
            .collect();
    }
    document.chunk_count = document.chunks.len();
    document
}

fn document_context_from_results(results: Vec<SearchResult>) -> String {
    if results.is_empty() {
        return String::new();
    }
    let mut context = String::from("\n\nCompany file context:\n");
    let mut used_chars = context.len();
    for result in diversify_results(
        results,
        MAX_CONTEXT_RESULTS,
        MAX_CONTEXT_RESULTS_PER_DOCUMENT,
    ) {
        let source = if result.source.trim().is_empty() {
            "local file".to_string()
        } else {
            result.source.trim().to_string()
        };
        let excerpt = truncate_chars(&result.content, 1_600);
        let line = format!(
            "- File: {} | Source: {} | Match: {:.0}%\n  Evidence: {}\n",
            result.title,
            source,
            (result.score * 100.0).round(),
            excerpt
        );
        if used_chars + line.len() > MAX_CONTEXT_CHARS {
            break;
        }
        used_chars += line.len();
        context.push_str(&line);
    }
    context
}

fn build_fts_query(query: &str) -> Option<String> {
    let tokens = unique_tokens(query)
        .into_iter()
        .take(10)
        .map(|token| format!("{token}*"))
        .collect::<Vec<_>>();

    if tokens.is_empty() {
        None
    } else {
        Some(tokens.join(" OR "))
    }
}

fn merge_candidates(
    primary: Vec<SearchCandidate>,
    secondary: Vec<SearchCandidate>,
) -> Vec<SearchCandidate> {
    let mut seen = HashSet::new();
    let mut merged = Vec::with_capacity(primary.len() + secondary.len());
    for candidate in primary.into_iter().chain(secondary) {
        if seen.insert(candidate.chunk_id.clone()) {
            merged.push(candidate);
        }
        if merged.len() >= MAX_SEARCH_CANDIDATES {
            break;
        }
    }
    merged
}

fn unique_tokens(content: &str) -> Vec<String> {
    let mut seen = HashSet::new();
    tokenize(content)
        .into_iter()
        .filter(|token| seen.insert(token.clone()))
        .collect()
}

fn lexical_match_score(query_terms: &[String], candidate: &SearchCandidate) -> f32 {
    if query_terms.is_empty() {
        return 0.0;
    }
    let content_terms = unique_tokens(&candidate.content)
        .into_iter()
        .collect::<HashSet<_>>();
    let matches = query_terms
        .iter()
        .filter(|term| {
            content_terms.contains(*term)
                || content_terms
                    .iter()
                    .any(|content_term| content_term.starts_with(term.as_str()))
        })
        .count();
    matches as f32 / query_terms.len() as f32
}

fn metadata_match_score(query_terms: &[String], candidate: &SearchCandidate) -> f32 {
    if query_terms.is_empty() {
        return 0.0;
    }
    let metadata = unique_tokens(&format!("{} {}", candidate.title, candidate.source))
        .into_iter()
        .collect::<HashSet<_>>();
    let matches = query_terms
        .iter()
        .filter(|term| metadata.contains(*term))
        .count();
    let exact_title_boost = if candidate
        .title
        .to_lowercase()
        .contains(&query_terms.join(" "))
    {
        0.25
    } else {
        0.0
    };
    ((matches as f32 / query_terms.len() as f32) + exact_title_boost).clamp(0.0, 1.0)
}

fn fts_rank_score(rank: f32) -> f32 {
    (1.0 / (1.0 + rank.abs())).clamp(0.0, 1.0)
}

fn diversify_results(
    results: Vec<SearchResult>,
    limit: usize,
    max_per_document: usize,
) -> Vec<SearchResult> {
    let mut counts: HashMap<String, usize> = HashMap::new();
    let mut selected = Vec::new();
    for result in results {
        let count = counts.entry(result.document_id.clone()).or_default();
        if *count >= max_per_document {
            continue;
        }
        *count += 1;
        selected.push(result);
        if selected.len() >= limit {
            break;
        }
    }
    selected
}

fn existing_document_for_hash(
    conn: &Connection,
    content_hash: &str,
    preferred_id: &str,
) -> Result<Option<ExistingDocument>, String> {
    if content_hash.is_empty() || content_hash == legacy_hash_marker() {
        return Ok(None);
    }
    conn.query_row(
        "
        SELECT id, created_at
        FROM knowledge_documents
        WHERE id = ?1 OR content_hash = ?2
        ORDER BY CASE WHEN id = ?1 THEN 0 ELSE 1 END
        LIMIT 1
        ",
        params![preferred_id, content_hash],
        |row| {
            Ok(ExistingDocument {
                id: row.get(0)?,
                created_at: row.get(1)?,
            })
        },
    )
    .optional()
    .map_err(|error| format!("Failed to check existing company file: {error}"))
}

fn normalize_content_for_storage(content: &str) -> String {
    content
        .replace("\r\n", "\n")
        .replace('\r', "\n")
        .lines()
        .map(str::trim_end)
        .collect::<Vec<_>>()
        .join("\n")
        .trim()
        .to_string()
}

fn content_hash(content: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(content.as_bytes());
    hex::encode(hasher.finalize())
}

fn legacy_hash_marker() -> &'static str {
    "legacy-unhashed"
}

fn token_count(content: &str) -> usize {
    content.split_whitespace().count()
}

fn truncate_chars(content: &str, max_chars: usize) -> String {
    let mut output = String::new();
    for character in content.chars().take(max_chars) {
        output.push(character);
    }
    if content.chars().count() > max_chars {
        output.push_str("...");
    }
    output
}

fn vector_to_blob(vector: &[f32]) -> Vec<u8> {
    vector
        .iter()
        .flat_map(|value| value.to_le_bytes())
        .collect::<Vec<_>>()
}

fn blob_to_vector(blob: &[u8]) -> Result<Vec<f32>, String> {
    if blob.len() % std::mem::size_of::<f32>() != 0 || blob.is_empty() {
        return Err("Stored vector has invalid byte length".to_string());
    }
    Ok(blob
        .chunks_exact(std::mem::size_of::<f32>())
        .map(|bytes| f32::from_le_bytes(bytes.try_into().unwrap()))
        .collect())
}

fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    if a.len() != b.len() {
        return 0.0;
    }
    let dot_product: f32 = a.iter().zip(b.iter()).map(|(left, right)| left * right).sum();
    let norm_a: f32 = a.iter().map(|val| val * val).sum::<f32>().sqrt();
    let norm_b: f32 = b.iter().map(|val| val * val).sum::<f32>().sqrt();

    if norm_a == 0.0 || norm_b == 0.0 {
        0.0
    } else {
        dot_product / (norm_a * norm_b)
    }
}

#[derive(Debug)]
struct SearchCandidate {
    chunk_id: String,
    document_id: String,
    title: String,
    source: String,
    content: String,
    vector: Vec<u8>,
    section_index: usize,
    fts_rank: Option<f32>,
}

#[derive(Debug)]
struct ExistingDocument {
    id: String,
    created_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ReindexProgressEvent {
    total_chunks: usize,
    total_memories: usize,
    processed: usize,
    errors: usize,
    stage: &'static str,
}

/// Re-embed all knowledge chunks and business memories that still have old
/// hash-based vectors (embedding_version = 0). Runs in batches of 5 using
/// batch embedding API. Emits `reindex-progress` events for UI observability.
pub async fn reindex_stale_embeddings(app: &AppHandle, settings: &ModelSettings) {
    let conn = match open_store(app) {
        Ok(c) => c,
        Err(_) => return,
    };

    // Test one embedding call first — bail early if provider has no embeddings
    if crate::providers::call_embedding(settings, "test").await.is_err() {
        eprintln!("Embedding provider unavailable — skipping re-index");
        return;
    }

    // Re-index knowledge chunks
    let stale_chunks: Vec<(String, String)> = {
        let mut stmt = match conn.prepare(
            "SELECT id, content FROM knowledge_chunks WHERE embedding_version = 0 LIMIT 500",
        ) {
            Ok(s) => s,
            Err(_) => return,
        };
        let rows = match stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        }) {
            Ok(rows) => rows.filter_map(|r| r.ok()).collect(),
            Err(_) => return,
        };
        rows
    };

    // Re-index business memories
    let stale_memories: Vec<(String, String, String, String)> = {
        let mut stmt = match conn.prepare(
            "SELECT id, title, memory_type, content FROM business_memories WHERE embedding_version = 0 LIMIT 500",
        ) {
            Ok(s) => s,
            Err(_) => return,
        };
        let rows = match stmt.query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
            ))
        }) {
            Ok(rows) => rows.filter_map(|r| r.ok()).collect(),
            Err(_) => return,
        };
        rows
    };

    let total_chunks = stale_chunks.len();
    let total_memories = stale_memories.len();
    if total_chunks == 0 && total_memories == 0 {
        return;
    }

    let mut processed: usize = 0;
    let mut errors: usize = 0;
    let total = total_chunks + total_memories;

    let emit_progress = |app: &AppHandle, processed: usize, errors: usize, stage: &'static str| {
        let _ = app.emit("reindex-progress", ReindexProgressEvent {
            total_chunks,
            total_memories,
            processed,
            errors,
            stage,
        });
    };

    emit_progress(app, 0, 0, "started");

    // Batch-embed chunks
    for batch in stale_chunks.chunks(5) {
        let texts: Vec<&str> = batch.iter().map(|(_, content)| content.as_str()).collect();
        let vectors = embed_texts_batch(settings, &texts).await;
        for ((id, _), vector) in batch.iter().zip(vectors.iter()) {
            let blob = vector_to_blob(vector);
            if conn.execute(
                "UPDATE knowledge_chunks SET vector = ?1, embedding_version = 1 WHERE id = ?2",
                rusqlite::params![blob, id],
            ).is_err() {
                errors += 1;
            }
        }
        processed += batch.len();
        emit_progress(app, processed, errors, "chunks");
        tokio::time::sleep(std::time::Duration::from_millis(200)).await;
    }

    // Batch-embed memories
    for batch in stale_memories.chunks(5) {
        let combined: Vec<String> = batch.iter()
            .map(|(_, title, memory_type, content)| format!("{} {} {}", title, memory_type, content))
            .collect();
        let texts: Vec<&str> = combined.iter().map(|s| s.as_str()).collect();
        let vectors = embed_texts_batch(settings, &texts).await;
        for ((id, _, _, _), vector) in batch.iter().zip(vectors.iter()) {
            let blob = vector_to_blob(vector);
            if conn.execute(
                "UPDATE business_memories SET vector = ?1, embedding_version = 1 WHERE id = ?2",
                rusqlite::params![blob, id],
            ).is_err() {
                errors += 1;
            }
        }
        processed += batch.len();
        emit_progress(app, processed, errors, "memories");
        tokio::time::sleep(std::time::Duration::from_millis(200)).await;
    }

    emit_progress(app, total, errors, "done");
    eprintln!(
        "Re-indexed {} chunks and {} memories with provider embeddings ({} errors)",
        total_chunks, total_memories, errors
    );
}

#[cfg(test)]
mod tests;
