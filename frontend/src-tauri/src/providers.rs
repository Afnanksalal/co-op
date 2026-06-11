use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::time::Duration as StdDuration;

use crate::constants::{MAX_EMAIL_BODY_LENGTH, MAX_EMAIL_SUBJECT_LENGTH, REQUEST_TIMEOUT_SECS};
use crate::types::{ModelSettings, ResearchSource};
use crate::validation::sanitize_http_base_url;

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

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct FirecrawlSearchRequest<'a> {
    query: &'a str,
    limit: usize,
    scrape_options: FirecrawlScrapeOptions,
}

#[derive(Debug, Clone, Serialize)]
struct FirecrawlScrapeOptions {
    formats: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
struct ResendEmailRequest<'a> {
    from: &'a str,
    to: Vec<&'a str>,
    subject: &'a str,
    html: &'a str,
}

#[derive(Debug, Clone, Serialize)]
struct SendGridEmailRequest<'a> {
    personalizations: Vec<SendGridPersonalization<'a>>,
    from: SendGridEmail<'a>,
    subject: &'a str,
    content: Vec<SendGridContent<'a>>,
}

#[derive(Debug, Clone, Serialize)]
struct SendGridPersonalization<'a> {
    to: Vec<SendGridEmail<'a>>,
}

#[derive(Debug, Clone, Serialize)]
struct SendGridEmail<'a> {
    email: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    name: Option<&'a str>,
}

#[derive(Debug, Clone, Serialize)]
struct SendGridContent<'a> {
    #[serde(rename = "type")]
    content_type: &'a str,
    value: &'a str,
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
) -> Result<String, String> {
    match settings.provider.as_str() {
        "ollama" => call_ollama(settings, system_prompt, user_prompt).await,
        "openai_compatible" => call_openai_compatible(settings, system_prompt, user_prompt).await,
        provider => Err(format!("Unsupported provider: {provider}")),
    }
}

