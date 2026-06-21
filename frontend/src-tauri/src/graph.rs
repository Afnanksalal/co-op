use chrono::Utc;
use std::collections::HashSet;
use tauri::AppHandle;

use crate::constants::MAX_DOCUMENTS;
use crate::knowledge_store::list_document_summaries;
use crate::storage::{load_or_create_state, require_usable_activation};
use crate::types::{
    DesktopState, KnowledgeGraphEdge, KnowledgeGraphNode, KnowledgeGraphSnapshot, StartupProfile,
};

#[tauri::command]
pub fn get_knowledge_graph(app: AppHandle) -> Result<KnowledgeGraphSnapshot, String> {
    let mut state = load_or_create_state(&app)?;
    require_usable_activation(&state)?;
    if let Ok(documents) = list_document_summaries(&app, MAX_DOCUMENTS) {
        state.documents = documents;
    }
    Ok(build_knowledge_graph(&state))
}

pub fn build_knowledge_graph(state: &DesktopState) -> KnowledgeGraphSnapshot {
    let mut builder = GraphBuilder::default();
    let company_id = company_node_id(&state.workspace);

    if has_company_profile(&state.workspace) {
        builder.add_node(
            &company_id,
            &display_company(&state.workspace),
            "company",
            profile_summary(&state.workspace),
        );
    }

    add_profile_graph(&mut builder, &state.workspace, &company_id);

    for document in &state.documents {
        let document_id = format!("document:{}", document.id);
        builder.add_node(
            &document_id,
            &document.title,
            "document",
            format!(
                "{} source with {} saved sections",
                empty_dash(&document.source),
                document.chunk_count.max(document.chunks.len())
            ),
        );
        builder.add_edge(&company_id, &document_id, "has_knowledge", 0.72);
    }

    for memory in &state.memories {
        let memory_id = format!("memory:{}", memory.id);
        builder.add_node(
            &memory_id,
            &memory.title,
            "memory",
            format!(
                "{} memory from {}",
                empty_dash(&memory.memory_type),
                empty_dash(&memory.source)
            ),
        );
        builder.add_edge(&company_id, &memory_id, "remembers", memory.confidence);
    }

    for run in &state.research_runs {
        let research_id = format!("research:{}", run.id);
        builder.add_node(
            &research_id,
            &run.query,
            "research",
            format!("{} source(s), provider {}", run.sources.len(), run.provider),
        );
        builder.add_edge(&company_id, &research_id, "monitors", 0.66);
    }

    for lead in &state.leads {
        let lead_id = format!("lead:{}", lead.id);
        builder.add_node(
            &lead_id,
            &first_non_empty(&[
                &lead.name,
                &lead.company_name,
                &lead.website,
                "Untitled lead",
            ]),
            "lead",
            format!(
                "{} lead, score {}, status {}",
                empty_dash(&lead.lead_type),
                lead.lead_score,
                empty_dash(&lead.status)
            ),
        );
        builder.add_edge(
            &company_id,
            &lead_id,
            "targets",
            lead.lead_score as f32 / 100.0,
        );
    }

    for campaign in &state.campaigns {
        let campaign_id = format!("campaign:{}", campaign.id);
        builder.add_node(
            &campaign_id,
            &campaign.name,
            "campaign",
            format!(
                "{} campaign for {} leads",
                empty_dash(&campaign.mode),
                empty_dash(&campaign.target_lead_type)
            ),
        );
        builder.add_edge(&company_id, &campaign_id, "runs_campaign", 0.65);
        for email in state
            .campaign_emails
            .iter()
            .filter(|email| email.campaign_id == campaign.id)
        {
            let lead_id = format!("lead:{}", email.lead_id);
            if builder.has_node(&lead_id) {
                builder.add_edge(&campaign_id, &lead_id, "contacts", 0.58);
            }
        }
    }

    for run in &state.workflow_runs {
        let run_id = format!("workflow:{}", run.id);
        builder.add_node(
            &run_id,
            &run.objective,
            "workflow",
            format!(
                "{} work plan, status {}, sensitivity {}",
                empty_dash(&run.workflow_type),
                empty_dash(&run.status),
                empty_dash(&run.risk_level)
            ),
        );
        builder.add_edge(&company_id, &run_id, "executed", 0.5);
    }

    builder.snapshot()
}

