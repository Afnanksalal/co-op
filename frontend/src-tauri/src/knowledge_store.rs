use chrono::Utc;
use rusqlite::{params, Connection};
use tauri::{AppHandle, Manager};

use crate::constants::{MAX_DOCUMENTS, RAG_VECTOR_DIMENSIONS};
use crate::rag::{chunk_text, embed_text};
use crate::types::{DesktopState, KnowledgeChunk, KnowledgeDocument, SearchResult};

const KNOWLEDGE_DB_FILE: &str = "knowledge.sqlite3";
const MAX_SEARCH_CANDIDATES: usize = 256;

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

pub fn search_store(
    app: &AppHandle,
    query: &str,
    limit: usize,
) -> Result<Vec<SearchResult>, String> {
    let conn = open_store(app)?;
    search_with_conn(&conn, query, limit)
}

pub fn document_context_for_app(app: &AppHandle, query: &str) -> Result<String, String> {
    let results = search_store(app, query, 5)?;
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

fn open_store(app: &AppHandle) -> Result<Connection, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Failed to resolve app data directory: {error}"))?;
    std::fs::create_dir_all(&dir)
        .map_err(|error| format!("Failed to create app data directory: {error}"))?;
    let conn = Connection::open(dir.join(KNOWLEDGE_DB_FILE))
        .map_err(|error| format!("Failed to open local knowledge store: {error}"))?;
    configure_connection(&conn)?;
    init_schema(&conn)?;
    Ok(conn)
}

fn configure_connection(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        PRAGMA foreign_keys = ON;
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        PRAGMA busy_timeout = 5000;
        ",
    )
    .map_err(|error| format!("Failed to configure local knowledge store: {error}"))
}

