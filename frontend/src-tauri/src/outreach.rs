use chrono::Utc;
use futures::StreamExt;
use std::collections::HashSet;
use tauri::AppHandle;
use uuid::Uuid;

use crate::constants::{
    MAX_CAMPAIGN_SEND_BATCH, MAX_EMAIL_BODY_LENGTH, MAX_EMAIL_SUBJECT_LENGTH,
    MAX_GENERATED_EMAILS_PER_CAMPAIGN, MAX_LEADS, MAX_RESEARCH_RUNS,
};
use crate::guardrails::{validate_business_input, validate_model_output};
use crate::outreach_helpers::{
    apply_lead_vars, build_lead_search_query, fallback_leads_from_sources, lead_context,
    lead_fingerprint, lead_from_request, parse_generated_leads, sent_recipients_for_campaign,
    split_subject_body,
};
use crate::providers::{call_model, search_firecrawl, send_email};
use crate::research_sources::format_sources;
use crate::storage::{load_or_create_state, require_usable_activation, save_state, to_response};
use crate::types::{
    Campaign, CampaignEmail, CampaignEmailRequest, CampaignRequest, DesktopState,
    DesktopStateResponse, DiscoverLeadsRequest, Lead, LeadRequest, ResearchRun,
};
use crate::validation::{
    looks_like_email, validate_campaign_request, validate_lead_request, validate_read_only,
    validate_objective,
};
use crate::workflows::workspace_context;

#[tauri::command]
pub fn create_lead(app: AppHandle, request: LeadRequest) -> Result<DesktopStateResponse, String> {
    validate_lead_request(&request)?;
    let mut state = load_or_create_state(&app)?;
    require_usable_activation(&state)?;
    state.leads.insert(0, lead_from_request(request));
    save_state(&app, &state)?;
    Ok(to_response(state))
}

#[tauri::command]
pub async fn discover_leads(
    app: AppHandle,
    request: DiscoverLeadsRequest,
) -> Result<DesktopStateResponse, String> {
    validate_objective("Lead discovery query", &request.query)?;
    validate_business_input("Customer discovery", &request.lead_type, &request.query)?;
    if !matches!(request.lead_type.as_str(), "person" | "company") {
        return Err("Lead type must be person or company".to_string());
    }
    let mut state = load_or_create_state(&app)?;
    require_usable_activation(&state)?;
    let settings = validate_read_only(&state.model_settings)?;
    if settings.research_provider != "firecrawl" {
        return Err(
            "Lead discovery uses web search. Open Settings and save a web search key before discovering prospects."
                .to_string(),
        );
    }
    if settings
        .firecrawl_api_key
        .as_deref()
        .map(str::trim)
        .unwrap_or("")
        .is_empty()
    {
        return Err(
            "Lead discovery needs a saved web search key. Open Settings > Sources and save your web search key."
                .to_string(),
        );
    }

    let available_slots = MAX_LEADS.saturating_sub(state.leads.len());
    if available_slots == 0 {
        return Err("Lead list is full. Delete old leads before discovering more.".to_string());
    }
    let max_leads = request.max_leads.clamp(1, 25).min(available_slots);
    let search_query = build_lead_search_query(&request, &state);
    let sources = search_firecrawl(&settings, &search_query, max_leads.saturating_mul(2)).await?;
    if sources.is_empty() {
        return Err("No web results found for that lead search.".to_string());
    }

    let source_context = format_sources(&sources);
    let extraction_prompt = format!(
    "Company profile:\n{}\n\nLead type: {}\nOwner search brief: {}\nWeb search query: {}\nMax leads: {}\n\nWeb sources:\n{}\n\nExtract concrete leads only from the web sources. Do not invent names, websites, locations, or follower counts. Leave unknown fields empty. Score fit from 0-100 based on relevance to the company profile. Return one lead per line in this exact pipe-delimited format:\nname | company | website | profile_url | platform | niche | location | description | score",
    workspace_context(&state.workspace),
    request.lead_type,
    request.query.trim(),
    search_query,
    max_leads,
    source_context
  );
    let generated = call_model(
        &settings,
        "You are Co-Op's lead discovery extractor. Use only supplied web evidence. Only output pipe-delimited lead rows.",
        &extraction_prompt,
        Some(0.1),
    )
    .await?;

    let mut leads = parse_generated_leads(&generated, &request.lead_type, max_leads, &sources);
    if leads.is_empty() {
        leads = fallback_leads_from_sources(&sources, &request.lead_type, max_leads);
    }

    let mut seen = state
        .leads
        .iter()
        .map(lead_fingerprint)
        .collect::<HashSet<_>>();
    let mut saved_count = 0usize;
    for lead in leads.into_iter().rev() {
        if saved_count >= max_leads {
            break;
        }
        let fingerprint = lead_fingerprint(&lead);
        if fingerprint.is_empty() || !seen.insert(fingerprint) {
            continue;
        }
        state.leads.insert(0, lead);
        saved_count += 1;
    }
    if saved_count == 0 {
        return Err("Web search finished, but no new leads were found.".to_string());
    }

    state.model_settings = settings;
    state.research_runs.insert(
        0,
        ResearchRun {
            id: Uuid::new_v4().to_string(),
            query: search_query,
            provider: "firecrawl".to_string(),
            summary: format!(
                "Lead discovery web search saved {saved_count} new {}.",
                if saved_count == 1 { "lead" } else { "leads" }
            ),
            sources,
            created_at: Utc::now().to_rfc3339(),
        },
    );
    state.research_runs.truncate(MAX_RESEARCH_RUNS);
    save_state(&app, &state)?;
    Ok(to_response(state))
}