pub fn graph_context(state: &DesktopState) -> String {
    let graph = build_knowledge_graph(state);
    if graph.nodes.is_empty() {
        return String::new();
    }

    let mut context = format!(
        "\n\nBusiness memory: {} items, {} connections.\n",
        graph.nodes.len(),
        graph.edges.len()
    );
    for edge in graph.edges.iter().take(12) {
        let source = graph
            .nodes
            .iter()
            .find(|node| node.id == edge.source)
            .map(|node| node.label.as_str())
            .unwrap_or(edge.source.as_str());
        let target = graph
            .nodes
            .iter()
            .find(|node| node.id == edge.target)
            .map(|node| node.label.as_str())
            .unwrap_or(edge.target.as_str());
        context.push_str(&format!(
            "- {} --{}--> {} ({:.2})\n",
            source, edge.relationship, target, edge.weight
        ));
    }
    context
}

#[derive(Default)]
struct GraphBuilder {
    node_ids: HashSet<String>,
    edge_ids: HashSet<String>,
    nodes: Vec<KnowledgeGraphNode>,
    edges: Vec<KnowledgeGraphEdge>,
}

impl GraphBuilder {
    fn add_node(&mut self, id: &str, label: &str, node_type: &str, summary: String) {
        let trimmed_label = label.trim();
        if id.trim().is_empty() || trimmed_label.is_empty() || !self.node_ids.insert(id.to_string())
        {
            return;
        }
        self.nodes.push(KnowledgeGraphNode {
            id: id.to_string(),
            label: trimmed_label.to_string(),
            node_type: node_type.to_string(),
            summary,
        });
    }

    fn add_edge(&mut self, source: &str, target: &str, relationship: &str, weight: f32) {
        if source == target || !self.has_node(source) || !self.has_node(target) {
            return;
        }
        let id = format!("{source}:{relationship}:{target}");
        if !self.edge_ids.insert(id.clone()) {
            return;
        }
        self.edges.push(KnowledgeGraphEdge {
            id,
            source: source.to_string(),
            target: target.to_string(),
            relationship: relationship.to_string(),
            weight: weight.clamp(0.0, 1.0),
        });
    }

    fn has_node(&self, id: &str) -> bool {
        self.node_ids.contains(id)
    }

    fn snapshot(self) -> KnowledgeGraphSnapshot {
        KnowledgeGraphSnapshot {
            generated_at: Utc::now().to_rfc3339(),
            nodes: self.nodes,
            edges: self.edges,
        }
    }
}

fn add_profile_graph(builder: &mut GraphBuilder, profile: &StartupProfile, company_id: &str) {
    if !builder.has_node(company_id) {
        return;
    }

    add_profile_node(
        builder,
        company_id,
        "founder",
        &profile.founder_name,
        "founded_by",
        &profile.founder_role,
        0.88,
    );
    add_profile_node(
        builder,
        company_id,
        "stage",
        &profile.stage,
        "at_stage",
        "Current company maturity",
        0.74,
    );
    add_profile_node(
        builder,
        company_id,
        "sector",
        &first_non_empty(&[&profile.sector, &profile.industry]),
        "operates_in",
        "Market sector",
        0.74,
    );
    add_profile_node(
        builder,
        company_id,
        "business_model",
        &profile.business_model,
        "uses_model",
        "Commercial motion",
        0.7,
    );
    add_profile_node(
        builder,
        company_id,
        "revenue_model",
        &profile.revenue_model,
        "monetizes_with",
        "Revenue model",
        0.64,
    );
    add_profile_node(
        builder,
        company_id,
        "funding",
        &profile.funding_stage,
        "funded_by",
        "Capital stage",
        0.62,
    );
    add_profile_node(
        builder,
        company_id,
        "customer",
        &profile.target_customers,
        "serves",
        "Ideal customer profile",
        0.86,
    );
    add_profile_node(
        builder,
        company_id,
        "problem",
        &profile.problem,
        "solves_problem",
        "Problem statement",
        0.9,
    );
    add_profile_node(
        builder,
        company_id,
        "solution",
        &profile.solution,
        "offers_solution",
        "Solution narrative",
        0.9,
    );
    add_profile_node(
        builder,
        company_id,
        "advantage",
        &profile.competitive_advantage,
        "defended_by",
        "Differentiation",
        0.8,
    );
    add_profile_node(
        builder,
        company_id,
        "region",
        &first_non_empty(&[
            &profile.operating_regions,
            &profile.country,
            &profile.location,
        ]),
        "operates_in_region",
        "Operating geography",
        0.58,
    );
}

fn add_profile_node(
    builder: &mut GraphBuilder,
    company_id: &str,
    node_type: &str,
    label: &str,
    relationship: &str,
    summary: &str,
    weight: f32,
) {
    let label = label.trim();
    if label.is_empty() || label == "other" || label == "not_yet" {
        return;
    }
    let id = format!("{}:{}", node_type, slug(label));
    builder.add_node(&id, label, node_type, summary.to_string());
    builder.add_edge(company_id, &id, relationship, weight);
}

