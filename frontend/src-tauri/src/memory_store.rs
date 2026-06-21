use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};
use sha2::{Digest, Sha256};
use std::collections::HashSet;
use tauri::AppHandle;

use crate::constants::{MAX_MEMORIES, RAG_VECTOR_DIMENSIONS};
use crate::knowledge_store::schema::open_store;
use crate::rag::{embed_text, tokenize};
use crate::types::{BusinessMemory, MemorySearchResult};

const MAX_MEMORY_SEARCH_CANDIDATES: usize = 512;
const MAX_MEMORY_CONTEXT_RESULTS: usize = 8;
const MAX_MEMORY_CONTEXT_CHARS: usize = 10_000;

pub fn store_business_memory(app: &AppHandle, memory: &BusinessMemory) -> Result<(), String> {
    let mut conn = open_store(app)?;
    store_memory_with_conn(&mut conn, memory)
}

pub fn list_memory_summaries(app: &AppHandle, limit: usize) -> Result<Vec<BusinessMemory>, String> {
    let conn = open_store(app)?;
    list_memory_summaries_with_conn(&conn, limit)
}

pub fn search_business_memories(
    app: &AppHandle,
    query: &str,
    limit: usize,
) -> Result<Vec<MemorySearchResult>, String> {
    let conn = open_store(app)?;
    search_memories_with_conn(&conn, query, limit)
}

pub fn memory_context_for_app(app: &AppHandle, query: &str) -> Result<String, String> {
    let results = search_business_memories(app, query, MAX_MEMORY_CONTEXT_RESULTS)?;
    Ok(memory_context_from_results(results))
}

