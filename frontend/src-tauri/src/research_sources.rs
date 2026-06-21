use crate::providers::search_firecrawl;
use crate::types::{ModelSettings, ResearchSource, StartupProfile};

const MAX_SEARCH_PART_CHARS: usize = 140;
const MAX_SEARCH_QUERY_CHARS: usize = 900;
const MAX_RESEARCH_SEARCHES: usize = 4;

pub(crate) async fn collect_research_sources(
    settings: &ModelSettings,
    profile: &StartupProfile,
    owner_query: &str,
    focus: &str,
    source_limit: usize,
) -> Result<(Vec<ResearchSource>, Vec<String>), String> {
    let queries = research_search_queries(profile, owner_query, focus);
    let mut merged = Vec::new();
    let mut used_queries = Vec::new();

    for query in queries.iter().take(MAX_RESEARCH_SEARCHES) {
        let remaining = source_limit.saturating_sub(merged.len()).max(2);
        let sources = search_firecrawl(settings, query, remaining).await?;
        used_queries.push(query.clone());
        merged.extend(sources);
        merged = dedupe_sources(filter_business_sources(merged, profile, owner_query, focus));
        if merged.len() >= source_limit {
            break;
        }
    }

    merged.truncate(source_limit);
    Ok((merged, used_queries))
}

pub(crate) fn ensure_web_search_ready(settings: &ModelSettings) -> Result<(), String> {
    if settings.research_provider != "firecrawl" {
        return Err(
            "Web search is required for source-backed business research. Open Settings and save a web search key."
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
            "Web search is not set up yet. Open Settings > Sources and save a web search key."
                .to_string(),
        );
    }
    Ok(())
}

pub(crate) fn require_sources(sources: &[ResearchSource], label: &str) -> Result<(), String> {
    if sources.is_empty() {
        return Err(format!(
            "No usable web sources matched this {label}. Add a clearer website, market, customer, or location, then try again."
        ));
    }
    Ok(())
}

pub(crate) fn format_sources(sources: &[ResearchSource]) -> String {
    if sources.is_empty() {
        return "No web sources found.".to_string();
    }
    sources
        .iter()
        .map(|source| {
            format!(
                "- {}\n  URL: {}\n  Description: {}\n  Content: {}",
                source.title,
                source.url,
                source.description,
                truncate(&source.content, 1500)
            )
        })
        .collect::<Vec<String>>()
        .join("\n")
}

pub(crate) fn format_search_queries(queries: &[String]) -> String {
    queries
        .iter()
        .map(|query| format!("- {query}"))
        .collect::<Vec<_>>()
        .join("\n")
}

pub(crate) fn research_search_queries(
    profile: &StartupProfile,
    owner_query: &str,
    focus: &str,
) -> Vec<String> {
    if is_competitor_focus(owner_query, focus) {
        return competitor_search_queries(profile, owner_query);
    }

    vec![business_web_search_query(profile, owner_query, focus)]
}

pub(crate) fn business_web_search_query(
    profile: &StartupProfile,
    owner_query: &str,
    focus: &str,
) -> String {
    let mut parts = Vec::new();
    push_search_part(&mut parts, owner_query);
    push_search_part(&mut parts, focus);
    push_search_part(&mut parts, &profile.company_name);
    push_search_part(&mut parts, &profile.website);
    push_search_part(&mut parts, &profile.industry);
    push_search_part(&mut parts, &profile.sector);
    push_search_part(&mut parts, &profile.target_customers);
    push_search_part(&mut parts, &profile.problem);
    push_search_part(&mut parts, &profile.solution);
    push_search_part(&mut parts, &profile.operating_regions);
    push_search_part(&mut parts, &profile.country);
    push_search_part(&mut parts, &profile.city);

    if is_competitor_focus(owner_query, focus) {
        push_search_part(
            &mut parts,
            "direct competitors alternatives service providers positioning pricing",
        );
    }

    truncate(
        &dedupe_search_parts(parts).join(" "),
        MAX_SEARCH_QUERY_CHARS,
    )
}

pub(crate) fn filter_business_sources(
    sources: Vec<ResearchSource>,
    profile: &StartupProfile,
    owner_query: &str,
    focus: &str,
) -> Vec<ResearchSource> {
    let terms = relevance_terms(profile, owner_query, focus);
    if terms.is_empty() {
        return sources;
    }
    let strict = is_competitor_focus(owner_query, focus);

    sources
        .into_iter()
        .filter(|source| source_relevance_score(source, &terms) >= if strict { 2 } else { 1 })
        .collect()
}

