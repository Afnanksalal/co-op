use aes_gcm::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose, Engine as _};
use keyring::Entry;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{collections::BTreeMap, fs, path::PathBuf};
use tauri::{AppHandle, Manager};

use crate::security::machine_fingerprint;
use crate::types::{ActivationState, ModelSettings};

const SERVICE: &str = "co-op-desktop";
const SECRETS_FILE: &str = "secrets.json";
const SECRETS_SCHEMA_VERSION: u32 = 1;

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

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct SecretStore {
    schema_version: u32,
    entries: BTreeMap<String, StoredSecret>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StoredSecret {
    nonce: String,
    ciphertext: String,
}

pub fn hydrate_activation_secret(
    app: &AppHandle,
    install_id: &str,
    activation: &mut Option<ActivationState>,
) {
    if let Some(activation) = activation {
        if !activation.activation_token.trim().is_empty() {
            let _ = store_secret(
                app,
                install_id,
                SecretSlot::ActivationToken,
                activation.activation_token.trim(),
            );
        }
        activation.activation_token = load_secret(app, install_id, SecretSlot::ActivationToken)
            .unwrap_or_else(|| activation.activation_token.clone());
    }
}

pub fn persist_activation_token(
    app: &AppHandle,
    install_id: &str,
    token: &str,
) -> Result<(), String> {
    store_secret(app, install_id, SecretSlot::ActivationToken, token.trim())
}

pub fn delete_activation_token(app: &AppHandle, install_id: &str) {
    let _ = entry(install_id, SecretSlot::ActivationToken).and_then(|entry| {
        entry
            .delete_credential()
            .map_err(|error| format!("Failed to delete activation token: {error}"))
    });
    let _ = delete_file_secret(app, install_id, SecretSlot::ActivationToken);
}

pub fn hydrate_model_secrets(app: &AppHandle, install_id: &str, settings: &mut ModelSettings) {
    migrate_plaintext_secret(
        app,
        install_id,
        SecretSlot::OpenAiApiKey,
        &settings.openai_api_key,
    );
    migrate_plaintext_secret(
        app,
        install_id,
        SecretSlot::FirecrawlApiKey,
        &settings.firecrawl_api_key,
    );
    migrate_plaintext_secret(
        app,
        install_id,
        SecretSlot::EmailApiKey,
        &settings.email_api_key,
    );

    settings.openai_api_key = load_secret(app, install_id, SecretSlot::OpenAiApiKey)
        .or_else(|| settings.openai_api_key.take());
    settings.firecrawl_api_key = load_secret(app, install_id, SecretSlot::FirecrawlApiKey)
        .or_else(|| settings.firecrawl_api_key.take());
    settings.email_api_key = load_secret(app, install_id, SecretSlot::EmailApiKey)
        .or_else(|| settings.email_api_key.take());
}

pub fn persist_model_secrets(
    app: &AppHandle,
    install_id: &str,
    settings: &ModelSettings,
) -> Result<(), String> {
    persist_optional_secret(
        app,
        install_id,
        SecretSlot::OpenAiApiKey,
        settings.openai_api_key.as_deref(),
    )?;
    persist_optional_secret(
        app,
        install_id,
        SecretSlot::FirecrawlApiKey,
        settings.firecrawl_api_key.as_deref(),
    )?;
    persist_optional_secret(
        app,
        install_id,
        SecretSlot::EmailApiKey,
        settings.email_api_key.as_deref(),
    )?;
    Ok(())
}

fn persist_optional_secret(
    app: &AppHandle,
    install_id: &str,
    slot: SecretSlot,
    value: Option<&str>,
) -> Result<(), String> {
    if let Some(secret) = value.map(str::trim).filter(|secret| !secret.is_empty()) {
        store_secret(app, install_id, slot, secret)?;
    }
    Ok(())
}

fn migrate_plaintext_secret(
    app: &AppHandle,
    install_id: &str,
    slot: SecretSlot,
    value: &Option<String>,
) {
    if let Some(secret) = value
        .as_deref()
        .map(str::trim)
        .filter(|secret| !secret.is_empty())
    {
        let _ = store_secret(app, install_id, slot, secret);
    }
}

fn load_secret(app: &AppHandle, install_id: &str, slot: SecretSlot) -> Option<String> {
    select_preferred_secret(
        load_file_secret(app, install_id, slot).ok().flatten(),
        load_keyring_secret(install_id, slot),
    )
}

fn select_preferred_secret(
    file_secret: Option<String>,
    keyring_secret: Option<String>,
) -> Option<String> {
    file_secret.or(keyring_secret)
}

fn load_keyring_secret(install_id: &str, slot: SecretSlot) -> Option<String> {
    entry(install_id, slot).ok()?.get_password().ok()
}

fn store_secret(
    app: &AppHandle,
    install_id: &str,
    slot: SecretSlot,
    value: &str,
) -> Result<(), String> {
    let file_result = store_file_secret(app, install_id, slot, value);
    let keyring_result = store_keyring_secret(install_id, slot, value);

    if file_result.is_ok() || keyring_result.is_ok() {
        Ok(())
    } else {
        Err(format!(
            "Failed to store {} in secure storage: {}; {}",
            slot.as_str(),
            file_result
                .err()
                .unwrap_or_else(|| "encrypted local storage unavailable".to_string()),
            keyring_result
                .err()
                .unwrap_or_else(|| "OS credential storage unavailable".to_string())
        ))
    }
}

fn store_keyring_secret(install_id: &str, slot: SecretSlot, value: &str) -> Result<(), String> {
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

fn load_file_secret(
    app: &AppHandle,
    install_id: &str,
    slot: SecretSlot,
) -> Result<Option<String>, String> {
    let store = read_secret_store(app)?;
    let Some(secret) = store.entries.get(&secret_key_id(install_id, slot)) else {
        return Ok(None);
    };
    decrypt_secret(install_id, secret).map(Some)
}

fn store_file_secret(
    app: &AppHandle,
    install_id: &str,
    slot: SecretSlot,
    value: &str,
) -> Result<(), String> {
    let mut store = read_secret_store(app)?;
    store.schema_version = SECRETS_SCHEMA_VERSION;
    store.entries.insert(
        secret_key_id(install_id, slot),
        encrypt_secret(install_id, value)?,
    );
    write_secret_store(app, &store)
}

fn delete_file_secret(app: &AppHandle, install_id: &str, slot: SecretSlot) -> Result<(), String> {
    let mut store = read_secret_store(app)?;
    store.entries.remove(&secret_key_id(install_id, slot));
    write_secret_store(app, &store)
}

fn read_secret_store(app: &AppHandle) -> Result<SecretStore, String> {
    let path = secret_store_path(app)?;
    if !path.exists() {
        return Ok(SecretStore {
            schema_version: SECRETS_SCHEMA_VERSION,
            entries: BTreeMap::new(),
        });
    }
    let content = fs::read_to_string(&path)
        .map_err(|error| format!("Failed to read encrypted local secrets: {error}"))?;
    serde_json::from_str::<SecretStore>(&content)
        .map_err(|error| format!("Encrypted local secrets are corrupt: {error}"))
}

fn write_secret_store(app: &AppHandle, store: &SecretStore) -> Result<(), String> {
    let path = secret_store_path(app)?;
    let content = serde_json::to_string_pretty(store)
        .map_err(|error| format!("Failed to serialize encrypted local secrets: {error}"))?;
    let tmp_path = path.with_extension("json.tmp");
    fs::write(&tmp_path, content)
        .map_err(|error| format!("Failed to write encrypted local secrets: {error}"))?;
    fs::rename(&tmp_path, &path)
        .or_else(|_| {
            fs::remove_file(&path).ok();
            fs::rename(&tmp_path, &path)
        })
        .map_err(|error| format!("Failed to replace encrypted local secrets: {error}"))
}

fn secret_store_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Failed to resolve app data directory: {error}"))?;
    fs::create_dir_all(&dir)
        .map_err(|error| format!("Failed to create app data directory: {error}"))?;
    Ok(dir.join(SECRETS_FILE))
}

fn encrypt_secret(install_id: &str, value: &str) -> Result<StoredSecret, String> {
    let key = encryption_key(install_id);
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|error| format!("Failed to initialize local secret encryption: {error}"))?;
    let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
    let ciphertext = cipher
        .encrypt(&nonce, value.as_bytes())
        .map_err(|error| format!("Failed to encrypt local secret: {error}"))?;

    Ok(StoredSecret {
        nonce: general_purpose::STANDARD.encode(nonce),
        ciphertext: general_purpose::STANDARD.encode(ciphertext),
    })
}

