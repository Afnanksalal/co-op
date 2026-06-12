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
    let research_type = normalize_research_type(&request.research_type);
    let depth = normalize_research_depth(&request.depth);
    let source_limit = source_limit_for_depth(&depth);
    let prompt_profile = research_prompt_profile(&research_type, &depth);

    let (provider, sources, summary) = if settings.research_provider == "firecrawl" {
        let sources = search_firecrawl(&settings, &request.query, source_limit).await?;
        let source_context = format_sources(&sources);
        let summary = call_model(
            &settings,
            &prompt_profile,
            &format!(
                "Research brief: {}\n\nSources:\n{}",
                request.query, source_context
            ),
        )
        .await?;
        ("firecrawl".to_string(), sources, summary)
    } else {
        let summary = call_model(
            &settings,
            &format!(
                "{}\n\nNo live web source provider is configured. Use only model knowledge, clearly mark uncertainty, and do not invent citations.",
                prompt_profile
            ),
            &format!("Research brief: {}", request.query),
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

fn normalize_research_type(value: &str) -> String {
    match value.trim() {
        "market_scan" | "competitors" | "customer" | "pricing" | "investor" | "risk" => {
            value.trim().to_string()
        }
        _ => "market_scan".to_string(),
    }
}

fn normalize_research_depth(value: &str) -> String {
    match value.trim() {
        "quick" | "standard" | "deep" => value.trim().to_string(),
        _ => "standard".to_string(),
    }
}

fn source_limit_for_depth(depth: &str) -> usize {
    match depth {
        "quick" => 3,
        "deep" => 8,
        _ => 5,
    }
}

fn research_prompt_profile(research_type: &str, depth: &str) -> String {
    let job = match research_type {
        "competitors" => {
            "competitive research: identify alternatives, positioning, strengths, weaknesses, and gaps"
        }
        "customer" => {
            "customer research: clarify buyer segments, pains, triggers, objections, and useful outreach angles"
        }
        "pricing" => {
            "pricing research: compare pricing models, value metrics, packaging, and willingness-to-pay signals"
        }
        "investor" => {
            "investor research: summarize market momentum, investor fit, funding signals, and diligence questions"
        }
        "risk" => "risk research: identify market, legal, operating, security, and execution risks",
        _ => "market research: size the market, trends, competitors, buyers, and immediate opportunities",
    };
    let depth_instruction = match depth {
        "quick" => "Keep it short: 5-7 sharp bullets and one next move.",
        "deep" => {
            "Go deeper: group evidence, compare tradeoffs, include uncertainties, and propose a practical action plan."
        }
        _ => "Be concise but useful: summarize key findings, evidence, risks, and next actions.",
    };

    format!(
        "You are Co-Op's private research analyst for a business owner. Run {}. {} Write in plain business language. Structure the answer with: Quick answer, What matters, Evidence, Risks or unknowns, and Next moves. If sources are provided, cite source titles inline; if not, clearly say the answer is assistant-only.",
        job, depth_instruction
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn truncate_handles_unicode_boundaries() {
        assert_eq!(truncate("éééé", 2), "éé...");
    }
}
