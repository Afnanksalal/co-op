use serde::Serialize;

use crate::constants::{MAX_EMAIL_BODY_LENGTH, MAX_EMAIL_SUBJECT_LENGTH};
use crate::types::ModelSettings;

use crate::providers::{ensure_success, http_client};

#[derive(Debug, Clone, Serialize)]
pub(crate) struct ResendEmailRequest<'a> {
    pub from: &'a str,
    pub to: Vec<&'a str>,
    pub subject: &'a str,
    pub html: &'a str,
}

#[derive(Debug, Clone, Serialize)]
pub(crate) struct SendGridEmailRequest<'a> {
    pub personalizations: Vec<SendGridPersonalization<'a>>,
    pub from: SendGridEmail<'a>,
    pub subject: &'a str,
    pub content: Vec<SendGridContent<'a>>,
}

#[derive(Debug, Clone, Serialize)]
pub(crate) struct SendGridPersonalization<'a> {
    pub to: Vec<SendGridEmail<'a>>,
}

#[derive(Debug, Clone, Serialize)]
pub(crate) struct SendGridEmail<'a> {
    pub email: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<&'a str>,
}

#[derive(Debug, Clone, Serialize)]
pub(crate) struct SendGridContent<'a> {
    #[serde(rename = "type")]
    pub content_type: &'a str,
    pub value: &'a str,
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
    let from = formatted_sender(settings);
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
            name: optional_sender_name(settings),
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

pub(crate) fn formatted_sender(settings: &ModelSettings) -> String {
    let sender_name = settings.email_from_name.trim();
    if sender_name.is_empty() {
        settings.email_from.trim().to_string()
    } else {
        format!("{sender_name} <{}>", settings.email_from.trim())
    }
}

pub(crate) fn optional_sender_name(settings: &ModelSettings) -> Option<&str> {
    let sender_name = settings.email_from_name.trim();
    if sender_name.is_empty() {
        None
    } else {
        Some(sender_name)
    }
}

pub(crate) fn markdownish_to_html(value: &str) -> String {
    value
        .lines()
        .map(|line| format!("<p>{}</p>", escape_html(line)))
        .collect::<Vec<String>>()
        .join("")
}

pub(crate) fn escape_html(value: &str) -> String {
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
    fn email_html_escapes_untrusted_body() {
        let html = markdownish_to_html("Hi <script>alert(1)</script> & \"team\"");

        assert!(html.contains("&lt;script&gt;"));
        assert!(html.contains("&amp;"));
        assert!(html.contains("&quot;team&quot;"));
    }

    #[test]
    fn sender_format_omits_blank_display_name() {
        let mut settings = ModelSettings {
            email_from: "owner@example.com".to_string(),
            email_from_name: String::new(),
            ..ModelSettings::default()
        };

        assert_eq!(formatted_sender(&settings), "owner@example.com");
        assert_eq!(optional_sender_name(&settings), None);

        settings.email_from_name = "Ops Team".to_string();

        assert_eq!(formatted_sender(&settings), "Ops Team <owner@example.com>");
        assert_eq!(optional_sender_name(&settings), Some("Ops Team"));
    }
}
