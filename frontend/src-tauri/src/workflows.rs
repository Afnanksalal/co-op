use chrono::Utc;
use tauri::AppHandle;
use uuid::Uuid;

use crate::constants::MAX_STORED_WORKFLOW_RUNS;
use crate::graph::graph_context;
use crate::guardrails::{
    classify_question_type, guardrail_policy_prompt, validate_business_input,
    validate_model_output, QuestionType,
};
use crate::memory::{memory_context_from_store, remember_business_event};
use crate::providers::call_model;
use crate::knowledge_store::document_context_for_app;
use crate::research::research_context_for_business;
use crate::storage::{load_or_create_state, require_usable_activation, save_state};
use crate::types::{WorkflowRequest, WorkflowRun, WorkflowTraceEvent};
use crate::validation::{validate_read_only, validate_workflow_request};

#[tauri::command]
pub async fn run_business_workflow(
    app: AppHandle,
    request: WorkflowRequest,
) -> Result<WorkflowRun, String> {
    let state = load_or_create_state(&app)?;
    validate_workflow_request(&request)?;
    let workflow_type = request.workflow_type.trim().to_lowercase();
    let objective = request.objective.trim().to_string();
    let guardrail_decision = validate_business_input("Plan", &workflow_type, &objective)?;
    require_usable_activation(&state)?;

    let model_settings = validate_read_only(&state.model_settings)?;
    
    if crate::guardrails::resolve_off_topic(&model_settings, &request.objective).await {
        return Err("Co-Op is intentionally scoped to business tasks and therefore cannot assist with personal requests or non-business topics.".to_string());
    }

    let created_at = Utc::now().to_rfc3339();
    let risk_level = if guardrail_decision.high_risk {
        "high".to_string()
    } else {
        workflow_risk_level(&workflow_type, &objective)
    };
    let approval_required = guardrail_decision.high_risk
        || should_run_review_gate(&model_settings.council_mode, &workflow_type, &objective);
    let mut run = WorkflowRun {
        id: Uuid::new_v4().to_string(),
        workflow_type,
        objective,
        provider: model_settings.provider.clone(),
        status: "running".to_string(),
        steps: Vec::new(),
        trace: Vec::new(),
        risk_level,
        approval_required,
        output: None,
        error: None,
        created_at,
        completed_at: None,
    };
    push_trace(
        &mut run,
        "intake",
        "Loaded local entitlement",
        "completed",
        "License state is usable for local workflow execution.",
    );
    push_trace(
        &mut run,
        "context",
        "Loaded startup workspace",
        "completed",
        "Company profile fields were attached from local state.",
    );
    let routing_detail = format!(
        "AI source: {}; review level: {}; sensitivity: {}.",
        model_settings.provider, model_settings.council_mode, run.risk_level
    );
    push_trace(
        &mut run,
        "routing",
        "Loaded provider policy",
        "completed",
        &routing_detail,
    );

    let web_required = match guardrail_decision.web_intent {
        crate::guardrails::WebIntent::Yes => true,
        crate::guardrails::WebIntent::No => false,
        crate::guardrails::WebIntent::Uncertain => {
            crate::guardrails::resolve_web_intent(&model_settings, &run.objective).await
        }
    };
    let mut source_context_attached = false;

    if web_required {
        crate::research_sources::ensure_web_search_ready(&model_settings)?;
    }

    let question_type = classify_question_type(&run.objective);
    let conservative_system_prompt = format!(
        "{}\n\n{}",
        business_system_prompt(&run.workflow_type, &model_settings.council_mode, question_type),
        guardrail_policy_prompt(&run.workflow_type, true, true)
    );
    let initial_budget = crate::context_manager::calculate_char_budget(
        model_settings.max_run_tokens,
        conservative_system_prompt.chars().count() + run.objective.chars().count() + 100
    );

    let max_web_chars = (initial_budget as f64 * 0.60) as usize;
    let max_local_chars = (initial_budget as f64 * 0.40) as usize;
    
    let workspace_text = workspace_context(&state.workspace);
    let graph_text = graph_context(&state);
    let prompt_prefix = format!("Startup workspace:\n{}\n{}", workspace_text, graph_text);

    let mut local_context = String::new();
    let rag = document_context_for_app(&app, &model_settings, &run.objective).await?;
    if !rag.is_empty() && crate::guardrails::is_safe_context(&rag) {
        push_trace(
            &mut run,
            "context",
            "Attached company file context",
            "completed",
            "Relevant saved company file sections were added to this work plan.",
        );
        local_context.push_str(&rag);
    } else {
        push_trace(
            &mut run,
            "context",
            "Checked company files",
            "skipped",
            "No saved company file sections matched this work request.",
        );
    }
    
    let memory = memory_context_from_store(&app, &model_settings, &run.objective).await?;
    if !memory.is_empty() && crate::guardrails::is_safe_context(&memory) {
        push_trace(
            &mut run,
            "context",
            "Attached business memory",
            "completed",
            "Relevant saved decisions and notes were added to this work plan.",
        );
        if !local_context.is_empty() {
            local_context.push_str("\n\n");
        }
        local_context.push_str(&memory);
    }
    
    let truncated_local = crate::context_manager::truncate_text_to_budget(&local_context, max_local_chars);

    let web_context = if web_required {
        let raw_web = research_context_for_business(
            &model_settings,
            &state.workspace,
            &run.objective,
            &run.workflow_type,
            10,
        )
        .await?;
        let safe_web = if crate::guardrails::is_safe_context(&raw_web) { raw_web } else { String::new() };
        let truncated_web = crate::context_manager::truncate_text_to_budget(&safe_web, max_web_chars);
        source_context_attached = !truncated_web.trim().is_empty();
        push_trace(
            &mut run,
            "context",
            "Attached web sources",
            "completed",
            "Live web sources were added because this work needs current outside facts.",
        );
        truncated_web
    } else {
        String::new()
    };
    
    let system_prompt = format!(
        "{}\n\n{}",
        business_system_prompt(&run.workflow_type, &model_settings.council_mode, question_type),
        guardrail_policy_prompt(&run.workflow_type, web_required, source_context_attached)
    );
    let prompt = format!(
        "{}\n{}\n\nObjective:\n{}\n\nWeb sources:\n{}",
        prompt_prefix, truncated_local, run.objective, web_context
    );
    push_trace(
        &mut run,
        "model",
        "Prepared work request",
        "completed",
        "The request was prepared with company profile, memory, files, and objective.",
    );
    let mut output = call_model(&model_settings, &system_prompt, &prompt, Some(0.2)).await;

    if let Ok(primary_output) = &output {
        push_trace(
            &mut run,
            "model",
            "Primary agent completed",
            "completed",
            "The configured model returned a workflow result.",
        );
        if !run.approval_required {
            push_trace(
                &mut run,
                "guardrail",
                "Review step checked",
                "skipped",
                "This request did not need an extra review step.",
            );
            return finalize_workflow(
                app,
                state,
                run,
                output,
                web_required,
                source_context_attached,
            );
        }

        let review_prompt = format!(
      "Review this business workflow result for risk, missing assumptions, factual gaps, and next actions. Keep it concise.\n\n{}",
      primary_output
    );
        push_trace(
            &mut run,
            "guardrail",
            "Ran extra review",
            "running",
            "A reviewer is checking risk, assumptions, and missing evidence.",
        );
        let review = call_model(
            &model_settings,
            "You are Co-Op's final reviewer. Return only decision risks, missing facts, or concrete next actions \
that are not already covered and are grounded in the company's actual profile and context. \
Do not mention teams, tools, services, or platforms that are not present in the company profile. \
Do not invent organizational structure. Do not restate the answer. \
If there are no material additions, answer exactly: No material additions.",
            &review_prompt,
            Some(0.6),
        )
        .await;
        if let Ok(review_output) = review {
            mark_last_trace(&mut run, "completed", "Extra review completed.");
            output = output.map(|primary| crate::chat::append_review_section(primary, "Review notes", review_output));
        } else {
            mark_last_trace(
                &mut run,
                "failed",
                "Extra review failed; the primary output will still be recorded.",
            );
        }
    }

    finalize_workflow(
        app,
        state,
        run,
        output,
        web_required,
        source_context_attached,
    )
}

