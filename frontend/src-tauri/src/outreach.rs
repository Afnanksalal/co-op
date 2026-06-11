use chrono::Utc;
use std::collections::HashSet;
use tauri::AppHandle;
use uuid::Uuid;

use crate::constants::{MAX_CAMPAIGN_SEND_BATCH, MAX_GENERATED_EMAILS_PER_CAMPAIGN};
use crate::providers::{call_model, send_email};
use crate::research::run_research_query;
use crate::storage::{load_or_create_state, save_state, to_response};
use crate::types::{
    Campaign, CampaignEmail, CampaignEmailRequest, CampaignRequest, DesktopStateResponse,
    DiscoverLeadsRequest, Lead, LeadRequest, ResearchRequest,
};
use crate::validation::{
    looks_like_email, validate_campaign_request, validate_lead_request, validate_model_settings,
    validate_objective,
};
use crate::workflows::workspace_context;

#[tauri::command]
pub fn create_lead(app: AppHandle, request: LeadRequest) -> Result<DesktopStateResponse, String> {
    validate_lead_request(&request)?;
    let mut state = load_or_create_state(&app)?;
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
    if !matches!(request.lead_type.as_str(), "person" | "company") {
        return Err("Lead type must be person or company".to_string());
    }
    let research = run_research_query(
        app.clone(),
        ResearchRequest {
            query: request.query.clone(),
            save_to_rag: false,
        },
    )
    .await?;
    let mut state = load_or_create_state(&app)?;
    let settings = state.model_settings.clone();
    let extraction_prompt = format!(
    "Startup workspace:\n{}\n\nLead type: {}\nMax leads: {}\nResearch summary:\n{}\n\nSources:\n{}\n\nExtract concrete leads. Return one lead per line in this exact pipe-delimited format:\nname | company | email | website | profile_url | platform | niche | location | description | score",
    workspace_context(&state.workspace),
    request.lead_type,
    request.max_leads.clamp(1, 25),
    research.summary,
    research
      .sources
      .iter()
      .map(|source| format!("{} {} {}", source.title, source.url, source.description))
      .collect::<Vec<String>>()
      .join("\n")
  );
    let generated = call_model(
    &settings,
    "You are Co-Op's lead discovery extractor. Only output pipe-delimited lead rows. Use empty fields when unknown.",
    &extraction_prompt,
  )
  .await?;

    let mut leads = parse_generated_leads(
        &generated,
        &request.lead_type,
        request.max_leads.clamp(1, 25),
    );
    if leads.is_empty() {
        leads = fallback_leads_from_research(
            &research,
            &request.lead_type,
            request.max_leads.clamp(1, 25),
        );
    }
    for lead in leads.into_iter().rev() {
        state.leads.insert(0, lead);
    }
    save_state(&app, &state)?;
    Ok(to_response(state))
}

