use chrono::Utc;
use tauri::AppHandle;
use uuid::Uuid;

use crate::constants::MAX_STORED_WORKFLOW_RUNS;
use crate::providers::call_model;
use crate::rag::document_context;
use crate::storage::{is_activation_usable, load_or_create_state, save_state};
use crate::types::{WorkflowRequest, WorkflowRun};
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
    let activation = state
        .activation
        .as_ref()
        .ok_or_else(|| "Activate Co-Op Desktop before running business workflows".to_string())?;

    if !is_activation_usable(activation, Utc::now()) {
        return Err(
            "License heartbeat grace has expired. Refresh the license before running workflows."
                .to_string(),
        );
    }

    let mut model_settings = state.model_settings.clone();
    validate_model_settings(&mut model_settings)?;
    state.model_settings = model_settings.clone();

    let created_at = Utc::now().to_rfc3339();
    let mut run = WorkflowRun {
        id: Uuid::new_v4().to_string(),
        workflow_type,
        objective,
        provider: model_settings.provider.clone(),
        status: "running".to_string(),
        steps: vec![
            "Loaded local entitlement".to_string(),
            "Loaded local startup workspace".to_string(),
            "Loaded provider routing policy".to_string(),
            "Prepared business workflow prompt".to_string(),
        ],
        output: None,
        error: None,
        created_at,
        completed_at: None,
    };

    let rag = document_context(&state.documents, &run.objective);
    if !rag.is_empty() {
        run.steps
            .push("Attached local vector RAG context".to_string());
    }
    let system_prompt = business_system_prompt(&run.workflow_type, &model_settings.council_mode);
    let prompt = format!(
        "Startup workspace:\n{}\n\nObjective:\n{}\n{}",
        workspace_context(&state.workspace),
        run.objective,
        rag
    );
    let mut output = call_model(&model_settings, &system_prompt, &prompt).await;

    if output.is_ok()
        && should_run_review_gate(
            &model_settings.council_mode,
            &run.workflow_type,
            &run.objective,
        )
    {
        let review_prompt = format!(
      "Review this business workflow result for risk, missing assumptions, factual gaps, and next actions. Keep it concise.\n\n{}",
      output.as_ref().unwrap()
    );
        run.steps.push("Ran council review gate".to_string());
        let review = call_model(
            &model_settings,
            "You are a strict business risk reviewer.",
            &review_prompt,
        )
        .await;
        if let Ok(review_output) = review {
            output = output.map(|primary| format!("{primary}\n\nCouncil review:\n{review_output}"));
        }
    }

    match output {
        Ok(content) => {
            run.status = "completed".to_string();
            run.output = Some(content);
            run.steps
                .push("Recorded local workflow audit entry".to_string());
        }
        Err(error) => {
            run.status = "failed".to_string();
            run.error = Some(error);
        }
    }

    run.completed_at = Some(Utc::now().to_rfc3339());
    state.workflow_runs.insert(0, run.clone());
    state.workflow_runs.truncate(MAX_STORED_WORKFLOW_RUNS);
    save_state(&app, &state)?;
    Ok(run)
}

pub fn business_system_prompt(workflow_type: &str, council_mode: &str) -> String {
    format!(
    "You are Co-Op, a local-first business management and operations harness. Workflow type: {workflow_type}. \
Keep company data private, ask for missing assumptions, produce concrete actions, and mark risky decisions for human approval. \
Council mode is {council_mode}; use critique only when configured."
  )
}

pub fn workspace_context(profile: &crate::types::StartupProfile) -> String {
    format!(
    "Company: {}\nWebsite: {}\nStage: {}\nIndustry: {}\nLocation: {}\nTeam size: {}\nCustomers: {}\nProblem: {}\nSolution: {}\nBusiness model: {}\nTraction: {}\nGoals: {}",
    empty_dash(&profile.company_name),
    empty_dash(&profile.website),
    empty_dash(&profile.stage),
    empty_dash(&profile.industry),
    empty_dash(&profile.location),
    empty_dash(&profile.team_size),
    empty_dash(&profile.target_customers),
    empty_dash(&profile.problem),
    empty_dash(&profile.solution),
    empty_dash(&profile.business_model),
    empty_dash(&profile.traction),
    empty_dash(&profile.goals),
  )
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
}
