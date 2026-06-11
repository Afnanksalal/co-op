use base64::{engine::general_purpose, Engine as _};
use chrono::Utc;
use quick_xml::events::Event;
use quick_xml::reader::Reader;
use std::io::{Cursor, Read};
use tauri::AppHandle;
use uuid::Uuid;
use zip::ZipArchive;

use crate::constants::{MAX_ALERTS, MAX_CAP_TABLES, MAX_PITCH_DECKS};
use crate::providers::call_model;
use crate::research::run_research_query;
use crate::storage::{load_or_create_state, require_usable_activation, save_state, to_response};
use crate::types::{
    Alert, AlertRequest, BusinessToolResult, CapTableRequest, CapTableScenario,
    DesktopStateResponse, PitchDeckAnalysis, PitchDeckRequest, ResearchRequest,
};
use crate::validation::{validate_cap_table, validate_model_settings, validate_objective};
use crate::workflows::workspace_context;

const MAX_PITCH_DECK_UPLOAD_BYTES: usize = 25 * 1024 * 1024;
const MAX_PITCH_CONTEXT_CHARS: usize = 80_000;
const MIN_PITCH_CONTEXT_CHARS: usize = 20;

#[tauri::command]
pub fn save_alert(app: AppHandle, request: AlertRequest) -> Result<DesktopStateResponse, String> {
    validate_objective("Alert query", &request.query)?;
    if request.name.trim().len() < 2 {
        return Err("Alert name is required".to_string());
    }
    if !matches!(request.cadence.as_str(), "daily" | "weekly" | "manual") {
        return Err("Alert cadence must be daily, weekly, or manual".to_string());
    }
    let mut state = load_or_create_state(&app)?;
    require_usable_activation(&state)?;
    state.alerts.insert(
        0,
        Alert {
            id: Uuid::new_v4().to_string(),
            name: request.name.trim().to_string(),
            query: request.query.trim().to_string(),
            cadence: request.cadence,
            enabled: request.enabled,
            last_result: None,
            created_at: Utc::now().to_rfc3339(),
        },
    );
    state.alerts.truncate(MAX_ALERTS);
    save_state(&app, &state)?;
    Ok(to_response(state))
}

#[tauri::command]
pub async fn run_alert_now(
    app: AppHandle,
    alert_id: String,
) -> Result<DesktopStateResponse, String> {
    let state = load_or_create_state(&app)?;
    require_usable_activation(&state)?;
    let alert = state
        .alerts
        .iter()
        .find(|alert| alert.id == alert_id)
        .cloned()
        .ok_or_else(|| "Alert not found".to_string())?;
    let research = run_research_query(
        app.clone(),
        ResearchRequest {
            query: alert.query.clone(),
            save_to_rag: true,
        },
    )
    .await?;
    let mut state = load_or_create_state(&app)?;
    if let Some(stored) = state.alerts.iter_mut().find(|item| item.id == alert_id) {
        stored.last_result = Some(research.summary);
    }
    save_state(&app, &state)?;
    Ok(to_response(state))
}

#[tauri::command]
pub async fn analyze_pitch_deck(
    app: AppHandle,
    request: PitchDeckRequest,
) -> Result<DesktopStateResponse, String> {
    if request.title.trim().len() < 2 {
        return Err("Pitch deck title is required".to_string());
    }
    let mut state = load_or_create_state(&app)?;
    require_usable_activation(&state)?;
    let payload = pitch_deck_payload(&request)?;
    let mut settings = state.model_settings.clone();
    validate_model_settings(&mut settings)?;
    state.model_settings = settings.clone();
    let prompt = format!(
        "Startup workspace:\n{}\n\nDeck title: {}\nSource file: {}\nDetected slides/pages: {}\n\nDeck content:\n{}\n\nReturn an investor-grade analysis with these sections:\n1. Score out of 100.\n2. One-paragraph verdict.\n3. Slide-by-slide or topic-by-topic critique.\n4. Missing proof, market, product, traction, GTM, financial, and team evidence.\n5. Diligence risks and questions an investor will ask.\n6. Concrete rewrite checklist for the next version.\nBe specific and do not invent metrics that are not present.",
        workspace_context(&state.workspace),
        request.title.trim(),
        payload
            .source_file_name
            .as_deref()
            .unwrap_or("manual notes"),
        payload.slide_count,
        payload.content
    );
    let analysis = call_model(
        &settings,
        "You are a senior venture investor and pitch deck operator. You evaluate decks rigorously, preserve uncertainty, and produce actionable revision guidance.",
        &prompt,
    )
    .await?;
    let score = derive_score(&analysis);
    state.pitch_decks.insert(
        0,
        PitchDeckAnalysis {
            id: Uuid::new_v4().to_string(),
            title: request.title.trim().to_string(),
            deck_notes: payload.content.clone(),
            source_file_name: payload.source_file_name,
            slide_count: payload.slide_count,
            score,
            analysis,
            created_at: Utc::now().to_rfc3339(),
        },
    );
    state.pitch_decks.truncate(MAX_PITCH_DECKS);
    save_state(&app, &state)?;
    Ok(to_response(state))
}

