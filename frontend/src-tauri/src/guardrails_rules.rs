#![allow(dead_code)]

use std::sync::OnceLock;
use regex::RegexSet;
use unicode_normalization::UnicodeNormalization;
use crate::guardrails::QuestionType;

static PROMPT_ATTACK: OnceLock<RegexSet> = OnceLock::new();

pub fn looks_like_prompt_attack(normalized: &str) -> bool {
    PROMPT_ATTACK
        .get_or_init(|| {
            RegexSet::new([
                r"ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions|rules|prompts|directives)",
                r"\b(developer|debug|god|admin|sudo|maintenance)\s+mode\b",
                r"\bjailbreak\b",
                r"bypass\s+(guardrails?|safety|filter|rules?|restrictions?|protections?)",
                r"\bact\s+as\s+(dan|dude|evil|unrestricted|unfiltered)\b",
                r"(system|hidden|internal|secret)\s+prompt",
                r"(reveal|print|show|repeat|output|display)\s+(your|the|my)\s+(instructions|prompt|rules)",
                r"(pretend|imagine|roleplay)\s+.*\b(no\s+rules|unrestricted|without\s+limits)\b",
                r"(forget|disregard|override)\s+(your|all|the)\s+(rules|instructions|training|guidelines)",
                r"you\s+are\s+now\s+(free|unrestricted|unfiltered|liberated)",
            ])
            .expect("prompt attack patterns must compile")
        })
        .is_match(normalized)
}

static CODE_EXEC_REQUEST: OnceLock<RegexSet> = OnceLock::new();

pub fn asks_for_code_execution(normalized: &str) -> bool {
    CODE_EXEC_REQUEST
        .get_or_init(|| {
            RegexSet::new([
                r"\b(run|execute|write|create|build)\s+(a\s+)?(script|code|program|command)\b",
                r"\b(shell\s+script|powershell|cmd\.exe|terminal\s+command|bash\s+command)\b",
                r"\b(npm\s+install|cargo\s+run|python\s+script)\b",
                r"\beval\s*\(",
                r"\b(drop\s+table|delete\s+database)\b",
                r"\b(reverse\s*shell|malware|exploit|credential\s*dump)\b",
            ])
            .expect("code exec patterns must compile")
        })
        .is_match(normalized)
}

static SECRET_DISCLOSURE: OnceLock<RegexSet> = OnceLock::new();

pub fn asks_for_secret_disclosure(normalized: &str) -> bool {
    SECRET_DISCLOSURE
        .get_or_init(|| {
            RegexSet::new([
                r"(show|reveal|print|dump|export|display|give|tell)\s+.{0,50}(api\s*key|secret\s*key|activation\s*token|license\s*token|env\s*var|environment\s*variable)",
                r"(what\s+(is|are)\s+(your|the))\s+.{0,30}(api\s*key|secret|token|password|credentials?)",
                r"(show|reveal|print|dump|export|display|give|repeat)\s+.{0,50}(system\s*prompt|hidden\s*prompt|internal\s*prompt)",
            ])
            .expect("secret disclosure patterns must compile")
        })
        .is_match(normalized)
}

static EXEC_INSTRUCTION: OnceLock<RegexSet> = OnceLock::new();

pub fn contains_executable_instruction(normalized: &str) -> bool {
    EXEC_INSTRUCTION
        .get_or_init(|| {
            RegexSet::new([
                r"(open|launch|start|fire\s*up|boot)\s+(a\s+)?(terminal|powershell|cmd|shell|console|command\s*prompt)",
                r"(run|execute|paste|enter|type)\s+(this|the\s+following|these|it)\s+(in|into|at|on)",
                r"\b(pip|npm|yarn|pnpm|brew|apt|apt-get|yum|dnf|pacman|cargo|gem|go\s+get)\s+install\b",
                r"\b(sudo\s|chmod\s+\+x|rm\s+-rf|curl\s+-|wget\s+|docker\s+(run|exec))\b",
                r"\b(cargo\s+(run|build)|npm\s+run|python3?\s+-|python\.exe|node\s+-e)\b",
                r"\b(drop\s+table|delete\s+from|truncate\s+table)\b",
                r"\b(reverse\s*shell|credential\s*dump|malware|exploit\s*(code|kit)|payload|backdoor|rootkit)\b",
                r"\b(powershell|cmd\.exe|bash\s+-c)\b",
            ])
            .expect("exec instruction patterns must compile")
        })
        .is_match(normalized)
}

static LEAK_INTERNALS: OnceLock<RegexSet> = OnceLock::new();