fn finalize_workflow(
    app: AppHandle,
    mut state: crate::types::DesktopState,
    mut run: WorkflowRun,
    output: Result<String, String>,
    web_required: bool,
    source_context_attached: bool,
) -> Result<WorkflowRun, String> {
    match output {
        Ok(content) => {
            validate_model_output(&content, web_required, source_context_attached, false)?;
            run.status = "completed".to_string();
            run.output = Some(content);
            push_trace(
                &mut run,
                "checkpoint",
                "Recorded local workflow audit entry",
                "completed",
                "The completed workflow run was persisted to local state.",
            );
        }
        Err(error) => {
            run.status = "failed".to_string();
            push_trace(&mut run, "model", "Workflow failed", "failed", &error);
            run.error = Some(error);
        }
    }

    run.completed_at = Some(Utc::now().to_rfc3339());
    let memory_output = run.output.clone();
    state.workflow_runs.insert(0, run.clone());
    state.workflow_runs.truncate(MAX_STORED_WORKFLOW_RUNS);
    if let Some(content) = memory_output {
        let _ = remember_business_event(
            &app,
            &mut state,
            "plan",
            &run.objective,
            &content,
            "plans",
            0.84,
        );
    }
    save_state(&app, &state)?;
    Ok(run)
}

pub fn business_system_prompt(workflow_type: &str, council_mode: &str, question_type: QuestionType) -> String {
    let capability_boundary = "\
CAPABILITY BOUNDARY: You are a text-based business advisor running inside the Co-Op desktop application. \
You have NO terminal access, NO ability to execute commands, NO access to live servers, databases, dashboards, or deployment infrastructure. \
You cannot open browsers, run scripts, or perform any system action. When a user asks you to perform a system action:
1. Explicitly state that Co-Op cannot execute that action.
2. Provide the exact steps or commands the user should execute themselves.
3. Clearly label your output as \"Instructions for the owner\" — not actions you performed.
Never present instructions as if you executed them. Never say \"I checked the logs\" or \"I restarted the server.\"";

    let grounding_rule = "\
STRICT GROUNDING RULE: You may ONLY reference facts that appear in the attached workspace context, company files, business memory, or web sources. Specifically:
- Do NOT invent hosting providers, deployment platforms, service names, or infrastructure details.
- Do NOT invent team names, departments, or organizational structures.
- Do NOT invent tools, dashboards, monitoring services, or third-party integrations.
- Do NOT present inferred information as fact. If you must infer, prefix with \"Assuming...\" or \"If [condition], then...\"
- When information is missing, say exactly what is missing instead of filling the gap.";

    let format_instruction = match question_type {
        QuestionType::Factual => "\
Answer in 1-3 sentences. Do NOT add sections for Known Facts, Assumptions, Risks, Review Notes, or Next Actions. \
If an assumption is critical, state it inline.",
        QuestionType::ActionRequest => "\
State whether Co-Op can perform this action (it cannot execute commands). Then list the exact steps the owner should take. \
Do NOT generate Key Decisions, Risks, or Assumptions sections.",
        QuestionType::Planning => "\
Structure the answer with: Decision, Evidence Used, Assumptions, Action Plan, Risks, and Next Checkpoint. \
Mark external actions for human approval.",
        QuestionType::Brainstorming => "\
List 3-7 options with one-line tradeoffs each. Recommend one. Do NOT add Known Facts or Risk sections.",
        QuestionType::Comparison => "\
Create a comparison table or list. Classify each item. State evidence source. Do NOT add a planning framework.",
    };
    format!(
        "{capability_boundary}\n\n{grounding_rule}\n\nYou are Co-Op, a local-first business management and operations harness. Workflow type: {workflow_type}. \
Keep company data private, separate known facts from assumptions, and never fabricate company metrics. \
Use live web sources when they are attached. Do not make competitor, legal, investor, pricing, or market claims without source evidence. \
{format_instruction} \
When recommending external actions such as legal, payroll, payment, fundraising, security, or customer outreach, mark whether a human owner must approve before execution. \
Review policy is {council_mode}; use critique only when configured."
    )
}