struct PitchDeckPayload {
    content: String,
    source_file_name: Option<String>,
    slide_count: usize,
}

struct ExtractedDeckText {
    text: String,
    slide_count: usize,
}

fn pitch_deck_payload(request: &PitchDeckRequest) -> Result<PitchDeckPayload, String> {
    let mut sections = Vec::new();
    let notes = request.deck_notes.trim();
    if !notes.is_empty() {
        sections.push(format!("Founder notes:\n{notes}"));
    }

    let mut source_file_name = None;
    let mut slide_count = 0;
    if let Some(encoded) = request
        .file_data_base64
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        let bytes = decode_pitch_file(encoded)?;
        if bytes.len() > MAX_PITCH_DECK_UPLOAD_BYTES {
            return Err("Pitch deck upload must be 25MB or smaller".to_string());
        }
        let file_name = request
            .file_name
            .as_deref()
            .map(clean_file_name)
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| "uploaded deck".to_string());
        let extracted = extract_pitch_file_text(
            &bytes,
            &file_name,
            request.file_mime_type.as_deref().unwrap_or_default(),
        )?;
        if extracted.text.trim().is_empty() {
            return Err("Uploaded deck did not contain readable text".to_string());
        }
        slide_count = extracted.slide_count;
        source_file_name = Some(file_name.clone());
        sections.push(format!("Uploaded deck ({file_name}):\n{}", extracted.text));
    }

    if sections.is_empty() {
        return Err("Upload a pitch deck file or add deck notes before analysis".to_string());
    }

    let content = truncate_chars(&sections.join("\n\n"), MAX_PITCH_CONTEXT_CHARS);
    if content.trim().chars().count() < MIN_PITCH_CONTEXT_CHARS {
        return Err("Pitch deck content must be at least 20 characters".to_string());
    }

    Ok(PitchDeckPayload {
        content,
        source_file_name,
        slide_count,
    })
}

fn decode_pitch_file(encoded: &str) -> Result<Vec<u8>, String> {
    let payload = encoded
        .split_once(',')
        .filter(|_| encoded.starts_with("data:"))
        .map(|(_, payload)| payload)
        .unwrap_or(encoded)
        .trim();
    general_purpose::STANDARD
        .decode(payload)
        .map_err(|_| "Uploaded deck file could not be decoded".to_string())
}

fn extract_pitch_file_text(
    bytes: &[u8],
    file_name: &str,
    mime_type: &str,
) -> Result<ExtractedDeckText, String> {
    let extension = file_name
        .rsplit('.')
        .next()
        .unwrap_or_default()
        .to_ascii_lowercase();
    let mime_type = mime_type.to_ascii_lowercase();

    if extension == "pptx"
        || mime_type == "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        || bytes.starts_with(b"PK")
    {
        return extract_pptx_text(bytes);
    }

    if extension == "pdf" || mime_type == "application/pdf" || bytes.starts_with(b"%PDF") {
        return extract_pdf_text(bytes);
    }

    if matches!(
        extension.as_str(),
        "txt" | "md" | "markdown" | "text" | "csv"
    ) || mime_type.starts_with("text/")
    {
        return Ok(ExtractedDeckText {
            text: String::from_utf8_lossy(bytes).to_string(),
            slide_count: 0,
        });
    }

    if let Ok(text) = String::from_utf8(bytes.to_vec()) {
        return Ok(ExtractedDeckText {
            text,
            slide_count: 0,
        });
    }

    Err("Unsupported pitch deck file. Upload a PDF, PPTX, TXT, or Markdown file.".to_string())
}

fn extract_pdf_text(bytes: &[u8]) -> Result<ExtractedDeckText, String> {
    let pages = pdf_extract::extract_text_from_mem_by_pages(bytes)
        .map_err(|error| format!("Failed to extract PDF text: {error}"))?;
    let text = pages
        .iter()
        .enumerate()
        .map(|(index, page)| format!("Page {}:\n{}", index + 1, page.trim()))
        .collect::<Vec<_>>()
        .join("\n\n");
    Ok(ExtractedDeckText {
        text,
        slide_count: pages.len(),
    })
}

