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

#[test]
fn init_schema_upgrades_legacy_tables_before_creating_indexes() {
    let mut conn = Connection::open_in_memory().expect("sqlite memory db");
    configure_connection(&conn).expect("configure sqlite");
    conn.execute_batch(
        "
            CREATE TABLE knowledge_documents (
              id TEXT PRIMARY KEY,
              title TEXT NOT NULL,
              source TEXT NOT NULL,
              content TEXT NOT NULL,
              chunk_count INTEGER NOT NULL DEFAULT 0,
              created_at TEXT NOT NULL
            );

            CREATE TABLE knowledge_chunks (
              id TEXT PRIMARY KEY,
              document_id TEXT NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
              content TEXT NOT NULL,
              vector BLOB NOT NULL,
              created_at TEXT NOT NULL
            );
            ",
    )
    .expect("legacy schema");

    init_schema(&conn).expect("legacy schema migrates");

    assert!(table_has_column(&conn, "knowledge_documents", "content_hash").expect("column"));
    assert!(table_has_column(&conn, "knowledge_documents", "updated_at").expect("column"));
    assert!(table_has_column(&conn, "knowledge_chunks", "section_index").expect("column"));
    assert!(table_has_column(&conn, "knowledge_chunks", "token_count").expect("column"));
    assert!(
        index_exists(&conn, "knowledge_documents_content_hash_idx").expect("document hash index")
    );
    assert!(
        index_exists(&conn, "knowledge_chunks_document_section_idx").expect("chunk section index")
    );

    let document = test_document("Migrated file", "Cash runway and sales pipeline context");
    store_document_with_conn(&mut conn, &document).expect("store after migration");
    let results = search_with_conn(&conn, "cash runway", 5).expect("search after migration");

    assert_eq!(results.len(), 1);
}

#[test]
fn duplicate_file_content_updates_existing_document_instead_of_bloating_index() {
    let mut conn = Connection::open_in_memory().expect("sqlite memory db");
    configure_connection(&conn).expect("configure sqlite");
    init_schema(&conn).expect("schema");
    let first = test_document("First policy", "Refund policy for annual contracts");
    let second = KnowledgeDocument {
        id: Uuid::new_v4().to_string(),
        title: "Updated policy name".to_string(),
        source: "upload".to_string(),
        content: first.content.clone(),
        chunk_count: first.chunk_count,
        chunks: first
            .chunks
            .iter()
            .map(|chunk| KnowledgeChunk {
                id: Uuid::new_v4().to_string(),
                document_id: "new-doc".to_string(),
                content: chunk.content.clone(),
                vector: chunk.vector.clone(),
                created_at: chunk.created_at.clone(),
            })
            .collect(),
        created_at: Utc::now().to_rfc3339(),
    };

    store_document_with_conn(&mut conn, &first).expect("store first");
    store_document_with_conn(&mut conn, &second).expect("store duplicate");
    let summaries = list_document_summaries_with_conn(&conn, 10).expect("summaries");
    let results = search_with_conn(&conn, "refund contracts", 10).expect("search");

    assert_eq!(summaries.len(), 1);
    assert_eq!(summaries[0].title, "Updated policy name");
    assert_eq!(results.len(), 1);
}

#[test]
fn hybrid_search_rejects_unrelated_recent_files() {
    let mut conn = Connection::open_in_memory().expect("sqlite memory db");
    configure_connection(&conn).expect("configure sqlite");
    init_schema(&conn).expect("schema");
    let document = test_document("Hiring notes", "Interview loop and onboarding checklist");

    store_document_with_conn(&mut conn, &document).expect("store document");
    let results = search_with_conn(&conn, "runway burn cash", 5).expect("search");

    assert!(results.is_empty());
}

#[test]
fn hybrid_search_uses_title_and_content_signals() {
    let mut conn = Connection::open_in_memory().expect("sqlite memory db");
    configure_connection(&conn).expect("configure sqlite");
    init_schema(&conn).expect("schema");
    let runway = test_document(
        "Runway board memo",
        "Monthly burn, cash plan, payroll timing, and financing assumptions",
    );
    let sales = test_document(
        "Sales call notes",
        "Pipeline review, outreach reply rates, and customer objections",
    );

    store_document_with_conn(&mut conn, &sales).expect("store sales");
    store_document_with_conn(&mut conn, &runway).expect("store runway");
    let results = search_with_conn(&conn, "cash runway", 5).expect("search");

    assert!(!results.is_empty());
    assert_eq!(results[0].title, "Runway board memo");
    assert!(results[0].score > 0.4);
}

fn test_document(title: &str, content: &str) -> KnowledgeDocument {
    let id = Uuid::new_v4().to_string();
    let created_at = Utc::now().to_rfc3339();
    let chunks = chunk_text(content)
        .into_iter()
        .map(|chunk| KnowledgeChunk {
            id: Uuid::new_v4().to_string(),
            document_id: id.clone(),
            vector: embed_text(&chunk),
            content: chunk,
            created_at: created_at.clone(),
        })
        .collect::<Vec<_>>();
    KnowledgeDocument {
        id,
        title: title.to_string(),
        source: "test".to_string(),
        content: content.to_string(),
        chunk_count: chunks.len(),
        chunks,
        created_at,
    }
}

fn index_exists(conn: &Connection, index_name: &str) -> Result<bool, String> {
    conn.query_row(
        "
            SELECT 1
            FROM sqlite_master
            WHERE type = 'index' AND name = ?1
            LIMIT 1
            ",
        params![index_name],
        |_| Ok(true),
    )
    .optional()
    .map(|value| value.unwrap_or(false))
    .map_err(|error| format!("Failed to inspect index: {error}"))
}
