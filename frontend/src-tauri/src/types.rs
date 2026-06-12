mod business;
mod chat;
mod desktop_state;
mod investors;
mod knowledge;
mod outreach;
mod requests;
mod state;
mod workflow;

pub use business::*;
pub use chat::*;
pub use desktop_state::*;
pub use investors::*;
pub use knowledge::*;
pub use outreach::*;
pub use requests::*;
pub use state::*;
pub use workflow::*;

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    #[test]
    fn desktop_state_serialization_excludes_secrets() {
        let mut state = DesktopState::default();
        state.model_settings.openai_api_key = Some("sk-openai-secret".to_string());
        state.model_settings.firecrawl_api_key = Some("fc-firecrawl-secret".to_string());
        state.model_settings.email_api_key = Some("email-provider-secret".to_string());
        state.activation = Some(ActivationState {
            activation_token: "coop_act_secret".to_string(),
            customer_email: "owner@example.com".to_string(),
            plan: "team".to_string(),
            status: "active".to_string(),
            expires_at: None,
            features: vec!["local_data".to_string()],
            offline_grace_ends_at: Utc::now().to_rfc3339(),
            last_heartbeat_at: Utc::now().to_rfc3339(),
            machine_fingerprint: "fingerprint".to_string(),
            cloud_base_url: crate::constants::DEFAULT_CLOUD_URL.to_string(),
        });

        let serialized = serde_json::to_string(&state).expect("desktop state should serialize");

        assert!(!serialized.contains("sk-openai-secret"));
        assert!(!serialized.contains("fc-firecrawl-secret"));
        assert!(!serialized.contains("email-provider-secret"));
        assert!(!serialized.contains("coop_act_secret"));
    }

    #[test]
    fn old_partial_state_deserializes_with_model_defaults() {
        let legacy = r#"{
      "installId": "0598c23a-c67a-4378-928d-6b1a40c6ece6",
      "activation": null,
      "modelSettings": {
        "provider": "ollama",
        "ollamaBaseUrl": "http://localhost:11434",
        "ollamaModel": "llama3.1",
        "openaiBaseUrl": "https://api.openai.com/v1",
        "openaiApiKey": null,
        "openaiModel": "gpt-4.1-mini",
        "councilMode": "review_only",
        "maxRunTokens": 12000
      },
      "workflowRuns": []
    }"#;

        let state = serde_json::from_str::<DesktopState>(legacy)
            .expect("legacy desktop state should migrate");

        assert_eq!(state.install_id, "0598c23a-c67a-4378-928d-6b1a40c6ece6");
        assert_eq!(state.model_settings.research_provider, "llm");
        assert_eq!(state.model_settings.email_provider, "none");
        assert_eq!(
            state.model_settings.firecrawl_base_url,
            "https://api.firecrawl.dev"
        );
    }
}
