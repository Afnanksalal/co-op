use chrono::Utc;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
pub struct WorkflowTraceEvent {
    pub id: String,
    pub stage: String,
    pub label: String,
    pub status: String,
    pub detail: String,
    pub created_at: String,
}

impl Default for WorkflowTraceEvent {
    fn default() -> Self {
        Self {
            id: String::new(),
            stage: String::new(),
            label: String::new(),
            status: String::new(),
            detail: String::new(),
            created_at: Utc::now().to_rfc3339(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
pub struct WorkflowRun {
    pub id: String,
    pub workflow_type: String,
    pub objective: String,
    pub provider: String,
    pub status: String,
    pub steps: Vec<String>,
    pub trace: Vec<WorkflowTraceEvent>,
    pub risk_level: String,
    pub approval_required: bool,
    pub output: Option<String>,
    pub error: Option<String>,
    pub created_at: String,
    pub completed_at: Option<String>,
}

impl Default for WorkflowRun {
    fn default() -> Self {
        Self {
            id: String::new(),
            workflow_type: String::new(),
            objective: String::new(),
            provider: String::new(),
            status: String::new(),
            steps: Vec::new(),
            trace: Vec::new(),
            risk_level: "normal".to_string(),
            approval_required: false,
            output: None,
            error: None,
            created_at: Utc::now().to_rfc3339(),
            completed_at: None,
        }
    }
}
