use chrono::Utc;
use tauri::AppHandle;
use uuid::Uuid;

use crate::constants::MAX_RESEARCH_RUNS;
use crate::providers::{call_model, search_firecrawl};
use crate::rag::add_knowledge_document;
use crate::storage::{load_or_create_state, require_usable_activation, save_state};
use crate::types::{DocumentRequest, ResearchRequest, ResearchRun, ResearchSource};
use crate::validation::{validate_model_settings, validate_objective};

#[tauri::command]
pub async fn run_research_query(
    app: AppHandle,
    request: ResearchRequest,
) -> Result<ResearchRun, String> {
    validate_objective("Research query", &request.query)?;
    let mut state = load_or_create_state(&app)?;
    require_usable_activation(&state)?;
    let mut settings = state.model_settings.clone();
    validate_model_settings(&mut settings)?;
    state.model_settings = settings.clone();

    let (provider, sources, summary) = if settings.research_provider == "firecrawl" {
        let sources = search_firecrawl(&settings, &request.query, 5).await?;
        let source_context = format_sources(&sources);
        let summary = call_model(
      &settings,
      "You are Co-Op's local research analyst. Summarize cited web research for a business owner. Be specific and concise.",
      &format!("Query: {}\n\nSources:\n{}", request.query, source_context),
    )
    .await?;
        ("firecrawl".to_string(), sources, summary)
    } else {
        let summary = call_model(
      &settings,
      "You are Co-Op's local research analyst. Use only your model knowledge unless external research is configured. Clearly mark uncertainty.",
      &request.query,
    )
    .await?;
        ("llm".to_string(), Vec::<ResearchSource>::new(), summary)
    };

    let run = ResearchRun {
        id: Uuid::new_v4().to_string(),
        query: request.query.trim().to_string(),
        provider,
        summary,
        sources,
        created_at: Utc::now().to_rfc3339(),
    };
    state.research_runs.insert(0, run.clone());
    state.research_runs.truncate(MAX_RESEARCH_RUNS);
    save_state(&app, &state)?;

    if request.save_to_rag {
        let mut content = run.summary.clone();
        for source in &run.sources {
            content.push_str(&format!(
                "\n\nSource: {}\n{}\n{}",
                source.url, source.description, source.content
            ));
        }
        let _ = add_knowledge_document(
            app,
            DocumentRequest {
                title: format!("Research: {}", run.query),
                source: run.provider.clone(),
                content,
            },
        )?;
    }

    Ok(run)
}

pub async fn research_context(
    settings: &crate::types::ModelSettings,
    query: &str,
) -> Result<String, String> {
    if settings.research_provider == "firecrawl" {
        let sources = search_firecrawl(settings, query, 3).await?;
        Ok(format_sources(&sources))
    } else {
        Ok(String::new())
    }
}

pub fn format_sources(sources: &[ResearchSource]) -> String {
    if sources.is_empty() {
        return "No live sources configured.".to_string();
    }
    sources
        .iter()
        .map(|source| {
            format!(
                "- {}\n  URL: {}\n  Description: {}\n  Content: {}",
                source.title,
                source.url,
                source.description,
                truncate(&source.content, 1500)
            )
        })
        .collect::<Vec<String>>()
        .join("\n")
}

fn truncate(value: &str, max: usize) -> String {
    if value.chars().count() <= max {
        value.to_string()
    } else {
        format!("{}...", value.chars().take(max).collect::<String>())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn truncate_handles_unicode_boundaries() {
        assert_eq!(truncate("éééé", 2), "éé...");
    }
}
