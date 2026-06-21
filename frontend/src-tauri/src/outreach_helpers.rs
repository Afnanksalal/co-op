use chrono::Utc;
use std::collections::HashSet;
use uuid::Uuid;

use crate::types::{
    CampaignEmail, DesktopState, DiscoverLeadsRequest, Lead, LeadRequest, ResearchSource,
};

pub(crate) fn sent_recipients_for_campaign(
    emails: &[CampaignEmail],
    campaign_id: &str,
) -> HashSet<String> {
    emails
        .iter()
        .filter(|email| email.campaign_id == campaign_id && email.status == "sent")
        .map(|email| email.to.to_lowercase())
        .collect()
}

pub(crate) fn lead_from_request(request: LeadRequest) -> Lead {
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

pub(crate) fn parse_generated_leads(output: &str, lead_type: &str, max: usize) -> Vec<Lead> {
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

pub(crate) fn fallback_leads_from_sources(
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

pub(crate) fn build_lead_search_query(
    request: &DiscoverLeadsRequest,
    state: &DesktopState,
) -> String {
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

pub(crate) fn lead_fingerprint(lead: &Lead) -> String {
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

pub(crate) fn split_subject_body(output: &str) -> (String, String) {
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

pub(crate) fn apply_lead_vars(template: &str, lead: &Lead) -> String {
    template
        .replace("{{name}}", &lead.name)
        .replace("{{company}}", &lead.company_name)
        .replace("{{website}}", &lead.website)
        .replace("{{niche}}", &lead.niche)
        .replace("{{location}}", &lead.location)
}

pub(crate) fn lead_context(lead: &Lead) -> String {
    format!(
        "Name: {}\nCompany: {}\nEmail: {}\nWebsite: {}\nProfile: {}\nPlatform: {}\nNiche: {}\nLocation: {}\nDescription: {}",
        lead.name,
        lead.company_name,
        lead.email,
        lead.website,
        lead.profile_url,
        lead.platform,
        lead.niche,
        lead.location,
        lead.description
    )
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

fn normalized_identity(value: &str) -> String {
    value
        .trim()
        .trim_end_matches('/')
        .trim_start_matches("https://")
        .trim_start_matches("http://")
        .trim_start_matches("www.")
        .to_lowercase()
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
