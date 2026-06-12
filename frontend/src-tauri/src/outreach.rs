use chrono::Utc;
use std::collections::HashSet;
use tauri::AppHandle;
use uuid::Uuid;

use crate::constants::{
    MAX_CAMPAIGN_SEND_BATCH, MAX_GENERATED_EMAILS_PER_CAMPAIGN, MAX_LEADS, MAX_RESEARCH_RUNS,
};
use crate::providers::{call_model, search_firecrawl, send_email};
use crate::research::format_sources;
use crate::storage::{load_or_create_state, require_usable_activation, save_state, to_response};
use crate::types::{
    Campaign, CampaignEmail, CampaignEmailRequest, CampaignRequest, DesktopState,
    DesktopStateResponse, DiscoverLeadsRequest, Lead, LeadRequest, ResearchRun, ResearchSource,
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
    if !matches!(request.lead_type.as_str(), "person" | "company") {
        return Err("Lead type must be person or company".to_string());
    }
    let mut state = load_or_create_state(&app)?;
    require_usable_activation(&state)?;
    let mut settings = state.model_settings.clone();
    validate_model_settings(&mut settings)?;
    if settings.research_provider != "firecrawl" {
        return Err(
            "Lead discovery uses web search. Open Setup > Research and choose Web search before discovering leads."
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
            "Lead discovery needs a saved web search key. Open Setup > Research and save your Firecrawl key."
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
    "Company profile:\n{}\n\nLead type: {}\nOwner search brief: {}\nWeb search query: {}\nMax leads: {}\n\nWeb sources:\n{}\n\nExtract concrete leads only from the web sources. Do not invent names, emails, websites, locations, or follower counts. Leave unknown fields empty. Score fit from 0-100 based on relevance to the company profile. Return one lead per line in this exact pipe-delimited format:\nname | company | email | website | profile_url | platform | niche | location | description | score",
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
    )
    .await?;

    let mut leads = parse_generated_leads(&generated, &request.lead_type, max_leads);
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
    require_usable_activation(&state)?;
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
            let lead = Lead {
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
                source: "web discovery".to_string(),
                created_at: Utc::now().to_rfc3339(),
            };
            if lead_fingerprint(&lead).is_empty() {
                None
            } else {
                Some(lead)
            }
        })
        .take(max)
        .collect()
}

fn fallback_leads_from_sources(
    sources: &[ResearchSource],
    lead_type: &str,
    max: usize,
) -> Vec<Lead> {
    sources
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
            source: "web search".to_string(),
            created_at: Utc::now().to_rfc3339(),
        })
        .collect()
}

fn build_lead_search_query(request: &DiscoverLeadsRequest, state: &DesktopState) -> String {
    let workspace = &state.workspace;
    let mut parts = Vec::new();
    push_search_part(&mut parts, &request.query);
    if request.lead_type == "person" {
        push_search_part(
            &mut parts,
            "founder OR operator OR creator OR expert OR consultant",
        );
        push_search_part(&mut parts, "email OR contact OR LinkedIn");
    } else {
        push_search_part(&mut parts, "company OR business OR startup");
        push_search_part(&mut parts, "contact OR email OR website");
    }
    push_search_part(&mut parts, &workspace.target_customers);
    push_search_part(&mut parts, &workspace.industry);
    push_search_part(&mut parts, &workspace.sector);
    push_search_part(&mut parts, &workspace.operating_regions);
    push_search_part(&mut parts, &workspace.country);
    push_search_part(&mut parts, &workspace.location);
    push_search_part(&mut parts, &workspace.problem);
    push_search_part(&mut parts, &workspace.solution);
    dedupe_search_parts(parts).join(" ")
}

fn push_search_part(parts: &mut Vec<String>, value: &str) {
    let trimmed = value.trim();
    if !trimmed.is_empty() && trimmed != "other" {
        parts.push(trimmed.to_string());
    }
}

fn dedupe_search_parts(parts: Vec<String>) -> Vec<String> {
    let mut seen = HashSet::new();
    parts
        .into_iter()
        .filter(|part| seen.insert(part.to_lowercase()))
        .collect()
}

fn lead_fingerprint(lead: &Lead) -> String {
    let identity = [
        lead.email.as_str(),
        lead.profile_url.as_str(),
        lead.website.as_str(),
        lead.company_name.as_str(),
        lead.name.as_str(),
    ]
    .into_iter()
    .find(|value| !value.trim().is_empty())
    .map(normalized_identity)
    .unwrap_or_default();

    if identity.is_empty() {
        String::new()
    } else {
        format!("{}:{identity}", lead.lead_type.trim().to_lowercase())
    }
}