#[tauri::command]
pub fn create_campaign(
    app: AppHandle,
    request: CampaignRequest,
) -> Result<DesktopStateResponse, String> {
    validate_campaign_request(&request)?;
    validate_business_input(
        "Outreach",
        &request.target_lead_type,
        &format!(
            "{}\n{}\n{}",
            request.campaign_goal, request.subject_template, request.body_template
        ),
    )?;
    let mut state = load_or_create_state(&app)?;
    require_usable_activation(&state)?;
    state.campaigns.insert(
        0,
        Campaign {
            id: Uuid::new_v4().to_string(),
            name: request.name.trim().to_string(),
            mode: request.mode,
            target_lead_type: request.target_lead_type,
            subject_template: request.subject_template,
            body_template: request.body_template,
            campaign_goal: request.campaign_goal,
            tone: request.tone,
            call_to_action: request.call_to_action,
            status: "draft".to_string(),
            created_at: Utc::now().to_rfc3339(),
        },
    );
    save_state(&app, &state)?;
    Ok(to_response(state))
}

#[tauri::command]
pub async fn generate_campaign_emails(
    app: AppHandle,
    request: CampaignEmailRequest,
) -> Result<DesktopStateResponse, String> {
    let mut state = load_or_create_state(&app)?;
    require_usable_activation(&state)?;
    let campaign = state
        .campaigns
        .iter()
        .find(|campaign| campaign.id == request.campaign_id)
        .cloned()
        .ok_or_else(|| "Campaign not found".to_string())?;
    validate_business_input(
        "Outreach",
        &campaign.target_lead_type,
        &campaign.campaign_goal,
    )?;
    let leads: Vec<Lead> = state
        .leads
        .iter()
        .filter(|lead| {
            lead.lead_type == campaign.target_lead_type
                && !lead.email.trim().is_empty()
                && looks_like_email(&lead.email)
        })
        .filter(|lead| {
            !state
                .campaign_emails
                .iter()
                .any(|email| email.campaign_id == campaign.id && email.lead_id == lead.id)
        })
        .take(MAX_GENERATED_EMAILS_PER_CAMPAIGN)
        .cloned()
        .collect();
    if leads.is_empty() {
        return Err("No matching leads with valid email addresses found".to_string());
    }

    let settings = state.model_settings.clone();
    let mut generated = Vec::new();

    if campaign.mode == "ai_personalized" {
        let subject_template = campaign.subject_template.clone();
        let body_template = campaign.body_template.clone();
        let mut futures = futures::stream::iter(leads.into_iter().map(|lead| {
            let settings_clone = settings.clone();
            let subject_template = subject_template.clone();
            let body_template = body_template.clone();
            let prompt = format!(
                "Startup:\n{}\n\nCampaign goal: {}\nTone: {}\nCTA: {}\nLead:\n{}\n\nReturn subject on the first line and email body after that.",
                workspace_context(&state.workspace),
                campaign.campaign_goal,
                campaign.tone,
                campaign.call_to_action,
                lead_context(&lead)
            );

            async move {
                match call_model(
                    &settings_clone,
                    "You write concise, personalized B2B outreach emails. No fake claims.",
                    &prompt,
                    Some(0.7),
                )
                .await
                {
                    Ok(output) => {
                        if validate_model_output(&output, false, false, false).is_ok() {
                            let (subject, body) = split_subject_body(&output);
                            (lead, subject, body, None)
                        } else if !subject_template.trim().is_empty()
                            && !body_template.trim().is_empty()
                        {
                            (
                                lead.clone(),
                                apply_lead_vars(&subject_template, &lead),
                                apply_lead_vars(&body_template, &lead),
                                Some("AI output failed validation; used campaign template instead.".to_string()),
                            )
                        } else {
                            (
                                lead,
                                String::new(),
                                String::new(),
                                Some("AI output failed validation and no campaign template was available.".to_string()),
                            )
                        }
                    }
                    Err(error) => {
                        if !subject_template.trim().is_empty() && !body_template.trim().is_empty()
                        {
                            (
                                lead.clone(),
                                apply_lead_vars(&subject_template, &lead),
                                apply_lead_vars(&body_template, &lead),
                                Some(format!("AI generation failed ({error}); used campaign template instead.")),
                            )
                        } else {
                            (
                                lead,
                                String::new(),
                                String::new(),
                                Some(format!("AI generation failed: {error}")),
                            )
                        }
                    }
                }
            }
        }))
        .buffer_unordered(5);

        let mut failed = 0usize;
        while let Some((lead, subject, body, provider_message)) = futures.next().await {
            if subject.trim().is_empty() || body.trim().is_empty() {
                failed += 1;
                continue;
            }
            let status = if provider_message.is_some() {
                "generated_from_template".to_string()
            } else {
                "generated".to_string()
            };
            generated.push(CampaignEmail {
                id: Uuid::new_v4().to_string(),
                campaign_id: campaign.id.clone(),
                lead_id: lead.id,
                to: lead.email,
                subject,
                body,
                status,
                provider_message,
                created_at: Utc::now().to_rfc3339(),
                sent_at: None,
            });
        }
        if generated.is_empty() {
            return Err(format!(
                "Failed to generate any emails ({failed} lead(s) failed). Check your AI provider or add a campaign template fallback."
            ));
        }
    } else {
        for lead in leads {
            let (subject, body) = (
                apply_lead_vars(&campaign.subject_template, &lead),
                apply_lead_vars(&campaign.body_template, &lead),
            );
            generated.push(CampaignEmail {
                id: Uuid::new_v4().to_string(),
                campaign_id: campaign.id.clone(),
                lead_id: lead.id,
                to: lead.email,
                subject,
                body,
                status: "generated".to_string(),
                provider_message: None,
                created_at: Utc::now().to_rfc3339(),
                sent_at: None,
            });
        }
    }

    state.campaign_emails.extend(generated);
    if let Some(stored) = state
        .campaigns
        .iter_mut()
        .find(|item| item.id == campaign.id)
    {
        stored.status = "emails_generated".to_string();
    }
    save_state(&app, &state)?;
    Ok(to_response(state))
}

