mod chat;
mod constants;
mod graph;
mod guardrails;
mod knowledge_store;
mod license;
mod memory;
mod memory_store;
mod outreach;
mod providers;
mod rag;
mod research;
mod research_sources;
mod secrets;
mod security;
mod settings;
mod storage;
mod tools;
mod types;
mod validation;
mod workflows;
mod workspace;

pub use chat::run_agent_chat;
pub use graph::get_knowledge_graph;
pub use license::{
    activate_license, clear_activation, get_activation_state, get_machine_fingerprint,
    heartbeat_license,
};
pub use memory::{save_business_memory, search_business_memory};
pub use outreach::{
    create_campaign, create_lead, discover_leads, generate_campaign_emails, send_campaign_emails,
};
pub use rag::{add_knowledge_document, search_knowledge};
pub use research::run_research_query;
pub use settings::save_model_settings;
pub use tools::{analyze_pitch_deck, run_alert_now, run_calculator, save_alert, save_cap_table};
pub use workflows::run_business_workflow;
pub use workspace::{save_bookmark, save_integration, save_workspace_profile};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            activate_license,
            add_knowledge_document,
            analyze_pitch_deck,
            clear_activation,
            create_campaign,
            create_lead,
            discover_leads,
            generate_campaign_emails,
            get_activation_state,
            get_knowledge_graph,
            get_machine_fingerprint,
            heartbeat_license,
            run_agent_chat,
            run_alert_now,
            run_business_workflow,
            run_calculator,
            run_research_query,
            save_alert,
            save_business_memory,
            save_bookmark,
            save_cap_table,
            save_integration,
            save_model_settings,
            save_workspace_profile,
            search_knowledge,
            search_business_memory,
            send_campaign_emails,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
