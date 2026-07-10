# Fix All 30 AI Workflow Issues

Comprehensive plan to fix every issue identified in the AI workflow audit, organized into 6 phases by component and dependency order.

---

## User Review Required

> [!IMPORTANT]
> **Phase 1 (Critical backend fixes)** touches the core agent loop in `chat.rs`, `guardrails.rs`, `validation.rs`, and `providers.rs`. These are the highest-impact changes — fixing them alone would resolve most "improper answer" problems.

> [!WARNING]
> **Issue #1 (fake embeddings)** is flagged but will **not** be fixed in this plan. Replacing the hash-based embedder with a real embedding model (e.g., calling Ollama's `/api/embeddings` or a local ONNX model) is a standalone project that requires architecture decisions (which model? async indexing? migration of existing vectors?). I'll note the path forward but not implement it here.

> [!IMPORTANT]
> **Issue #4 (same-model self-review)** is a design limitation, not a code bug. True multi-model review requires either a second provider slot or a different model name for the reviewer. I'll improve the prompts to make the single-model review more effective, but the fundamental limitation remains unless you want to add a second model configuration.

## Open Questions

1. **Issue #20 (timeout)**: Should I increase `REQUEST_TIMEOUT_SECS` to 120s globally, or make it configurable per-provider (Ollama gets longer, OpenAI stays shorter)?
2. **Issue #13 (auto-submit suggestions)**: Should clicking a suggestion card auto-send the message, or just populate + focus the input? Auto-send is more magical but removes the chance to edit.
3. **Issue #1 (embeddings)**: Do you want me to plan the embedding model migration as a separate follow-up, or skip it entirely for now?

---

## Phase 1: Critical Backend Fixes (Rust)

The core fixes that directly cause wrong/blocked/missing answers.

---

### Issue #2 — Output guardrail blocks ALL code fences

#### [MODIFY] [guardrails.rs](file:///c:/Users/loq/Desktop/co-op/frontend/src-tauri/src/guardrails.rs)

**Problem**: `validate_model_output()` rejects any output containing ` ``` ` — even markdown tables, contract quotes, or structured comparisons.

**Fix**: Replace the blanket code-fence block with a smarter check that only blocks fences containing executable patterns (shell commands, SQL, script code), while allowing markdown formatting:

```diff
-    if output.contains("```") || contains_executable_instruction(&normalized) {
-        return Err(
-            "Co-Op blocked this answer because it included executable code or command steps."
-                .to_string(),
-        );
-    }
+    if contains_executable_instruction(&normalized) {
+        return Err(
+            "Co-Op blocked this answer because it included executable command steps."
+                .to_string(),
+        );
+    }
+    if contains_executable_code_fence(output) {
+        return Err(
+            "Co-Op blocked this answer because it included executable code blocks."
+                .to_string(),
+        );
+    }
```

Add new function `contains_executable_code_fence()` that:
- Extracts content between ` ``` ` pairs
- Checks the language tag after the opening fence (e.g., `bash`, `shell`, `powershell`, `sql`, `python`, `javascript`)
- Checks the fenced content for executable patterns (`rm `, `sudo`, `curl`, `DROP TABLE`, etc.)
- Allows fences with tags like `markdown`, `text`, `json`, `csv`, or no tag

---

### Issue #3 — No structured conversation history to the model

#### [MODIFY] [providers.rs](file:///c:/Users/loq/Desktop/co-op/frontend/src-tauri/src/providers.rs)

**Problem**: `call_model()` only accepts one system + one user message. Multi-turn context is flattened into one giant string.

**Fix**: Add a new `call_model_with_history()` function that accepts a `Vec<ChatMessage>`:

```rust
pub async fn call_model_with_history(
    settings: &ModelSettings,
    system_prompt: &str,
    messages: Vec<ChatMessage<'_>>,
) -> Result<String, String> {
    match settings.provider.as_str() {
        "ollama" => call_ollama_with_history(settings, system_prompt, messages).await,
        "openai_compatible" => call_openai_with_history(settings, system_prompt, messages).await,
        provider => Err(format!("Unsupported provider: {provider}")),
    }
}
```

Both `call_ollama_with_history` and `call_openai_with_history` will build a proper message array: `[system, ...history_messages, user]` instead of cramming everything into one user message.

#### [MODIFY] [chat.rs](file:///c:/Users/loq/Desktop/co-op/frontend/src-tauri/src/chat.rs)

