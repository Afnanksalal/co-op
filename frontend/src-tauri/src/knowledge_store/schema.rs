use rusqlite::{params, Connection};
use tauri::{AppHandle, Manager};

use super::legacy_hash_marker;

const KNOWLEDGE_DB_FILE: &str = "knowledge.sqlite3";
const KNOWLEDGE_DB_SCHEMA_VERSION: i64 = 2;

pub(super) fn open_store(app: &AppHandle) -> Result<Connection, String> {
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

pub(super) fn configure_connection(conn: &Connection) -> Result<(), String> {
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

pub(super) fn init_schema(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS knowledge_documents (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          source TEXT NOT NULL,
          content TEXT NOT NULL,
          content_hash TEXT NOT NULL DEFAULT '',
          content_length INTEGER NOT NULL DEFAULT 0,
          chunk_count INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS knowledge_chunks (
          id TEXT PRIMARY KEY,
          document_id TEXT NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
          section_index INTEGER NOT NULL DEFAULT 0,
          content TEXT NOT NULL,
          vector BLOB NOT NULL,
          token_start INTEGER NOT NULL DEFAULT 0,
          token_end INTEGER NOT NULL DEFAULT 0,
          token_count INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL
        );

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
    .map_err(|error| format!("Failed to initialize local knowledge store: {error}"))?;
    ensure_schema_upgrades(conn)?;
    ensure_indexes(conn)?;
    conn.pragma_update(None, "user_version", KNOWLEDGE_DB_SCHEMA_VERSION)
        .map_err(|error| format!("Failed to mark local knowledge schema version: {error}"))
}

fn ensure_indexes(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        CREATE INDEX IF NOT EXISTS knowledge_documents_content_hash_idx
          ON knowledge_documents(content_hash);

        CREATE INDEX IF NOT EXISTS knowledge_documents_updated_idx
          ON knowledge_documents(updated_at DESC);

        CREATE INDEX IF NOT EXISTS knowledge_chunks_document_idx
          ON knowledge_chunks(document_id);

        CREATE INDEX IF NOT EXISTS knowledge_chunks_document_section_idx
          ON knowledge_chunks(document_id, section_index);
        ",
    )
    .map_err(|error| format!("Failed to index local knowledge store: {error}"))
}

fn ensure_schema_upgrades(conn: &Connection) -> Result<(), String> {
    ensure_column(
        conn,
        "knowledge_documents",
        "content_hash",
        "TEXT NOT NULL DEFAULT ''",
    )?;
    ensure_column(
        conn,
        "knowledge_documents",
        "content_length",
        "INTEGER NOT NULL DEFAULT 0",
    )?;
    ensure_column(
        conn,
        "knowledge_documents",
        "updated_at",
        "TEXT NOT NULL DEFAULT ''",
    )?;
    ensure_column(
        conn,
        "knowledge_chunks",
        "section_index",
        "INTEGER NOT NULL DEFAULT 0",
    )?;
    ensure_column(
        conn,
        "knowledge_chunks",
        "token_start",
        "INTEGER NOT NULL DEFAULT 0",
    )?;
    ensure_column(
        conn,
        "knowledge_chunks",
        "token_end",
        "INTEGER NOT NULL DEFAULT 0",
    )?;
    ensure_column(
        conn,
        "knowledge_chunks",
        "token_count",
        "INTEGER NOT NULL DEFAULT 0",
    )?;
    conn.execute(
        "UPDATE knowledge_documents SET content_hash = ?1 WHERE content_hash = ''",
        params![legacy_hash_marker()],
    )
    .map_err(|error| format!("Failed to prepare existing file records: {error}"))?;
    conn.execute(
        "UPDATE knowledge_documents SET content_length = length(content) WHERE content_length = 0",
        [],
    )
    .map_err(|error| format!("Failed to backfill file sizes: {error}"))?;
    conn.execute(
        "UPDATE knowledge_documents SET updated_at = created_at WHERE updated_at = ''",
        [],
    )
    .map_err(|error| format!("Failed to backfill file update times: {error}"))?;
    Ok(())
}

fn ensure_column(
    conn: &Connection,
    table: &str,
    column: &str,
    definition: &str,
) -> Result<(), String> {
    if table_has_column(conn, table, column)? {
        return Ok(());
    }
    conn.execute(
        &format!("ALTER TABLE {table} ADD COLUMN {column} {definition}"),
        [],
    )
    .map_err(|error| format!("Failed to upgrade local knowledge column {column}: {error}"))?;
    Ok(())
}

pub(super) fn table_has_column(
    conn: &Connection,
    table: &str,
    column: &str,
) -> Result<bool, String> {
    let mut stmt = conn
        .prepare(&format!("PRAGMA table_info({table})"))
        .map_err(|error| format!("Failed to inspect local knowledge schema: {error}"))?;
    let rows = stmt
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|error| format!("Failed to inspect local knowledge columns: {error}"))?;
    for row in rows {
        if row.map_err(|error| format!("Failed to read local knowledge column: {error}"))? == column
        {
            return Ok(true);
        }
    }
    Ok(false)
}
