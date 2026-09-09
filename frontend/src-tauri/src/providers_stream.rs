use futures::StreamExt;
use serde::Serialize;
use serde_json::Value;
use std::sync::atomic::{AtomicBool, Ordering};

use crate::providers::{ensure_success, http_client};
use crate::types::ModelSettings;
use crate::validation::sanitize_http_base_url;

#[derive(Debug, Clone, Serialize)]
struct ChatMessage<'a> {
    role: &'a str,
    content: &'a str,
}

#[derive(Debug, Clone, Serialize)]
struct OllamaStreamRequest<'a> {
    model: &'a str,
    stream: bool,
    messages: Vec<ChatMessage<'a>>,
    options: OllamaStreamOptions,
}

#[derive(Debug, Clone, Serialize)]
struct OllamaStreamOptions {
    num_predict: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
}

#[derive(Debug, Clone, Serialize)]
struct OpenAiStreamRequest<'a> {
    model: &'a str,
    messages: Vec<ChatMessage<'a>>,
    temperature: f32,
    max_tokens: u32,
    stream: bool,
}

#[derive(Debug, PartialEq, Eq)]
pub(crate) enum StreamDelta {
    Text(String),
    Done,
}

/// Stream the primary assistant answer. Review/research calls stay unary.
pub async fn call_model_streaming(
    settings: &ModelSettings,
    system_prompt: &str,
    user_prompt: &str,
    temperature: Option<f32>,
    cancel: &AtomicBool,
    on_token: &mut (dyn FnMut(&str) + Send),
) -> Result<String, String> {
    match settings.provider.as_str() {
        "ollama" => {
            stream_ollama(
                settings,
                system_prompt,
                user_prompt,
                temperature,
                cancel,
                on_token,
            )
            .await
        }
        "openai_compatible" => {
            stream_openai(
                settings,
                system_prompt,
                user_prompt,
                temperature,
                cancel,
                on_token,
            )
            .await
        }
        provider => Err(format!("Unsupported provider: {provider}")),
    }
}

pub(crate) fn parse_ollama_stream_line(line: &str) -> Option<StreamDelta> {
    let value: Value = serde_json::from_str(line.trim()).ok()?;
    let text = value
        .get("message")
        .and_then(|message| message.get("content"))
        .and_then(Value::as_str)
        .unwrap_or("");
    let done = value.get("done").and_then(Value::as_bool).unwrap_or(false);
    if !text.is_empty() {
        return Some(StreamDelta::Text(text.to_string()));
    }
    if done {
        return Some(StreamDelta::Done);
    }
    None
}

pub(crate) fn parse_openai_sse_line(line: &str) -> Option<StreamDelta> {
    let payload = line.trim().strip_prefix("data:")?.trim();
    if payload.is_empty() {
        return None;
    }
    if payload == "[DONE]" {
        return Some(StreamDelta::Done);
    }
    let value: Value = serde_json::from_str(payload).ok()?;
    let text = value
        .get("choices")
        .and_then(Value::as_array)
        .and_then(|choices| choices.first())
        .and_then(|choice| choice.get("delta"))
        .and_then(|delta| delta.get("content"))
        .and_then(Value::as_str)
        .unwrap_or("");
    if text.is_empty() {
        None
    } else {
        Some(StreamDelta::Text(text.to_string()))
    }
}

fn cancelled(cancel: &AtomicBool) -> Result<(), String> {
    if cancel.load(Ordering::SeqCst) {
        Err("Chat cancelled.".to_string())
    } else {
        Ok(())
    }
}

async fn consume_line_stream(
    response: reqwest::Response,
    cancel: &AtomicBool,
    on_token: &mut (dyn FnMut(&str) + Send),
    parse_line: fn(&str) -> Option<StreamDelta>,
) -> Result<String, String> {
    let mut stream = response.bytes_stream();
    let mut buffer = String::new();
    let mut full = String::new();
    while let Some(chunk) = stream.next().await {
        cancelled(cancel)?;
        let chunk = chunk.map_err(|error| format!("Stream read failed: {error}"))?;
        buffer.push_str(&String::from_utf8_lossy(&chunk));
        while let Some(index) = buffer.find('\n') {
            let line = buffer[..index].to_string();
            buffer.replace_range(..=index, "");
            match parse_line(&line) {
                Some(StreamDelta::Text(text)) => {
                    on_token(&text);
                    full.push_str(&text);
                }
                Some(StreamDelta::Done) => return Ok(full),
                None => {}
            }
        }
    }
    if !buffer.trim().is_empty() {
        if let Some(StreamDelta::Text(text)) = parse_line(&buffer) {
            on_token(&text);
            full.push_str(&text);
        }
    }
    if full.trim().is_empty() {
        Err("Provider stream returned no content".to_string())
    } else {
        Ok(full)
    }
}

async fn stream_ollama(
    settings: &ModelSettings,
    system_prompt: &str,
    user_prompt: &str,
    temperature: Option<f32>,
    cancel: &AtomicBool,
    on_token: &mut (dyn FnMut(&str) + Send),
) -> Result<String, String> {
    cancelled(cancel)?;
    let request = OllamaStreamRequest {
        model: &settings.ollama_model,
        stream: true,
        options: OllamaStreamOptions {
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
    let response = http_client()?
        .post(format!("{}/api/chat", ollama_base_url))
        .json(&request)
        .send()
        .await
        .map_err(|error| format!("Ollama request failed: {error}"))?;
    let response = ensure_success(response, "Ollama").await?;
    consume_line_stream(response, cancel, on_token, parse_ollama_stream_line).await
}

async fn stream_openai(
    settings: &ModelSettings,
    system_prompt: &str,
    user_prompt: &str,
    temperature: Option<f32>,
    cancel: &AtomicBool,
    on_token: &mut (dyn FnMut(&str) + Send),
) -> Result<String, String> {
    cancelled(cancel)?;
    let api_key = settings
        .openai_api_key
        .as_deref()
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "OpenAI-compatible provider selected but no API key is saved".to_string())?;
    let input_chars = system_prompt.len() + user_prompt.len();
    let estimated_input_tokens = (input_chars / 3) as u32;
    let configured_max = settings.normalized_max_tokens();
    let effective_max_tokens = if estimated_input_tokens >= configured_max {
        256
    } else {
        configured_max.saturating_sub(estimated_input_tokens).max(256)
    };
    let request = OpenAiStreamRequest {
        model: &settings.openai_model,
        temperature: temperature.unwrap_or(0.2),
        max_tokens: effective_max_tokens,
        stream: true,
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
    consume_line_stream(response, cancel, on_token, parse_openai_sse_line).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ollama_stream_lines_yield_deltas_then_done() {
        assert_eq!(
            parse_ollama_stream_line(r#"{"message":{"content":"Hel"},"done":false}"#),
            Some(StreamDelta::Text("Hel".to_string()))
        );
        assert_eq!(
            parse_ollama_stream_line(r#"{"message":{"content":""},"done":true}"#),
            Some(StreamDelta::Done)
        );
    }

    #[test]
    fn openai_sse_lines_yield_deltas_then_done() {
        assert_eq!(
            parse_openai_sse_line(r#"data: {"choices":[{"delta":{"content":"Hi"}}]}"#),
            Some(StreamDelta::Text("Hi".to_string()))
        );
        assert_eq!(
            parse_openai_sse_line("data: [DONE]"),
            Some(StreamDelta::Done)
        );
    }
}