pub fn workspace_context(profile: &crate::types::StartupProfile) -> String {
    let mut lines: Vec<String> = Vec::new();

    let founder_name = profile.founder_name.trim();
    let founder_role = profile.founder_role.trim();
    if !founder_name.is_empty() {
        if !founder_role.is_empty() {
            lines.push(format!("Founder: {founder_name} ({founder_role})"));
        } else {
            lines.push(format!("Founder: {founder_name}"));
        }
    }
    push_field(&mut lines, "Company", &profile.company_name);
    push_field(&mut lines, "Tagline", &profile.tagline);
    push_field(&mut lines, "Website", &profile.website);
    push_field(&mut lines, "Description", &profile.description);
    push_field(&mut lines, "Stage", &profile.stage);
    push_field(&mut lines, "Industry", &profile.industry);
    push_field(&mut lines, "Sector", &profile.sector);
    push_field(&mut lines, "Location", &profile.location);
    push_field(&mut lines, "Country", &profile.country);
    push_field(&mut lines, "City", &profile.city);
    push_field(&mut lines, "Operating regions", &profile.operating_regions);
    push_field(&mut lines, "Team size", &profile.team_size);
    if let Some(count) = profile.cofounder_count {
        lines.push(format!("Co-founder count: {count}"));
    }
    push_field(&mut lines, "Customers", &profile.target_customers);
    push_field(&mut lines, "Problem", &profile.problem);
    push_field(&mut lines, "Solution", &profile.solution);
    push_field(&mut lines, "Business model", &profile.business_model);
    push_field(&mut lines, "Revenue model", &profile.revenue_model);
    push_field(&mut lines, "Revenue status", &profile.is_revenue);
    if let Some(revenue) = profile.monthly_revenue {
        lines.push(format!("Monthly revenue: {}", format_money(revenue)));
    }
    push_field(&mut lines, "Funding stage", &profile.funding_stage);
    if let Some(raised) = profile.total_raised {
        lines.push(format!("Total raised: {}", format_money(raised)));
    }
    push_field(&mut lines, "Traction", &profile.traction);
    push_field(&mut lines, "Competitive advantage", &profile.competitive_advantage);
    push_field(&mut lines, "Goals", &profile.goals);

    if lines.is_empty() {
        return "No company profile fields are filled in yet.".to_string();
    }
    lines.join("\n")
}

