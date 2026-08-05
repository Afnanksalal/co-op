use crate::types::ChatMessageRecord;

/// Conservative heuristic for token budgeting: 3 characters = 1 token
const CHARS_PER_TOKEN: usize = 3;

/// Default minimum input context window in tokens (e.g. 16,384 tokens ~ 49,152 chars)
pub const DEFAULT_CONTEXT_WINDOW_TOKENS: u32 = 16_384;

/// Calculates the total character budget available.
pub fn calculate_char_budget(max_tokens: u32, reserved_chars: usize) -> usize {
    let total_budget = (max_tokens as usize).saturating_mul(CHARS_PER_TOKEN);
    total_budget.saturating_sub(reserved_chars)
}

/// Calculates the input context character budget for prompt assembly.
/// Reserves room for model output without collapsing to zero when
/// `max_run_tokens` is larger than the default context window.
pub fn calculate_input_context_budget(max_run_tokens: u32, reserved_chars: usize) -> usize {
    const MIN_INPUT_TOKENS: u32 = 4_096;
    let context_window =
        DEFAULT_CONTEXT_WINDOW_TOKENS.max(max_run_tokens.saturating_add(MIN_INPUT_TOKENS));
    let output_reserve = max_run_tokens.min(context_window / 2);
    let input_tokens = context_window
        .saturating_sub(output_reserve)
        .max(MIN_INPUT_TOKENS);
    let total_budget = (input_tokens as usize).saturating_mul(CHARS_PER_TOKEN);
    total_budget.saturating_sub(reserved_chars)
}

/// Truncates a string to fit within the given character limit.
/// Appends a truncation marker if the string is shortened.
pub fn truncate_text_to_budget(text: &str, max_chars: usize) -> String {
    let trimmed = text.trim();
    if trimmed.is_empty() || max_chars == 0 {
        return String::new();
    }
    
    let current_chars = trimmed.chars().count();
    if current_chars <= max_chars {
        return trimmed.to_string();
    }
    
    let marker = "\n\n[...context truncated to fit model limit...]";
    if max_chars <= marker.chars().count() {
        return String::new();
    }
    
    let take_chars = max_chars.saturating_sub(marker.chars().count());
    let mut truncated: String = trimmed.chars().take(take_chars).collect();
    truncated.push_str(marker);
    truncated
}

/// Truncates chat history to fit within the given budget.
/// It iterates from newest to oldest messages, keeping only what fits.
pub fn truncate_chat_history(messages: &[ChatMessageRecord], max_chars: usize) -> String {
    if messages.is_empty() || max_chars == 0 {
        return String::new();
    }

    let mut accepted_messages = Vec::new();
    let mut current_chars = 0;

    // Traverse from newest to oldest
    for message in messages.iter().rev() {
        let role_label = match message.role.as_str() {
            "assistant" => "Assistant",
            _ => "User",
        };
        let formatted = format!("{}: {}", role_label, message.content.trim());
        // +2 for the double-newline separator between messages
        let len = formatted.chars().count() + 2;

        if current_chars + len > max_chars {
            break;
        }

        current_chars += len;
        accepted_messages.push(formatted);
    }

    accepted_messages.reverse();
    accepted_messages.join("\n\n")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_char_budget() {
        assert_eq!(calculate_char_budget(100, 50), 250);
        assert_eq!(calculate_char_budget(10, 100), 0);
    }

    #[test]
    fn test_calculate_input_context_budget() {
        // 2048 output reserve against a 16k window -> 14336 input tokens -> 43008 - 1000 chars
        assert_eq!(calculate_input_context_budget(2048, 1000), 43_008 - 1000);
        // Large max_run_tokens must still leave a usable input budget (never zero).
        let large = calculate_input_context_budget(32_000, 1000);
        assert!(large >= 4_096 * 3 - 1000);
        assert!(large > 0);
    }

    #[test]
    fn test_truncate_text() {
        let text = "This is a very long string that definitely needs truncation because it is much longer than fifty characters.";
        let truncated = truncate_text_to_budget(text, 50);
        assert!(truncated.contains("...context truncated"));
        assert!(truncated.chars().count() <= 50);
        
        let fits = truncate_text_to_budget(text, 200);
        assert_eq!(fits, text);
    }

    #[test]
    fn test_truncate_chat_history() {
        let msgs = vec![
            ChatMessageRecord { id: "".to_string(), role: "user".to_string(), content: "old message".to_string(), agent_type: None, created_at: "".to_string() },
            ChatMessageRecord { id: "".to_string(), role: "assistant".to_string(), content: "new message".to_string(), agent_type: None, created_at: "".to_string() }
        ];
        
        let long = truncate_chat_history(&msgs, 1000);
        assert!(long.contains("old message"));
        assert!(long.contains("new message"));

        let short = truncate_chat_history(&msgs, 30); // "assistant: new message" is 22 chars
        assert!(!short.contains("old message"));
        assert!(short.contains("new message"));
    }
}
