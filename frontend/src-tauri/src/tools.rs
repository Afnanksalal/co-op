use chrono::Utc;
use tauri::AppHandle;
use uuid::Uuid;

use crate::providers::call_model;
use crate::research::run_research_query;
use crate::storage::{load_or_create_state, save_state, to_response};
use crate::types::{
    Alert, AlertRequest, BusinessToolResult, CapTableRequest, CapTableScenario,
    DesktopStateResponse, PitchDeckAnalysis, PitchDeckRequest, ResearchRequest,
};
use crate::validation::{validate_cap_table, validate_model_settings, validate_objective};
use crate::workflows::workspace_context;

#[tauri::command]
pub fn save_alert(app: AppHandle, request: AlertRequest) -> Result<DesktopStateResponse, String> {
    validate_objective("Alert query", &request.query)?;
    if request.name.trim().len() < 2 {
        return Err("Alert name is required".to_string());
    }
    if !matches!(request.cadence.as_str(), "daily" | "weekly" | "manual") {
        return Err("Alert cadence must be daily, weekly, or manual".to_string());
    }
    let mut state = load_or_create_state(&app)?;
    state.alerts.insert(
        0,
        Alert {
            id: Uuid::new_v4().to_string(),
            name: request.name.trim().to_string(),
            query: request.query.trim().to_string(),
            cadence: request.cadence,
            enabled: request.enabled,
            last_result: None,
            created_at: Utc::now().to_rfc3339(),
        },
    );
    save_state(&app, &state)?;
    Ok(to_response(state))
}

#[tauri::command]
pub async fn run_alert_now(
    app: AppHandle,
    alert_id: String,
) -> Result<DesktopStateResponse, String> {
    let state = load_or_create_state(&app)?;
    let alert = state
        .alerts
        .iter()
        .find(|alert| alert.id == alert_id)
        .cloned()
        .ok_or_else(|| "Alert not found".to_string())?;
    let research = run_research_query(
        app.clone(),
        ResearchRequest {
            query: alert.query.clone(),
            save_to_rag: true,
        },
    )
    .await?;
    let mut state = load_or_create_state(&app)?;
    if let Some(stored) = state.alerts.iter_mut().find(|item| item.id == alert_id) {
        stored.last_result = Some(research.summary);
    }
    save_state(&app, &state)?;
    Ok(to_response(state))
}

#[tauri::command]
pub async fn analyze_pitch_deck(
    app: AppHandle,
    request: PitchDeckRequest,
) -> Result<DesktopStateResponse, String> {
    if request.title.trim().len() < 2 {
        return Err("Pitch deck title is required".to_string());
    }
    validate_objective("Pitch deck notes", &request.deck_notes)?;
    let mut state = load_or_create_state(&app)?;
    let mut settings = state.model_settings.clone();
    validate_model_settings(&mut settings)?;
    state.model_settings = settings.clone();
    let prompt = format!(
    "Startup:\n{}\n\nPitch deck notes:\n{}\n\nScore this deck from 0-100 and provide investor-grade feedback by slide/topic.",
    workspace_context(&state.workspace),
    request.deck_notes
  );
    let analysis = call_model(
        &settings,
        "You are a pitch deck reviewer for venture-backed startups.",
        &prompt,
    )
    .await?;
    let score = derive_score(&analysis);
    state.pitch_decks.insert(
        0,
        PitchDeckAnalysis {
            id: Uuid::new_v4().to_string(),
            title: request.title.trim().to_string(),
            deck_notes: request.deck_notes.trim().to_string(),
            score,
            analysis,
            created_at: Utc::now().to_rfc3339(),
        },
    );
    save_state(&app, &state)?;
    Ok(to_response(state))
}

#[tauri::command]
pub fn save_cap_table(
    app: AppHandle,
    request: CapTableRequest,
) -> Result<DesktopStateResponse, String> {
    validate_cap_table(&request)?;
    let mut state = load_or_create_state(&app)?;
    state.cap_tables.insert(
        0,
        CapTableScenario {
            id: Uuid::new_v4().to_string(),
            name: request.name.trim().to_string(),
            founder_ownership_percent: request.founder_ownership_percent,
            investor_ownership_percent: request.investor_ownership_percent,
            option_pool_percent: request.option_pool_percent,
            post_money_valuation: request.post_money_valuation,
            notes: request.notes,
            created_at: Utc::now().to_rfc3339(),
        },
    );
    save_state(&app, &state)?;
    Ok(to_response(state))
}

#[tauri::command]
pub fn run_calculator(tool_type: String, values: Vec<f64>) -> Result<BusinessToolResult, String> {
    validate_finite_values(&values)?;
    let output = match tool_type.as_str() {
        "runway" => {
            if values.len() < 2 || values[1] <= 0.0 {
                return Err(
                    "Runway calculator expects cash balance and monthly net burn".to_string(),
                );
            }
            format!(
                "Runway: {:.1} months\nCash: {:.2}\nMonthly burn: {:.2}",
                values[0] / values[1],
                values[0],
                values[1]
            )
        }
        "burn_rate" => {
            if values.len() < 2 {
                return Err(
                    "Burn-rate calculator expects starting cash and ending cash".to_string()
                );
            }
            format!("Net burn over period: {:.2}", values[0] - values[1])
        }
        "valuation" => {
            if values.len() < 2 {
                return Err("Valuation calculator expects revenue and multiple".to_string());
            }
            format!("Indicative valuation: {:.2}", values[0] * values[1])
        }
        "unit_economics" => {
            if values.len() < 2 || values[0] <= 0.0 || values[1] <= 0.0 {
                return Err("Unit economics calculator expects LTV and CAC".to_string());
            }
            format!("LTV:CAC ratio: {:.2}", values[0] / values[1])
        }
        _ => return Err("Unsupported calculator".to_string()),
    };
    Ok(BusinessToolResult {
        id: Uuid::new_v4().to_string(),
        tool_type,
        title: "Calculator result".to_string(),
        output,
        created_at: Utc::now().to_rfc3339(),
    })
}

fn validate_finite_values(values: &[f64]) -> Result<(), String> {
    if values.len() > 25 {
        return Err("Calculator accepts at most 25 values".to_string());
    }
    if values.iter().any(|value| !value.is_finite()) {
        return Err("Calculator values must be finite numbers".to_string());
    }
    Ok(())
}

fn derive_score(analysis: &str) -> u8 {
    for token in analysis.split(|char: char| !char.is_ascii_digit()) {
        if let Ok(value) = token.parse::<u8>() {
            if value <= 100 {
                return value;
            }
        }
    }
    70
}