fn store_memory_with_conn(conn: &mut Connection, memory: &BusinessMemory) -> Result<(), String> {
    let content = normalize_content(&memory.content);
    let content_hash = content_hash(&format!(
        "{}\n{}\n{}",
        memory.memory_type, memory.title, content
    ));
    let canonical_id = existing_memory_id_for_hash(conn, &content_hash)?
        .unwrap_or_else(|| memory.id.trim().to_string());
    let id = if canonical_id.is_empty() {
        uuid::Uuid::new_v4().to_string()
    } else {
        canonical_id
    };
    let created_at = if memory.created_at.trim().is_empty() {
        Utc::now().to_rfc3339()
    } else {
        memory.created_at.clone()
    };
    let updated_at = Utc::now().to_rfc3339();
    let vector = embed_text(&format!(
        "{} {} {}",
        memory.title, memory.memory_type, content
    ));
    let tx = conn
        .transaction()
        .map_err(|error| format!("Failed to start memory transaction: {error}"))?;
    tx.execute(
        "
        INSERT INTO business_memories (
          id, memory_type, title, content, source, content_hash, vector, confidence, pinned, created_at, updated_at
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
        ON CONFLICT(id) DO UPDATE SET
          memory_type = excluded.memory_type,
          title = excluded.title,
          content = excluded.content,
          source = excluded.source,
          content_hash = excluded.content_hash,
          vector = excluded.vector,
          confidence = excluded.confidence,
          pinned = excluded.pinned,
          updated_at = excluded.updated_at
        ",
        params![
            id,
            normalize_memory_type(&memory.memory_type),
            memory.title.trim(),
            content,
            memory.source.trim(),
            content_hash,
            vector_to_blob(&vector),
            memory.confidence.clamp(0.0, 1.0),
            if memory.pinned { 1 } else { 0 },
            created_at,
            updated_at,
        ],
    )
    .map_err(|error| format!("Failed to store business memory: {error}"))?;
    tx.execute(
        "DELETE FROM business_memories_fts WHERE memory_id = ?1",
        params![id],
    )
    .map_err(|error| format!("Failed to update memory search index: {error}"))?;
    tx.execute(
        "
        INSERT INTO business_memories_fts (memory_id, memory_type, title, source, content)
        VALUES (?1, ?2, ?3, ?4, ?5)
        ",
        params![
            id,
            normalize_memory_type(&memory.memory_type),
            memory.title.trim(),
            memory.source.trim(),
            content,
        ],
    )
    .map_err(|error| format!("Failed to index business memory: {error}"))?;
    tx.commit()
        .map_err(|error| format!("Failed to commit business memory: {error}"))
}

fn list_memory_summaries_with_conn(
    conn: &Connection,
    limit: usize,
) -> Result<Vec<BusinessMemory>, String> {
    let mut stmt = conn
        .prepare(
            "
            SELECT id, memory_type, title, content, source, confidence, pinned, created_at, updated_at
            FROM business_memories
            ORDER BY pinned DESC, updated_at DESC, created_at DESC
            LIMIT ?1
            ",
        )
        .map_err(|error| format!("Failed to prepare memory summary query: {error}"))?;
    let rows = stmt
        .query_map(params![limit.clamp(1, MAX_MEMORIES) as i64], map_memory)
        .map_err(|error| format!("Failed to list business memories: {error}"))?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Failed to read business memories: {error}"))
}

fn search_memories_with_conn(
    conn: &Connection,
    query: &str,
    limit: usize,
) -> Result<Vec<MemorySearchResult>, String> {
    let query_terms = unique_tokens(query);
    let query_vector = embed_text(query);
    let mut candidates = if let Some(fts_query) = build_fts_query(query) {
        memory_candidates_with_fts(conn, &fts_query)?
    } else {
        Vec::new()
    };
    candidates = merge_memory_candidates(candidates, recent_memory_candidates(conn)?);
    if candidates.is_empty() || query_terms.is_empty() {
        return Ok(Vec::new());
    }

    let mut results = candidates
        .into_iter()
        .filter_map(|candidate| {
            let vector = blob_to_vector(&candidate.vector).ok()?;
            let semantic_score = cosine_similarity(&query_vector, &vector).max(0.0);
            let lexical_score = lexical_memory_score(&query_terms, &candidate);
            let metadata_score = metadata_memory_score(&query_terms, &candidate);
            let pin_score = if candidate.pinned { 0.05 } else { 0.0 };
            let fts_score = candidate.fts_rank.map(fts_rank_score).unwrap_or(0.0);
            let score = ((lexical_score * 0.38)
                + (semantic_score * 0.34)
                + (metadata_score * 0.15)
                + (fts_score * 0.08)
                + pin_score)
                .clamp(0.0, 1.0);
            if score >= 0.05 {
                Some(MemorySearchResult {
                    id: candidate.id,
                    memory_type: candidate.memory_type,
                    title: candidate.title,
                    content: candidate.content,
                    source: candidate.source,
                    confidence: candidate.confidence,
                    pinned: candidate.pinned,
                    created_at: candidate.created_at,
                    updated_at: candidate.updated_at,
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

fn memory_candidates_with_fts(
    conn: &Connection,
    fts_query: &str,
) -> Result<Vec<MemoryCandidate>, String> {
    let mut stmt = conn
        .prepare(
            "
            SELECT
              m.id, m.memory_type, m.title, m.content, m.source, m.vector, m.confidence,
              m.pinned, m.created_at, m.updated_at, bm25(business_memories_fts) AS fts_rank
            FROM business_memories_fts
            JOIN business_memories m ON m.id = business_memories_fts.memory_id
            WHERE business_memories_fts MATCH ?1
            ORDER BY fts_rank
            LIMIT ?2
            ",
        )
        .map_err(|error| format!("Failed to prepare memory search: {error}"))?;
    let rows = stmt
        .query_map(
            params![fts_query, MAX_MEMORY_SEARCH_CANDIDATES as i64],
            map_candidate,
        )
        .map_err(|error| format!("Failed to run memory search: {error}"))?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Failed to read memory search results: {error}"))
}

fn recent_memory_candidates(conn: &Connection) -> Result<Vec<MemoryCandidate>, String> {
    let mut stmt = conn
        .prepare(
            "
            SELECT
              id, memory_type, title, content, source, vector, confidence,
              pinned, created_at, updated_at, NULL AS fts_rank
            FROM business_memories
            ORDER BY pinned DESC, updated_at DESC, created_at DESC
            LIMIT ?1
            ",
        )
        .map_err(|error| format!("Failed to prepare recent memory search: {error}"))?;
    let rows = stmt
        .query_map(params![MAX_MEMORY_SEARCH_CANDIDATES as i64], map_candidate)
        .map_err(|error| format!("Failed to run recent memory search: {error}"))?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Failed to read recent memory results: {error}"))
}

fn memory_context_from_results(results: Vec<MemorySearchResult>) -> String {
    if results.is_empty() {
        return String::new();
    }
    let mut context = String::from("\n\nBusiness memory context:\n");
    let mut used_chars = context.len();
    for result in results {
        let line = format!(
            "- {} | Type: {} | Source: {} | Confidence: {:.0}% | Match: {:.0}%\n  Memory: {}\n",
            result.title,
            result.memory_type,
            empty_dash(&result.source),
            result.confidence * 100.0,
            result.score * 100.0,
            truncate_chars(&result.content, 1_200),
        );
        if used_chars + line.len() > MAX_MEMORY_CONTEXT_CHARS {
            break;
        }
        used_chars += line.len();
        context.push_str(&line);
    }
    context
}

fn map_memory(row: &rusqlite::Row<'_>) -> rusqlite::Result<BusinessMemory> {
    Ok(BusinessMemory {
        id: row.get(0)?,
        memory_type: row.get(1)?,
        title: row.get(2)?,
        content: row.get(3)?,
        source: row.get(4)?,
        confidence: row.get::<_, f64>(5)? as f32,
        pinned: row.get::<_, i64>(6)? != 0,
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
    })
}

fn map_candidate(row: &rusqlite::Row<'_>) -> rusqlite::Result<MemoryCandidate> {
    Ok(MemoryCandidate {
        id: row.get(0)?,
        memory_type: row.get(1)?,
        title: row.get(2)?,
        content: row.get(3)?,
        source: row.get(4)?,
        vector: row.get(5)?,
        confidence: row.get::<_, f64>(6)? as f32,
        pinned: row.get::<_, i64>(7)? != 0,
        created_at: row.get(8)?,
        updated_at: row.get(9)?,
        fts_rank: row.get::<_, Option<f64>>(10)?.map(|rank| rank as f32),
    })
}

fn existing_memory_id_for_hash(
    conn: &Connection,
    content_hash: &str,
) -> Result<Option<String>, String> {
    conn.query_row(
        "
        SELECT id
        FROM business_memories
        WHERE content_hash = ?1
        LIMIT 1
        ",
        params![content_hash],
        |row| row.get(0),
    )
    .optional()
    .map_err(|error| format!("Failed to check existing business memory: {error}"))
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

fn merge_memory_candidates(
    primary: Vec<MemoryCandidate>,
    secondary: Vec<MemoryCandidate>,
) -> Vec<MemoryCandidate> {
    let mut seen = HashSet::new();
    let mut merged = Vec::with_capacity(primary.len() + secondary.len());
    for candidate in primary.into_iter().chain(secondary) {
        if seen.insert(candidate.id.clone()) {
            merged.push(candidate);
        }
        if merged.len() >= MAX_MEMORY_SEARCH_CANDIDATES {
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

fn lexical_memory_score(query_terms: &[String], candidate: &MemoryCandidate) -> f32 {
    if query_terms.is_empty() {
        return 0.0;
    }
    let content_terms = unique_tokens(&candidate.content)
        .into_iter()
        .collect::<HashSet<_>>();
    let matches = query_terms
        .iter()
        .filter(|term| content_terms.contains(*term))
        .count();
    matches as f32 / query_terms.len() as f32
}

fn metadata_memory_score(query_terms: &[String], candidate: &MemoryCandidate) -> f32 {
    if query_terms.is_empty() {
        return 0.0;
    }
    let metadata = unique_tokens(&format!(
        "{} {} {}",
        candidate.title, candidate.source, candidate.memory_type
    ))
    .into_iter()
    .collect::<HashSet<_>>();
    let matches = query_terms
        .iter()
        .filter(|term| metadata.contains(*term))
        .count();
    matches as f32 / query_terms.len() as f32
}

fn fts_rank_score(rank: f32) -> f32 {
    (1.0 / (1.0 + rank.abs())).clamp(0.0, 1.0)
}

fn normalize_memory_type(value: &str) -> String {
    match value.trim() {
        "profile" | "decision" | "risk" | "preference" | "customer" | "research" | "plan"
        | "conversation" | "note" => value.trim().to_string(),
        _ => "note".to_string(),
    }
}

fn normalize_content(content: &str) -> String {
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

fn vector_to_blob(vector: &[f32]) -> Vec<u8> {
    vector
        .iter()
        .flat_map(|value| value.to_le_bytes())
        .collect::<Vec<_>>()
}

fn blob_to_vector(blob: &[u8]) -> Result<Vec<f32>, String> {
    if blob.len() % std::mem::size_of::<f32>() != 0 {
        return Err("Stored memory vector has invalid byte length".to_string());
    }
    let vector = blob
        .chunks_exact(std::mem::size_of::<f32>())
        .map(|bytes| f32::from_le_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]))
        .collect::<Vec<_>>();
    if vector.len() != RAG_VECTOR_DIMENSIONS {
        return Err(
            "Stored memory vector dimension does not match runtime configuration".to_string(),
        );
    }
    Ok(vector)
}

fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    a.iter()
        .zip(b.iter())
        .map(|(left, right)| left * right)
        .sum()
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

fn empty_dash(value: &str) -> String {
    if value.trim().is_empty() {
        "-".to_string()
    } else {
        value.trim().to_string()
    }
}

#[derive(Debug)]
struct MemoryCandidate {
    id: String,
    memory_type: String,
    title: String,
    content: String,
    source: String,
    vector: Vec<u8>,
    confidence: f32,
    pinned: bool,
    created_at: String,
    updated_at: String,
    fts_rank: Option<f32>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::knowledge_store::schema::{configure_connection, init_schema};

    fn memory(title: &str, content: &str) -> BusinessMemory {
        BusinessMemory {
            id: uuid::Uuid::new_v4().to_string(),
            memory_type: "decision".to_string(),
            title: title.to_string(),
            content: content.to_string(),
            source: "test".to_string(),
            confidence: 0.9,
            pinned: false,
            created_at: Utc::now().to_rfc3339(),
            updated_at: Utc::now().to_rfc3339(),
        }
    }

    #[test]
    fn memory_store_searches_vector_and_text() {
        let mut conn = Connection::open_in_memory().unwrap();
        configure_connection(&conn).unwrap();
        init_schema(&conn).unwrap();

        store_memory_with_conn(
            &mut conn,
            &memory(
                "Pipeline decision",
                "Prioritize dental clinic outreach this month.",
            ),
        )
        .unwrap();
        store_memory_with_conn(
            &mut conn,
            &memory("Pricing note", "Keep the founder plan simple and monthly."),
        )
        .unwrap();

        let results = search_memories_with_conn(&conn, "dental outreach", 5).unwrap();

        assert_eq!(results[0].title, "Pipeline decision");
    }

    #[test]
    fn memory_store_dedupes_same_content() {
        let mut conn = Connection::open_in_memory().unwrap();
        configure_connection(&conn).unwrap();
        init_schema(&conn).unwrap();
        let first = memory("Decision", "Use one weekly pipeline review.");
        let second = memory("Decision", "Use one weekly pipeline review.");

        store_memory_with_conn(&mut conn, &first).unwrap();
        store_memory_with_conn(&mut conn, &second).unwrap();

        let memories = list_memory_summaries_with_conn(&conn, 10).unwrap();
        assert_eq!(memories.len(), 1);
    }
}
