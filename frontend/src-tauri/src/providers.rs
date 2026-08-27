use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::time::Duration as StdDuration;

use crate::constants::REQUEST_TIMEOUT_SECS;
use crate::types::{ModelSettings, ResearchSource};
use crate::validation::sanitize_http_base_url;

pub use crate::providers_email::send_email;

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
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
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


pub fn http_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(StdDuration::from_secs(REQUEST_TIMEOUT_SECS))
        .build()
        .map_err(|error| format!("Failed to create HTTP client: {error}"))
}

pub async fn call_model(
    settings: &ModelSettings,
    system_prompt: &str,
    user_prompt: &str,
    temperature: Option<f32>,
) -> Result<String, String> {
    match settings.provider.as_str() {
        "ollama" => call_ollama(settings, system_prompt, user_prompt, temperature).await,
        "openai_compatible" => call_openai_compatible(settings, system_prompt, user_prompt, temperature).await,
        provider => Err(format!("Unsupported provider: {provider}")),
    }
}

pub async fn call_ollama(
    settings: &ModelSettings,
    system_prompt: &str,
    user_prompt: &str,
    temperature: Option<f32>,
) -> Result<String, String> {
    let request = OllamaChatRequest {
        model: &settings.ollama_model,
        stream: false,
        options: OllamaOptions {
            num_predict: settings.normalized_max_tokens() as i32,
            temperature,
        },
        messages: vec![
            ChatMessage {
                role: "system",
                content: system_prompt,
            },
            ChatMessage {
                role: "user",
                content: user_prompt,
            },
        ],
    };

    let ollama_base_url =
        sanitize_http_base_url(&settings.ollama_base_url, true, false, "Ollama URL")?;
        
    let mut attempt = 0;
    const MAX_ATTEMPTS: u8 = 3;

    loop {
        attempt += 1;
        
        let result = http_client()?
            .post(format!("{}/api/chat", ollama_base_url))
            .json(&request)
            .send()
            .await;

        match result {
            Ok(response) => {
                match ensure_success(response, "Ollama").await {
                    Ok(success_res) => {
                        let body = success_res
                            .json::<OllamaChatResponse>()
                            .await
                            .map_err(|error| format!("Ollama response was not valid JSON: {error}"))?;
                        return Ok(body.message.content);
                    }
                    Err(e) => {
                        if attempt >= MAX_ATTEMPTS {
                            return Err(e);
                        }
                    }
                }
            }
            Err(e) => {
                if attempt >= MAX_ATTEMPTS {
                    return Err(format!("Ollama request failed: {e}"));
                }
            }
        }
        
        tokio::time::sleep(std::time::Duration::from_secs(2)).await;
    }
}

pub async fn call_openai_compatible(
    settings: &ModelSettings,
    system_prompt: &str,
    user_prompt: &str,
    temperature: Option<f32>,
) -> Result<String, String> {
    let api_key = settings
        .openai_api_key
        .as_deref()
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "OpenAI-compatible provider selected but no API key is saved".to_string())?;

    let request = OpenAiChatRequest {
        model: &settings.openai_model,
        temperature: temperature.unwrap_or(0.2),
        max_tokens: settings.normalized_max_tokens(),
        messages: vec![
            ChatMessage {
                role: "system",
                content: system_prompt,
            },
            ChatMessage {
                role: "user",
                content: user_prompt,
            },
        ],
    };

    let openai_base_url = sanitize_http_base_url(
        &settings.openai_base_url,
        true,
        false,
        "OpenAI-compatible URL",
    )?;

    let mut attempt = 0;
    const MAX_ATTEMPTS: u8 = 3;

    loop {
        attempt += 1;

        let result = http_client()?
            .post(format!("{}/chat/completions", openai_base_url))
            .bearer_auth(api_key)
            .json(&request)
            .send()
            .await;

        match result {
            Ok(response) => {
                match ensure_success(response, "OpenAI-compatible provider").await {
                    Ok(success_res) => {
                        let body = success_res
                            .json::<OpenAiChatResponse>()
                            .await
                            .map_err(|error| format!("OpenAI-compatible response was not valid JSON: {error}"))?;

                        return body
                            .choices
                            .first()
                            .map(|choice| choice.message.content.clone())
                            .filter(|content| !content.trim().is_empty())
                            .ok_or_else(|| "OpenAI-compatible provider returned no content".to_string());
                    }
                    Err(e) => {
                        if attempt >= MAX_ATTEMPTS {
                            return Err(e);
                        }
                    }
                }
            }
            Err(e) => {
                if attempt >= MAX_ATTEMPTS {
                    return Err(format!("OpenAI-compatible request failed: {e}"));
                }
            }
        }

        tokio::time::sleep(std::time::Duration::from_secs(2)).await;
    }
}

