use chrono::Utc;
use tauri::AppHandle;
use uuid::Uuid;

use crate::constants::MAX_STORED_WORKFLOW_RUNS;
use crate::graph::graph_context;
use crate::guardrails::{guardrail_policy_prompt, validate_business_input, validate_model_output};
use crate::memory::{memory_context_from_store, remember_business_event};
use crate::providers::call_model;
use crate::rag::document_context_from_store;
use crate::research::{requires_live_web_research, research_context_for_business};
use crate::storage::{load_or_create_state, require_usable_activation, save_state};
use crate::types::{WorkflowRequest, WorkflowRun, WorkflowTraceEvent};
use crate::validation::{validate_model_settings, validate_workflow_request};

#[tauri::command]
pub async fn run_business_workflow(
    app: AppHandle,
    request: WorkflowRequest,
) -> Result<WorkflowRun, String> {
    let mut state = load_or_create_state(&app)?;
    validate_workflow_request(&request)?;
    let workflow_type = request.workflow_type.trim().to_lowercase();
    let objective = request.objective.trim().to_string();
    let guardrail_decision = validate_business_input("Plan", &workflow_type, &objective)?;
    require_usable_activation(&state)?;

    let mut model_settings = state.model_settings.clone();
    validate_model_settings(&mut model_settings)?;
    state.model_settings = model_settings.clone();

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

    let rag = document_context_from_store(&app, &run.objective)?;
    if !rag.is_empty() {
        push_trace(
            &mut run,
            "context",
            "Attached company file context",
            "completed",
            "Relevant saved company file sections were added to this work plan.",
        );
    } else {
        push_trace(
            &mut run,
            "context",
            "Checked company files",
            "skipped",
            "No saved company file sections matched this work request.",
        );
    }
    let memory = memory_context_from_store(&app, &run.objective)?;
    if !memory.is_empty() {
        push_trace(
            &mut run,
            "context",
            "Attached business memory",
            "completed",
            "Relevant saved decisions and notes were added to this work plan.",
        );
    }
    let web_required = guardrail_decision.web_required
        || requires_live_web_research(&run.workflow_type, &run.objective);
    let mut source_context_attached = false;
    let web_context = if web_required {
        let context = research_context_for_business(
            &model_settings,
            &state.workspace,
            &run.objective,
            &run.workflow_type,
        )
        .await?;
        source_context_attached = !context.trim().is_empty();
        push_trace(
            &mut run,
            "context",
            "Attached web sources",
            "completed",
            "Live web sources were added because this work needs current outside facts.",
        );
        context
    } else {
        String::new()
    };
    let system_prompt = format!(
        "{}\n\n{}",
        business_system_prompt(&run.workflow_type, &model_settings.council_mode),
        guardrail_policy_prompt(&run.workflow_type, web_required, source_context_attached)
    );
    let prompt = format!(
        "Startup workspace:\n{}\n{}\n{}\n\nObjective:\n{}\n{}\n\nWeb sources:\n{}",
        workspace_context(&state.workspace),
        graph_context(&state),
        memory,
        run.objective,
        rag,
        web_context
    );
    push_trace(
        &mut run,
        "model",
        "Prepared work request",
        "completed",
        "The request was prepared with company profile, memory, files, and objective.",
    );
    let mut output = call_model(&model_settings, &system_prompt, &prompt).await;

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
            "You are a strict business risk reviewer.",
            &review_prompt,
        )
        .await;
        if let Ok(review_output) = review {
            mark_last_trace(&mut run, "completed", "Extra review completed.");
            output = output.map(|primary| format!("{primary}\n\nReview notes:\n{review_output}"));
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
            validate_model_output(&content, web_required, source_context_attached)?;
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

pub fn business_system_prompt(workflow_type: &str, council_mode: &str) -> String {
    format!(
        "You are Co-Op, a local-first business management and operations harness. Workflow type: {workflow_type}. \
Keep company data private, separate known facts from assumptions, and never fabricate company metrics. \
Use live web sources when they are attached. Do not make competitor, legal, investor, pricing, or market claims without source evidence. \
Use this production response contract: Decision, Evidence Used, Assumptions, Action Plan, Owners, Risks, Human Approval Required, Next Checkpoint. \
When recommending external actions such as legal, payroll, payment, fundraising, security, or customer outreach, mark whether a human owner must approve before execution. \
Review policy is {council_mode}; use critique only when configured."
    )
}

pub fn workspace_context(profile: &crate::types::StartupProfile) -> String {
    format!(
    "Founder: {} ({})\nCompany: {}\nTagline: {}\nWebsite: {}\nDescription: {}\nStage: {}\nIndustry: {}\nSector: {}\nLocation: {}\nCountry: {}\nCity: {}\nOperating regions: {}\nTeam size: {}\nCo-founder count: {}\nCustomers: {}\nProblem: {}\nSolution: {}\nBusiness model: {}\nRevenue model: {}\nRevenue status: {}\nMonthly revenue: {}\nFunding stage: {}\nTotal raised: {}\nTraction: {}\nCompetitive advantage: {}\nGoals: {}",
    empty_dash(&profile.founder_name),
    empty_dash(&profile.founder_role),
    empty_dash(&profile.company_name),
    empty_dash(&profile.tagline),
    empty_dash(&profile.website),
    empty_dash(&profile.description),
    empty_dash(&profile.stage),
    empty_dash(&profile.industry),
    empty_dash(&profile.sector),
    empty_dash(&profile.location),
    empty_dash(&profile.country),
    empty_dash(&profile.city),
    empty_dash(&profile.operating_regions),
    empty_dash(&profile.team_size),
    profile.cofounder_count.map(|value| value.to_string()).unwrap_or_else(|| "-".to_string()),
    empty_dash(&profile.target_customers),
    empty_dash(&profile.problem),
    empty_dash(&profile.solution),
    empty_dash(&profile.business_model),
    empty_dash(&profile.revenue_model),
    empty_dash(&profile.is_revenue),
    profile.monthly_revenue.map(format_money).unwrap_or_else(|| "-".to_string()),
    empty_dash(&profile.funding_stage),
    profile.total_raised.map(format_money).unwrap_or_else(|| "-".to_string()),
    empty_dash(&profile.traction),
    empty_dash(&profile.competitive_advantage),
    empty_dash(&profile.goals),
  )
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

fn empty_dash(value: &str) -> &str {
    if value.trim().is_empty() {
        "-"
    } else {
        value.trim()
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
}