fn has_company_profile(profile: &StartupProfile) -> bool {
    [
        &profile.company_name,
        &profile.tagline,
        &profile.description,
        &profile.problem,
        &profile.solution,
    ]
    .iter()
    .any(|value| !value.trim().is_empty())
}

fn display_company(profile: &StartupProfile) -> String {
    first_non_empty(&[&profile.company_name, &profile.tagline, "Company workspace"])
}

fn company_node_id(profile: &StartupProfile) -> String {
    format!("company:{}", slug(&display_company(profile)))
}

fn profile_summary(profile: &StartupProfile) -> String {
    let mut facts = Vec::new();
    push_fact(&mut facts, "stage", &profile.stage);
    push_fact(
        &mut facts,
        "sector",
        &first_non_empty(&[&profile.sector, &profile.industry]),
    );
    push_fact(&mut facts, "model", &profile.business_model);
    push_fact(&mut facts, "team", &profile.team_size);
    push_fact(
        &mut facts,
        "region",
        &first_non_empty(&[&profile.country, &profile.location]),
    );
    if facts.is_empty() {
        "Local company workspace".to_string()
    } else {
        facts.join(", ")
    }
}

fn push_fact(facts: &mut Vec<String>, label: &str, value: &str) {
    let value = value.trim();
    if value.is_empty() || value == "other" {
        return;
    }
    facts.push(format!("{label}: {value}"));
}

fn slug(value: &str) -> String {
    let mut slug = value
        .to_lowercase()
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() {
                character
            } else {
                '-'
            }
        })
        .collect::<String>()
        .split('-')
        .filter(|part| !part.is_empty())
        .collect::<Vec<&str>>()
        .join("-");
    if slug.is_empty() {
        slug = "unknown".to_string();
    }
    slug
}

fn first_non_empty(values: &[&str]) -> String {
    values
        .iter()
        .map(|value| value.trim())
        .find(|value| !value.is_empty())
        .unwrap_or("")
        .to_string()
}

fn empty_dash(value: &str) -> String {
    if value.trim().is_empty() {
        "-".to_string()
    } else {
        value.trim().to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{BusinessMemory, DesktopState, KnowledgeChunk, KnowledgeDocument, Lead};

    #[test]
    fn graph_links_workspace_documents_and_leads() {
        let mut state = DesktopState::default();
        state.workspace.company_name = "Co-Op".to_string();
        state.workspace.stage = "mvp".to_string();
        state.workspace.sector = "saas".to_string();
        state.workspace.target_customers = "Business owners".to_string();
        state.documents.push(KnowledgeDocument {
            id: "doc1".to_string(),
            title: "Deck".to_string(),
            source: "upload".to_string(),
            content: "content".to_string(),
            chunk_count: 1,
            chunks: vec![KnowledgeChunk {
                id: "chunk1".to_string(),
                document_id: "doc1".to_string(),
                content: "content".to_string(),
                vector: vec![1.0],
                created_at: Utc::now().to_rfc3339(),
            }],
            created_at: Utc::now().to_rfc3339(),
        });
        state.leads.push(Lead {
            id: "lead1".to_string(),
            lead_type: "company".to_string(),
            name: String::new(),
            company_name: "Acme".to_string(),
            email: String::new(),
            website: String::new(),
            profile_url: String::new(),
            platform: String::new(),
            niche: String::new(),
            location: String::new(),
            description: String::new(),
            lead_score: 80,
            status: "new".to_string(),
            source: "manual".to_string(),
            created_at: Utc::now().to_rfc3339(),
        });
        state.memories.push(BusinessMemory {
            id: "memory1".to_string(),
            memory_type: "decision".to_string(),
            title: "Pipeline focus".to_string(),
            content: "Focus on qualified pipeline this month.".to_string(),
            source: "test".to_string(),
            confidence: 0.9,
            pinned: false,
            created_at: Utc::now().to_rfc3339(),
            updated_at: Utc::now().to_rfc3339(),
        });

        let graph = build_knowledge_graph(&state);

        assert!(graph.nodes.iter().any(|node| node.node_type == "company"));
        assert!(graph.nodes.iter().any(|node| node.node_type == "document"));
        assert!(graph.nodes.iter().any(|node| node.node_type == "lead"));
        assert!(graph.nodes.iter().any(|node| node.node_type == "memory"));
        assert!(graph
            .edges
            .iter()
            .any(|edge| edge.relationship == "has_knowledge"));
        assert!(graph
            .edges
            .iter()
            .any(|edge| edge.relationship == "targets"));
        assert!(graph
            .edges
            .iter()
            .any(|edge| edge.relationship == "remembers"));
    }
}