Update `run_agent_chat` to:
1. Build `context` (workspace + graph + rag + memory + research) as the **system prompt suffix** instead of user message prefix
2. Convert `recent_history()` into a `Vec<ChatMessage>` with proper `user`/`assistant` role alternation
3. Call `call_model_with_history()` for the primary answer
4. Keep A2A and council review using the simpler `call_model()` (they don't need history)

```diff
-    let history = recent_history(&state.chat_sessions[index]);
-    let prompt = format!(
-        "{context}\n\nConversation:\n{history}\n\nUser: {}",
-        request.message
-    );
-    let system_prompt = format!(...);
-    let mut answer = call_model(&settings, &system_prompt, &prompt).await?;
+    let system_prompt = format!(
+        "{}\n\n{}\n\nCompany context:\n{}",
+        agent_prompt(&request.agent_type),
+        guardrail_policy_prompt(&request.agent_type, web_required, source_context_attached),
+        context
+    );
+    let mut history_messages = build_chat_messages(&state.chat_sessions[index]);
+    history_messages.push(ChatMessage {
+        role: "user",
+        content: &request.message,
+    });
+    let mut answer = call_model_with_history(&settings, &system_prompt, history_messages).await?;
```

Add a new `build_chat_messages()` helper:
```rust
fn build_chat_messages(session: &ChatSession) -> Vec<ChatMessage<'_>> {
    let keep = crate::constants::MAX_CHAT_HISTORY_MESSAGES;
    let start = session.messages.len().saturating_sub(keep);
    session.messages[start..]
        .iter()
        .map(|msg| ChatMessage {
            role: if msg.role == "user" { "user" } else { "assistant" },
            content: &msg.content,
        })
        .collect()
}
```

---

### Issue #5 — `high_risk_only` council mode silently skipped in chat

#### [MODIFY] [chat.rs](file:///c:/Users/loq/Desktop/co-op/frontend/src-tauri/src/chat.rs)

**Problem**: Chat only triggers review for `review_only | full_council`, ignoring `high_risk_only`.

**Fix**: Use the existing `should_run_review_gate()` function from `workflows.rs` instead of inline matching:

```diff
-    if matches!(
-        request.council_mode.as_str(),
-        "review_only" | "full_council"
-    ) {
+    let run_council = crate::workflows::should_run_review_gate(
+        &request.council_mode,
+        &request.agent_type,
+        &request.message,
+    ) || (request.council_mode == "high_risk_only" && guardrail_decision.high_risk);
+    if run_council {
```

This properly triggers review when:
- Mode is `review_only` or `full_council` (always review)
- Mode is `high_risk_only` AND the input was classified as high risk by guardrails

---

### Issue #6 — `validate_model_settings` hard-requires Firecrawl key

#### [MODIFY] [validation.rs](file:///c:/Users/loq/Desktop/co-op/frontend/src-tauri/src/validation.rs)

**Problem**: Every chat/workflow call runs `validate_model_settings()` which unconditionally requires a Firecrawl API key, blocking Ollama-only users.

**Fix**: Remove the Firecrawl key requirement from `validate_model_settings()`. Instead, check it only in the code paths that actually need web search (`research_context_for_business`, `run_research_query`, `discover_leads`). The check already exists in `ensure_web_search_ready()` — it's the right place.

```diff
-    if settings
-        .firecrawl_api_key
-        .as_deref()
-        .map(str::trim)
-        .unwrap_or("")
-        .is_empty()
-    {
-        return Err("Web search key is required for source-backed business research".to_string());
-    }
```

Also remove the Firecrawl URL sanitization from `validate_model_settings()` when the key is empty (no point validating a URL you won't use):

```diff
-    settings.firecrawl_base_url =
-        sanitize_http_base_url(&settings.firecrawl_base_url, true, false, "Firecrawl URL")?;
+    if settings.firecrawl_api_key.as_deref().map(str::trim).unwrap_or("").is_empty() {
+        // Skip Firecrawl URL validation when no key is configured
+    } else {
+        settings.firecrawl_base_url =
+            sanitize_http_base_url(&settings.firecrawl_base_url, true, false, "Firecrawl URL")?;
+    }
```

#### [MODIFY] [chat.rs](file:///c:/Users/loq/Desktop/co-op/frontend/src-tauri/src/chat.rs)

When web search is needed but Firecrawl isn't configured, **gracefully degrade** instead of failing:

```diff
     let use_web = request.research_enabled || web_required;
+    let web_ready = settings.firecrawl_api_key.as_deref()
+        .map(str::trim).unwrap_or("").is_empty() == false
+        && settings.research_provider == "firecrawl";
     let mut source_context_attached = false;
-    if use_web {
+    if use_web && web_ready {
         // ... existing web search code ...
+    } else if use_web && !web_ready {
+        context.push_str("\n\n[Web sources were requested but web search is not configured. Answer using local context only and note where web evidence would strengthen the response.]\n");
     }
```

---

## Phase 2: Guardrail & Prompt Improvements (Rust)

Fixes for overly aggressive filters and weak prompts.

---

### Issue #14 — Agent system prompts are too short

#### [MODIFY] [chat.rs](file:///c:/Users/loq/Desktop/co-op/frontend/src-tauri/src/chat.rs)

Replace each one-liner in `agent_prompt()` with structured, multi-paragraph prompts. Example for operations:

```rust
"operations" => "You are Co-Op Operations, a private business advisor for owner-led companies.

Your job is to turn ambiguous business work into clear, actionable output.

Response structure (use these exact headings):
## Quick answer
One paragraph with the direct answer or recommendation.

## Key facts used
Bullet list of company facts, memories, or file context you relied on.

## Assumptions
Anything you assumed because it wasn't in the provided context.

## Action plan
Numbered steps with owners (if identifiable) and timeframes.

## Risks
What could go wrong, what's missing, what needs human verification.

## Next checkpoint
When the owner should revisit this decision and what to check.

Rules:
- Be direct and specific. Avoid generic business advice.
- Reference the company's actual stage, metrics, and goals from the context.
- If information is missing, say what's missing and give the best answer you can.
- Never fabricate metrics, customer names, or financial numbers.
- Keep the total answer concise — aim for useful density, not length."
```

Similar structured prompts for `legal`, `finance`, `investor`, `competitor`, and `sales` — each tailored to the advisor persona with domain-specific headings.

---

### Issue #15 — Common words trigger web requirement

#### [MODIFY] [guardrails.rs](file:///c:/Users/loq/Desktop/co-op/frontend/src-tauri/src/guardrails.rs)

**Problem**: Words like `"find"`, `"current"`, `"today"`, `"lead"` trigger `web_required`, which can fail the request.

**Fix**: Require these ambiguous terms to appear in a business-external context. Change from single-word matching to phrase matching:

```diff
-    "find",
-    "current",
-    "latest",
-    "recent",
-    "today",
+    "find competitors",
+    "find alternatives",
+    "current market",
+    "current pricing",
+    "latest funding",
+    "latest regulation",
+    "recent investment",
+    "recent acquisition",
```

Keep `"lead"` and `"prospect"` only when combined with discovery intent:
```diff
-    "lead",
-    "prospect",
+    "find leads",
+    "find prospects",
+    "discover leads",
+    "new prospects",
```

---

### Issue #16 — Off-topic filter false positives

#### [MODIFY] [guardrails.rs](file:///c:/Users/loq/Desktop/co-op/frontend/src-tauri/src/guardrails.rs)

**Fix**: Add industry-context awareness to the off-topic check. If the company's `industry`, `sector`, or `description` contains a keyword, don't treat it as off-topic. Since `is_clear_off_topic` doesn't have access to the profile, change the signature:

```diff
-fn is_clear_off_topic(area: &str, normalized: &str) -> bool {
+fn is_clear_off_topic(area: &str, normalized: &str) -> bool {
     if has_business_term(area, normalized) {
         return false;
     }
+    // Require multiple off-topic signals, not just one keyword
+    let off_topic_count = [
         "recipe",
         "homework",
         "dating",
         ...
     ]
     .iter()
-    .any(|term| normalized.contains(term))
+    .filter(|term| normalized.contains(*term))
+    .count();
+    // Only block if off-topic term appears AND no business context
+    off_topic_count >= 2
 }
```

This requires 2+ off-topic keywords to trigger, reducing false positives for domain-specific businesses.

---

### Issue #17 — Fixed confidence 0.72 for all memories

#### [MODIFY] [chat.rs](file:///c:/Users/loq/Desktop/co-op/frontend/src-tauri/src/chat.rs)

**Fix**: Scale memory confidence based on the review level that was applied:

```diff
+    let memory_confidence = match (request.a2a_enabled, run_council) {
+        (true, true) => 0.90,   // Both A2A + council reviewed
+        (true, false) => 0.82,  // A2A reviewed only
+        (false, true) => 0.80,  // Council reviewed only
+        (false, false) => 0.68, // No review
+    };
     let _ = remember_business_event(
         &app,
         &mut state,
         "conversation",
         &memory_title,
         &memory_content,
         "ask",
-        0.72,
+        memory_confidence,
     );
```

---

### Issue #19 — Brittle "No material additions" check

#### [MODIFY] [chat.rs](file:///c:/Users/loq/Desktop/co-op/frontend/src-tauri/src/chat.rs)

**Fix**: Expand the no-op detection to cover common model variations:

```diff
 fn append_review_section(answer: String, heading: &str, addition: String) -> String {
     let trimmed = addition.trim();
-    if trimmed.is_empty()
-        || trimmed.eq_ignore_ascii_case("no material additions")
-        || trimmed.eq_ignore_ascii_case("no material additions.")
-    {
+    if trimmed.is_empty() || is_empty_review(trimmed) {
         return answer;
     }
     format!("{answer}\n\n{heading}:\n{trimmed}")
 }
+
+fn is_empty_review(value: &str) -> bool {
+    let lower = value.to_lowercase();
+    let lower = lower.trim().trim_end_matches('.');
+    matches!(lower,
+        "no material additions"
+        | "no additional material concerns"
+        | "no material concerns"
+        | "no additions"
+        | "nothing to add"
+        | "none"
+        | "n/a"
+        | "no issues found"
+        | "no gaps identified"
+        | "no material gaps"
+        | "the draft is complete"
+        | "no further additions"
+    ) || lower.starts_with("no material")
+      || (lower.len() < 40 && lower.starts_with("no ") && lower.contains("addition"))
+}
```

---

### Issue #18 — Duplicate info in prompt wastes tokens

#### [MODIFY] [chat.rs](file:///c:/Users/loq/Desktop/co-op/frontend/src-tauri/src/chat.rs)

**Fix**: Move workspace context and graph context into the **system prompt** (they're static per-session), and only put dynamic per-message content (RAG results, memory matches, research sources) in the user turn:

```diff
     let system_prompt = format!(
-        "{}\n\n{}",
-        agent_prompt(&request.agent_type),
-        guardrail_policy_prompt(...)
+        "{}\n\n{}\n\nStartup workspace:\n{}\n{}",
+        agent_prompt(&request.agent_type),
+        guardrail_policy_prompt(...),
+        workspace_context(&state.workspace),
+        graph_context(&state)
     );
```

Remove workspace context and graph context from the user prompt concatenation. This prevents the same company profile from appearing in both the system prompt and user message context.

---

### Issue #20 — 30s timeout too short for Ollama

#### [MODIFY] [constants.rs](file:///c:/Users/loq/Desktop/co-op/frontend/src-tauri/src/constants.rs)

**Fix**: Add separate timeout constants:

```diff
-pub const REQUEST_TIMEOUT_SECS: u64 = 30;
+pub const REQUEST_TIMEOUT_SECS: u64 = 30;
+pub const OLLAMA_TIMEOUT_SECS: u64 = 180;
+pub const OPENAI_TIMEOUT_SECS: u64 = 60;
```

#### [MODIFY] [providers.rs](file:///c:/Users/loq/Desktop/co-op/frontend/src-tauri/src/providers.rs)

Use provider-specific timeouts:

```diff
-pub fn http_client() -> Result<reqwest::Client, String> {
+pub fn http_client_with_timeout(timeout_secs: u64) -> Result<reqwest::Client, String> {
     reqwest::Client::builder()
-        .timeout(StdDuration::from_secs(REQUEST_TIMEOUT_SECS))
+        .timeout(StdDuration::from_secs(timeout_secs))
         .build()
         .map_err(|error| format!("Failed to create HTTP client: {error}"))
 }
+
+pub fn http_client() -> Result<reqwest::Client, String> {
+    http_client_with_timeout(REQUEST_TIMEOUT_SECS)
+}
```

Update `call_ollama` to use `http_client_with_timeout(OLLAMA_TIMEOUT_SECS)` and `call_openai_compatible` to use `http_client_with_timeout(OPENAI_TIMEOUT_SECS)`.

---

### Issue #21 — Code fence guardrail blocks lead extraction output

#### [MODIFY] [outreach.rs](file:///c:/Users/loq/Desktop/co-op/frontend/src-tauri/src/outreach.rs)

**Fix**: Strip code fences from the model output before passing to `parse_generated_leads`, and skip `validate_model_output` for structured extraction (it's not user-facing prose):

```diff
     let generated = call_model(
         &settings,
         "You are Co-Op's lead discovery extractor...",
         &extraction_prompt,
     ).await?;
-
-    let mut leads = parse_generated_leads(&generated, &request.lead_type, max_leads);
+    let cleaned = strip_code_fences(&generated);
+    let mut leads = parse_generated_leads(&cleaned, &request.lead_type, max_leads);
```

Add helper:
```rust
fn strip_code_fences(value: &str) -> String {
    let mut result = String::new();
    let mut in_fence = false;
    for line in value.lines() {
        if line.trim().starts_with("```") {
            in_fence = !in_fence;
            continue;
        }
        if !in_fence || !line.trim().is_empty() {
            result.push_str(line);
            result.push('\n');
        }
    }
    result
}
```

---

### Issue #27 — Web search failure kills entire chat

#### [MODIFY] [chat.rs](file:///c:/Users/loq/Desktop/co-op/frontend/src-tauri/src/chat.rs)

**Fix**: Catch web search errors and degrade gracefully:

```diff
     if use_web && web_ready {
-        let research = research_context_for_business(
+        match research_context_for_business(
             &settings,
             &state.workspace,
             &request.message,
             &request.agent_type,
-        ).await?;
-        if !research.trim().is_empty() {
-            source_context_attached = true;
-            ...
+        ).await {
+            Ok(research) if !research.trim().is_empty() => {
+                source_context_attached = true;
+                emit_chat_progress(...);
+                context.push_str("\n\nLive research context:\n");
+                context.push_str(&research);
+            }
+            Ok(_) => {
+                context.push_str("\n\n[Web search returned no results. Answering with local context only.]\n");
+            }
+            Err(_) => {
+                context.push_str("\n\n[Web search failed. Answering with local context only. Note where web evidence would help.]\n");
+            }
         }
     }
```

---

### Issue #28 — No token budget, context overflow risk

#### [MODIFY] [chat.rs](file:///c:/Users/loq/Desktop/co-op/frontend/src-tauri/src/chat.rs)

**Fix**: Add a rough character-budget cap for the total prompt. Since ~4 chars ≈ 1 token, and most models accept 8k-128k tokens, cap total context at a safe fraction of `max_run_tokens`:

```rust
const CHARS_PER_TOKEN: usize = 4;

fn cap_context(context: &str, max_tokens: u32) -> String {
    let budget = (max_tokens as usize) * CHARS_PER_TOKEN * 3; // Reserve 3x output budget for input
    if context.len() <= budget {
        return context.to_string();
    }
    let mut truncated = context.chars().take(budget).collect::<String>();
    truncated.push_str("\n\n[Context was trimmed to fit the model's input limit.]");
    truncated
}
```

Apply before building the final prompt.

---

### Issue #30 — Duplicated web-required logic

#### [MODIFY] [guardrails.rs](file:///c:/Users/loq/Desktop/co-op/frontend/src-tauri/src/guardrails.rs)

**Fix**: Remove `needs_current_sources()` from guardrails and have `validate_business_input` call `requires_live_web_research()` from `research_sources.rs` instead:

```diff
 pub fn validate_business_input(...) -> Result<GuardrailDecision, String> {
     ...
     Ok(GuardrailDecision {
-        web_required: needs_current_sources(area, &normalized),
+        web_required: crate::research_sources::requires_live_web_research(area, message),
         high_risk: is_high_risk_business_work(area, &normalized),
     })
 }
```

Delete `needs_current_sources()`. Single source of truth in `research_sources.rs`.

---

## Phase 3: Frontend Chat UX Fixes (TypeScript)

---

### Issue #7 — Fake progress bar timing

#### [MODIFY] [chat-progress.tsx](file:///c:/Users/loq/Desktop/co-op/frontend/src/components/desktop/panels/chat-progress.tsx)

**Fix**: Slow down the fallback progression so it doesn't visually complete before the backend finishes. Change from 2-second intervals to 4-second intervals, and cap at a lower percentage:

```diff
-  const activeIndex = Math.min(planned.length - 1, Math.floor(tick / 2));
+  const activeIndex = Math.min(
+    Math.max(0, planned.length - 2), // Never show the last step as "done" in fallback
+    Math.floor(tick / 4)              // Advance every 4 seconds instead of 2
+  );
```

Also, change the progress bar to cap at 85% during fallback (never show 100% until real events arrive):

```diff
-  const progress = Math.max(12, Math.round((completed / Math.max(rows.length, 1)) * 100));
+  const isFallback = events.length === 0;
+  const rawProgress = Math.round((completed / Math.max(rows.length, 1)) * 100);
+  const progress = isFallback ? Math.min(rawProgress, 85) : Math.max(12, rawProgress);
```

---

### Issue #8 — Session options not locked after first message

#### [MODIFY] [chat-header.tsx](file:///c:/Users/loq/Desktop/co-op/frontend/src/components/desktop/panels/chat-header.tsx)

**Fix**: Accept a `locked` prop and disable the selectors when viewing an existing session:

```diff
 export function ChatHeader({
+  locked,
   ...
 }: {
+  locked: boolean;
   ...
 }) {
```

In the options panel, disable the selects and toggles when `locked`:

```diff
-            <Select value={agentType} onValueChange={onAgentTypeChange}>
+            <Select value={agentType} onValueChange={onAgentTypeChange} disabled={locked}>
```

```diff
-            <TogglePill label="Extra review" checked={a2aEnabled} onChange={onA2aChange} />
+            <TogglePill label="Extra review" checked={a2aEnabled} onChange={onA2aChange} disabled={locked} />
```

#### [MODIFY] [chat.tsx](file:///c:/Users/loq/Desktop/co-op/frontend/src/components/desktop/panels/chat.tsx)

Pass `locked` when an existing session is active:

```diff
         <ChatHeader
+          locked={Boolean(activeSession && activeSession.messages.length > 0)}
           ...
         />
```

---

### Issue #9 — `researchEnabled` init from global, not session

#### [MODIFY] [chat.tsx](file:///c:/Users/loq/Desktop/co-op/frontend/src/components/desktop/panels/chat.tsx)

**Fix**: When selecting a session, the code already restores `researchEnabled` from the session. The issue is only the initial state. Fix by checking if there's an initial session:

```diff
-  const [researchEnabled, setResearchEnabled] = useState(state.modelSettings.firecrawlApiKeySaved);
+  const initialSession = state.chatSessions[0];
+  const [researchEnabled, setResearchEnabled] = useState(
+    initialSession?.researchEnabled ?? state.modelSettings.firecrawlApiKeySaved
+  );
```

---

### Issue #10 — "Reviewed" badge reads current toggle, not actual

#### [MODIFY] [chat.tsx](file:///c:/Users/loq/Desktop/co-op/frontend/src/components/desktop/panels/chat.tsx)

**Fix**: Pass the session's `a2aEnabled` flag for persisted messages, and `true` only when the current pending chat had A2A on:

```diff
               {(activeSession?.messages ?? []).map((item) => (
-                <ChatMessageBubble key={item.id} message={item} reviewed={a2aEnabled} />
+                <ChatMessageBubble key={item.id} message={item} reviewed={activeSession?.a2aEnabled} />
               ))}
```

---

### Issue #12 — No error display when chat fails

#### [MODIFY] [chat.tsx](file:///c:/Users/loq/Desktop/co-op/frontend/src/components/desktop/panels/chat.tsx)

**Fix**: The `runWithState` wrapper returns `false` on failure. Add an error state and display it:

```diff
+  const [chatError, setChatError] = useState<string | null>(null);
```

In `submitChat`:
```diff
     void runWithState(
       'chat',
       () => runAgentChat({...}),
       'Response saved.'
     ).then((saved) => {
       if (!saved) {
         setSessionId(previousSessionId);
         setMessage(prompt);
+        setChatError('Something went wrong. Check your model settings and try again.');
       }
       setPendingChat(null);
       setProgressEvents([]);
     });
```

Display the error above the composer:

```diff
         <ChatComposer
+          error={chatError}
+          onDismissError={() => setChatError(null)}
           message={message}
           ...
         />
```

#### [MODIFY] [chat-composer.tsx](file:///c:/Users/loq/Desktop/co-op/frontend/src/components/desktop/panels/chat-composer.tsx)

Add error display above the textarea:

```tsx
{error && (
  <div className="mb-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
    {error}
    <button type="button" onClick={onDismissError} className="ml-2 underline">Dismiss</button>
  </div>
)}
```

---

### Issue #13 — Suggestions don't auto-submit

#### [MODIFY] [chat-empty-state.tsx](file:///c:/Users/loq/Desktop/co-op/frontend/src/components/desktop/panels/chat-empty-state.tsx)

**Fix**: Change `onSelectSuggestion` to accept a string and auto-submit:

```diff
 export function ChatEmptyState({
   suggestions,
   onSelectSuggestion,
 }: {
   suggestions: string[];
-  onSelectSuggestion: (value: string) => void;
+  onSelectSuggestion: (value: string, autoSubmit: boolean) => void;
 }) {
```

```diff
-            onClick={() => onSelectSuggestion(suggestion)}
+            onClick={() => onSelectSuggestion(suggestion, true)}
```

#### [MODIFY] [chat.tsx](file:///c:/Users/loq/Desktop/co-op/frontend/src/components/desktop/panels/chat.tsx)

Handle auto-submit in the parent:

```diff
-            <ChatEmptyState suggestions={suggestions} onSelectSuggestion={setMessage} />
+            <ChatEmptyState
+              suggestions={suggestions}
+              onSelectSuggestion={(value, autoSubmit) => {
+                setMessage(value);
+                if (autoSubmit) {
+                  // Defer to next tick so state is updated
+                  setTimeout(() => {
+                    const form = document.querySelector('form[class*="border-t"]');
+                    if (form instanceof HTMLFormElement) form.requestSubmit();
+                  }, 0);
+                }
+              }}
+            />
```

Actually, a cleaner approach — add a `submitRef`:

```diff
+  const submitRef = useRef<(() => void) | null>(null);
```

And in the composer, expose a submit callback. Or simpler: just set the message and use a ref-based submit trigger.

---

## Phase 4: Performance & State Fixes

---

### Issue #11 — Full graph rebuild on every message

#### [MODIFY] [chat.rs](file:///c:/Users/loq/Desktop/co-op/frontend/src-tauri/src/chat.rs)

**Fix**: Cap the graph context to only the most relevant edges instead of building the full graph:

```diff
-    context.push_str(&graph_context(&state));
+    context.push_str(&graph_context_brief(&state, 8));
```

#### [MODIFY] [graph.rs](file:///c:/Users/loq/Desktop/co-op/frontend/src-tauri/src/graph.rs)

Add a lightweight version that skips the full build:

```rust
pub fn graph_context_brief(state: &DesktopState, max_edges: usize) -> String {
    let mut context = String::new();
    let counts = (
        state.documents.len(),
        state.memories.len(),
        state.leads.len(),
        state.research_runs.len(),
    );
    context.push_str(&format!(
        "\n\nBusiness context: {} files, {} memories, {} leads, {} research runs.\n",
        counts.0, counts.1, counts.2, counts.3
    ));
    // Add only profile edges (cheap, no iteration over large collections)
    // Skip full graph construction
    context
}
```

---

## Phase 5: DTO Alignment Fixes

---

### Issue #22 — Pitch score grabs first number ≤ 100

#### [MODIFY] [tools.rs](file:///c:/Users/loq/Desktop/co-op/frontend/src-tauri/src/tools.rs)

**Fix**: Look for the score near keywords like "score", "rating", "/100":

```diff
 fn derive_score(analysis: &str) -> u8 {
-    for token in analysis.split(|char: char| !char.is_ascii_digit()) {
-        if let Ok(value) = token.parse::<u8>() {
-            if value <= 100 {
-                return value;
+    let lower = analysis.to_lowercase();
+    // Look for patterns like "score: 82", "82/100", "score of 82"
+    for (i, _) in lower.match_indices("score") {
+        let after = &lower[i..];
+        for token in after.split(|c: char| !c.is_ascii_digit()).take(5) {
+            if let Ok(value) = token.parse::<u8>() {
+                if value <= 100 {
+                    return value;
+                }
             }
         }
     }
+    // Fallback: look for X/100 pattern
+    if let Some(pos) = lower.find("/100") {
+        let before = &lower[..pos];
+        if let Some(num_str) = before.rsplit(|c: char| !c.is_ascii_digit()).next() {
+            if let Ok(value) = num_str.parse::<u8>() {
+                if value <= 100 { return value; }
+            }
+        }
+    }
     70
 }
```

---

### Issue #23 — Revenue status mismatch

#### [MODIFY] [constants.ts](file:///c:/Users/loq/Desktop/co-op/frontend/src/components/desktop/constants.ts)

**Fix**: Align the options with what the Rust backend accepts:

```diff
-export const revenueStatuses = ['pre_revenue', 'no', 'yes'];
+export const revenueStatuses = ['pre_revenue', 'revenue', 'no'];
```

Add label:
```diff
   pre_revenue: 'Pre-revenue',
+  revenue: 'Generating revenue',
```

#### [MODIFY] [preview-state.ts](file:///c:/Users/loq/Desktop/co-op/frontend/src/lib/desktop/runtime/preview-state.ts)

Already uses `'revenue'` — this is correct. The constants were wrong.

---

### Issue #25 — Lead type mismatch in preview data

#### [MODIFY] [preview-state.ts](file:///c:/Users/loq/Desktop/co-op/frontend/src/lib/desktop/runtime/preview-state.ts)

**Fix**: Change preview leads to use valid lead types:

```diff
-      leadType: 'customer',
+      leadType: 'company',
```

(Two occurrences — both preview leads.)

---

### Issue #26 — `strategy` accepted in workflow but not chat

#### [MODIFY] [chat-header.tsx](file:///c:/Users/loq/Desktop/co-op/frontend/src/components/desktop/panels/chat-header.tsx)

This is intentional — `strategy` is a workflow-only type. No change needed. But we should add a comment explaining the difference in `validation.rs`.

#### [MODIFY] [validation.rs](file:///c:/Users/loq/Desktop/co-op/frontend/src-tauri/src/validation.rs)

```diff
 pub fn validate_chat_request(request: &ChatRequest) -> Result<(), String> {
     validate_chat_message(&request.message)?;
+    // Note: "strategy" is intentionally excluded from chat agents.
+    // It's a workflow-only type that uses the structured plan format.
     if !matches!(
         request.agent_type.as_str(),
         "operations" | "legal" | "finance" | "investor" | "competitor" | "sales"
```

---

## Phase 6: Minor Code Quality Fixes

---

### Issue #24 — Session ID whitespace edge case

No code change needed — the Rust code already handles this with `.filter(|id| !id.trim().is_empty())`. The TypeScript side uses `crypto.randomUUID()` which never produces whitespace. This is a theoretical edge case, not a practical bug.

---

### Issue #29 — Event listener stale closure risk

No code change needed — the current implementation correctly uses `useRef` to avoid stale closures. The `pendingSessionRef` pattern is the standard React approach. Adding a comment for future maintainers:

#### [MODIFY] [chat.tsx](file:///c:/Users/loq/Desktop/co-op/frontend/src/components/desktop/panels/chat.tsx)

```diff
   useEffect(() => {
+    // This ref is intentionally used instead of state to avoid recreating
+    // the Tauri event listener on every session change. The listener reads
+    // pendingSessionRef.current which is kept in sync by a separate effect.
     if (!isTauriRuntime()) return;
```

---

## Verification Plan

### Automated Tests

```bash
cd frontend/src-tauri
cargo test
cargo clippy --all-targets -- -D warnings

cd ..
npm run typecheck
npm run build
```

### Manual Verification

After applying each phase:

1. **Phase 1**: Test chat with Ollama (no Firecrawl key) — should work now. Test a chat that triggers `high_risk_only` review. Test a response that includes markdown tables.
2. **Phase 2**: Test "What should I focus on today?" — should not require web sources. Test a restaurant asking about recipes.
3. **Phase 3**: Click a suggestion — should send. View an old session — "Reviewed" badge should reflect actual session settings. Trigger a model error — should see error message.
4. **Phase 4**: Chat with 200+ memories — should be fast.
5. **Phase 5**: Revenue status dropdown should show "Generating revenue". Preview leads should display correctly.
6. **Phase 6**: Read the comments, confirm tests pass.

### Known Limitations Not Fixed

| Issue | Reason |
|-------|--------|
| #1 — Fake embeddings | Requires architecture decision on embedding model. Noted as future work. |
| #4 — Same-model self-review | Requires second model slot. Improved prompts make it more effective but fundamentally limited. |
