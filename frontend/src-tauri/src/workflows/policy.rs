use crate::guardrails::QuestionType;

pub fn business_system_prompt(workflow_type: &str, council_mode: &str, question_type: QuestionType) -> String {
    let capability_boundary = "\
CAPABILITY BOUNDARY: You are a text-based business advisor running inside the Co-Op desktop application. \
You have NO terminal access, NO ability to execute commands, NO access to live servers, databases, dashboards, or deployment infrastructure. \
You cannot open browsers, run scripts, or perform any system action. When a user asks you to perform a system action:
1. Explicitly state that Co-Op cannot execute that action.
2. Provide the exact steps or commands the user should execute themselves.
3. Clearly label your output as \"Instructions for the owner\" — not actions you performed.
Never present instructions as if you executed them. Never say \"I checked the logs\" or \"I restarted the server.\"";

    let grounding_rule = "\
STRICT GROUNDING RULE: You may ONLY reference facts that appear in the attached workspace context, company files, business memory, or web sources. Specifically:
- Do NOT invent hosting providers, deployment platforms, service names, or infrastructure details.
- Do NOT invent team names, departments, or organizational structures.
- Do NOT invent tools, dashboards, monitoring services, or third-party integrations.
- Do NOT present inferred information as fact. If you must infer, prefix with \"Assuming...\" or \"If [condition], then...\"
- When information is missing, say exactly what is missing instead of filling the gap.";

    let format_instruction = match question_type {
        QuestionType::Factual => "\
Answer in 1-3 sentences. Do NOT add sections for Known Facts, Assumptions, Risks, Review Notes, or Next Actions. \
If an assumption is critical, state it inline.",
        QuestionType::ActionRequest => "\
State whether Co-Op can perform this action (it cannot execute commands). Then list the exact steps the owner should take. \
Do NOT generate Key Decisions, Risks, or Assumptions sections.",
        QuestionType::Planning => "\
Structure the answer with: Decision, Evidence Used, Assumptions, Action Plan, Risks, and Next Checkpoint. \
Mark external actions for human approval.",
        QuestionType::Brainstorming => "\
List 3-7 options with one-line tradeoffs each. Recommend one. Do NOT add Known Facts or Risk sections.",
        QuestionType::Comparison => "\
Create a comparison table or list. Classify each item. State evidence source. Do NOT add a planning framework.",
    };
    format!(
        "{capability_boundary}\n\n{grounding_rule}\n\nYou are Co-Op, a local-first business management and operations harness. Workflow type: {workflow_type}. \
Keep company data private, separate known facts from assumptions, and never fabricate company metrics. \
Use live web sources when they are attached. Do not make competitor, legal, investor, pricing, or market claims without source evidence. \
{format_instruction} \
When recommending external actions such as legal, payroll, payment, fundraising, security, or customer outreach, mark whether a human owner must approve before execution. \
Review policy is {council_mode}; use critique only when configured."
    )
}

pub fn should_run_review_gate(council_mode: &str, workflow_type: &str, objective: &str) -> bool {
    match council_mode {
        "off" => false,
        "review_only" | "full_council" => true,
        "high_risk_only" => {
            if matches!(workflow_type, "finance" | "legal" | "strategy") {
                return true;
            }
            let objective = objective.to_lowercase();
            [
                "contract",
                "lawsuit",
                "compliance",
                "payroll",
                "payment",
                "bank",
                "investor",
                "board",
                "acquisition",
                "termination",
                "security",
                "privacy",
            ]
            .iter()
            .any(|term| objective.contains(term))
        }
        _ => false,
    }
}

pub fn workflow_risk_level(workflow_type: &str, objective: &str) -> String {
    if matches!(workflow_type, "legal" | "finance") {
        return "high".to_string();
    }
    if workflow_type == "strategy" {
        return "elevated".to_string();
    }
    let objective = objective.to_lowercase();
    let high_risk = [
        "contract",
        "lawsuit",
        "compliance",
        "payroll",
        "payment",
        "bank",
        "investor",
        "board",
        "acquisition",
        "termination",
        "security",
        "privacy",
        "gdpr",
        "hipaa",
        "soc 2",
    ]
    .iter()
    .any(|term| objective.contains(term));
    if high_risk {
        "high".to_string()
    } else {
        "normal".to_string()
    }
}


#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn high_risk_council_mode_only_reviews_risky_workflows() {
        assert!(should_run_review_gate(
            "high_risk_only",
            "legal",
            "Review vendor contract"
        ));
        assert!(should_run_review_gate(
            "high_risk_only",
            "operations",
            "Approve payroll payment run"
        ));
        assert!(!should_run_review_gate(
            "high_risk_only",
            "operations",
            "Summarize weekly support tags"
        ));
    }

    #[test]
    fn workflow_risk_level_flags_sensitive_business_actions() {
        assert_eq!(workflow_risk_level("finance", "Forecast burn"), "high");
        assert_eq!(
            workflow_risk_level("operations", "Prepare GDPR security checklist"),
            "high"
        );
        assert_eq!(workflow_risk_level("strategy", "Plan launch"), "elevated");
        assert_eq!(
            workflow_risk_level("sales", "Summarize discovery calls"),
            "normal"
        );
    }
}
