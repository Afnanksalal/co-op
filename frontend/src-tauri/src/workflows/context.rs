use crate::types::StartupProfile;

pub fn workspace_context(profile: &crate::types::StartupProfile) -> String {
    let mut lines: Vec<String> = Vec::new();

    let founder_name = profile.founder_name.trim();
    let founder_role = profile.founder_role.trim();
    if !founder_name.is_empty() {
        if !founder_role.is_empty() {
            lines.push(format!("Founder: {founder_name} ({founder_role})"));
        } else {
            lines.push(format!("Founder: {founder_name}"));
        }
    }
    push_field(&mut lines, "Company", &profile.company_name);
    push_field(&mut lines, "Tagline", &profile.tagline);
    push_field(&mut lines, "Website", &profile.website);
    push_field(&mut lines, "Description", &profile.description);
    push_field(&mut lines, "Stage", &profile.stage);
    push_field(&mut lines, "Industry", &profile.industry);
    push_field(&mut lines, "Sector", &profile.sector);
    push_field(&mut lines, "Location", &profile.location);
    push_field(&mut lines, "Country", &profile.country);
    push_field(&mut lines, "City", &profile.city);
    push_field(&mut lines, "Operating regions", &profile.operating_regions);
    push_field(&mut lines, "Team size", &profile.team_size);
    if let Some(count) = profile.cofounder_count {
        lines.push(format!("Co-founder count: {count}"));
    }
    push_field(&mut lines, "Customers", &profile.target_customers);
    push_field(&mut lines, "Problem", &profile.problem);
    push_field(&mut lines, "Solution", &profile.solution);
    push_field(&mut lines, "Business model", &profile.business_model);
    push_field(&mut lines, "Revenue model", &profile.revenue_model);
    push_field(&mut lines, "Revenue status", &profile.is_revenue);
    if let Some(revenue) = profile.monthly_revenue {
        lines.push(format!("Monthly revenue: {}", format_money(revenue)));
    }
    push_field(&mut lines, "Funding stage", &profile.funding_stage);
    if let Some(raised) = profile.total_raised {
        lines.push(format!("Total raised: {}", format_money(raised)));
    }
    push_field(&mut lines, "Traction", &profile.traction);
    push_field(&mut lines, "Competitive advantage", &profile.competitive_advantage);
    push_field(&mut lines, "Goals", &profile.goals);

    if lines.is_empty() {
        return "No company profile fields are filled in yet.".to_string();
    }
    lines.join("\n")
}

fn is_default_value(label: &str, value: &str) -> bool {
    let trimmed = value.trim();
    matches!((label, trimmed), 
        ("Stage", "idea") | 
        ("Sector", "other") | 
        ("Revenue model", "not_yet") | 
        ("Revenue status", "pre_revenue") | 
        ("Funding stage", "bootstrapped")
    )
}

fn push_field(lines: &mut Vec<String>, label: &str, value: &str) {
    let trimmed = value.trim();
    if !trimmed.is_empty() && !is_default_value(label, value) {
        lines.push(format!("{label}: {trimmed}"));
    }
}

fn format_money(value: f64) -> String {
    if value.fract() == 0.0 {
        format!("{value:.0}")
    } else {
        format!("{value:.2}")
    }
}


#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn workspace_context_omits_empty_fields() {
        let profile = crate::types::StartupProfile {
            company_name: "WatchDawg".to_string(),
            problem: "Website security scanning is manual and slow.".to_string(),
            solution: "Automated website security analysis.".to_string(),
            ..crate::types::StartupProfile::default()
        };
        let context = workspace_context(&profile);
        assert!(context.contains("Company: WatchDawg"));
        assert!(context.contains("Problem:"));
        assert!(context.contains("Solution:"));
        // Empty fields should not appear
        assert!(!context.contains("Location:"));
        assert!(!context.contains("Country:"));
        assert!(!context.contains("City:"));
        assert!(!context.contains("Founder:"));
        assert!(!context.contains("-"));
    }

    #[test]
    fn workspace_context_shows_message_for_empty_profile() {
        let profile = crate::types::StartupProfile {
            founder_role: String::new(),
            stage: String::new(),
            sector: String::new(),
            revenue_model: String::new(),
            is_revenue: String::new(),
            funding_stage: String::new(),
            ..crate::types::StartupProfile::default()
        };
        let context = workspace_context(&profile);
        assert!(context.contains("No company profile fields"));
    }
}
