use chrono::Utc;
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use tauri::AppHandle;
use uuid::Uuid;

use crate::constants::{
    LOCAL_EMBEDDING_DIMENSIONS, LOCAL_EMBEDDING_VERSION, PROVIDER_EMBEDDING_VERSION,
};
use crate::knowledge_store::{
    list_document_summaries, search_store, store_document, to_document_summary,
};
use crate::providers::{call_embedding, call_embedding_batch};
use crate::storage::{load_or_create_state, require_usable_activation, save_state, to_response};
use crate::types::{
    DesktopStateResponse, DocumentRequest, KnowledgeChunk, KnowledgeDocument, ModelSettings,
    SearchRequest, SearchResult,
};
use crate::validation::{validate_document_request, validate_objective};

/// Which embedding space a batch was written into. Never mix spaces inside one write.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EmbeddingSpace {
    Local,
    Provider,
}

impl EmbeddingSpace {
    pub fn version(self) -> i64 {
        match self {
            Self::Local => LOCAL_EMBEDDING_VERSION,
            Self::Provider => PROVIDER_EMBEDDING_VERSION,
        }
    }
}

#[derive(Debug, Clone)]
pub struct EmbeddedBatch {
    pub vectors: Vec<Vec<f32>>,
    pub space: EmbeddingSpace,
}

#[tauri::command]
pub async fn add_knowledge_document(
    app: AppHandle,
    request: DocumentRequest,
) -> Result<DesktopStateResponse, String> {
    validate_document_request(&request)?;
    let mut state = load_or_create_state(&app)?;
    require_usable_activation(&state)?;
    let settings = crate::validation::validate_read_only(&state.model_settings)?;
    let document_id = Uuid::new_v4().to_string();
    let created_at = Utc::now().to_rfc3339();
    let texts = chunk_text(&request.content);
    let batch = embed_batch(&settings, &texts).await;
    let chunks: Vec<KnowledgeChunk> = texts
        .into_iter()
        .zip(batch.vectors)
        .map(|(content, vector)| KnowledgeChunk {
            id: Uuid::new_v4().to_string(),
            document_id: document_id.clone(),
            vector,
            content,
            created_at: created_at.clone(),
        })
        .collect();
    let document = KnowledgeDocument {
        id: document_id,
        title: request.title.trim().to_string(),
        source: request.source.trim().to_string(),
        content: request.content.trim().to_string(),
        chunk_count: chunks.len(),
        chunks,
        created_at,
    };
    store_document(&app, &document, batch.space.version())?;
    state.documents = list_document_summaries(&app, crate::constants::MAX_DOCUMENTS)
        .unwrap_or_else(|_| vec![to_document_summary(&document)]);
    save_state(&app, &state)?;
    Ok(to_response(state))
}

#[tauri::command]
pub async fn search_knowledge(
    app: AppHandle,
    request: SearchRequest,
) -> Result<Vec<SearchResult>, String> {
    validate_objective("Search query", &request.query)?;
    let state = load_or_create_state(&app)?;
    require_usable_activation(&state)?;
    let settings = crate::validation::validate_read_only(&state.model_settings)?;
    search_store(&app, &settings, &request.query, request.limit.unwrap_or(5)).await
}