fn extract_pptx_text(bytes: &[u8]) -> Result<ExtractedDeckText, String> {
    let mut archive = ZipArchive::new(Cursor::new(bytes))
        .map_err(|error| format!("Failed to open PPTX deck: {error}"))?;
    let mut slide_names = Vec::new();
    for index in 0..archive.len() {
        let file = archive
            .by_index(index)
            .map_err(|error| format!("Failed to inspect PPTX deck: {error}"))?;
        let name = file.name().replace('\\', "/");
        if name.starts_with("ppt/slides/slide") && name.ends_with(".xml") {
            slide_names.push(name);
        }
    }
    slide_names.sort_by_key(|name| slide_number(name).unwrap_or(usize::MAX));

    let mut sections = Vec::new();
    for name in slide_names {
        let mut file = archive
            .by_name(&name)
            .map_err(|error| format!("Failed to read PPTX slide: {error}"))?;
        let mut xml = String::new();
        file.read_to_string(&mut xml)
            .map_err(|error| format!("Failed to decode PPTX slide XML: {error}"))?;
        let slide_text = extract_text_from_slide_xml(&xml);
        if !slide_text.trim().is_empty() {
            sections.push(format!("Slide {}:\n{}", sections.len() + 1, slide_text));
        }
    }

    if sections.is_empty() {
        return Err("PPTX deck did not contain readable slide text".to_string());
    }

    Ok(ExtractedDeckText {
        slide_count: sections.len(),
        text: sections.join("\n\n"),
    })
}

fn extract_text_from_slide_xml(xml: &str) -> String {
    let mut reader = Reader::from_str(xml);
    reader.config_mut().trim_text(true);
    let mut buf = Vec::new();
    let mut pieces = Vec::new();

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Text(text)) => {
                if let Ok(decoded) = text.decode() {
                    let normalized = normalize_whitespace(&decoded);
                    if !normalized.is_empty() {
                        pieces.push(normalized);
                    }
                }
            }
            Ok(Event::Eof) => break,
            Err(_) => break,
            _ => {}
        }
        buf.clear();
    }

    pieces.join(" ")
}

fn slide_number(name: &str) -> Option<usize> {
    name.rsplit_once("slide")
        .and_then(|(_, suffix)| suffix.strip_suffix(".xml"))
        .and_then(|value| value.parse::<usize>().ok())
}

fn clean_file_name(value: &str) -> String {
    value
        .trim()
        .chars()
        .filter(|char| char.is_ascii_alphanumeric() || matches!(char, '.' | '-' | '_' | ' '))
        .take(160)
        .collect::<String>()
}