pub fn requires_live_web_research(area: &str, objective: &str) -> bool {
    let area = area.trim().to_lowercase();
    if matches!(area.as_str(), "competitor" | "legal" | "investor") {
        return true;
    }

    let objective = objective.to_lowercase();
    let web_terms = [
        "competitor",
        "competitors",
        "alternative",
        "alternatives",
        "market",
        "trend",
        "pricing",
        "price",
        "legal",
        "law",
        "regulation",
        "compliance",
        "contract",
        "investor",
        "funding",
        "customer segment",
        "lead",
        "prospect",
        "outreach angle",
        "who are",
        "find",
        "current",
        "latest",
        "recent",
        "today",
    ];

    web_terms.iter().any(|term| objective.contains(term))
}

fn competitor_search_queries(profile: &StartupProfile, owner_query: &str) -> Vec<String> {
    let business_context = compact_context(&[
        profile.solution.as_str(),
        profile.description.as_str(),
        profile.industry.as_str(),
        profile.sector.as_str(),
    ]);
    let buyer_context = compact_context(&[
        profile.target_customers.as_str(),
        profile.problem.as_str(),
        profile.operating_regions.as_str(),
        profile.country.as_str(),
        profile.city.as_str(),
    ]);
    let region_context = compact_context(&[
        profile.country.as_str(),
        profile.city.as_str(),
        profile.operating_regions.as_str(),
    ]);

    let mut queries = Vec::new();
    push_search_part(
        &mut queries,
        &format!(
            "{} {} {} competitors alternatives",
            profile.company_name, business_context, buyer_context
        ),
    );
    push_search_part(
        &mut queries,
        &format!(
            "{} companies providers agencies {}",
            business_context, region_context
        ),
    );
    push_search_part(
        &mut queries,
        &format!(
            "{} service providers {} {}",
            profile.solution, profile.target_customers, region_context
        ),
    );
    push_search_part(
        &mut queries,
        &format!(
            "{} alternatives {} {}",
            owner_query, business_context, buyer_context
        ),
    );

    dedupe_search_parts(queries)
        .into_iter()
        .map(|query| truncate(&query, MAX_SEARCH_QUERY_CHARS))
        .collect()
}

fn compact_context(values: &[&str]) -> String {
    let mut parts = Vec::new();
    for value in values {
        for phrase in value
            .split([',', ';', '\n'])
            .map(|part| part.split_whitespace().collect::<Vec<_>>().join(" "))
            .map(|part| part.trim().to_string())
            .filter(|part| part.len() >= 3)
        {
            if !is_generic_context_phrase(&phrase) {
                push_search_part(&mut parts, &phrase);
            }
        }
    }
    dedupe_search_parts(parts).join(" ")
}

fn is_generic_context_phrase(value: &str) -> bool {
    matches!(
        value.trim().to_lowercase().as_str(),
        "other" | "software" | "business" | "businesses" | "company" | "companies"
    )
}

fn dedupe_sources(sources: Vec<ResearchSource>) -> Vec<ResearchSource> {
    let mut seen = std::collections::HashSet::new();
    sources
        .into_iter()
        .filter(|source| {
            let key = if source.url.trim().is_empty() {
                format!(
                    "{}|{}",
                    source.title.trim().to_lowercase(),
                    source.description.trim().to_lowercase()
                )
            } else {
                source
                    .url
                    .trim()
                    .trim_end_matches('/')
                    .to_lowercase()
                    .to_string()
            };
            seen.insert(key)
        })
        .collect()
}

fn is_competitor_focus(owner_query: &str, focus: &str) -> bool {
    let focus = focus.to_lowercase();
    let owner_query = owner_query.to_lowercase();
    focus.contains("competitor")
        || focus.contains("alternative")
        || owner_query.contains("competitor")
        || owner_query.contains("competitors")
        || owner_query.contains("alternative")
        || owner_query.contains("alternatives")
}

fn push_search_part(parts: &mut Vec<String>, value: &str) {
    let cleaned = value.split_whitespace().collect::<Vec<_>>().join(" ");
    let trimmed = cleaned.trim();
    if trimmed.is_empty() || trimmed == "-" || trimmed.eq_ignore_ascii_case("other") {
        return;
    }
    parts.push(truncate(trimmed, MAX_SEARCH_PART_CHARS));
}

fn dedupe_search_parts(parts: Vec<String>) -> Vec<String> {
    let mut seen = std::collections::HashSet::new();
    parts
        .into_iter()
        .filter(|part| seen.insert(part.to_lowercase()))
        .collect()
}

fn relevance_terms(profile: &StartupProfile, owner_query: &str, focus: &str) -> Vec<String> {
    let mut terms = std::collections::BTreeSet::new();
    for value in [
        profile.company_name.as_str(),
        profile.website.as_str(),
        profile.industry.as_str(),
        profile.sector.as_str(),
        profile.target_customers.as_str(),
        profile.problem.as_str(),
        profile.solution.as_str(),
        profile.operating_regions.as_str(),
        owner_query,
        focus,
    ] {
        for token in value
            .split(|character: char| !character.is_ascii_alphanumeric())
            .map(str::trim)
            .filter(|token| token.len() >= 4)
        {
            let token = token.to_lowercase();
            if !is_generic_relevance_term(&token) {
                terms.insert(token);
            }
        }
    }
    terms.into_iter().take(24).collect()
}