#[cfg(test)]
pub fn search_documents(
    documents: &[KnowledgeDocument],
    query: &str,
    limit: usize,
) -> Vec<SearchResult> {
    let query_vector = embed_text_local(query);
    let mut results = Vec::new();
    for document in documents {
        for chunk in &document.chunks {
            let score = cosine_similarity(&query_vector, &chunk.vector);
            if score > 0.0 {
                results.push(SearchResult {
                    document_id: document.id.clone(),
                    chunk_id: chunk.id.clone(),
                    title: document.title.clone(),
                    source: document.source.clone(),
                    content: chunk.content.clone(),
                    score,
                });
            }
        }
    }
    results.sort_by(|a, b| {
        b.score
            .partial_cmp(&a.score)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    results.truncate(limit.clamp(1, 20));
    results
}


pub fn chunk_text(content: &str) -> Vec<String> {
    const TARGET_WORDS: usize = 180;
    const MAX_WORDS: usize = 260;
    const OVERLAP_WORDS: usize = 32;

    let normalized = normalize_text(content);
    if normalized.is_empty() {
        return Vec::new();
    }

    let mut segments = Vec::new();
    for sentence in split_sentences(&normalized) {
        let words = sentence.split_whitespace().collect::<Vec<_>>();
        if words.len() > MAX_WORDS {
            segments.extend(
                words
                    .chunks(TARGET_WORDS)
                    .map(|chunk| chunk.join(" "))
                    .collect::<Vec<_>>(),
            );
        } else if !sentence.is_empty() {
            segments.push(sentence);
        }
    }

    let mut chunks = Vec::new();
    let mut current = String::new();
    let mut current_words = 0usize;

    for segment in segments {
        let segment_words = word_count(&segment);
        if current_words > 0 && current_words + segment_words > MAX_WORDS {
            chunks.push(current.trim().to_string());
            let overlap = trailing_words(&current, OVERLAP_WORDS);
            current = overlap;
            current_words = word_count(&current);
        }
        if !current.is_empty() {
            current.push(' ');
        }
        current.push_str(&segment);
        current_words += segment_words;

        if current_words >= TARGET_WORDS {
            chunks.push(current.trim().to_string());
            let overlap = trailing_words(&current, OVERLAP_WORDS);
            current = overlap;
            current_words = word_count(&current);
        }
    }

    if current_words > 0 {
        let last = current.trim().to_string();
        if chunks.last().map(|chunk| chunk != &last).unwrap_or(true) {
            chunks.push(last);
        }
    }

    chunks
}

/// Embed an entire batch into one consistent space.
/// If the provider cannot embed every item successfully, the whole batch uses
/// the local lexical space — never a mixed provider/local index.
pub async fn embed_batch(settings: &ModelSettings, texts: &[String]) -> EmbeddedBatch {
    if texts.is_empty() {
        return EmbeddedBatch {
            vectors: Vec::new(),
            space: EmbeddingSpace::Local,
        };
    }

    if let Ok(probe) = call_embedding(settings, "co-op embedding capability probe").await {
        if !probe.is_empty() {
            let mut vectors = Vec::with_capacity(texts.len());
            let mut consistent = true;
            for text in texts {
                match call_embedding(settings, text).await {
                    Ok(vector) if vector.len() == probe.len() && !vector.is_empty() => {
                        vectors.push(vector);
                    }
                    _ => {
                        consistent = false;
                        break;
                    }
                }
            }
            if consistent && vectors.len() == texts.len() {
                return EmbeddedBatch {
                    vectors,
                    space: EmbeddingSpace::Provider,
                };
            }
        }
    }

    EmbeddedBatch {
        vectors: texts.iter().map(|text| embed_text_local(text)).collect(),
        space: EmbeddingSpace::Local,
    }
}

/// Query embedding for search. Prefers provider when available so it can match
/// provider-indexed chunks; always also exposes local via [`embed_text_local`].
pub async fn embed_query_provider(
    settings: &ModelSettings,
    content: &str,
) -> Option<Vec<f32>> {
    match call_embedding(settings, content).await {
        Ok(vector) if !vector.is_empty() => Some(vector),
        _ => None,
    }
}

/// Batch-embed multiple texts. Uses provider batch API when available,
/// falls back to local embeddings for the entire batch on provider failure.
pub async fn embed_texts_batch(settings: &ModelSettings, texts: &[&str]) -> Vec<Vec<f32>> {
    match call_embedding_batch(settings, texts).await {
        Ok(vectors) => vectors,
        Err(e) => {
            eprintln!("Batch embedding provider unavailable ({}), using local fallback", e);
            texts.iter().map(|t| embed_text_local(t)).collect()
        }
    }
}

pub fn embed_text_local(content: &str) -> Vec<f32> {
    let mut vector = vec![0.0; LOCAL_EMBEDDING_DIMENSIONS];
    for token in tokenize(content) {
        let mut hasher = DefaultHasher::new();
        token.hash(&mut hasher);
        let index = (hasher.finish() as usize) % LOCAL_EMBEDDING_DIMENSIONS;
        vector[index] += 1.0;
    }
    normalize(vector)
}

pub(crate) fn tokenize(content: &str) -> Vec<String> {
    let base_tokens: Vec<String> = content
        .to_lowercase()
        .split(|char: char| !char.is_ascii_alphanumeric())
        .filter(|token| token.len() > 2 && !is_stop_word(token))
        .map(stem)
        .collect();

    let mut tokens = Vec::with_capacity(base_tokens.len() * 3);
    for token in &base_tokens {
        tokens.push(token.clone());
        tokens.extend(
            business_synonyms(token)
                .iter()
                .map(|value| value.to_string()),
        );
    }
    // Add bigrams
    for pair in base_tokens.windows(2) {
        tokens.push(format!("{}_{}", pair[0], pair[1]));
    }
    tokens
}

fn normalize_text(content: &str) -> String {
    content
        .replace("\r\n", "\n")
        .replace('\r', "\n")
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>()
        .join("\n")
}

fn split_sentences(content: &str) -> Vec<String> {
    let mut sentences = Vec::new();
    let mut buffer = String::new();
    for character in content.chars() {
        buffer.push(character);
        if matches!(character, '.' | '!' | '?' | '\n') {
            let sentence = buffer.trim();
            if !sentence.is_empty() {
                sentences.push(sentence.to_string());
            }
            buffer.clear();
        }
    }
    let remaining = buffer.trim();
    if !remaining.is_empty() {
        sentences.push(remaining.to_string());
    }
    sentences
}

fn trailing_words(content: &str, count: usize) -> String {
    let words = content.split_whitespace().collect::<Vec<_>>();
    let start = words.len().saturating_sub(count);
    words[start..].join(" ")
}

fn word_count(content: &str) -> usize {
    content.split_whitespace().count()
}

fn is_stop_word(token: &str) -> bool {
    matches!(
        token,
        "the"
            | "and"
            | "for"
            | "with"
            | "from"
            | "this"
            | "that"
            | "are"
            | "was"
            | "were"
            | "have"
            | "has"
            | "had"
            | "not"
            | "but"
            | "you"
            | "your"
            | "our"
            | "their"
            | "into"
            | "about"
            | "after"
            | "before"
            | "over"
            | "under"
            | "between"
            | "within"
            | "without"
    )
}

fn stem(token: &str) -> String {
    let s = token.to_lowercase();
    // Order matters — check longest suffixes first
    if s.len() > 5 {
        if s.ends_with("ation") { return s[..s.len()-5].to_string(); }
        if s.ends_with("ment") { return s[..s.len()-4].to_string(); }
        if s.ends_with("ness") { return s[..s.len()-4].to_string(); }
        if s.ends_with("able") { return s[..s.len()-4].to_string(); }
        if s.ends_with("ible") { return s[..s.len()-4].to_string(); }
        if s.ends_with("tion") { return s[..s.len()-4].to_string(); }
        if s.ends_with("sion") { return s[..s.len()-4].to_string(); }
        if s.ends_with("ious") { return s[..s.len()-4].to_string(); }
        if s.ends_with("eous") { return s[..s.len()-4].to_string(); }
    }
    if s.len() > 4 {
        if s.ends_with("ive") { return s[..s.len()-3].to_string(); }
        if s.ends_with("ous") { return s[..s.len()-3].to_string(); }
        if s.ends_with("ies") { return format!("{}y", &s[..s.len()-3]); }
        if s.ends_with("ing") { return s[..s.len()-3].to_string(); }
        if s.ends_with("ful") { return s[..s.len()-3].to_string(); }
    }
    if s.len() > 3 {
        if s.ends_with("ly") { return s[..s.len()-2].to_string(); }
        if s.ends_with("ed") { return s[..s.len()-2].to_string(); }
        if s.ends_with("er") { return s[..s.len()-2].to_string(); }
        if s.ends_with("es") { return s[..s.len()-2].to_string(); }
        if s.ends_with("al") { return s[..s.len()-2].to_string(); }
    }
    if s.len() > 3 && s.ends_with('s') && !s.ends_with("ss") {
        return s[..s.len()-1].to_string();
    }
    s
}

fn business_synonyms(token: &str) -> &'static [&'static str] {
    match token {
        // Finance & Metrics
        "cash" => &["runway", "burn", "finance", "capital", "liquidity"],
        "runway" => &["cash", "burn", "finance", "month", "surviv"],
        "burn" => &["runway", "cash", "spend", "rate", "expens"],
        "revenue" => &["income", "sales", "earn", "topline", "monetiz"],
        "profit" => &["margin", "earn", "ebitda", "bottom", "net"],
        "margin" => &["profit", "gross", "net", "percent"],
        "expens" | "expense" => &["cost", "spend", "overhead", "opex", "budget"],
        "cost" => &["expens", "spend", "price", "overhead", "budget"],
        "spend" => &["cost", "expens", "budget", "burn", "outlay"],
        "budget" => &["cost", "spend", "forecast", "plan", "allocat"],
        "forecast" => &["project", "predict", "estimat", "plan", "model"],
        "valuat" | "valuation" => &["worth", "multipl", "enterpris", "cap", "price"],
        "roi" => &["return", "invest", "yield", "payback"],
        "kpi" => &["metric", "indicat", "measur", "target", "goal"],
        "metric" => &["kpi", "measur", "indicat", "benchmark", "data"],
        "cac" => &["acquisit", "cost", "customer", "spend"],
        "ltv" => &["lifetim", "valu", "revenue", "retent"],
        "mrr" => &["recurr", "revenue", "month", "subscript"],
        "arr" => &["annual", "recurr", "revenue", "subscript"],
        "ebitda" => &["earn", "profit", "operat", "margin"],
        "arpu" => &["revenue", "user", "averag", "unit"],
        "gmv" => &["gross", "merchandis", "volume", "transact"],

        // Sales & Pipeline
        "sales" | "sale" => &["pipeline", "revenue", "customer", "deal", "close"],
        "pipeline" => &["funnel", "deal", "opportun", "stage", "sales"],
        "funnel" => &["pipeline", "stage", "convers", "lead", "prospect"],
        "lead" => &["prospect", "opportun", "potenti", "qualif"],
        "prospect" => &["lead", "potenti", "target", "outreach"],
        "deal" => &["opportun", "contract", "close", "sales", "pipeline"],
        "close" | "closing" => &["deal", "win", "convers", "sign", "sales"],
        "convers" | "conversion" => &["convert", "close", "win", "rate", "funnel"],
        "qualif" | "qualification" => &["lead", "prospect", "fit", "criteria"],
        "object" | "objection" => &["concern", "pushback", "resist", "handl"],
        "upsell" => &["cross", "expand", "revenue", "grow"],
        "churn" => &["attrit", "retent", "cancel", "leav", "turnov", "lost"],
        "retent" | "retention" => &["churn", "loyal", "renew", "keep", "engag"],
        "loyal" | "loyalty" => &["retent", "engag", "repeat", "brand"],

        // Marketing & Growth
        "market" | "marketing" => &["position", "campaign", "growth", "brand", "promot"],
        "brand" => &["market", "position", "identit", "reput", "aware"],
        "campaign" => &["market", "promot", "advertis", "outreach", "launch"],
        "position" | "positioning" => &["messag", "narrat", "differenti", "brand"],
        "outreach" => &["email", "campaign", "prospect", "cold", "contact"],
        "content" => &["blog", "articl", "media", "publish", "write"],
        "seo" => &["search", "organic", "rank", "traffic", "keyword"],
        "gtm" => &["market", "launch", "strateg", "distribut", "channel"],
        "growth" => &["scale", "expand", "acquir", "market", "tract"],
        "icp" => &["ideal", "customer", "profil", "target", "persona"],
        "persona" => &["icp", "target", "customer", "segment", "buyer"],

        // Customers
        "customer" | "customers" => &["buyer", "client", "user", "account", "patron"],
        "client" | "clients" => &["customer", "buyer", "account", "patron"],
        "buyer" | "buyers" => &["customer", "client", "purchas", "prospect"],
        "user" | "users" => &["customer", "client", "member", "subscrib"],
        "segment" => &["group", "cohort", "target", "tier", "category"],

        // Pricing
        "pricing" | "price" => &["cost", "revenue", "monetiz", "tier", "plan"],
        "monetiz" | "monetization" => &["revenue", "pricing", "model", "income"],
        "subscript" | "subscription" => &["recurr", "plan", "tier", "saas", "mrr"],
        "tier" => &["plan", "pricing", "level", "package"],
        "discount" => &["promot", "offer", "deal", "coupon", "rebat"],

        // Legal & Compliance
        "legal" => &["contract", "complianc", "risk", "regulat", "law"],
        "contract" | "contracts" => &["legal", "agreement", "complianc", "term", "sign"],
        "complianc" | "compliance" => &["legal", "regulat", "audit", "risk", "policy"],
        "regulat" | "regulation" => &["complianc", "legal", "law", "rule", "policy"],
        "ip" => &["intellectu", "property", "patent", "trademark", "copyright"],
        "patent" => &["ip", "intellectu", "invent", "protect"],
        "trademark" => &["ip", "brand", "register", "protect"],
        "gdpr" => &["privacy", "data", "protect", "complianc", "consent"],
        "privacy" => &["gdpr", "data", "protect", "consent", "policy"],
        "nda" => &["confidenti", "agreement", "disclos", "secret"],
        "tos" => &["term", "servic", "agreement", "policy", "legal"],
        "soc2" => &["security", "complianc", "audit", "control"],
        "liability" => &["risk", "legal", "insur", "protect"],

        // Fundraising & Investors
        "investor" | "investors" => &["fundrais", "capital", "diligenc", "vc", "angel"],
        "fundrais" | "fundraising" => &["investor", "capital", "raise", "round", "seed"],
        "vc" => &["ventur", "capital", "investor", "fund", "partner"],
        "angel" => &["investor", "seed", "early", "fund"],
        "seed" => &["angel", "early", "round", "pre", "fundrais"],
        "series" => &["round", "fundrais", "stage", "growth"],
        "diligenc" | "diligence" => &["investig", "review", "audit", "risk", "check"],
        "term" | "termsheet" => &["deal", "valuat", "dilut", "prefer", "negoti"],
        "dilut" | "dilution" => &["equity", "share", "own", "round", "cap"],
        "pitch" => &["deck", "present", "narrat", "investor", "demo"],
        "deck" => &["pitch", "present", "slide", "investor"],
        "tract" | "traction" => &["growth", "metric", "progress", "momentum"],

        // Team & HR
        "hire" | "hiring" => &["recruit", "talent", "headcount", "onboard", "staff"],
        "recruit" | "recruiting" => &["hire", "talent", "sourc", "candid"],
        "talent" => &["hire", "recruit", "team", "skill", "peopl"],
        "terminat" | "fire" => &["layoff", "offboard", "separat", "exit"],
        "layoff" => &["terminat", "restructur", "downsize", "reduc"],
        "equity" => &["stock", "option", "vest", "share", "cap", "esop"],
        "vest" | "vesting" => &["equity", "stock", "option", "cliff", "schedul"],
        "esop" => &["equity", "stock", "option", "employe", "plan"],
        "culture" => &["valu", "team", "environ", "morale", "mission"],
        "compensat" | "compensation" => &["salary", "pay", "benefit", "bonus", "equity"],
        "salary" => &["compensat", "pay", "wage", "income"],
        "onboard" | "onboarding" => &["hire", "train", "orient", "ramp"],

        // Operations & Process
        "operations" | "operat" => &["process", "workflow", "sop", "efficien"],
        "process" => &["workflow", "operat", "sop", "procedur", "system"],
        "workflow" => &["process", "operat", "automat", "sop", "pipeline"],
        "sop" => &["procedur", "process", "standard", "protocol", "guidelin"],
        "automat" | "automation" => &["workflow", "efficien", "tool", "system"],
        "efficien" | "efficiency" => &["product", "optimiz", "streamlin", "perform"],
        "strateg" | "strategy" => &["plan", "approach", "roadmap", "vision", "tactic"],
        "plan" => &["strateg", "roadmap", "action", "objectiv", "goal"],
        "goal" => &["objectiv", "target", "kpi", "mileston", "aim"],
        "risk" => &["threat", "vulnerab", "mitigat", "exposur", "liabil"],

        // Product & Engineering
        "product" => &["feature", "roadmap", "build", "ship", "release"],
        "feature" => &["product", "function", "capabil", "releas"],
        "mvp" => &["prototyp", "minimum", "viabl", "beta", "v1"],
        "roadmap" => &["plan", "timeline", "mileston", "backlog", "priorit"],
        "backlog" => &["roadmap", "priorit", "ticket", "task", "sprint"],
        "technic" | "technical" => &["engineer", "architectur", "infrastructur", "stack"],
        "scalab" | "scalability" => &["scale", "growth", "capac", "perform", "load"],
        "infra" | "infrastructure" => &["system", "architectur", "platform", "devop"],
        "api" => &["integrat", "endpoint", "interfac", "connect"],
        "integrat" | "integration" => &["api", "connect", "sync", "third", "partner"],
        "saas" => &["software", "subscript", "cloud", "platform", "recurr"],
        "platform" => &["product", "system", "saas", "infra", "ecosyst"],
        "deploy" => &["releas", "ship", "launch", "rollout", "publish"],

        // Competition & Market
        "competitor" | "competitors" => &["rival", "alternativ", "market", "landscap"],
        "alternativ" | "alternative" | "alternatives" => &["competitor", "option", "substitut", "rival"],
        "differenti" | "differentiation" => &["competit", "advantage", "unique", "moat"],
        "moat" => &["differenti", "advantage", "barrier", "defend"],
        "landscap" | "landscape" => &["market", "competitor", "industry", "sector"],
        "trend" => &["market", "shift", "emerg", "pattern", "direct"],

        // Board & Governance
        "board" => &["director", "governance", "advisor", "meet", "vote"],
        "advisor" => &["board", "mentor", "consult", "guid", "expert"],
        "governance" => &["board", "policy", "oversigh", "control", "complianc"],
        "stakeholder" => &["investor", "board", "partner", "interest"],

        // Partnerships & Distribution
        "partner" | "partnership" => &["collabor", "allianc", "channel", "joint", "integrat"],
        "channel" => &["distribut", "partner", "sales", "gtm", "direct"],
        "distribut" | "distribution" => &["channel", "reach", "market", "partner"],
        "vendor" => &["supplier", "partner", "provid", "third"],

        _ => &[],
    }
}

fn normalize(mut vector: Vec<f32>) -> Vec<f32> {
    let magnitude = vector.iter().map(|value| value * value).sum::<f32>().sqrt();
    if magnitude > 0.0 {
        for value in &mut vector {
            *value /= magnitude;
        }
    }
    vector
}

#[cfg(test)]
fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    let dot_product: f32 = a.iter().zip(b.iter()).map(|(left, right)| left * right).sum();
    let norm_a: f32 = a.iter().map(|val| val * val).sum::<f32>().sqrt();
    let norm_b: f32 = b.iter().map(|val| val * val).sum::<f32>().sqrt();

    if norm_a == 0.0 || norm_b == 0.0 {
        0.0
    } else {
        dot_product / (norm_a * norm_b)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn vector_search_ranks_related_chunks() {
        let document = KnowledgeDocument {
            id: "doc".to_string(),
            title: "Finance".to_string(),
            source: "test".to_string(),
            content: "runway burn revenue".to_string(),
            chunk_count: 1,
            chunks: vec![KnowledgeChunk {
                id: "chunk".to_string(),
                document_id: "doc".to_string(),
                content: "Monthly burn and runway planning".to_string(),
                vector: embed_text_local("Monthly burn and runway planning"),
                created_at: Utc::now().to_rfc3339(),
            }],
            created_at: Utc::now().to_rfc3339(),
        };

        let results = search_documents(&[document], "runway burn", 5);
        assert_eq!(results.len(), 1);
        assert!(results[0].score > 0.0);
    }

    #[test]
    fn chunking_keeps_overlap_and_splits_large_documents() {
        let content = (0..520)
            .map(|index| format!("word{index}"))
            .collect::<Vec<_>>()
            .join(" ");
        let chunks = chunk_text(&content);

        assert!(chunks.len() >= 3);
        assert!(chunks
            .iter()
            .all(|chunk| chunk.split_whitespace().count() <= 260));
        assert!(chunks[1].contains("word"));
    }

    #[test]
    fn tokenizer_adds_business_synonyms_and_removes_noise() {
        let tokens = tokenize("The cash plan for customers");

        assert!(tokens.contains(&"cash".to_string()));
        assert!(tokens.contains(&"runway".to_string()));
        assert!(tokens.contains(&"buyer".to_string()));
        assert!(!tokens.contains(&"the".to_string()));
    }
}