// ── Embedding endpoints ──────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
struct OllamaEmbeddingRequest<'a> {
    model: &'a str,
    prompt: &'a str,
}

#[derive(Debug, Clone, Deserialize)]
struct OllamaEmbeddingResponse {
    embedding: Vec<f32>,
}

#[derive(Debug, Clone, Serialize)]
struct OpenAiEmbeddingRequest<'a> {
    model: &'a str,
    input: &'a str,
}

#[derive(Debug, Clone, Deserialize)]
struct OpenAiEmbeddingData {
    embedding: Vec<f32>,
}

#[derive(Debug, Clone, Deserialize)]
struct OpenAiEmbeddingResponse {
    data: Vec<OpenAiEmbeddingData>,
}

pub async fn call_embedding(
    settings: &ModelSettings,
    text: &str,
) -> Result<Vec<f32>, String> {
    match settings.provider.as_str() {
        "ollama" => embed_ollama(settings, text).await,
        "openai_compatible" => embed_openai_compatible(settings, text).await,
        provider => Err(format!("Unsupported embedding provider: {provider}")),
    }
}

async fn embed_ollama(
    settings: &ModelSettings,
    text: &str,
) -> Result<Vec<f32>, String> {
    let request = OllamaEmbeddingRequest {
        model: &settings.ollama_model,
        prompt: text,
    };
    let ollama_base_url =
        sanitize_http_base_url(&settings.ollama_base_url, true, false, "Ollama URL")?;
    let response = http_client()?
        .post(format!("{}/api/embeddings", ollama_base_url))
        .json(&request)
        .send()
        .await
        .map_err(|error| format!("Ollama embedding request failed: {error}"))?;
    let response = ensure_success(response, "Ollama embeddings").await?;
    let body = response
        .json::<OllamaEmbeddingResponse>()
        .await
        .map_err(|error| format!("Ollama embedding response was not valid JSON: {error}"))?;
    if body.embedding.is_empty() {
        return Err("Ollama returned an empty embedding vector".to_string());
    }
    Ok(body.embedding)
}

async fn embed_openai_compatible(
    settings: &ModelSettings,
    text: &str,
) -> Result<Vec<f32>, String> {
    let api_key = settings
        .openai_api_key
        .as_deref()
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "OpenAI-compatible provider selected but no API key is saved".to_string())?;
    let request = OpenAiEmbeddingRequest {
        model: &settings.openai_model,
        input: text,
    };
    let openai_base_url = sanitize_http_base_url(
        &settings.openai_base_url,
        true,
        false,
        "OpenAI-compatible URL",
    )?;
    let response = http_client()?
        .post(format!("{}/embeddings", openai_base_url))
        .bearer_auth(api_key)
        .json(&request)
        .send()
        .await
        .map_err(|error| format!("OpenAI-compatible embedding request failed: {error}"))?;
    let response = ensure_success(response, "OpenAI-compatible embeddings").await?;
    let body = response
        .json::<OpenAiEmbeddingResponse>()
        .await
        .map_err(|error| {
            format!("OpenAI-compatible embedding response was not valid JSON: {error}")
        })?;
    body.data
        .first()
        .map(|entry| entry.embedding.clone())
        .filter(|vector| !vector.is_empty())
        .ok_or_else(|| "OpenAI-compatible provider returned no embedding".to_string())
}