#[tauri::command]
pub async fn send_campaign_emails(
    app: AppHandle,
    request: CampaignEmailRequest,
) -> Result<DesktopStateResponse, String> {
    let mut state = load_or_create_state(&app)?;
    require_usable_activation(&state)?;
    let settings = validate_read_only(&state.model_settings)?;
    let indexes: Vec<usize> = state
        .campaign_emails
        .iter()
        .enumerate()
        .filter(|(_, email)| email.campaign_id == request.campaign_id && email.status != "sent")
        .map(|(index, _)| index)
        .take(MAX_CAMPAIGN_SEND_BATCH)
        .collect();
    if indexes.is_empty() {
        return Err("No generated unsent campaign emails found".to_string());
    }

    let mut sent_recipients =
        sent_recipients_for_campaign(&state.campaign_emails, &request.campaign_id);
    for index in indexes {
        let email = state.campaign_emails[index].clone();
        if !sent_recipients.insert(email.to.to_lowercase()) {
            state.campaign_emails[index].status = "skipped_duplicate".to_string();
            state.campaign_emails[index].provider_message =
                Some("Duplicate recipient skipped".to_string());
            continue;
        }
        match send_email(&settings, &email.to, &email.subject, &email.body).await {
            Ok(message) => {
                state.campaign_emails[index].status = "sent".to_string();
                state.campaign_emails[index].provider_message = Some(message);
                state.campaign_emails[index].sent_at = Some(Utc::now().to_rfc3339());
            }
            Err(error) => {
                state.campaign_emails[index].status = "failed".to_string();
                state.campaign_emails[index].provider_message = Some(error);
            }
        }
    }
    update_campaign_status_from_emails(&mut state, &request.campaign_id);
    save_state(&app, &state)?;
    Ok(to_response(state))
}

