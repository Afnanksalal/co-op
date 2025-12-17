/**
 * Response Sanitizer - Cleans LLM output for clean UI display
 * Removes markdown formatting, thinking tags, applies guardrails,
 * and humanizes responses
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
 * Improved guardrails - removes harmful content and prompt injection attempts
 */
export function applyGuardrails(text: string): string {
  let result = text;

  // Prompt injection patterns
  const injectionPatterns = [
    /ignore (previous|all|above|prior|earlier) (instructions?|prompts?|rules?|context)/gi,
    /disregard (previous|all|above|prior|earlier|everything)/gi,
    /forget (everything|all|your) (you|instructions|learned|know)/gi,
    /you are now (a|an)?/gi,
    /act as if you (are|were)/gi,
    /pretend (to be|you are|that)/gi,
    /from now on,? (you|act|behave)/gi,
    /new (instructions?|rules?|persona|role):/gi,
    /override (your|the|all) (instructions?|rules?|guidelines?)/gi,
    /bypass (your|the|all) (restrictions?|limitations?|filters?)/gi,
  ];

  // System prompt disclosure patterns
  const disclosurePatterns = [
    /system prompt/gi,
    /reveal your (instructions?|prompt|programming|rules)/gi,
    /show (me )?your (instructions?|prompt|system|rules)/gi,
    /what (are|is) your (instructions?|prompt|system|rules)/gi,
    /tell me (about )?your (instructions?|prompt|programming)/gi,
    /print your (instructions?|prompt|system)/gi,
    /output your (instructions?|prompt|system)/gi,
  ];

  // Harmful content patterns
  const harmfulPatterns = [
    /how to (hack|exploit|attack|breach|compromise)/gi,
    /create (malware|virus|ransomware|exploit)/gi,
    /illegal (activities?|methods?|ways?)/gi,
    /bypass (security|authentication|authorization)/gi,
    /steal (data|information|credentials|money)/gi,
    /fraud(ulent)? (scheme|method|technique)/gi,
    /money laundering (technique|method|scheme)/gi,
    /tax evasion (method|scheme|technique)/gi,
  ];

  // Off-topic patterns (non-startup related)
  const offTopicPatterns = [
    /write (me )?(a |an )?(poem|story|song|essay|fiction)/gi,
    /tell (me )?(a |an )?(joke|riddle|story)/gi,
    /roleplay (as|with)/gi,
    /creative writing/gi,
    /generate (fake|false) (news|information|data)/gi,
  ];

  // Apply all guardrail patterns
  const allPatterns = [
    ...injectionPatterns,
    ...disclosurePatterns,
    ...harmfulPatterns,
    ...offTopicPatterns,
  ];

  for (const pattern of allPatterns) {
    result = result.replace(pattern, '[content filtered]');
  }

  return result;
}

/**
 * Humanize the response - make it sound more natural and conversational
 */
export function humanizeResponse(text: string): string {
  let result = text;

  // Remove robotic phrases
  const roboticPhrases = [
    /^(Certainly|Sure|Of course|Absolutely)[!,.]?\s*/gi,
    /^(I'd be happy to|I'm happy to|I would be glad to)[^.]*\.\s*/gi,
    /^(As an AI|As a language model|As an assistant)[^.]*\.\s*/gi,
    /^(Based on (my|the) (training|knowledge|data))[^.]*\.\s*/gi,
    /^(Let me|Allow me to) (help you|explain|clarify)[^.]*\.\s*/gi,
    /^(Great question|Good question|Excellent question)[!.]?\s*/gi,
    /^(Thank you for (asking|your question))[^.]*\.\s*/gi,
    /(I hope (this|that) helps)[!.]?\s*/gi,
    /(Let me know if you (have|need) (any )?(more|further|additional) (questions?|help|assistance))[!.]?\s*/gi,
    /(Feel free to (ask|reach out|contact)[^.]*)[!.]?\s*/gi,
    /(Is there anything else (I can|you'd like me to)[^?]*\?)\s*/gi,
    /(Please (don't hesitate to|feel free to)[^.]*)[!.]?\s*/gi,
  ];

  for (const pattern of roboticPhrases) {
    result = result.replace(pattern, '');
  }

  // Remove filler words at sentence starts
  result = result.replace(/^(Well,|So,|Now,|Basically,|Actually,|Essentially,)\s*/gim, '');

  // Remove excessive hedging
  result = result.replace(/\b(I think|I believe|I would say|In my opinion|It seems like)\s+/gi, '');

  // Clean up any double spaces or leading whitespace from removals
  result = result.replace(/\s{2,}/g, ' ').trim();

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

  // Step 3: Humanize the response
  result = humanizeResponse(result);

  // Step 4: Final cleanup
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
