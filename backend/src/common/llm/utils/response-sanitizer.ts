/**
 * Response Sanitizer - Cleans LLM output for clean UI display
 * Removes markdown formatting, thinking tags, and ensures clean text output
 */

/**
 * Strips all markdown formatting from text
 */
export function stripMarkdown(text: string): string {
  let result = text;

  // Remove thinking/reasoning tags from reasoning models (DeepSeek R1, etc.)
  result = result
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
    .replace(/<reflection>[\s\S]*?<\/reflection>/gi, '');

  // Remove code blocks (```language ... ```)
  result = result.replace(/```[\s\S]*?```/g, (match) => {
    // Extract just the code content without the backticks and language
    const lines = match.split('\n');
    if (lines.length > 2) {
      return lines.slice(1, -1).join('\n');
    }
    return match.replace(/```\w*\n?/g, '').replace(/```/g, '');
  });

  // Remove inline code (`code`)
  result = result.replace(/`([^`]+)`/g, '$1');

  // Remove headers (# ## ### etc.)
  result = result.replace(/^#{1,6}\s+(.+)$/gm, '$1');

  // Remove bold (**text** or __text__)
  result = result.replace(/\*\*([^*]+)\*\*/g, '$1');
  result = result.replace(/__([^_]+)__/g, '$1');

  // Remove italic (*text* or _text_) - be careful not to break bullet points
  result = result.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '$1');
  result = result.replace(/(?<!_)_([^_\n]+)_(?!_)/g, '$1');

  // Remove strikethrough (~~text~~)
  result = result.replace(/~~([^~]+)~~/g, '$1');

  // Remove links [text](url) -> text
  result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Remove images ![alt](url)
  result = result.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');

  // Remove blockquotes (> text)
  result = result.replace(/^>\s+/gm, '');

  // Remove horizontal rules (---, ***, ___)
  result = result.replace(/^[-*_]{3,}$/gm, '');

  // Normalize bullet points to simple dashes
  result = result.replace(/^[\s]*[*+]\s+/gm, '- ');

  // Remove HTML tags
  result = result.replace(/<[^>]+>/g, '');

  // Clean up excessive whitespace
  result = result.replace(/\n{3,}/g, '\n\n');
  result = result.trim();

  return result;
}

/**
 * Removes any potentially harmful or off-topic content
 */
export function applyGuardrails(text: string): string {
  let result = text;

  // Remove any attempts to break character or reveal system prompts
  const guardrailPatterns = [
    /ignore (previous|all|above) instructions?/gi,
    /disregard (previous|all|above)/gi,
    /forget (everything|all|your) (you|instructions)/gi,
    /you are now/gi,
    /act as if/gi,
    /pretend (to be|you are)/gi,
    /system prompt/gi,
    /reveal your (instructions|prompt)/gi,
  ];

  for (const pattern of guardrailPatterns) {
    result = result.replace(pattern, '[FILTERED]');
  }

  return result;
}

/**
 * Main sanitizer function - applies all cleaning steps
 */
export function sanitizeResponse(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let result = text;

  // Step 1: Apply guardrails
  result = applyGuardrails(result);

  // Step 2: Strip markdown
  result = stripMarkdown(result);

  // Step 3: Final cleanup
  result = result
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\t/g, '  ') // Convert tabs to spaces
    .replace(/ {3,}/g, '  ') // Reduce multiple spaces
    .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
    .trim();

  return result;
}

/**
 * Sanitizes an array of responses
 */
export function sanitizeResponses(texts: string[]): string[] {
  return texts.map(sanitizeResponse);
}