#[tauri::command]
pub fn create_campaign(
    app: AppHandle,
    request: CampaignRequest,
) -> Result<DesktopStateResponse, String> {
    validate_campaign_request(&request)?;
    let mut state = load_or_create_state(&app)?;
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
    let campaign = state
        .campaigns
        .iter()
        .find(|campaign| campaign.id == request.campaign_id)
        .cloned()
        .ok_or_else(|| "Campaign not found".to_string())?;
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
    for lead in leads {
        let (subject, body) = if campaign.mode == "ai_personalized" {
            let prompt = format!(
        "Startup:\n{}\n\nCampaign goal: {}\nTone: {}\nCTA: {}\nLead:\n{}\n\nReturn subject on the first line and email body after that.",
        workspace_context(&state.workspace),
        campaign.campaign_goal,
        campaign.tone,
        campaign.call_to_action,
        lead_context(&lead)
      );
            let output = call_model(
                &settings,
                "You write concise, personalized B2B outreach emails. No fake claims.",
                &prompt,
            )
            .await?;
            split_subject_body(&output)
        } else {
            (
                apply_lead_vars(&campaign.subject_template, &lead),
                apply_lead_vars(&campaign.body_template, &lead),
            )
        };
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
    let mut settings = state.model_settings.clone();
    validate_model_settings(&mut settings)?;
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
    if let Some(campaign) = state
        .campaigns
        .iter_mut()
        .find(|campaign| campaign.id == request.campaign_id)
    {
        campaign.status = "sent_or_attempted".to_string();
    }
    save_state(&app, &state)?;
    Ok(to_response(state))
}

fn sent_recipients_for_campaign(emails: &[CampaignEmail], campaign_id: &str) -> HashSet<String> {
    emails
        .iter()
        .filter(|email| email.campaign_id == campaign_id && email.status == "sent")
        .map(|email| email.to.to_lowercase())
        .collect()
}

fn lead_from_request(request: LeadRequest) -> Lead {
    Lead {
        id: Uuid::new_v4().to_string(),
        lead_type: request.lead_type,
        name: request.name.trim().to_string(),
        company_name: request.company_name.trim().to_string(),
        email: request.email.trim().to_string(),
        website: request.website.trim().to_string(),
        profile_url: request.profile_url.trim().to_string(),
        platform: request.platform.trim().to_string(),
        niche: request.niche.trim().to_string(),
        location: request.location.trim().to_string(),
        description: request.description.trim().to_string(),
        lead_score: request.lead_score.min(100),
        status: request.status.trim().to_string(),
        source: request.source.trim().to_string(),
        created_at: Utc::now().to_rfc3339(),
    }
}

fn parse_generated_leads(output: &str, lead_type: &str, max: usize) -> Vec<Lead> {
    output
        .lines()
        .filter_map(|line| {
            let parts: Vec<&str> = line.split('|').map(str::trim).collect();
            if parts.len() < 10 {
                return None;
            }
            let score = parts[9].parse::<u8>().unwrap_or(50).min(100);
            Some(Lead {
                id: Uuid::new_v4().to_string(),
                lead_type: lead_type.to_string(),
                name: parts[0].to_string(),
                company_name: parts[1].to_string(),
                email: parts[2].to_string(),
                website: parts[3].to_string(),
                profile_url: parts[4].to_string(),
                platform: parts[5].to_string(),
                niche: parts[6].to_string(),
                location: parts[7].to_string(),
                description: parts[8].to_string(),
                lead_score: score,
                status: "new".to_string(),
                source: "discovery".to_string(),
                created_at: Utc::now().to_rfc3339(),
            })
        })
        .take(max)
        .collect()
}

fn fallback_leads_from_research(
    research: &crate::types::ResearchRun,
    lead_type: &str,
    max: usize,
) -> Vec<Lead> {
    research
        .sources
        .iter()
        .take(max)
        .map(|source| Lead {
            id: Uuid::new_v4().to_string(),
            lead_type: lead_type.to_string(),
            name: if lead_type == "person" {
                source.title.clone()
            } else {
                String::new()
            },
            company_name: if lead_type == "company" {
                source.title.clone()
            } else {
                String::new()
            },
            email: String::new(),
            website: source.url.clone(),
            profile_url: source.url.clone(),
            platform: "web".to_string(),
            niche: String::new(),
            location: String::new(),
            description: source.description.clone(),
            lead_score: 50,
            status: "new".to_string(),
            source: "research".to_string(),
            created_at: Utc::now().to_rfc3339(),
        })
        .collect()
}

fn split_subject_body(output: &str) -> (String, String) {
    let mut lines = output.lines();
    let first = lines
        .next()
        .unwrap_or("Quick note")
        .trim()
        .trim_start_matches("Subject:")
        .trim()
        .to_string();
    let rest = lines.collect::<Vec<&str>>().join("\n").trim().to_string();
    (first, rest)
}

fn apply_lead_vars(template: &str, lead: &Lead) -> String {
    template
        .replace("{{name}}", &lead.name)
        .replace("{{company}}", &lead.company_name)
        .replace("{{website}}", &lead.website)
        .replace("{{niche}}", &lead.niche)
        .replace("{{location}}", &lead.location)
}

fn lead_context(lead: &Lead) -> String {
    format!(
    "Name: {}\nCompany: {}\nEmail: {}\nWebsite: {}\nProfile: {}\nPlatform: {}\nNiche: {}\nLocation: {}\nDescription: {}",
    lead.name, lead.company_name, lead.email, lead.website, lead.profile_url, lead.platform, lead.niche, lead.location, lead.description
  )
}
