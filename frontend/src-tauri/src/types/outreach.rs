use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Lead {
    pub id: String,
    pub lead_type: String,
    pub name: String,
    pub company_name: String,
    pub email: String,
    pub website: String,
    pub profile_url: String,
    pub platform: String,
    pub niche: String,
    pub location: String,
    pub description: String,
    pub lead_score: u8,
    pub status: String,
    pub source: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Campaign {
    pub id: String,
    pub name: String,
    pub mode: String,
    pub target_lead_type: String,
    pub subject_template: String,
    pub body_template: String,
    pub campaign_goal: String,
    pub tone: String,
    pub call_to_action: String,
    pub status: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CampaignEmail {
    pub id: String,
    pub campaign_id: String,
    pub lead_id: String,
    pub to: String,
    pub subject: String,
    pub body: String,
    pub status: String,
    pub provider_message: Option<String>,
    pub created_at: String,
    pub sent_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Investor {
    pub id: String,
    pub name: String,
    pub firm: String,
    pub stage: String,
    pub sectors: Vec<String>,
    pub geography: String,
    pub ticket_size: String,
    pub notes: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Alert {
    pub id: String,
    pub name: String,
    pub query: String,
    pub cadence: String,
    pub enabled: bool,
    pub last_result: Option<String>,
    pub created_at: String,
}
