use chrono::Utc;
use tauri::AppHandle;
use uuid::Uuid;

use crate::constants::MAX_RESEARCH_RUNS;
use crate::guardrails::{guardrail_policy_prompt, validate_business_input, validate_model_output};
use crate::memory::remember_business_event;
use crate::providers::call_model;
use crate::rag::add_knowledge_document;
use crate::research_sources::{
    collect_research_sources, ensure_web_search_ready, format_search_queries, format_sources,
    require_sources,
};
use crate::storage::{load_or_create_state, require_usable_activation, save_state};
use crate::types::{DocumentRequest, ModelSettings, ResearchRequest, ResearchRun, StartupProfile};
use crate::validation::{validate_model_settings, validate_objective};

pub(crate) use crate::research_sources::requires_live_web_research;

#[tauri::command]
pub async fn run_research_query(
    app: AppHandle,
    request: ResearchRequest,
) -> Result<ResearchRun, String> {
    validate_objective("Research query", &request.query)?;
    validate_business_input("Research", &request.research_type, &request.query)?;
    let mut state = load_or_create_state(&app)?;
    require_usable_activation(&state)?;
    let mut settings = state.model_settings.clone();
    validate_model_settings(&mut settings)?;
    state.model_settings = settings.clone();
    let research_type = normalize_research_type(&request.research_type);
    let depth = normalize_research_depth(&request.depth);
    let source_limit = source_limit_for_depth(&depth);
    let prompt_profile = research_prompt_profile(&research_type, &depth);
    ensure_web_search_ready(&settings)?;

    let (sources, search_queries) = collect_research_sources(
        &settings,
        &state.workspace,
        &request.query,
        &research_type,
        source_limit,
    )
    .await?;
    require_sources(&sources, "research")?;
    let source_context = format_sources(&sources);
    let search_context = format_search_queries(&search_queries);
    let system_prompt = format!(
        "{}\n\n{}",
        prompt_profile,
        guardrail_policy_prompt(&research_type, true, true)
    );
    let summary = call_model(
        &settings,
        &system_prompt,
        &format!(
            "Owner brief: {}\nWeb searches completed:\n{}\n\nSources:\n{}",
            request.query, search_context, source_context
        ),
    )
    .await?;
    validate_model_output(&summary, true, true)?;

    let run = ResearchRun {
        id: Uuid::new_v4().to_string(),
        query: request.query.trim().to_string(),
        provider: "firecrawl".to_string(),
        summary,
        sources,
        created_at: Utc::now().to_rfc3339(),
    };
    state.research_runs.insert(0, run.clone());
    state.research_runs.truncate(MAX_RESEARCH_RUNS);
    let _ = remember_business_event(
        &app,
        &mut state,
        "research",
        &run.query,
        &run.summary,
        "research",
        0.82,
    );
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

pub async fn research_context_for_business(
    settings: &ModelSettings,
    profile: &StartupProfile,
    owner_query: &str,
    focus: &str,
) -> Result<String, String> {
    ensure_web_search_ready(settings)?;
    let (sources, search_queries) =
        collect_research_sources(settings, profile, owner_query, focus, 4).await?;
    require_sources(&sources, "web context")?;
    Ok(format!(
        "Searches completed:\n{}\n\n{}",
        format_search_queries(&search_queries),
        format_sources(&sources)
    ))
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
        "You are Co-Op's private research analyst for a business owner. Run {}. {} Write in plain business language. Structure the answer with: Quick answer, What matters, Evidence, Risks or unknowns, and Next moves. Use only the supplied web sources for outside facts. Cite source titles inline. For competitor work, classify each named company as verified direct competitor, indirect alternative, or non-competitor, and explain why in one sentence. Do not say the owner should run another broad web search; Co-Op already completed the searches listed in the prompt. If evidence is still weak, state exactly what is weak and give the best supported candidate list.",
        job, depth_instruction
    )
}