fn normalized_identity(value: &str) -> String {
    value
        .trim()
        .trim_end_matches('/')
        .trim_start_matches("https://")
        .trim_start_matches("http://")
        .trim_start_matches("www.")
        .to_lowercase()
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

#[cfg(test)]
mod tests {
    use super::*;

    fn campaign_email(to: &str, status: &str) -> CampaignEmail {
        CampaignEmail {
            id: Uuid::new_v4().to_string(),
            campaign_id: "campaign".to_string(),
            lead_id: Uuid::new_v4().to_string(),
            to: to.to_string(),
            subject: "Hello".to_string(),
            body: "Body".to_string(),
            status: status.to_string(),
            provider_message: None,
            created_at: Utc::now().to_rfc3339(),
            sent_at: None,
        }
    }

    #[test]
    fn sent_recipients_are_case_insensitive() {
        let emails = vec![
            campaign_email("Owner@Example.com", "sent"),
            campaign_email("new@example.com", "generated"),
        ];
        let seen = sent_recipients_for_campaign(&emails, "campaign");

        assert!(seen.contains("owner@example.com"));
        assert!(!seen.contains("new@example.com"));
    }

    #[test]
    fn subject_body_split_handles_subject_prefix() {
        let (subject, body) = split_subject_body("Subject: Quick idea\nHi there\nSecond line");

        assert_eq!(subject, "Quick idea");
        assert_eq!(body, "Hi there\nSecond line");
    }

    #[test]
    fn lead_vars_are_applied_to_templates() {
        let lead = Lead {
            id: Uuid::new_v4().to_string(),
            lead_type: "company".to_string(),
            name: "Asha".to_string(),
            company_name: "ExampleCo".to_string(),
            email: "asha@example.com".to_string(),
            website: "https://example.com".to_string(),
            profile_url: String::new(),
            platform: "web".to_string(),
            niche: "SaaS".to_string(),
            location: "Bengaluru".to_string(),
            description: String::new(),
            lead_score: 80,
            status: "new".to_string(),
            source: "test".to_string(),
            created_at: Utc::now().to_rfc3339(),
        };

        assert_eq!(
            apply_lead_vars("Hi {{name}} at {{company}} in {{location}}", &lead),
            "Hi Asha at ExampleCo in Bengaluru"
        );
    }

    #[test]
    fn lead_discovery_query_uses_search_brief_and_workspace_context() {
        let mut state = DesktopState::default();
        state.workspace.industry = "Fintech".to_string();
        state.workspace.target_customers = "Finance teams at B2B SaaS companies".to_string();
        state.workspace.operating_regions = "United States".to_string();
        state.workspace.problem = "Manual revenue reporting".to_string();
        let request = DiscoverLeadsRequest {
            query: "series A companies hiring finance leaders".to_string(),
            lead_type: "company".to_string(),
            max_leads: 10,
        };

        let query = build_lead_search_query(&request, &state);

        assert!(query.contains("series A companies hiring finance leaders"));
        assert!(query.contains("company OR business OR startup"));
        assert!(query.contains("Finance teams at B2B SaaS companies"));
        assert!(query.contains("Fintech"));
        assert!(query.contains("United States"));
        assert!(query.contains("Manual revenue reporting"));
    }

    #[test]
    fn lead_fingerprint_dedupes_common_identity_variants() {
        let mut first = test_lead("company");
        first.website = "https://www.example.com/".to_string();
        first.company_name = "Example".to_string();
        let mut second = test_lead("company");
        second.website = "http://example.com".to_string();
        second.company_name = "Different label".to_string();

        assert_eq!(lead_fingerprint(&first), lead_fingerprint(&second));
    }

    #[test]
    fn generated_leads_without_identity_are_rejected() {
        let output = " | | | | | web | finance | | interesting but anonymous | 70";

        assert!(parse_generated_leads(output, "company", 5).is_empty());
    }

    fn test_lead(lead_type: &str) -> Lead {
        Lead {
            id: Uuid::new_v4().to_string(),
            lead_type: lead_type.to_string(),
            name: String::new(),
            company_name: String::new(),
            email: String::new(),
            website: String::new(),
            profile_url: String::new(),
            platform: String::new(),
            niche: String::new(),
            location: String::new(),
            description: String::new(),
            lead_score: 50,
            status: "new".to_string(),
            source: "test".to_string(),
            created_at: Utc::now().to_rfc3339(),
        }
    }
}