fn is_generic_relevance_term(term: &str) -> bool {
    matches!(
        term,
        "business"
            | "businesses"
            | "company"
            | "companies"
            | "customer"
            | "customers"
            | "client"
            | "clients"
            | "competitor"
            | "competitors"
            | "alternative"
            | "alternatives"
            | "market"
            | "markets"
            | "pricing"
            | "positioning"
            | "software"
            | "platform"
            | "product"
            | "products"
            | "service"
            | "services"
            | "solution"
            | "solutions"
            | "startup"
            | "startups"
            | "saas"
            | "b2b"
            | "b2c"
            | "other"
            | "find"
            | "finding"
            | "what"
            | "where"
            | "when"
            | "which"
            | "with"
            | "that"
            | "this"
            | "from"
            | "into"
            | "your"
            | "mine"
    )
}

fn source_relevance_score(source: &ResearchSource, terms: &[String]) -> usize {
    let title = source.title.to_lowercase();
    let haystack = format!(
        "{} {} {} {}",
        title,
        source.description.to_lowercase(),
        source.content.to_lowercase(),
        source.url.to_lowercase()
    );

    terms
        .iter()
        .map(|term| {
            if !haystack.contains(term) {
                0
            } else if title.contains(term) {
                2
            } else {
                1
            }
        })
        .sum()
}

fn truncate(value: &str, max: usize) -> String {
    if value.chars().count() <= max {
        value.to_string()
    } else {
        format!("{}...", value.chars().take(max).collect::<String>())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn business_search_query_adds_company_context_for_competitors() {
        let profile = StartupProfile {
            company_name: "VTRON".to_string(),
            target_customers: "B2B SaaS founders".to_string(),
            problem: "finding customers".to_string(),
            solution: "sales workflow software".to_string(),
            ..StartupProfile::default()
        };

        let query = business_web_search_query(&profile, "who are my competitors", "competitors");

        assert!(query.contains("VTRON"));
        assert!(query.contains("B2B SaaS founders"));
        assert!(query.contains("direct competitors alternatives service providers"));
    }

    #[test]
    fn competitor_research_uses_multiple_specific_searches() {
        let profile = StartupProfile {
            company_name: "VTRON".to_string(),
            solution: "custom SaaS and IoT electronics development".to_string(),
            target_customers: "businesses and government buyers".to_string(),
            country: "India".to_string(),
            ..StartupProfile::default()
        };

        let queries = research_search_queries(&profile, "find me my competitors", "competitors");

        assert!(queries.len() >= 3);
        assert!(queries.iter().any(|query| query.contains("VTRON")));
        assert!(queries
            .iter()
            .any(|query| query.contains("companies providers agencies India")));
        assert!(queries.iter().any(|query| query.contains("government")));
    }

    #[test]
    fn live_web_research_is_required_for_external_fact_work() {
        assert!(requires_live_web_research(
            "competitor",
            "who are my competitors"
        ));
        assert!(requires_live_web_research(
            "legal",
            "review privacy compliance"
        ));
        assert!(requires_live_web_research("operations", "find competitors"));
        assert!(!requires_live_web_research(
            "operations",
            "summarize my saved notes"
        ));
    }

    #[test]
    fn competitor_sources_must_match_business_context() {
        let profile = StartupProfile {
            company_name: "VTRON".to_string(),
            target_customers: "B2B SaaS founders".to_string(),
            problem: "finding customers".to_string(),
            solution: "sales workflow software".to_string(),
            ..StartupProfile::default()
        };
        let sources = vec![ResearchSource {
            title: "Mastering B2B SaaS competitor research".to_string(),
            url: "https://example.com/generic".to_string(),
            description: "A generic article about competitor research.".to_string(),
            content: "B2B SaaS competitor research basics.".to_string(),
        }];

        let filtered =
            filter_business_sources(sources, &profile, "who are my competitors", "competitors");

        assert!(filtered.is_empty());
    }

    #[test]
    fn relevant_sources_are_kept_for_market_research() {
        let profile = StartupProfile::default();
        let sources = vec![ResearchSource {
            title: "Robotics software market update".to_string(),
            url: "https://example.com/robotics".to_string(),
            description: "Robotics teams are buying new workflow tools.".to_string(),
            content: "Manufacturers are modernizing robotics operations.".to_string(),
        }];

        let filtered =
            filter_business_sources(sources, &profile, "robotics software market", "market_scan");

        assert_eq!(filtered.len(), 1);
    }

    #[test]
    fn truncate_handles_unicode_boundaries() {
        assert_eq!(truncate("éééé", 2), "éé...");
    }
}
