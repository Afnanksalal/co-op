use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{env, fs, path::PathBuf, time::Duration as StdDuration};
use tauri::{AppHandle, Manager};
use uuid::Uuid;

const STATE_FILE: &str = "state.json";
const DEFAULT_CLOUD_URL: &str = "https://api.co-op.software";
const DEFAULT_OLLAMA_URL: &str = "http://localhost:11434";
const REQUEST_TIMEOUT_SECS: u64 = 30;
const MIN_RUN_TOKENS: u32 = 256;
const MAX_RUN_TOKENS: u32 = 64000;
const MAX_MODEL_NAME_LENGTH: usize = 128;
const MAX_OBJECTIVE_LENGTH: usize = 4000;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivationState {
  pub activation_token: String,
  pub customer_email: String,
  pub plan: String,
  pub status: String,
  pub expires_at: Option<String>,
  pub features: Vec<String>,
  pub offline_grace_ends_at: String,
  pub last_heartbeat_at: String,
  pub machine_fingerprint: String,
  pub cloud_base_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelSettings {
  pub provider: String,
  pub ollama_base_url: String,
  pub ollama_model: String,
  pub openai_base_url: String,
  pub openai_api_key: Option<String>,
  pub openai_model: String,
  pub council_mode: String,
  pub max_run_tokens: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivationStateView {
  pub customer_email: String,
  pub plan: String,
  pub status: String,
  pub expires_at: Option<String>,
  pub features: Vec<String>,
  pub offline_grace_ends_at: String,
  pub last_heartbeat_at: String,
  pub cloud_base_url: String,
}

impl From<&ActivationState> for ActivationStateView {
  fn from(value: &ActivationState) -> Self {
    Self {
      customer_email: value.customer_email.clone(),
      plan: value.plan.clone(),
      status: value.status.clone(),
      expires_at: value.expires_at.clone(),
      features: value.features.clone(),
      offline_grace_ends_at: value.offline_grace_ends_at.clone(),
      last_heartbeat_at: value.last_heartbeat_at.clone(),
      cloud_base_url: value.cloud_base_url.clone(),
    }
  }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelSettingsView {
  pub provider: String,
  pub ollama_base_url: String,
  pub ollama_model: String,
  pub openai_base_url: String,
  pub openai_model: String,
  pub openai_api_key_saved: bool,
  pub council_mode: String,
  pub max_run_tokens: u32,
}

impl From<&ModelSettings> for ModelSettingsView {
  fn from(value: &ModelSettings) -> Self {
    Self {
      provider: value.provider.clone(),
      ollama_base_url: value.ollama_base_url.clone(),
      ollama_model: value.ollama_model.clone(),
      openai_base_url: value.openai_base_url.clone(),
      openai_model: value.openai_model.clone(),
      openai_api_key_saved: value
        .openai_api_key
        .as_deref()
        .map(|api_key| !api_key.trim().is_empty())
        .unwrap_or(false),
      council_mode: value.council_mode.clone(),
      max_run_tokens: value.max_run_tokens,
    }
  }
}

impl Default for ModelSettings {
  fn default() -> Self {
    Self {
      provider: "ollama".to_string(),
      ollama_base_url: DEFAULT_OLLAMA_URL.to_string(),
      ollama_model: "llama3.1".to_string(),
      openai_base_url: "https://api.openai.com/v1".to_string(),
      openai_api_key: None,
      openai_model: "gpt-4.1-mini".to_string(),
      council_mode: "review_only".to_string(),
      max_run_tokens: 12000,
    }
  }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopState {
  #[serde(default)]
  pub install_id: String,
  #[serde(default)]
  pub activation: Option<ActivationState>,
  #[serde(default)]
  pub model_settings: ModelSettings,
  #[serde(default)]
  pub workflow_runs: Vec<WorkflowRun>,
}

impl Default for DesktopState {
  fn default() -> Self {
    Self {
      install_id: Uuid::new_v4().to_string(),
      activation: None,
      model_settings: ModelSettings::default(),
      workflow_runs: Vec::new(),
    }
  }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopStateResponse {
  pub install_id: String,
  pub activation: Option<ActivationStateView>,
  pub model_settings: ModelSettingsView,
  pub workflow_runs: Vec<WorkflowRun>,
  pub is_usable: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowRun {
  pub id: String,
  pub workflow_type: String,
  pub objective: String,
  pub provider: String,
  pub status: String,
  pub steps: Vec<String>,
  pub output: Option<String>,
  pub error: Option<String>,
  pub created_at: String,
  pub completed_at: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowRequest {
  pub workflow_type: String,
  pub objective: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivateRequest {
  pub license_key: String,
}

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

#[derive(Debug, Clone, Serialize)]
struct ChatMessage<'a> {
  role: &'a str,
  content: &'a str,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct OllamaChatRequest<'a> {
  model: &'a str,
  stream: bool,
  messages: Vec<ChatMessage<'a>>,
  options: OllamaOptions,
}

#[derive(Debug, Clone, Serialize)]
struct OllamaOptions {
  num_predict: i32,
}

#[derive(Debug, Clone, Deserialize)]
struct OllamaChatResponse {
  message: OllamaMessage,
}

#[derive(Debug, Clone, Deserialize)]
struct OllamaMessage {
  content: String,
}

#[derive(Debug, Clone, Serialize)]
struct OpenAiChatRequest<'a> {
  model: &'a str,
  messages: Vec<ChatMessage<'a>>,
  temperature: f32,
  max_tokens: u32,
}

#[derive(Debug, Clone, Deserialize)]
struct OpenAiChatResponse {
  choices: Vec<OpenAiChoice>,
}

#[derive(Debug, Clone, Deserialize)]
struct OpenAiChoice {
  message: OpenAiMessage,
}

#[derive(Debug, Clone, Deserialize)]
struct OpenAiMessage {
  content: String,
}

#[tauri::command]
fn get_machine_fingerprint() -> String {
  machine_fingerprint()
}

#[tauri::command]
fn get_activation_state(app: AppHandle) -> Result<DesktopStateResponse, String> {
  let state = load_or_create_state(&app)?;
  Ok(to_response(state))
}

#[tauri::command]
async fn activate_license(app: AppHandle, request: ActivateRequest) -> Result<DesktopStateResponse, String> {
  let mut state = load_or_create_state(&app)?;
  let cloud_base_url = sanitize_http_base_url(DEFAULT_CLOUD_URL, true, true, "cloud license URL")?;
  let license_key = request.license_key.trim().to_string();
  if license_key.is_empty() {
    return Err("License key is required".to_string());
  }
  let fingerprint = machine_fingerprint();
  let app_version = app.package_info().version.to_string();
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
    return Err(body.error.or(body.message).unwrap_or_else(|| "License activation failed".to_string()));
  }

  let data = body.data.ok_or_else(|| "License activation response was empty".to_string())?;
  let now = Utc::now().to_rfc3339();
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
async fn heartbeat_license(app: AppHandle) -> Result<DesktopStateResponse, String> {
  let mut state = load_or_create_state(&app)?;
  let activation = state
    .activation
    .clone()
    .ok_or_else(|| "No local license activation found".to_string())?;

  let app_version = app.package_info().version.to_string();
  let payload = CloudHeartbeatRequest {
    activation_token: &activation.activation_token,
    machine_fingerprint: &activation.machine_fingerprint,
    app_version: &app_version,
  };
  let cloud_base_url = sanitize_http_base_url(&activation.cloud_base_url, true, true, "cloud license URL")?;

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
    return Err(body.error.or(body.message).unwrap_or_else(|| "License heartbeat failed".to_string()));
  }

  let entitlement = body.data.ok_or_else(|| "License heartbeat response was empty".to_string())?;
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
fn clear_activation(app: AppHandle) -> Result<DesktopStateResponse, String> {
  let mut state = load_or_create_state(&app)?;
  state.activation = None;
  save_state(&app, &state)?;
  Ok(to_response(state))
}

#[tauri::command]
fn save_model_settings(app: AppHandle, mut settings: ModelSettings) -> Result<DesktopStateResponse, String> {
  let mut state = load_or_create_state(&app)?;
  settings.openai_api_key = match settings.openai_api_key {
    Some(api_key) if api_key.trim().is_empty() => None,
    Some(api_key) => Some(api_key.trim().to_string()),
    None => state.model_settings.openai_api_key.clone(),
  };
  validate_model_settings(&mut settings)?;
  state.model_settings = settings;
  save_state(&app, &state)?;
  Ok(to_response(state))
}

#[tauri::command]
async fn run_business_workflow(app: AppHandle, request: WorkflowRequest) -> Result<WorkflowRun, String> {
  let mut state = load_or_create_state(&app)?;
  validate_workflow_request(&request)?;
  let workflow_type = request.workflow_type.trim().to_lowercase();
  let objective = request.objective.trim().to_string();
  let activation = state
    .activation
    .as_ref()
    .ok_or_else(|| "Activate Co-Op Desktop before running business workflows".to_string())?;

  if !is_activation_usable(activation, Utc::now()) {
    return Err("License heartbeat grace has expired. Refresh the license before running workflows.".to_string());
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
      "Loaded provider routing policy".to_string(),
      "Prepared business workflow prompt".to_string(),
    ],
    output: None,
    error: None,
    created_at,
    completed_at: None,
  };

  let system_prompt = business_system_prompt(&run.workflow_type, &model_settings.council_mode);
  let mut output = call_model(&model_settings, &system_prompt, &run.objective).await;

  if output.is_ok() && should_run_review_gate(&model_settings.council_mode, &run.workflow_type, &run.objective) {
    let review_prompt = format!(
      "Review the following business workflow result for risk, missing assumptions, and next actions. Keep it concise.\n\n{}",
      output.as_ref().unwrap()
    );
    run.steps.push("Ran gated council-style review".to_string());
    let review = call_model(&model_settings, "You are a strict business risk reviewer.", &review_prompt).await;
    if let Ok(review_output) = review {
      output = output.map(|primary| format!("{primary}\n\nReview gate:\n{review_output}"));
    }
  }

  match output {
    Ok(content) => {
      run.status = "completed".to_string();
      run.output = Some(content);
      run.steps.push("Recorded local workflow audit entry".to_string());
    }
    Err(error) => {
      run.status = "failed".to_string();
      run.error = Some(error);
    }
  }

  run.completed_at = Some(Utc::now().to_rfc3339());
  state.workflow_runs.insert(0, run.clone());
  state.workflow_runs.truncate(50);
  save_state(&app, &state)?;
  Ok(run)
}

fn to_response(state: DesktopState) -> DesktopStateResponse {
  let is_usable = state
    .activation
    .as_ref()
    .map(|activation| is_activation_usable(activation, Utc::now()))
    .unwrap_or(false);

  DesktopStateResponse {
    install_id: state.install_id,
    activation: state.activation.as_ref().map(ActivationStateView::from),
    model_settings: ModelSettingsView::from(&state.model_settings),
    workflow_runs: state.workflow_runs,
    is_usable,
  }
}

fn is_activation_usable(activation: &ActivationState, now: DateTime<Utc>) -> bool {
  if activation.status != "active" {
    return false;
  }

  if let Some(expires_at) = &activation.expires_at {
    if parse_rfc3339(expires_at).map(|expires| expires <= now).unwrap_or(true) {
      return false;
    }
  }

  parse_rfc3339(&activation.offline_grace_ends_at)
    .map(|grace_ends| grace_ends > now)
    .unwrap_or(false)
}

fn parse_rfc3339(value: &str) -> Option<DateTime<Utc>> {
  DateTime::parse_from_rfc3339(value).ok().map(|date| date.with_timezone(&Utc))
}

fn load_or_create_state(app: &AppHandle) -> Result<DesktopState, String> {
  let path = state_path(app)?;
  if !path.exists() {
    let state = DesktopState::default();
    save_state(app, &state)?;
    return Ok(state);
  }

  let content = fs::read_to_string(&path).map_err(|error| format!("Failed to read local state: {error}"))?;
  serde_json::from_str::<DesktopState>(&content).map_err(|error| format!("Local state is corrupt: {error}"))
}

fn save_state(app: &AppHandle, state: &DesktopState) -> Result<(), String> {
  let path = state_path(app)?;
  let content = serde_json::to_string_pretty(state).map_err(|error| format!("Failed to serialize local state: {error}"))?;
  fs::write(path, content).map_err(|error| format!("Failed to write local state: {error}"))
}

fn state_path(app: &AppHandle) -> Result<PathBuf, String> {
  let dir = app.path().app_data_dir().map_err(|error| format!("Failed to resolve app data directory: {error}"))?;
  fs::create_dir_all(&dir).map_err(|error| format!("Failed to create app data directory: {error}"))?;
  Ok(dir.join(STATE_FILE))
}

fn machine_fingerprint() -> String {
  let host = env::var("COMPUTERNAME")
    .or_else(|_| env::var("HOSTNAME"))
    .unwrap_or_else(|_| "unknown-host".to_string());
  let user = env::var("USERNAME")
    .or_else(|_| env::var("USER"))
    .unwrap_or_else(|_| "unknown-user".to_string());
  let raw = format!("{}|{}|{}|{}", env::consts::OS, env::consts::ARCH, host, user);
  let mut hasher = Sha256::new();
  hasher.update(raw.as_bytes());
  hex::encode(hasher.finalize())
}

fn local_device_name() -> String {
  env::var("COMPUTERNAME")
    .or_else(|_| env::var("HOSTNAME"))
    .map(|value| value.trim().to_string())
    .ok()
    .filter(|value| !value.is_empty())
    .unwrap_or_else(|| "Co-Op Desktop".to_string())
}

fn business_system_prompt(workflow_type: &str, council_mode: &str) -> String {
  format!(
    "You are Co-Op, a local-first business operations harness. Workflow type: {workflow_type}. \
Keep company data private, ask for missing assumptions, produce concrete actions, and mark risky decisions for human approval. \
Council mode is {council_mode}; do not run broad multi-model debate unless explicitly configured."
  )
}

fn http_client() -> Result<reqwest::Client, String> {
  reqwest::Client::builder()
    .timeout(StdDuration::from_secs(REQUEST_TIMEOUT_SECS))
    .build()
    .map_err(|error| format!("Failed to create HTTP client: {error}"))
}

fn sanitize_http_base_url(
  value: &str,
  allow_private_http: bool,
  strip_cloud_api_prefix: bool,
  label: &str,
) -> Result<String, String> {
  let trimmed = value.trim();
  if trimmed.is_empty() {
    return Err(format!("{label} is required"));
  }

  let mut url = reqwest::Url::parse(trimmed).map_err(|_| format!("{label} must be a valid URL"))?;
  let scheme = url.scheme();
  if scheme != "https" && scheme != "http" {
    return Err(format!("{label} must use http or https"));
  }

  if !url.username().is_empty() || url.password().is_some() {
    return Err(format!("{label} must not include credentials"));
  }

  if scheme == "http" && (!allow_private_http || !is_private_http_host(url.host_str().unwrap_or_default())) {
    return Err(format!("{label} must use https outside localhost or private network addresses"));
  }

  url.set_query(None);
  url.set_fragment(None);

  let mut rendered = url.to_string().trim_end_matches('/').to_string();
  if strip_cloud_api_prefix {
    for suffix in ["/api/v1", "/api/v1/"] {
      if rendered.ends_with(suffix) {
        rendered.truncate(rendered.len() - suffix.trim_end_matches('/').len());
        rendered = rendered.trim_end_matches('/').to_string();
      }
    }
  }

  Ok(rendered)
}

fn is_private_http_host(host: &str) -> bool {
  if host.eq_ignore_ascii_case("localhost") || host == "::1" || host.starts_with("127.") {
    return true;
  }
  if host.starts_with("10.") || host.starts_with("192.168.") {
    return true;
  }
  if let Some(rest) = host.strip_prefix("172.") {
    if let Some(second_octet) = rest.split('.').next().and_then(|part| part.parse::<u8>().ok()) {
      return (16..=31).contains(&second_octet);
    }
  }
  false
}

fn validate_model_settings(settings: &mut ModelSettings) -> Result<(), String> {
  settings.provider = settings.provider.trim().to_string();
  settings.council_mode = settings.council_mode.trim().to_string();
  settings.ollama_model = settings.ollama_model.trim().to_string();
  settings.openai_model = settings.openai_model.trim().to_string();
  settings.ollama_base_url = sanitize_http_base_url(&settings.ollama_base_url, true, false, "Ollama URL")?;
  settings.openai_base_url = sanitize_http_base_url(&settings.openai_base_url, true, false, "OpenAI-compatible URL")?;
  settings.max_run_tokens = settings.max_run_tokens.clamp(MIN_RUN_TOKENS, MAX_RUN_TOKENS);

  if !matches!(settings.provider.as_str(), "ollama" | "openai_compatible") {
    return Err("Unsupported model provider".to_string());
  }
  if !matches!(settings.council_mode.as_str(), "off" | "review_only" | "high_risk_only") {
    return Err("Unsupported council mode".to_string());
  }
  if settings.ollama_model.is_empty() || settings.ollama_model.len() > MAX_MODEL_NAME_LENGTH {
    return Err("Ollama model name is required and must be 128 characters or fewer".to_string());
  }
  if settings.openai_model.is_empty() || settings.openai_model.len() > MAX_MODEL_NAME_LENGTH {
    return Err("OpenAI-compatible model name is required and must be 128 characters or fewer".to_string());
  }
  if settings.provider == "openai_compatible" && settings.openai_api_key.as_deref().map(str::trim).unwrap_or("").is_empty() {
    return Err("Provider API key is required for OpenAI-compatible routing".to_string());
  }

  Ok(())
}

fn validate_workflow_request(request: &WorkflowRequest) -> Result<(), String> {
  let workflow_type = request.workflow_type.trim();
  if !matches!(workflow_type, "operations" | "finance" | "legal" | "sales" | "strategy") {
    return Err("Unsupported workflow type".to_string());
  }

  let objective = request.objective.trim();
  if objective.len() < 10 {
    return Err("Workflow objective must be at least 10 characters".to_string());
  }
  if objective.len() > MAX_OBJECTIVE_LENGTH {
    return Err(format!("Workflow objective must be {MAX_OBJECTIVE_LENGTH} characters or fewer"));
  }

  Ok(())
}

fn should_run_review_gate(council_mode: &str, workflow_type: &str, objective: &str) -> bool {
  match council_mode {
    "off" => false,
    "review_only" => true,
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

async fn call_model(settings: &ModelSettings, system_prompt: &str, user_prompt: &str) -> Result<String, String> {
  match settings.provider.as_str() {
    "ollama" => call_ollama(settings, system_prompt, user_prompt).await,
    "openai_compatible" => call_openai_compatible(settings, system_prompt, user_prompt).await,
    provider => Err(format!("Unsupported provider: {provider}")),
  }
}

async fn call_ollama(settings: &ModelSettings, system_prompt: &str, user_prompt: &str) -> Result<String, String> {
  let request = OllamaChatRequest {
    model: &settings.ollama_model,
    stream: false,
    options: OllamaOptions {
      num_predict: settings.max_run_tokens.min(MAX_RUN_TOKENS) as i32,
    },
    messages: vec![
      ChatMessage { role: "system", content: system_prompt },
      ChatMessage { role: "user", content: user_prompt },
    ],
  };

  let ollama_base_url = sanitize_http_base_url(&settings.ollama_base_url, true, false, "Ollama URL")?;
  let response = http_client()?
    .post(format!("{}/api/chat", ollama_base_url))
    .json(&request)
    .send()
    .await
    .map_err(|error| format!("Ollama request failed: {error}"))?;

  if !response.status().is_success() {
    return Err(format!("Ollama returned HTTP {}", response.status()));
  }

  let body = response
    .json::<OllamaChatResponse>()
    .await
    .map_err(|error| format!("Ollama response was not valid JSON: {error}"))?;

  Ok(body.message.content)
}

async fn call_openai_compatible(settings: &ModelSettings, system_prompt: &str, user_prompt: &str) -> Result<String, String> {
  let api_key = settings
    .openai_api_key
    .as_deref()
    .filter(|value| !value.trim().is_empty())
    .ok_or_else(|| "OpenAI-compatible provider selected but no API key is saved".to_string())?;

  let request = OpenAiChatRequest {
    model: &settings.openai_model,
    temperature: 0.2,
    max_tokens: settings.max_run_tokens.min(MAX_RUN_TOKENS),
    messages: vec![
      ChatMessage { role: "system", content: system_prompt },
      ChatMessage { role: "user", content: user_prompt },
    ],
  };

  let openai_base_url = sanitize_http_base_url(&settings.openai_base_url, true, false, "OpenAI-compatible URL")?;
  let response = http_client()?
    .post(format!("{}/chat/completions", openai_base_url))
    .bearer_auth(api_key)
    .json(&request)
    .send()
    .await
    .map_err(|error| format!("OpenAI-compatible request failed: {error}"))?;

  if !response.status().is_success() {
    return Err(format!("OpenAI-compatible provider returned HTTP {}", response.status()));
  }

  let body = response
    .json::<OpenAiChatResponse>()
    .await
    .map_err(|error| format!("OpenAI-compatible response was not valid JSON: {error}"))?;

  body
    .choices
    .first()
    .map(|choice| choice.message.content.clone())
    .filter(|content| !content.trim().is_empty())
    .ok_or_else(|| "OpenAI-compatible provider returned no content".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .invoke_handler(tauri::generate_handler![
      activate_license,
      clear_activation,
      get_activation_state,
      get_machine_fingerprint,
      heartbeat_license,
      run_business_workflow,
      save_model_settings,
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
  use super::*;
  use chrono::Duration;

  fn activation(grace: DateTime<Utc>, expires_at: Option<DateTime<Utc>>, status: &str) -> ActivationState {
    ActivationState {
      activation_token: "coop_act_test".to_string(),
      customer_email: "ops@example.com".to_string(),
      plan: "team".to_string(),
      status: status.to_string(),
      expires_at: expires_at.map(|date| date.to_rfc3339()),
      features: vec!["local_data".to_string()],
      offline_grace_ends_at: grace.to_rfc3339(),
      last_heartbeat_at: Utc::now().to_rfc3339(),
      machine_fingerprint: "fingerprint".to_string(),
      cloud_base_url: DEFAULT_CLOUD_URL.to_string(),
    }
  }

  #[test]
  fn usable_activation_requires_active_status_and_future_grace() {
    let now = Utc::now();
    let active = activation(now + Duration::days(3), None, "active");
    let expired_grace = activation(now - Duration::seconds(1), None, "active");
    let suspended = activation(now + Duration::days(3), None, "suspended");

    assert!(is_activation_usable(&active, now));
    assert!(!is_activation_usable(&expired_grace, now));
    assert!(!is_activation_usable(&suspended, now));
  }

  #[test]
  fn usable_activation_respects_license_expiry() {
    let now = Utc::now();
    let active = activation(now + Duration::days(3), Some(now + Duration::hours(1)), "active");
    let expired = activation(now + Duration::days(3), Some(now - Duration::seconds(1)), "active");

    assert!(is_activation_usable(&active, now));
    assert!(!is_activation_usable(&expired, now));
  }

  #[test]
  fn machine_fingerprint_is_hashed_before_leaving_runtime() {
    let fingerprint = machine_fingerprint();

    assert_eq!(fingerprint.len(), 64);
    assert!(fingerprint.chars().all(|char| char.is_ascii_hexdigit()));
  }

  #[test]
  fn cloud_url_normalization_strips_api_prefix() {
    let normalized = sanitize_http_base_url("https://license.example.com/api/v1/", true, true, "cloud license URL").unwrap();

    assert_eq!(normalized, "https://license.example.com");
  }

  #[test]
  fn public_http_urls_are_rejected() {
    let result = sanitize_http_base_url("http://license.example.com", true, false, "cloud license URL");

    assert!(result.is_err());
  }

  #[test]
  fn model_settings_validation_clamps_token_budget_and_rejects_dead_provider() {
    let mut settings = ModelSettings {
      provider: "unsupported_remote".to_string(),
      max_run_tokens: 999999,
      ..ModelSettings::default()
    };

    assert!(validate_model_settings(&mut settings).is_err());

    settings.provider = "ollama".to_string();
    validate_model_settings(&mut settings).unwrap();
    assert_eq!(settings.max_run_tokens, MAX_RUN_TOKENS);
  }

  #[test]
  fn high_risk_council_mode_only_reviews_risky_workflows() {
    assert!(should_run_review_gate("high_risk_only", "legal", "Review vendor contract"));
    assert!(should_run_review_gate("high_risk_only", "operations", "Approve payroll payment run"));
    assert!(!should_run_review_gate("high_risk_only", "operations", "Summarize weekly customer support tags"));
  }
}
