use keyring::Entry;

use crate::types::{ActivationState, ModelSettings};

const SERVICE: &str = "co-op-desktop";

#[derive(Debug, Copy, Clone)]
pub enum SecretSlot {
    ActivationToken,
    OpenAiApiKey,
    FirecrawlApiKey,
    EmailApiKey,
}

impl SecretSlot {
    fn as_str(self) -> &'static str {
        match self {
            Self::ActivationToken => "activation-token",
            Self::OpenAiApiKey => "openai-api-key",
            Self::FirecrawlApiKey => "firecrawl-api-key",
            Self::EmailApiKey => "email-api-key",
        }
    }
}

pub fn hydrate_activation_secret(install_id: &str, activation: &mut Option<ActivationState>) {
    if let Some(activation) = activation {
        if !activation.activation_token.trim().is_empty() {
            let _ = store_secret(
                install_id,
                SecretSlot::ActivationToken,
                activation.activation_token.trim(),
            );
        }
        activation.activation_token = load_secret(install_id, SecretSlot::ActivationToken)
            .unwrap_or_else(|| activation.activation_token.clone());
    }
}

pub fn persist_activation_token(install_id: &str, token: &str) -> Result<(), String> {
    store_secret(install_id, SecretSlot::ActivationToken, token.trim())
}

pub fn delete_activation_token(install_id: &str) {
    let _ = entry(install_id, SecretSlot::ActivationToken).and_then(|entry| {
        entry
            .delete_credential()
            .map_err(|error| format!("Failed to delete activation token: {error}"))
    });
}

pub fn hydrate_model_secrets(install_id: &str, settings: &mut ModelSettings) {
    migrate_plaintext_secret(
        install_id,
        SecretSlot::OpenAiApiKey,
        &settings.openai_api_key,
    );
    migrate_plaintext_secret(
        install_id,
        SecretSlot::FirecrawlApiKey,
        &settings.firecrawl_api_key,
    );
    migrate_plaintext_secret(install_id, SecretSlot::EmailApiKey, &settings.email_api_key);

    settings.openai_api_key = load_secret(install_id, SecretSlot::OpenAiApiKey)
        .or_else(|| settings.openai_api_key.take());
    settings.firecrawl_api_key = load_secret(install_id, SecretSlot::FirecrawlApiKey)
        .or_else(|| settings.firecrawl_api_key.take());
    settings.email_api_key =
        load_secret(install_id, SecretSlot::EmailApiKey).or_else(|| settings.email_api_key.take());
}

pub fn persist_model_secrets(install_id: &str, settings: &ModelSettings) -> Result<(), String> {
    persist_optional_secret(
        install_id,
        SecretSlot::OpenAiApiKey,
        settings.openai_api_key.as_deref(),
    )?;
    persist_optional_secret(
        install_id,
        SecretSlot::FirecrawlApiKey,
        settings.firecrawl_api_key.as_deref(),
    )?;
    persist_optional_secret(
        install_id,
        SecretSlot::EmailApiKey,
        settings.email_api_key.as_deref(),
    )?;
    Ok(())
}

fn persist_optional_secret(
    install_id: &str,
    slot: SecretSlot,
    value: Option<&str>,
) -> Result<(), String> {
    if let Some(secret) = value.map(str::trim).filter(|secret| !secret.is_empty()) {
        store_secret(install_id, slot, secret)?;
    }
    Ok(())
}

fn migrate_plaintext_secret(install_id: &str, slot: SecretSlot, value: &Option<String>) {
    if let Some(secret) = value
        .as_deref()
        .map(str::trim)
        .filter(|secret| !secret.is_empty())
    {
        let _ = store_secret(install_id, slot, secret);
    }
}

fn load_secret(install_id: &str, slot: SecretSlot) -> Option<String> {
    entry(install_id, slot).ok()?.get_password().ok()
}

fn store_secret(install_id: &str, slot: SecretSlot, value: &str) -> Result<(), String> {
    entry(install_id, slot)?
        .set_password(value)
        .map_err(|error| {
            format!(
                "Failed to store {} in OS credential storage: {error}",
                slot.as_str()
            )
        })
}

fn entry(install_id: &str, slot: SecretSlot) -> Result<Entry, String> {
    let account = format!("{}:{}", install_id, slot.as_str());
    Entry::new(SERVICE, &account)
        .map_err(|error| format!("Failed to open OS credential storage: {error}"))
}