fn decrypt_secret(install_id: &str, secret: &StoredSecret) -> Result<String, String> {
    let key = encryption_key(install_id);
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|error| format!("Failed to initialize local secret encryption: {error}"))?;
    let nonce = general_purpose::STANDARD
        .decode(&secret.nonce)
        .map_err(|error| format!("Encrypted local secret nonce is invalid: {error}"))?;
    let ciphertext = general_purpose::STANDARD
        .decode(&secret.ciphertext)
        .map_err(|error| format!("Encrypted local secret payload is invalid: {error}"))?;
    let plaintext = cipher
        .decrypt(Nonce::from_slice(&nonce), ciphertext.as_ref())
        .map_err(|error| format!("Failed to decrypt local secret: {error}"))?;
    String::from_utf8(plaintext)
        .map_err(|error| format!("Encrypted local secret was not valid UTF-8: {error}"))
}

fn encryption_key(install_id: &str) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(SERVICE.as_bytes());
    hasher.update(b"|");
    hasher.update(install_id.as_bytes());
    hasher.update(b"|");
    hasher.update(machine_fingerprint().as_bytes());
    hasher.finalize().into()
}

fn secret_key_id(install_id: &str, slot: SecretSlot) -> String {
    let mut hasher = Sha256::new();
    hasher.update(install_id.as_bytes());
    hasher.update(b"|");
    hasher.update(slot.as_str().as_bytes());
    hex::encode(hasher.finalize())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encrypted_file_secret_round_trips_without_plaintext() {
        let stored = encrypt_secret("install", "sk-test-secret").expect("secret should encrypt");

        assert_ne!(stored.ciphertext, "sk-test-secret");
        assert_eq!(
            decrypt_secret("install", &stored).expect("secret should decrypt"),
            "sk-test-secret"
        );
    }

    #[test]
    fn encrypted_file_secret_wins_over_stale_keyring_value() {
        let selected = select_preferred_secret(
            Some("new-key-from-file".to_string()),
            Some("old-key-from-keyring".to_string()),
        );

        assert_eq!(selected.as_deref(), Some("new-key-from-file"));
    }
}