pub fn leaks_guardrail_internals(normalized: &str) -> bool {
    LEAK_INTERNALS
        .get_or_init(|| {
            RegexSet::new([
                r"(my|the|these|our)\s+(system|hidden|internal|confidential|secret)\s+(prompt|instruction|rule|guideline)",
                r"i\s+(was|am)\s+(told|instructed|programmed|designed|built|configured)\s+to",
                r"guardrails?\s+for\b",
                r"safety\s+rules?\s+say",
                r"(reveal|show|print|dump|repeat|echo)\s+(your|my|the)\s+(instructions|prompt|rules|guidelines)",
                r"system\s+prompt\s+(says|is|reads|contains|states)",
                r"(my|the)\s+(guidelines?|rules?|instructions?)\s+(say|are|state|read|include)",
            ])
            .expect("leak patterns must compile")
        })
        .is_match(normalized)
}

pub fn extract_code_blocks(text: &str) -> Vec<(String, String)> {
    let mut blocks = Vec::new();
    let mut lines = text.lines().peekable();

    while let Some(line) = lines.next() {
        let trimmed = line.trim_start();
        let (fence, after_fence) = if let Some(after) = trimmed.strip_prefix("```") {
            ("```", after)
        } else if let Some(after) = trimmed.strip_prefix("~~~") {
            ("~~~", after)
        } else {
            continue;
        };

        let lang = after_fence.trim().to_lowercase();
        let mut content = Vec::new();
        for inner in lines.by_ref() {
            if inner.trim_start().starts_with(fence) {
                break;
            }
            content.push(inner);
        }
        blocks.push((lang, content.join("\n")));
    }

    blocks
}

const EXECUTABLE_LANG_TAGS: &[&str] = &[
    "bash", "sh", "zsh", "shell", "powershell", "ps1", "cmd", "bat",
    "python", "python3", "py", "rust", "javascript", "js",
    "typescript", "ts", "ruby", "perl", "php", "sql",
];

pub fn code_block_is_dangerous(lang: &str, normalized_content: &str) -> bool {
    if !lang.is_empty() && EXECUTABLE_LANG_TAGS.contains(&lang) {
        return true;
    }
    contains_executable_instruction(normalized_content)
}

pub fn is_clear_off_topic(_area: &str, normalized: &str) -> bool {
    let strong_offtopic = [
        "write a poem", "write me a poem",
        "write a story", "write me a story",
        "write a song", "write me a song",
        "write a novel", "write a screenplay",
        "tell me a joke", "tell a joke",
        "horoscope", "astrology", "zodiac", "tarot reading",
        "dating advice", "relationship advice",
        "homework help", "my assignment", "my essay",
        "fanfic", "fan fiction",
        "tell me i am", "tell me i'm", "tell me that i",
        "compliment me", "am i pretty", "am i smart", "am i good",
        "how are you", "what's your name", "are you alive", "are you sentient",
        "are you real", "are you conscious",
    ];

    let business_work_modifiers = [
        "pitch deck", "investor presentation", "investor deck",
        "brand story", "brand narrative", "brand messaging",
        "customer story", "customer testimonial", "case study",
        "sales pitch", "sales deck", "sales email",
        "marketing campaign", "marketing copy",
        "product launch", "product narrative",
        "team building", "team onboarding",
        "company values", "company mission", "company vision",
        "board presentation", "stakeholder update",
        "press release", "annual report",
    ];

    if strong_offtopic.iter().any(|t| normalized.contains(t))
        && !business_work_modifiers.iter().any(|m| normalized.contains(m))
    {
        return true;
    }

    if message_has_business_context(normalized) {
        return false;
    }

    let weak_offtopic = [
        "recipe", "cook ", "cooking", "bake ", "baking",
        "movie recommendation", "film recommendation",
        "song lyrics", "video game", "gaming",
        "sports score", "who won the game",
        "weight loss", "diet plan", "workout routine",
        "travel itinerary", "vacation plan",
        "celebrity gossip",
    ];
    weak_offtopic.iter().any(|t| normalized.contains(t))
}

pub fn message_has_business_context(normalized: &str) -> bool {
    [
        "business", "company", "customer", "sales", "market",
        "pricing", "revenue", "runway", "contract", "compliance",
        "investor", "funding", "pipeline", "prospect",
        "campaign", "hiring", "operations", "risk", "strategy",
        "budget", "forecast", "quarterly", "roi", "kpi",
        "stakeholder", "vendor", "partner", "board",
        "product", "onboarding", "retention", "churn",
        "conversation", "chat", "asked", "earlier", "previous",
        "first thing", "first question", "summarize", "summary",
        "what did i ask", "what have i asked", "so far", "follow up",
        "recall", "repeat", "you said", "my question", "we discussed",
    ]
    .iter()
    .any(|term| normalized.contains(term))
}

pub fn is_high_risk_business_work(area: &str, normalized: &str) -> bool {
    matches!(area, "legal" | "finance" | "investor")
        || [
            "contract",
            "lawsuit",
            "compliance",
            "payroll",
            "payment",
            "bank",
            "security",
            "privacy",
            "gdpr",
            "hipaa",
            "termination",
            "acquisition",
            "board",
        ]
        .iter()
        .any(|term| normalized.contains(term))
}