fn is_default_value(label: &str, value: &str) -> bool {
    let trimmed = value.trim();
    matches!((label, trimmed), 
        ("Stage", "idea") | 
        ("Sector", "other") | 
        ("Revenue model", "not_yet") | 
        ("Revenue status", "pre_revenue") | 
        ("Funding stage", "bootstrapped")
    )
}

fn push_field(lines: &mut Vec<String>, label: &str, value: &str) {
    let trimmed = value.trim();
    if !trimmed.is_empty() && !is_default_value(label, value) {
        lines.push(format!("{label}: {trimmed}"));
    }
}

fn format_money(value: f64) -> String {
    if value.fract() == 0.0 {
        format!("{value:.0}")
    } else {
        format!("{value:.2}")
    }
}

pub fn should_run_review_gate(council_mode: &str, workflow_type: &str, objective: &str) -> bool {
    match council_mode {
        "off" => false,
        "review_only" | "full_council" => true,
        "high_risk_only" => {
            if matches!(workflow_type, "finance" | "legal" | "strategy") {
                return true;
            }
            let objective = objective.to_lowercase();
            [
                "contract",
                "lawsuit",
                "compliance",
                "payroll",
                "payment",
                "bank",
                "investor",
                "board",
                "acquisition",
                "termination",
                "security",
                "privacy",
            ]
            .iter()
            .any(|term| objective.contains(term))
        }
        _ => false,
    }
}

