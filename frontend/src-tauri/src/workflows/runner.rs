use chrono::Utc;
use tauri::AppHandle;
use uuid::Uuid;

use crate::constants::MAX_STORED_WORKFLOW_RUNS;
use crate::graph::graph_context;
use crate::guardrails::{
    classify_question_type, guardrail_policy_prompt, validate_business_input,
    validate_model_output,
};
use crate::memory::{memory_context_from_store, remember_business_event};
use crate::providers::call_model;
use crate::knowledge_store::document_context_for_app;
use crate::research::research_context_for_business;
use crate::storage::{load_or_create_state, require_usable_activation, save_state};
use crate::types::{WorkflowRequest, WorkflowRun, WorkflowTraceEvent};
use crate::validation::{validate_read_only, validate_workflow_request};

use super::context::workspace_context;
use super::policy::{business_system_prompt, should_run_review_gate, workflow_risk_level};

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
    
    if !crate::guardrails::message_has_business_context(&request.objective.to_lowercase())
        && crate::guardrails::resolve_off_topic(&model_settings, &request.objective).await
    {
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

    // Default web research on for workflows unless the caller explicitly disables it.
    let use_web = request.research_enabled.unwrap_or(true);
    let web_required = match guardrail_decision.web_intent {
        crate::guardrails::WebIntent::Yes => true,
        crate::guardrails::WebIntent::No => false,
        crate::guardrails::WebIntent::Uncertain if use_web => {
            crate::guardrails::resolve_web_intent(&model_settings, &run.objective).await
        }
        crate::guardrails::WebIntent::Uncertain => false,
    };
    let mut source_context_attached = false;

    if web_required && use_web {
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
    let safe_rag = crate::guardrails::sanitize_retrieved_context(&rag);
    if !safe_rag.is_empty() {
        push_trace(
            &mut run,
            "context",
            "Attached company file context",
            "completed",
            "Relevant saved company file sections were added to this work plan.",
        );
        local_context.push_str(&safe_rag);
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
    let safe_memory = crate::guardrails::sanitize_retrieved_context(&memory);
    if !safe_memory.is_empty() {
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
        local_context.push_str(&safe_memory);
    }

    let truncated_local =
        crate::context_manager::truncate_text_to_budget(&local_context, max_local_chars);

    let web_context = if web_required && use_web {
        match research_context_for_business(
            &model_settings,
            &state.workspace,
            &run.objective,
            &run.workflow_type,
            10,
        )
        .await
        {
            Ok(raw_web) => {
                let safe_web = crate::guardrails::sanitize_retrieved_context(&raw_web);
                let truncated_web =
                    crate::context_manager::truncate_text_to_budget(&safe_web, max_web_chars);
                source_context_attached = !truncated_web.trim().is_empty();
                if source_context_attached {
                    push_trace(
                        &mut run,
                        "context",
                        "Attached web sources",
                        "completed",
                        "Live web sources were added because this work needs current outside facts.",
                    );
                } else {
                    push_trace(
                        &mut run,
                        "context",
                        "Web sources unavailable",
                        "skipped",
                        "Web research returned no usable sources after safety filtering.",
                    );
                }
                truncated_web
            }
            Err(error) => {
                push_trace(
                    &mut run,
                    "context",
                    "Web research failed",
                    "skipped",
                    &format!("Web research failed: {error}"),
                );
                String::new()
            }
        }
    } else if web_required && !use_web {
        push_trace(
            &mut run,
            "context",
            "Web research disabled",
            "skipped",
            "This work needs live sources, but web research was turned off for the request.",
        );
        String::new()
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
            run.status = if run.approval_required {
                "awaiting_approval".to_string()
            } else {
                "completed".to_string()
            };
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

#[tauri::command]
pub async fn approve_workflow_run(app: AppHandle, run_id: String) -> Result<crate::types::DesktopState, String> {
    let mut state = load_or_create_state(&app)?;
    let run = state
        .workflow_runs
        .iter_mut()
        .find(|r| r.id == run_id)
        .ok_or_else(|| "Workflow run not found".to_string())?;
    if run.status != "awaiting_approval" {
        return Err(format!("Cannot approve a run with status '{}'", run.status));
    }
    run.status = "completed".to_string();
    run.completed_at = Some(Utc::now().to_rfc3339());
    save_state(&app, &state)?;
    Ok(state)
}

#[tauri::command]
pub async fn reject_workflow_run(app: AppHandle, run_id: String) -> Result<crate::types::DesktopState, String> {
    let mut state = load_or_create_state(&app)?;
    let run = state
        .workflow_runs
        .iter_mut()
        .find(|r| r.id == run_id)
        .ok_or_else(|| "Workflow run not found".to_string())?;
    if run.status != "awaiting_approval" {
        return Err(format!("Cannot reject a run with status '{}'", run.status));
    }
    run.status = "rejected".to_string();
    run.completed_at = Some(Utc::now().to_rfc3339());
    save_state(&app, &state)?;
    Ok(state)
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
    use crate::types::WorkflowRun;

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
