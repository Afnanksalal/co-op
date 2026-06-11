use chrono::Utc;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use crate::constants::{APP_VERSION_FALLBACK, DEFAULT_CLOUD_URL};
use crate::providers::http_client;
use crate::secrets::{delete_activation_token, persist_activation_token};
use crate::security::{local_device_name, machine_fingerprint};
use crate::storage::{load_or_create_state, save_state, to_response};
use crate::types::{ActivateRequest, ActivationState, DesktopStateResponse};
use crate::validation::sanitize_http_base_url;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct CloudActivateRequest<'a> {
    license_key: &'a str,
    machine_fingerprint: &'a str,
    install_id: &'a str,
    device_name: Option<&'a str>,
    app_version: &'a str,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct CloudHeartbeatRequest<'a> {
    activation_token: &'a str,
    machine_fingerprint: &'a str,
    app_version: &'a str,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ApiResponse<T> {
    success: bool,
    data: Option<T>,
    message: Option<String>,
    error: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ActivationResponse {
    activation_token: String,
    entitlement: EntitlementResponse,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct EntitlementResponse {
    customer_email: String,
    plan: String,
    status: String,
    expires_at: Option<String>,
    features: Vec<String>,
    offline_grace_ends_at: String,
}

#[tauri::command]
pub fn get_machine_fingerprint() -> String {
    machine_fingerprint()
}

#[tauri::command]
pub fn get_activation_state(app: AppHandle) -> Result<DesktopStateResponse, String> {
    let state = load_or_create_state(&app)?;
    Ok(to_response(state))
}

#[tauri::command]
pub async fn activate_license(
    app: AppHandle,
    request: ActivateRequest,
) -> Result<DesktopStateResponse, String> {
    let mut state = load_or_create_state(&app)?;
    let cloud_base_url =
        sanitize_http_base_url(DEFAULT_CLOUD_URL, true, true, "cloud license URL")?;
    let license_key = request.license_key.trim().to_string();
    if license_key.is_empty() {
        return Err("License key is required".to_string());
    }
    let fingerprint = machine_fingerprint();
    let app_version = app.package_info().version.to_string();
    let app_version = if app_version.trim().is_empty() {
        APP_VERSION_FALLBACK.to_string()
    } else {
        app_version
    };
    let device_name = local_device_name();
    let payload = CloudActivateRequest {
        license_key: &license_key,
        machine_fingerprint: &fingerprint,
        install_id: &state.install_id,
        device_name: Some(&device_name),
        app_version: &app_version,
    };

    let response = http_client()?
        .post(format!("{}/api/v1/licenses/activate", cloud_base_url))
        .json(&payload)
        .send()
        .await
        .map_err(|error| format!("Activation request failed: {error}"))?;

    let status = response.status();
    let body = response
        .json::<ApiResponse<ActivationResponse>>()
        .await
        .map_err(|error| format!("Activation response was not valid JSON: {error}"))?;

    if !status.is_success() || !body.success {
        return Err(body
            .error
            .or(body.message)
            .unwrap_or_else(|| "License activation failed".to_string()));
    }

    let data = body
        .data
        .ok_or_else(|| "License activation response was empty".to_string())?;
    let now = Utc::now().to_rfc3339();
    persist_activation_token(&state.install_id, &data.activation_token)?;
    state.activation = Some(ActivationState {
        activation_token: data.activation_token,
        customer_email: data.entitlement.customer_email,
        plan: data.entitlement.plan,
        status: data.entitlement.status,
        expires_at: data.entitlement.expires_at,
        features: data.entitlement.features,
        offline_grace_ends_at: data.entitlement.offline_grace_ends_at,
        last_heartbeat_at: now,
        machine_fingerprint: fingerprint,
        cloud_base_url,
    });

    save_state(&app, &state)?;
    Ok(to_response(state))
}

#[tauri::command]
pub async fn heartbeat_license(app: AppHandle) -> Result<DesktopStateResponse, String> {
    let mut state = load_or_create_state(&app)?;
    let activation = state
        .activation
        .clone()
        .ok_or_else(|| "No local license activation found".to_string())?;

    let app_version = app.package_info().version.to_string();
    let payload = CloudHeartbeatRequest {
        activation_token: &activation.activation_token,
        machine_fingerprint: &activation.machine_fingerprint,
        app_version: if app_version.trim().is_empty() {
            APP_VERSION_FALLBACK
        } else {
            &app_version
        },
    };
    let cloud_base_url =
        sanitize_http_base_url(&activation.cloud_base_url, true, true, "cloud license URL")?;

    let response = http_client()?
        .post(format!("{}/api/v1/licenses/heartbeat", cloud_base_url))
        .json(&payload)
        .send()
        .await
        .map_err(|error| format!("Heartbeat request failed: {error}"))?;

    let status = response.status();
    let body = response
        .json::<ApiResponse<EntitlementResponse>>()
        .await
        .map_err(|error| format!("Heartbeat response was not valid JSON: {error}"))?;

    if !status.is_success() || !body.success {
        return Err(body
            .error
            .or(body.message)
            .unwrap_or_else(|| "License heartbeat failed".to_string()));
    }

    let entitlement = body
        .data
        .ok_or_else(|| "License heartbeat response was empty".to_string())?;
    state.activation = Some(ActivationState {
        customer_email: entitlement.customer_email,
        plan: entitlement.plan,
        status: entitlement.status,
        expires_at: entitlement.expires_at,
        features: entitlement.features,
        offline_grace_ends_at: entitlement.offline_grace_ends_at,
        last_heartbeat_at: Utc::now().to_rfc3339(),
        cloud_base_url,
        ..activation
    });

    save_state(&app, &state)?;
    Ok(to_response(state))
}

#[tauri::command]
pub fn clear_activation(app: AppHandle) -> Result<DesktopStateResponse, String> {
    let mut state = load_or_create_state(&app)?;
    delete_activation_token(&state.install_id);
    state.activation = None;
    save_state(&app, &state)?;
    Ok(to_response(state))
}