fn init_schema(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS knowledge_documents (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          source TEXT NOT NULL,
          content TEXT NOT NULL,
          chunk_count INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS knowledge_chunks (
          id TEXT PRIMARY KEY,
          document_id TEXT NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          vector BLOB NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS knowledge_chunks_document_idx
          ON knowledge_chunks(document_id);

        CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_chunks_fts USING fts5(
          chunk_id UNINDEXED,
          document_id UNINDEXED,
          title,
          source,
          content,
          tokenize = 'unicode61'
        );
        ",
    )
    .map_err(|error| format!("Failed to initialize local knowledge store: {error}"))
}

fn store_document_with_conn(
    conn: &mut Connection,
    document: &KnowledgeDocument,
) -> Result<(), String> {
    let tx = conn
        .transaction()
        .map_err(|error| format!("Failed to start knowledge transaction: {error}"))?;
    tx.execute(
        "
        INSERT INTO knowledge_documents (id, title, source, content, chunk_count, created_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          source = excluded.source,
          content = excluded.content,
          chunk_count = excluded.chunk_count,
          created_at = excluded.created_at
        ",
        params![
            document.id,
            document.title,
            document.source,
            document.content,
            document.chunks.len() as i64,
            document.created_at,
        ],
    )
    .map_err(|error| format!("Failed to store knowledge document: {error}"))?;
    tx.execute(
        "DELETE FROM knowledge_chunks_fts WHERE document_id = ?1",
        params![document.id],
    )
    .map_err(|error| format!("Failed to update knowledge search index: {error}"))?;
    tx.execute(
        "DELETE FROM knowledge_chunks WHERE document_id = ?1",
        params![document.id],
    )
    .map_err(|error| format!("Failed to replace knowledge chunks: {error}"))?;

    for chunk in &document.chunks {
        tx.execute(
            "
            INSERT INTO knowledge_chunks (id, document_id, content, vector, created_at)
            VALUES (?1, ?2, ?3, ?4, ?5)
            ",
            params![
                chunk.id,
                chunk.document_id,
                chunk.content,
                vector_to_blob(&chunk.vector),
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
            ORDER BY created_at DESC
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
    limit: usize,
) -> Result<Vec<SearchResult>, String> {
    let query_vector = embed_text(query);
    let mut candidates = if let Some(fts_query) = build_fts_query(query) {
        search_candidates_with_fts(conn, &fts_query)?
    } else {
        Vec::new()
    };

    if candidates.is_empty() {
        candidates = recent_candidates(conn)?;
    }

    let mut results = candidates
        .into_iter()
        .filter_map(|candidate| {
            let vector = blob_to_vector(&candidate.vector).ok()?;
            let score = cosine_similarity(&query_vector, &vector);
            if score > 0.0 {
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
            SELECT c.id, c.document_id, d.title, d.source, c.content, c.vector
            FROM knowledge_chunks_fts
            JOIN knowledge_chunks c ON c.id = knowledge_chunks_fts.chunk_id
            JOIN knowledge_documents d ON d.id = c.document_id
            WHERE knowledge_chunks_fts MATCH ?1
            ORDER BY rank
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
            SELECT c.id, c.document_id, d.title, d.source, c.content, c.vector
            FROM knowledge_chunks c
            JOIN knowledge_documents d ON d.id = c.document_id
            ORDER BY c.created_at DESC
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
    })
}

fn normalize_document_for_store(mut document: KnowledgeDocument) -> KnowledgeDocument {
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
                vector: embed_text(&content),
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
    for result in results {
        context.push_str(&format!(
            "- {} ({:.2}): {}\n",
            result.title, result.score, result.content
        ));
    }
    context
}

fn build_fts_query(query: &str) -> Option<String> {
    let tokens = query
        .to_lowercase()
        .split(|character: char| !character.is_ascii_alphanumeric())
        .filter(|token| token.len() > 2)
        .take(10)
        .map(|token| format!("\"{token}\""))
        .collect::<Vec<_>>();

    if tokens.is_empty() {
        None
    } else {
        Some(tokens.join(" OR "))
    }
}

fn vector_to_blob(vector: &[f32]) -> Vec<u8> {
    vector
        .iter()
        .flat_map(|value| value.to_le_bytes())
        .collect::<Vec<_>>()
}

fn blob_to_vector(blob: &[u8]) -> Result<Vec<f32>, String> {
    if blob.len() % std::mem::size_of::<f32>() != 0 {
        return Err("Stored vector has invalid byte length".to_string());
    }
    let vector = blob
        .chunks_exact(std::mem::size_of::<f32>())
        .map(|bytes| f32::from_le_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]))
        .collect::<Vec<_>>();
    if vector.len() != RAG_VECTOR_DIMENSIONS {
        return Err("Stored vector dimension does not match runtime configuration".to_string());
    }
    Ok(vector)
}

fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    a.iter()
        .zip(b.iter())
        .map(|(left, right)| left * right)
        .sum()
}

#[derive(Debug)]
struct SearchCandidate {
    chunk_id: String,
    document_id: String,
    title: String,
    source: String,
    content: String,
    vector: Vec<u8>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;

    #[test]
    fn vector_blob_round_trips_without_json_expansion() {
        let vector = embed_text("runway revenue sales pipeline");
        let blob = vector_to_blob(&vector);
        let decoded = blob_to_vector(&blob).expect("valid vector blob");

        assert_eq!(
            blob.len(),
            RAG_VECTOR_DIMENSIONS * std::mem::size_of::<f32>()
        );
        assert_eq!(decoded.len(), vector.len());
        assert_eq!(decoded, vector);
    }

    #[test]
    fn sqlite_store_uses_fts_candidates_and_vector_ranking() {
        let mut conn = Connection::open_in_memory().expect("sqlite memory db");
        configure_connection(&conn).expect("configure sqlite");
        init_schema(&conn).expect("schema");
        let created_at = Utc::now().to_rfc3339();
        let document = KnowledgeDocument {
            id: Uuid::new_v4().to_string(),
            title: "Finance notes".to_string(),
            source: "test".to_string(),
            content: "Monthly burn and runway planning".to_string(),
            chunk_count: 1,
            chunks: vec![KnowledgeChunk {
                id: Uuid::new_v4().to_string(),
                document_id: "doc".to_string(),
                content: "Monthly burn and runway planning".to_string(),
                vector: embed_text("Monthly burn and runway planning"),
                created_at: created_at.clone(),
            }],
            created_at,
        };
        let mut document = document;
        document.chunks[0].document_id = document.id.clone();

        store_document_with_conn(&mut conn, &document).expect("store document");
        let summaries = list_document_summaries_with_conn(&conn, 10).expect("summaries");
        let results = search_with_conn(&conn, "runway burn", 5).expect("search");

        assert_eq!(summaries.len(), 1);
        assert_eq!(summaries[0].chunk_count, 1);
        assert!(summaries[0].chunks.is_empty());
        assert_eq!(results.len(), 1);
        assert!(results[0].score > 0.0);
    }
}