pub async fn search_firecrawl(
    settings: &ModelSettings,
    query: &str,
    limit: usize,
) -> Result<Vec<ResearchSource>, String> {
    let api_key = settings
        .firecrawl_api_key
        .as_deref()
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "Web search key is not saved".to_string())?;
    let base_url =
        sanitize_http_base_url(&settings.firecrawl_base_url, true, false, "Web search URL")?;
    let request = json!({
        "query": query,
        "limit": limit.clamp(1, 10),
        "sources": ["web"],
        "timeout": 60_000,
        "ignoreInvalidURLs": true,
        "scrapeOptions": {
            "formats": [{ "type": "markdown" }],
            "onlyMainContent": true
        }
    });

    let client = http_client()?;
    let response = client
        .post(format!("{}/v2/search", base_url))
        .bearer_auth(api_key)
        .json(&request)
        .send()
        .await
        .map_err(|error| format!("Firecrawl search request failed: {error}"))?;

    if response.status() == StatusCode::NOT_FOUND {
        return search_firecrawl_v1(settings, query, limit).await;
    }

    let response = ensure_success(response, "Firecrawl").await?;
    let payload = response
        .json::<Value>()
        .await
        .map_err(|error| format!("Firecrawl response was not valid JSON: {error}"))?;
    Ok(parse_firecrawl_sources(payload))
}

async fn search_firecrawl_v1(
    settings: &ModelSettings,
    query: &str,
    limit: usize,
) -> Result<Vec<ResearchSource>, String> {
    let api_key = settings
        .firecrawl_api_key
        .as_deref()
        .ok_or_else(|| "Web search key is not saved".to_string())?;
    let base_url =
        sanitize_http_base_url(&settings.firecrawl_base_url, true, false, "Web search URL")?;
    let request = json!({
        "query": query,
        "limit": limit.clamp(1, 10),
        "scrapeOptions": {
            "formats": ["markdown"]
        }
    });

    let response = http_client()?
        .post(format!("{}/v1/search", base_url))
        .bearer_auth(api_key)
        .json(&request)
        .send()
        .await
        .map_err(|error| format!("Firecrawl v1 search request failed: {error}"))?;

    let response = ensure_success(response, "Firecrawl").await?;
    let payload = response
        .json::<Value>()
        .await
        .map_err(|error| format!("Firecrawl response was not valid JSON: {error}"))?;
    Ok(parse_firecrawl_sources(payload))
}

fn parse_firecrawl_sources(payload: Value) -> Vec<ResearchSource> {
    let candidates = firecrawl_result_items(&payload);

    candidates
        .into_iter()
        .filter_map(|item| {
            let title = string_field(&item, &["title", "metadata.title"])
                .unwrap_or_else(|| "Untitled source".to_string());
            let raw_url = string_field(&item, &["url", "metadata.sourceURL", "metadata.url"])
                .unwrap_or_default();
            let url = if raw_url.starts_with("http://") || raw_url.starts_with("https://") {
                raw_url
            } else {
                String::new()
            };
            let description =
                string_field(&item, &["description", "snippet", "metadata.description"])
                    .unwrap_or_default();
            
            let raw_content = string_field(&item, &["content", "text", "summary", "markdown"])
                .unwrap_or_else(|| description.clone());
                
            let content = clean_markdown(&raw_content);
            
            if url.is_empty() && content.trim().is_empty() {
                return None;
            }
            Some(ResearchSource {
                title,
                url,
                description,
                content,
            })
        })
        .collect()
}

fn clean_markdown(input: &str) -> String {
    use std::sync::OnceLock;
    static RE_IMAGES: OnceLock<regex::Regex> = OnceLock::new();
    static RE_LINKS: OnceLock<regex::Regex> = OnceLock::new();
    static RE_FORMATTING: OnceLock<regex::Regex> = OnceLock::new();

    let re_images = RE_IMAGES.get_or_init(|| regex::Regex::new(r"!\[[^\]]*\]\([^)]+\)").unwrap());
    let re_links = RE_LINKS.get_or_init(|| regex::Regex::new(r"\[([^\]]+)\]\([^)]+\)").unwrap());
    let re_formatting = RE_FORMATTING.get_or_init(|| regex::Regex::new(r"(\*\*\*+|---+|===+|###+)").unwrap());

    let no_images = re_images.replace_all(input, "");
    let no_links = re_links.replace_all(&no_images, "$1");
    let no_formatting = re_formatting.replace_all(&no_links, "");
    
    no_formatting.to_string()
}

fn firecrawl_result_items(payload: &Value) -> Vec<Value> {
    let mut items = Vec::new();

    if let Some(data) = payload.get("data") {
        if let Some(array) = data.as_array() {
            items.extend(array.iter().cloned());
        } else if let Some(object) = data.as_object() {
            for key in ["web", "news", "images"] {
                if let Some(array) = object.get(key).and_then(Value::as_array) {
                    items.extend(array.iter().cloned());
                }
            }
        }
    }

    if items.is_empty() {
        if let Some(array) = payload.get("results").and_then(Value::as_array) {
            items.extend(array.iter().cloned());
        }
    }

    if items.is_empty() {
        for key in ["web", "news"] {
            if let Some(array) = payload.get(key).and_then(Value::as_array) {
                items.extend(array.iter().cloned());
            }
        }
    }

    items
}