#[tauri::command]
pub fn update_campaign_email(
    app: AppHandle,
    email_id: String,
    subject: String,
    body: String,
) -> Result<DesktopStateResponse, String> {
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
    let mut state = load_or_create_state(&app)?;
    require_usable_activation(&state)?;
    let email = state
        .campaign_emails
        .iter_mut()
        .find(|e| e.id == email_id && e.status == "generated")
        .ok_or_else(|| "Email draft not found or already sent".to_string())?;
    email.subject = subject.trim().to_string();
    email.body = body.trim().to_string();
    save_state(&app, &state)?;
    Ok(to_response(state))
}

#[tauri::command]
pub async fn send_single_campaign_email(
    app: AppHandle,
    email_id: String,
    dry_run: bool,
) -> Result<DesktopStateResponse, String> {
    let mut state = load_or_create_state(&app)?;
    require_usable_activation(&state)?;
    let settings = validate_read_only(&state.model_settings)?;
    let index = state
        .campaign_emails
        .iter()
        .position(|e| e.id == email_id)
        .ok_or_else(|| "Email draft not found".to_string())?;
    if state.campaign_emails[index].status == "sent" {
        return Err("Email already sent".to_string());
    }
    if dry_run {
        state.campaign_emails[index].status = "dry_run_ok".to_string();
        state.campaign_emails[index].provider_message =
            Some("Dry run — not actually sent".to_string());
    } else {
        let email = state.campaign_emails[index].clone();
        match send_email(&settings, &email.to, &email.subject, &email.body).await {
            Ok(message) => {
                state.campaign_emails[index].status = "sent".to_string();
                state.campaign_emails[index].provider_message = Some(message);
                state.campaign_emails[index].sent_at = Some(Utc::now().to_rfc3339());
            }
            Err(error) => {
                state.campaign_emails[index].status = "failed".to_string();
                state.campaign_emails[index].provider_message = Some(error);
            }
        }
    }
    if let Some(campaign_id) = state.campaign_emails.get(index).map(|e| e.campaign_id.clone()) {
        update_campaign_status_from_emails(&mut state, &campaign_id);
    }
    state.model_settings = settings;
    save_state(&app, &state)?;
    Ok(to_response(state))
}