pub fn workflow_risk_level(workflow_type: &str, objective: &str) -> String {
    if matches!(workflow_type, "legal" | "finance") {
        return "high".to_string();
    }
    if workflow_type == "strategy" {
        return "elevated".to_string();
    }
    let objective = objective.to_lowercase();
    let high_risk = [
        "contract",
        "lawsuit",
        "compliance",
        "payroll",
        "payment",
        "bank",
        "investor",
        "board",
        "acquisition",
        "termination",
        "security",
        "privacy",
        "gdpr",
        "hipaa",
        "soc 2",
    ]
    .iter()
    .any(|term| objective.contains(term));
    if high_risk {
        "high".to_string()
    } else {
        "normal".to_string()
    }
}

fn push_trace(run: &mut WorkflowRun, stage: &str, label: &str, status: &str, detail: &str) {
    run.steps.push(label.to_string());
    run.trace.push(WorkflowTraceEvent {
        id: Uuid::new_v4().to_string(),
        stage: stage.to_string(),
        label: label.to_string(),
        status: status.to_string(),
        detail: detail.to_string(),
        created_at: Utc::now().to_rfc3339(),
    });
}

fn mark_last_trace(run: &mut WorkflowRun, status: &str, detail: &str) {
    if let Some(event) = run.trace.last_mut() {
        event.status = status.to_string();
        event.detail = detail.to_string();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn high_risk_council_mode_only_reviews_risky_workflows() {
        assert!(should_run_review_gate(
            "high_risk_only",
            "legal",
            "Review vendor contract"
        ));
        assert!(should_run_review_gate(
            "high_risk_only",
            "operations",
            "Approve payroll payment run"
        ));
        assert!(!should_run_review_gate(
            "high_risk_only",
            "operations",
            "Summarize weekly support tags"
        ));
    }

    #[test]
    fn workflow_risk_level_flags_sensitive_business_actions() {
        assert_eq!(workflow_risk_level("finance", "Forecast burn"), "high");
        assert_eq!(
            workflow_risk_level("operations", "Prepare GDPR security checklist"),
            "high"
        );
        assert_eq!(workflow_risk_level("strategy", "Plan launch"), "elevated");
        assert_eq!(
            workflow_risk_level("sales", "Summarize discovery calls"),
            "normal"
        );
    }

    #[test]
    fn trace_events_keep_legacy_steps_in_sync() {
        let mut run = WorkflowRun::default();

        push_trace(
            &mut run,
            "model",
            "Prepared harness prompt",
            "completed",
            "Prompt assembled.",
        );

        assert_eq!(run.steps, vec!["Prepared harness prompt".to_string()]);
        assert_eq!(run.trace[0].stage, "model");
        assert_eq!(run.trace[0].status, "completed");
    }

    #[test]
    fn workspace_context_omits_empty_fields() {
        let profile = crate::types::StartupProfile {
            company_name: "WatchDawg".to_string(),
            problem: "Website security scanning is manual and slow.".to_string(),
            solution: "Automated website security analysis.".to_string(),
            ..crate::types::StartupProfile::default()
        };
        let context = workspace_context(&profile);
        assert!(context.contains("Company: WatchDawg"));
        assert!(context.contains("Problem:"));
        assert!(context.contains("Solution:"));
        // Empty fields should not appear
        assert!(!context.contains("Location:"));
        assert!(!context.contains("Country:"));
        assert!(!context.contains("City:"));
        assert!(!context.contains("Founder:"));
        assert!(!context.contains("-"));
    }

    #[test]
    fn workspace_context_shows_message_for_empty_profile() {
        let profile = crate::types::StartupProfile {
            founder_role: String::new(),
            stage: String::new(),
            sector: String::new(),
            revenue_model: String::new(),
            is_revenue: String::new(),
            funding_stage: String::new(),
            ..crate::types::StartupProfile::default()
        };
        let context = workspace_context(&profile);
        assert!(context.contains("No company profile fields"));
    }
}