fn normalize_whitespace(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn truncate_chars(value: &str, max_chars: usize) -> String {
    if value.chars().count() <= max_chars {
        return value.to_string();
    }
    let mut truncated = value.chars().take(max_chars).collect::<String>();
    truncated.push_str("\n\n[Deck context truncated for model safety.]");
    truncated
}

#[tauri::command]
pub fn save_cap_table(
    app: AppHandle,
    request: CapTableRequest,
) -> Result<DesktopStateResponse, String> {
    validate_cap_table(&request)?;
    let mut state = load_or_create_state(&app)?;
    require_usable_activation(&state)?;
    state.cap_tables.insert(
        0,
        CapTableScenario {
            id: Uuid::new_v4().to_string(),
            name: request.name.trim().to_string(),
            founder_ownership_percent: request.founder_ownership_percent,
            investor_ownership_percent: request.investor_ownership_percent,
            option_pool_percent: request.option_pool_percent,
            post_money_valuation: request.post_money_valuation,
            notes: request.notes,
            created_at: Utc::now().to_rfc3339(),
        },
    );
    state.cap_tables.truncate(MAX_CAP_TABLES);
    save_state(&app, &state)?;
    Ok(to_response(state))
}

#[tauri::command]
pub fn run_calculator(
    app: AppHandle,
    tool_type: String,
    values: Vec<f64>,
) -> Result<BusinessToolResult, String> {
    let state = load_or_create_state(&app)?;
    require_usable_activation(&state)?;
    calculate(tool_type, values)
}

fn calculate(tool_type: String, values: Vec<f64>) -> Result<BusinessToolResult, String> {
    validate_finite_values(&values)?;
    let output = match tool_type.as_str() {
        "runway" => {
            if values.len() < 2 || values[1] <= 0.0 {
                return Err(
                    "Runway calculator expects cash balance and monthly net burn".to_string(),
                );
            }
            format!(
                "Runway: {:.1} months\nCash: {:.2}\nMonthly burn: {:.2}",
                values[0] / values[1],
                values[0],
                values[1]
            )
        }
        "burn_rate" => {
            if values.len() < 2 {
                return Err(
                    "Burn-rate calculator expects starting cash and ending cash".to_string()
                );
            }
            format!("Net burn over period: {:.2}", values[0] - values[1])
        }
        "valuation" => {
            if values.len() < 2 {
                return Err("Valuation calculator expects revenue and multiple".to_string());
            }
            format!("Indicative valuation: {:.2}", values[0] * values[1])
        }
        "unit_economics" => {
            if values.len() < 2 || values[0] <= 0.0 || values[1] <= 0.0 {
                return Err("Unit economics calculator expects LTV and CAC".to_string());
            }
            format!("LTV:CAC ratio: {:.2}", values[0] / values[1])
        }
        _ => return Err("Unsupported calculator".to_string()),
    };
    Ok(BusinessToolResult {
        id: Uuid::new_v4().to_string(),
        tool_type,
        title: "Calculator result".to_string(),
        output,
        created_at: Utc::now().to_rfc3339(),
    })
}

fn validate_finite_values(values: &[f64]) -> Result<(), String> {
    if values.len() > 25 {
        return Err("Calculator accepts at most 25 values".to_string());
    }
    if values.iter().any(|value| !value.is_finite()) {
        return Err("Calculator values must be finite numbers".to_string());
    }
    Ok(())
}

fn derive_score(analysis: &str) -> u8 {
    for token in analysis.split(|char: char| !char.is_ascii_digit()) {
        if let Ok(value) = token.parse::<u8>() {
            if value <= 100 {
                return value;
            }
        }
    }
    70
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn calculators_cover_core_finance_tools() {
        assert!(calculate("runway".to_string(), vec![100_000.0, 20_000.0])
            .unwrap()
            .output
            .contains("5.0 months"));
        assert!(
            calculate("burn_rate".to_string(), vec![100_000.0, 70_000.0])
                .unwrap()
                .output
                .contains("30000.00")
        );
        assert!(calculate("valuation".to_string(), vec![500_000.0, 8.0])
            .unwrap()
            .output
            .contains("4000000.00"));
        assert!(calculate("unit_economics".to_string(), vec![900.0, 300.0])
            .unwrap()
            .output
            .contains("3.00"));
    }

    #[test]
    fn calculators_reject_invalid_numbers() {
        assert!(calculate("runway".to_string(), vec![100_000.0, 0.0]).is_err());
        assert!(calculate("unit_economics".to_string(), vec![900.0, 0.0]).is_err());
        assert!(calculate("runway".to_string(), vec![f64::NAN, 1.0]).is_err());
        assert!(calculate("unknown".to_string(), vec![1.0, 2.0]).is_err());
    }

    #[test]
    fn pitch_score_parser_uses_first_valid_score() {
        assert_eq!(derive_score("Score: 82 out of 100"), 82);
        assert_eq!(derive_score("No numeric score"), 70);
        assert_eq!(derive_score("Score: 140 then 64"), 64);
    }

    #[test]
    fn pitch_deck_payload_accepts_manual_notes() {
        let payload = pitch_deck_payload(&PitchDeckRequest {
            title: "Seed deck".to_string(),
            deck_notes: "Problem, market, product, traction, team, and ask.".to_string(),
            ..PitchDeckRequest::default()
        })
        .unwrap();

        assert!(payload.content.contains("Founder notes"));
        assert_eq!(payload.source_file_name, None);
    }

    #[test]
    fn slide_xml_extraction_preserves_presentation_text_order() {
        let xml = r#"
          <p:sld>
            <p:cSld>
              <a:t>Problem</a:t>
              <a:t>Manual workflows slow finance teams</a:t>
            </p:cSld>
          </p:sld>
        "#;

        assert_eq!(
            extract_text_from_slide_xml(xml),
            "Problem Manual workflows slow finance teams"
        );
    }

    #[test]
    fn pitch_context_is_truncated_without_breaking_unicode() {
        let text = truncate_chars("alpha beta gamma", 10);

        assert!(text.starts_with("alpha beta"));
        assert!(text.contains("truncated"));
    }

    #[test]
    fn slide_numbers_sort_pptx_slides_naturally() {
        assert_eq!(slide_number("ppt/slides/slide12.xml"), Some(12));
        assert_eq!(slide_number("ppt/notesSlides/notesSlide1.xml"), None);
    }
}