fn update_campaign_status_from_emails(state: &mut DesktopState, campaign_id: &str) {
    let sent = state
        .campaign_emails
        .iter()
        .filter(|e| e.campaign_id == campaign_id && e.status == "sent")
        .count();
    let failed = state
        .campaign_emails
        .iter()
        .filter(|e| e.campaign_id == campaign_id && e.status == "failed")
        .count();
    let total = state
        .campaign_emails
        .iter()
        .filter(|e| e.campaign_id == campaign_id)
        .count();
    if let Some(campaign) = state.campaigns.iter_mut().find(|c| c.id == campaign_id) {
        campaign.status = if sent == total && total > 0 {
            "sent".to_string()
        } else if sent > 0 {
            "partially_sent".to_string()
        } else if failed > 0 {
            "send_failed".to_string()
        } else {
            "emails_generated".to_string()
        };
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_campaign(id: &str) -> Campaign {
        Campaign {
            id: id.to_string(),
            name: "Test".to_string(),
            mode: "ai_personalized".to_string(),
            target_lead_type: "company".to_string(),
            subject_template: String::new(),
            body_template: String::new(),
            campaign_goal: "Test goal for campaign".to_string(),
            tone: "professional".to_string(),
            call_to_action: "Book a call".to_string(),
            status: "draft".to_string(),
            created_at: "2026-01-01T00:00:00Z".to_string(),
        }
    }

    fn test_email(campaign_id: &str, status: &str) -> CampaignEmail {
        CampaignEmail {
            id: Uuid::new_v4().to_string(),
            campaign_id: campaign_id.to_string(),
            lead_id: "lead-1".to_string(),
            to: "test@example.com".to_string(),
            subject: "Hello".to_string(),
            body: "Body text".to_string(),
            status: status.to_string(),
            provider_message: None,
            created_at: "2026-01-01T00:00:00Z".to_string(),
            sent_at: None,
        }
    }

    // Issue #15: All emails sent → campaign status is "sent".
    #[test]
    fn campaign_status_all_sent() {
        let mut state = DesktopState::default();
        state.campaigns.push(test_campaign("c1"));
        state.campaign_emails.push(test_email("c1", "sent"));
        state.campaign_emails.push(test_email("c1", "sent"));

        update_campaign_status_from_emails(&mut state, "c1");

        assert_eq!(state.campaigns[0].status, "sent");
    }

    // Issue #15: Some sent, some failed → "partially_sent".
    #[test]
    fn campaign_status_partially_sent() {
        let mut state = DesktopState::default();
        state.campaigns.push(test_campaign("c1"));
        state.campaign_emails.push(test_email("c1", "sent"));
        state.campaign_emails.push(test_email("c1", "failed"));

        update_campaign_status_from_emails(&mut state, "c1");

        assert_eq!(state.campaigns[0].status, "partially_sent");
    }

    // Issue #15: All failed → "send_failed".
    #[test]
    fn campaign_status_all_failed() {
        let mut state = DesktopState::default();
        state.campaigns.push(test_campaign("c1"));
        state.campaign_emails.push(test_email("c1", "failed"));
        state.campaign_emails.push(test_email("c1", "failed"));

        update_campaign_status_from_emails(&mut state, "c1");

        assert_eq!(state.campaigns[0].status, "send_failed");
    }

    // Issue #15: No sends attempted → "emails_generated".
    #[test]
    fn campaign_status_no_sends() {
        let mut state = DesktopState::default();
        state.campaigns.push(test_campaign("c1"));
        state.campaign_emails.push(test_email("c1", "generated"));
        state.campaign_emails.push(test_email("c1", "generated"));

        update_campaign_status_from_emails(&mut state, "c1");

        assert_eq!(state.campaigns[0].status, "emails_generated");
    }

    // Issue #15: Emails from other campaigns don't affect status.
    #[test]
    fn campaign_status_ignores_other_campaigns() {
        let mut state = DesktopState::default();
        state.campaigns.push(test_campaign("c1"));
        state.campaigns.push(test_campaign("c2"));
        state.campaign_emails.push(test_email("c1", "sent"));
        state.campaign_emails.push(test_email("c2", "failed"));

        update_campaign_status_from_emails(&mut state, "c1");

        assert_eq!(state.campaigns[0].status, "sent");
        assert_eq!(state.campaigns[1].status, "draft"); // c2 untouched
    }
}