pub async fn call_ollama(
    settings: &ModelSettings,
    system_prompt: &str,
    user_prompt: &str,
) -> Result<String, String> {
    let request = OllamaChatRequest {
        model: &settings.ollama_model,
        stream: false,
        options: OllamaOptions {
            num_predict: settings.normalized_max_tokens() as i32,
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
    let response = http_client()?
        .post(format!("{}/api/chat", ollama_base_url))
        .json(&request)
        .send()
        .await
        .map_err(|error| format!("Ollama request failed: {error}"))?;

    let response = ensure_success(response, "Ollama").await?;

    let body = response
        .json::<OllamaChatResponse>()
        .await
        .map_err(|error| format!("Ollama response was not valid JSON: {error}"))?;

    Ok(body.message.content)
}

pub async fn call_openai_compatible(
    settings: &ModelSettings,
    system_prompt: &str,
    user_prompt: &str,
) -> Result<String, String> {
    let api_key = settings
        .openai_api_key
        .as_deref()
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "OpenAI-compatible provider selected but no API key is saved".to_string())?;

    let request = OpenAiChatRequest {
        model: &settings.openai_model,
        temperature: 0.2,
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
    let response = http_client()?
        .post(format!("{}/chat/completions", openai_base_url))
        .bearer_auth(api_key)
        .json(&request)
        .send()
        .await
        .map_err(|error| format!("OpenAI-compatible request failed: {error}"))?;

    let response = ensure_success(response, "OpenAI-compatible provider").await?;

    let body = response
        .json::<OpenAiChatResponse>()
        .await
        .map_err(|error| format!("OpenAI-compatible response was not valid JSON: {error}"))?;

    body.choices
        .first()
        .map(|choice| choice.message.content.clone())
        .filter(|content| !content.trim().is_empty())
        .ok_or_else(|| "OpenAI-compatible provider returned no content".to_string())
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
        .ok_or_else(|| "Firecrawl API key is not saved".to_string())?;
    let base_url =
        sanitize_http_base_url(&settings.firecrawl_base_url, true, false, "Firecrawl URL")?;
    let request = FirecrawlSearchRequest {
        query,
        limit: limit.clamp(1, 10),
        scrape_options: FirecrawlScrapeOptions {
            formats: vec!["markdown".to_string()],
        },
    };

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
        .ok_or_else(|| "Firecrawl API key is not saved".to_string())?;
    let base_url =
        sanitize_http_base_url(&settings.firecrawl_base_url, true, false, "Firecrawl URL")?;
    let request = FirecrawlSearchRequest {
        query,
        limit: limit.clamp(1, 10),
        scrape_options: FirecrawlScrapeOptions {
            formats: vec!["markdown".to_string()],
        },
    };

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

pub async fn send_email(
    settings: &ModelSettings,
    to: &str,
    subject: &str,
    body: &str,
) -> Result<String, String> {
    if subject.trim().is_empty() || subject.len() > MAX_EMAIL_SUBJECT_LENGTH {
        return Err(format!(
            "Email subject must be 1-{MAX_EMAIL_SUBJECT_LENGTH} characters"
        ));
    }
    if body.trim().is_empty() || body.len() > MAX_EMAIL_BODY_LENGTH {
        return Err(format!(
            "Email body must be 1-{MAX_EMAIL_BODY_LENGTH} characters"
        ));
    }
    match settings.email_provider.as_str() {
        "resend" => send_resend(settings, to, subject, body).await,
        "sendgrid" => send_sendgrid(settings, to, subject, body).await,
        "none" => Err("No email provider configured".to_string()),
        provider => Err(format!("Unsupported email provider: {provider}")),
    }
}

async fn send_resend(
    settings: &ModelSettings,
    to: &str,
    subject: &str,
    body: &str,
) -> Result<String, String> {
    let api_key = settings
        .email_api_key
        .as_deref()
        .ok_or_else(|| "Resend API key is not saved".to_string())?;
    let from = format!("{} <{}>", settings.email_from_name, settings.email_from);
    let request = ResendEmailRequest {
        from: &from,
        to: vec![to],
        subject,
        html: &markdownish_to_html(body),
    };
    let response = http_client()?
        .post("https://api.resend.com/emails")
        .bearer_auth(api_key)
        .json(&request)
        .send()
        .await
        .map_err(|error| format!("Resend request failed: {error}"))?;
    let _ = ensure_success(response, "Resend").await?;
    Ok("Sent with Resend".to_string())
}

async fn send_sendgrid(
    settings: &ModelSettings,
    to: &str,
    subject: &str,
    body: &str,
) -> Result<String, String> {
    let api_key = settings
        .email_api_key
        .as_deref()
        .ok_or_else(|| "SendGrid API key is not saved".to_string())?;
    let html = markdownish_to_html(body);
    let request = SendGridEmailRequest {
        personalizations: vec![SendGridPersonalization {
            to: vec![SendGridEmail {
                email: to,
                name: None,
            }],
        }],
        from: SendGridEmail {
            email: &settings.email_from,
            name: Some(&settings.email_from_name),
        },
        subject,
        content: vec![SendGridContent {
            content_type: "text/html",
            value: &html,
        }],
    };
    let response = http_client()?
        .post("https://api.sendgrid.com/v3/mail/send")
        .bearer_auth(api_key)
        .json(&request)
        .send()
        .await
        .map_err(|error| format!("SendGrid request failed: {error}"))?;
    let _ = ensure_success(response, "SendGrid").await?;
    Ok("Sent with SendGrid".to_string())
}

fn parse_firecrawl_sources(payload: Value) -> Vec<ResearchSource> {
    let candidates = payload
        .get("data")
        .and_then(Value::as_array)
        .cloned()
        .or_else(|| payload.get("results").and_then(Value::as_array).cloned())
        .unwrap_or_default();

    candidates
        .into_iter()
        .filter_map(|item| {
            let title = string_field(&item, &["title", "metadata.title"])
                .unwrap_or_else(|| "Untitled source".to_string());
            let url = string_field(&item, &["url", "metadata.sourceURL", "metadata.url"])
                .unwrap_or_default();
            let description =
                string_field(&item, &["description", "snippet", "metadata.description"])
                    .unwrap_or_default();
            let content = string_field(&item, &["markdown", "content", "text", "summary"])
                .unwrap_or_else(|| description.clone());
            if url.is_empty() && content.is_empty() {
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

async fn ensure_success(
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

fn markdownish_to_html(value: &str) -> String {
    value
        .lines()
        .map(|line| format!("<p>{}</p>", escape_html(line)))
        .collect::<Vec<String>>()
        .join("")
}

fn escape_html(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
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
    fn email_html_escapes_untrusted_body() {
        let html = markdownish_to_html("Hi <script>alert(1)</script> & \"team\"");

        assert!(html.contains("&lt;script&gt;"));
        assert!(html.contains("&amp;"));
        assert!(html.contains("&quot;team&quot;"));
    }
}