fn string_field(value: &Value, keys: &[&str]) -> Option<String> {
    for key in keys {
        let mut cursor = value;
        let mut found = true;
        for part in key.split('.') {
            if let Some(next) = cursor.get(part) {
                cursor = next;
            } else {
                found = false;
                break;
            }
        }
        if found {
            if let Some(text) = cursor.as_str() {
                let trimmed = text.trim();
                if !trimmed.is_empty() {
                    return Some(trimmed.to_string());
                }
            }
        }
    }
    None
}

pub(crate) async fn ensure_success(
    response: reqwest::Response,
    label: &str,
) -> Result<reqwest::Response, String> {
    let status = response.status();
    if status.is_success() {
        Ok(response)
    } else {
        let body = response.text().await.unwrap_or_default();
        let body = sanitize_provider_error(&body);
        if body.is_empty() {
            Err(format!("{label} returned HTTP {status}"))
        } else {
            Err(format!("{label} returned HTTP {status}: {body}"))
        }
    }
}

fn sanitize_provider_error(value: &str) -> String {
    let compact = value
        .replace(['\n', '\r'], " ")
        .split_whitespace()
        .collect::<Vec<&str>>()
        .join(" ");
    redact_provider_error_tokens(&compact)
        .chars()
        .take(280)
        .collect()
}

fn redact_provider_error_tokens(value: &str) -> String {
    let mut redacted = Vec::new();
    let mut skip_next = false;

    for part in value.split_whitespace() {
        if skip_next {
            skip_next = false;
            continue;
        }

        if part.eq_ignore_ascii_case("bearer") {
            redacted.push("Bearer".to_string());
            redacted.push("[redacted]".to_string());
            skip_next = true;
            continue;
        }

        let lower = part.to_ascii_lowercase();
        if lower.starts_with("api_key=") || lower.starts_with("apikey=") {
            redacted.push("[redacted-api-key]".to_string());
        } else {
            redacted.push(part.to_string());
        }
    }

    redacted.join(" ")
}



#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn provider_error_sanitizer_redacts_common_secret_markers() {
        let sanitized = sanitize_provider_error("Bearer sk-secret\napi_key=abc123");

        assert!(!sanitized.contains("sk-secret"));
        assert!(!sanitized.contains("api_key"));
        assert!(sanitized.contains("[redacted]"));
    }

    #[test]
    fn parses_firecrawl_v2_web_results() {
        let payload = json!({
            "success": true,
            "data": {
                "web": [
                    {
                        "title": "Example competitor",
                        "description": "A relevant company",
                        "url": "https://example.com",
                        "markdown": "# Example\nUseful source content"
                    }
                ]
            }
        });

        let sources = parse_firecrawl_sources(payload);

        assert_eq!(sources.len(), 1);
        assert_eq!(sources[0].title, "Example competitor");
        assert_eq!(sources[0].url, "https://example.com");
        assert!(sources[0].content.contains("Useful source content"));
    }

    #[test]
    fn parses_firecrawl_flat_legacy_results() {
        let payload = json!({
            "success": true,
            "data": [
                {
                    "metadata": {
                        "title": "Legacy title",
                        "sourceURL": "https://legacy.example.com"
                    },
                    "content": "Legacy body"
                }
            ]
        });

        let sources = parse_firecrawl_sources(payload);

        assert_eq!(sources.len(), 1);
        assert_eq!(sources[0].title, "Legacy title");
        assert_eq!(sources[0].url, "https://legacy.example.com");
    }

    #[test]
    fn strips_markdown_noise_from_firecrawl_results() {
        let input = "---
### Header
[Contact Us](https://example.com)
![Logo](https://example.com/logo.png)
Useful text
---";
        let cleaned = super::clean_markdown(input);
        
        assert!(!cleaned.contains("Contact Us](https://example.com)"));
        assert!(cleaned.contains("Contact Us"));
        assert!(!cleaned.contains("![Logo]"));
        assert!(!cleaned.contains("---"));
        assert!(!cleaned.contains("###"));
        assert!(cleaned.contains("Useful text"));
    }
}
