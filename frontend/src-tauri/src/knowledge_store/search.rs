use rusqlite::{params, Connection};
use std::collections::{HashMap, HashSet};
use tauri::AppHandle;

use crate::types::{ModelSettings, SearchResult};
use crate::knowledge_store::schema::open_store;
use crate::knowledge_store::utils::*;

pub(crate) const MAX_SEARCH_CANDIDATES: usize = 768;
pub(crate) const MAX_CONTEXT_RESULTS: usize = 6;
pub(crate) const MAX_CONTEXT_CHARS: usize = 12_000;
pub(crate) const MAX_CONTEXT_RESULTS_PER_DOCUMENT: usize = 2;

#[derive(Debug)]
pub(crate) struct SearchCandidate {
    pub chunk_id: String,
    pub document_id: String,
    pub title: String,
    pub source: String,
    pub content: String,
    pub vector: Vec<u8>,
    pub section_index: usize,
    pub fts_rank: Option<f32>,
}

pub async fn search_store(
    app: &AppHandle,
    settings: &ModelSettings,
    query: &str,
    limit: usize,
) -> Result<Vec<SearchResult>, String> {
    let query_vector = crate::rag::embed_text(Some(app), settings, query).await;
    let conn = open_store(app)?;
    search_with_conn(&conn, query, &query_vector, limit)
}

pub async fn document_context_for_app(app: &AppHandle, settings: &ModelSettings, query: &str) -> Result<String, String> {
    let results = search_store(app, settings, query, 5).await?;
    Ok(document_context_from_results(results))
}

pub(crate) fn search_with_conn(
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

pub(crate) fn document_context_from_results(results: Vec<SearchResult>) -> String {
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