pub fn classify_question_type(message: &str) -> QuestionType {
    let normalized = normalize(message);

    let comparison_signals = [
        "competitor", "competitors", "compare", "comparison", "versus", " vs ",
        "alternative", "alternatives", "differ", "benchmark", "how do they",
        "which is better", "pros and cons",
    ];
    if comparison_signals.iter().any(|s| normalized.contains(s)) {
        return QuestionType::Comparison;
    }

    let action_signals = [
        "check the", "check my", "check our", "review the", "review my",
        "look at the", "look at my", "go to", "open the", "access the",
        "fire up", "restart", "redeploy", "deploy", "update the",
        "fix the", "debug", "troubleshoot", "set up", "configure",
        "send the", "schedule the", "cancel the", "verify the",
    ];
    if action_signals.iter().any(|s| normalized.contains(s)) {
        return QuestionType::ActionRequest;
    }

    let planning_signals = [
        "plan for", "create a plan", "build a plan", "90-day", "30-day",
        "roadmap", "strategy for", "how should we", "what should we do about",
        "prepare for", "action plan", "next steps for", "prioritize",
        "work plan", "project plan",
    ];
    if planning_signals.iter().any(|s| normalized.contains(s)) {
        return QuestionType::Planning;
    }

    let brainstorm_signals = [
        "ideas for", "brainstorm", "suggest", "suggestions", "options for",
        "ways to", "how can i", "how could we", "what are some",
        "creative", "possibilities",
    ];
    if brainstorm_signals.iter().any(|s| normalized.contains(s)) {
        return QuestionType::Brainstorming;
    }

    QuestionType::Factual
}

pub fn is_business_operational_query(normalized: &str) -> bool {
    let operational_context = [
        "check the logs", "check logs", "check my logs", "check our logs",
        "review the logs", "review logs", "monitor the", "monitoring",
        "check the server", "check my server", "check our server",
        "restart the server", "restart my server", "restart our server",
        "redeploy", "deploy to", "deployment", "check the database",
        "check the dashboard", "check uptime", "server status",
        "check the api", "check my api", "review the metrics",
        "review metrics", "check performance", "check the errors",
        "debug the", "troubleshoot", "diagnose",
    ];
    operational_context.iter().any(|phrase| normalized.contains(phrase))
}

pub fn is_navigational_guidance(normalized: &str) -> bool {
    let nav_signals = [
        "go to", "navigate to", "open the", "click on", "select the",
        "in the dashboard", "from the dashboard", "on the dashboard",
        "in the settings", "from the settings", "in the console",
        "from the console", "in the panel", "from the panel",
        "log in to", "sign in to", "access the", "visit the",
    ];
    let has_nav = nav_signals.iter().any(|s| normalized.contains(s));
    if !has_nav {
        return false;
    }
    let dangerous = [
        "sudo ", "rm -rf", "chmod ", "curl -", "wget ",
        "pip install", "npm install", "cargo run",
        "docker run", "docker exec", "eval(",
        "drop table", "delete from", "truncate table",
        "reverse shell", "credential dump", "malware",
        "exploit", "payload", "backdoor", "rootkit",
    ];
    !dangerous.iter().any(|d| normalized.contains(d))
}

pub fn normalize(value: &str) -> String {
    let decomposed: String = value.nfkd().collect();

    let cleaned: String = decomposed
        .chars()
        .map(|c| confusable_to_ascii(c).unwrap_or(c))
        .filter(|c| {
            !matches!(c,
                '\u{200B}'..='\u{200F}' |
                '\u{202A}'..='\u{202E}' |
                '\u{2060}'..='\u{2064}' |
                '\u{FEFF}' | '\u{00AD}'
            )
        })
        .collect();

    cleaned
        .to_lowercase()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

pub fn confusable_to_ascii(c: char) -> Option<char> {
    match c {
        'а' => Some('a'), 'е' => Some('e'), 'о' => Some('o'),
        'р' => Some('p'), 'с' => Some('c'), 'у' => Some('y'),
        'х' => Some('x'), 'і' => Some('i'), 'ј' => Some('j'),
        'ѕ' => Some('s'), 'ԁ' => Some('d'), 'ԝ' => Some('w'),
        'Ь' => Some('b'),
        'ρ' => Some('p'), 'ο' => Some('o'), 'α' => Some('a'),
        'ε' => Some('e'), 'ι' => Some('i'), 'κ' => Some('k'),
        'ν' => Some('n'), 'τ' => Some('t'), 'υ' => Some('u'),
        _ => None,
    }
}

pub fn is_safe_context(content: &str) -> bool {
    let normalized = normalize(content);
    !looks_like_prompt_attack(&normalized) && !asks_for_secret_disclosure(&normalized)
}
