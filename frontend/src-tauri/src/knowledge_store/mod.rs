use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};
use serde::Serialize;
use tauri::{AppHandle, Emitter};

use crate::constants::MAX_DOCUMENTS;
use crate::rag::{chunk_text, embed_text_local, embed_texts_batch};
use crate::types::{DesktopState, KnowledgeChunk, KnowledgeDocument, ModelSettings};

pub(crate) mod schema;
pub(crate) mod search;
pub(crate) mod utils;

pub use search::*;
pub use utils::*;

use schema::open_store;
#[cfg(test)]
use schema::{configure_connection, init_schema, table_has_column};



pub fn store_document(app: &AppHandle, document: &KnowledgeDocument, embedding_version: i64) -> Result<(), String> {
    let mut conn = open_store(app)?;
    store_document_with_conn(&mut conn, document, embedding_version)
}

pub fn list_document_summaries(
    app: &AppHandle,
    limit: usize,
) -> Result<Vec<KnowledgeDocument>, String> {
    let conn = open_store(app)?;
    list_document_summaries_with_conn(&conn, limit)
}

pub fn normalize_document_for_store(mut document: KnowledgeDocument) -> KnowledgeDocument {
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
            store_document_with_conn(&mut conn, &normalized, crate::constants::LOCAL_EMBEDDING_VERSION)?;
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
    embedding_version: i64,
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
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
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
                embedding_version,
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
    if let Err(e) = crate::providers::call_embedding(settings, "test").await {
        eprintln!("Embedding provider unavailable — skipping re-index: {}", e);
        let _ = app.emit("index-warning", format!("Background re-indexing paused: Embedding provider unavailable ({})", e));
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
