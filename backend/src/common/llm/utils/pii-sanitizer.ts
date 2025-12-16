/**
 * PII Sanitizer - Anonymizes sensitive company and personal data before sending to LLMs.
 * This prevents model training on confidential business information.
 * 
 * Strategy:
 * - Replace company names with generic placeholders
 * - Anonymize founder/employee names
 * - Mask specific financial figures
 * - Remove URLs and email addresses
 * - Keep industry/sector/stage info (non-identifying)
 */

export interface SanitizationMap {
  original: string;
  placeholder: string;
}

export interface SanitizedData {
  text: string;
  mappings: SanitizationMap[];
}

/**
 * Sanitize text by replacing PII with placeholders.
 * Returns the sanitized text and a mapping to restore original values.
 */
export function sanitizePII(
  text: string,
  companyName?: string,
  founderName?: string,
  additionalNames?: string[],
): SanitizedData {
  const mappings: SanitizationMap[] = [];
  let sanitized = text;

  // 1. Replace company name with placeholder
  if (companyName && companyName.length > 2) {
    const companyRegex = new RegExp(escapeRegex(companyName), 'gi');
    if (companyRegex.test(sanitized)) {
      mappings.push({ original: companyName, placeholder: '[COMPANY]' });
      sanitized = sanitized.replace(companyRegex, '[COMPANY]');
    }
  }

  // 2. Replace founder name with placeholder
  if (founderName && founderName.length > 2) {
    const founderRegex = new RegExp(escapeRegex(founderName), 'gi');
    if (founderRegex.test(sanitized)) {
      mappings.push({ original: founderName, placeholder: '[FOUNDER]' });
      sanitized = sanitized.replace(founderRegex, '[FOUNDER]');
    }
  }

  // 3. Replace additional names (employees, co-founders, etc.)
  if (additionalNames) {
    additionalNames.forEach((name, index) => {
      if (name && name.length > 2) {
        const nameRegex = new RegExp(escapeRegex(name), 'gi');
        if (nameRegex.test(sanitized)) {
          const placeholder = `[PERSON_${index + 1}]`;
          mappings.push({ original: name, placeholder });
          sanitized = sanitized.replace(nameRegex, placeholder);
        }
      }
    });
  }

  // 4. Mask email addresses
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  sanitized = sanitized.replace(emailRegex, '[EMAIL]');

  // 5. Mask URLs (but keep domain type info)
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
  sanitized = sanitized.replace(urlRegex, '[URL]');

  // 6. Mask phone numbers
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  sanitized = sanitized.replace(phoneRegex, '[PHONE]');

  // 7. Mask specific dollar amounts over $10k (keep small amounts for context)
  const largeAmountRegex = /\$\d{2,3}(?:,\d{3})+(?:\.\d{2})?|\$\d{5,}(?:\.\d{2})?/g;
  sanitized = sanitized.replace(largeAmountRegex, '[AMOUNT]');

  // 8. Mask addresses (basic pattern)
  const addressRegex = /\d{1,5}\s+[\w\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|court|ct|place|pl)\.?(?:\s*,?\s*(?:suite|ste|apt|unit|#)\s*\d+)?/gi;
  sanitized = sanitized.replace(addressRegex, '[ADDRESS]');

  return { text: sanitized, mappings };
}

/**
 * Restore original values from sanitized text using the mapping.
 */
export function restorePII(sanitized: string, mappings: SanitizationMap[]): string {
  let restored = sanitized;
  
  // Restore in reverse order to handle nested replacements
  for (const mapping of mappings.reverse()) {
    const placeholderRegex = new RegExp(escapeRegex(mapping.placeholder), 'g');
    restored = restored.replace(placeholderRegex, mapping.original);
  }
  
  return restored;
}

/**
 * Sanitize startup metadata for LLM context.
 * Keeps non-identifying info, anonymizes company-specific data.
 */
export function sanitizeStartupMetadata(metadata: Record<string, unknown>): {
  sanitized: Record<string, unknown>;
  mappings: SanitizationMap[];
} {
  const mappings: SanitizationMap[] = [];
  const sanitized = { ...metadata };

  // Replace company name
  if (typeof metadata.companyName === 'string' && metadata.companyName.length > 2) {
    mappings.push({ original: metadata.companyName, placeholder: '[COMPANY]' });
    sanitized.companyName = '[COMPANY]';
  }

  // Replace founder name if present
  if (typeof metadata.founderName === 'string' && metadata.founderName.length > 2) {
    mappings.push({ original: metadata.founderName, placeholder: '[FOUNDER]' });
    sanitized.founderName = '[FOUNDER]';
  }

  // Remove or mask sensitive URLs
  if (typeof metadata.website === 'string') {
    sanitized.website = '[COMPANY_WEBSITE]';
  }

  // Remove tagline (often unique/identifying)
  if (typeof metadata.tagline === 'string') {
    sanitized.tagline = '[TAGLINE]';
  }

  // Sanitize description (may contain company name)
  if (typeof metadata.description === 'string') {
    const companyName = typeof metadata.companyName === 'string' ? metadata.companyName : '';
    const { text } = sanitizePII(metadata.description, companyName);
    sanitized.description = text;
  }

  // Keep these as they're non-identifying:
  // - industry, sector, businessModel, revenueModel
  // - stage, foundedYear
  // - teamSize, cofounderCount
  // - country, city (general location is ok)
  // - fundingStage, isRevenue

  // Mask specific financial figures
  if (typeof metadata.totalRaised === 'number' && metadata.totalRaised > 0) {
    // Convert to range instead of exact figure
    const raised = metadata.totalRaised as number;
    if (raised < 100000) sanitized.totalRaised = 'under $100K';
    else if (raised < 500000) sanitized.totalRaised = '$100K-$500K';
    else if (raised < 1000000) sanitized.totalRaised = '$500K-$1M';
    else if (raised < 5000000) sanitized.totalRaised = '$1M-$5M';
    else if (raised < 10000000) sanitized.totalRaised = '$5M-$10M';
    else sanitized.totalRaised = '$10M+';
  }

  if (typeof metadata.monthlyRevenue === 'number' && metadata.monthlyRevenue > 0) {
    const mrr = metadata.monthlyRevenue as number;
    if (mrr < 10000) sanitized.monthlyRevenue = 'under $10K MRR';
    else if (mrr < 50000) sanitized.monthlyRevenue = '$10K-$50K MRR';
    else if (mrr < 100000) sanitized.monthlyRevenue = '$50K-$100K MRR';
    else if (mrr < 500000) sanitized.monthlyRevenue = '$100K-$500K MRR';
    else sanitized.monthlyRevenue = '$500K+ MRR';
  }

  // Sanitize target customer and competitive advantage (may be identifying)
  if (typeof metadata.targetCustomer === 'string') {
    const companyName = typeof metadata.companyName === 'string' ? metadata.companyName : '';
    const { text } = sanitizePII(metadata.targetCustomer, companyName);
    sanitized.targetCustomer = text;
  }

  if (typeof metadata.competitiveAdvantage === 'string') {
    const companyName = typeof metadata.companyName === 'string' ? metadata.companyName : '';
    const { text } = sanitizePII(metadata.competitiveAdvantage, companyName);
    sanitized.competitiveAdvantage = text;
  }

  if (typeof metadata.problemSolved === 'string') {
    const companyName = typeof metadata.companyName === 'string' ? metadata.companyName : '';
    const { text } = sanitizePII(metadata.problemSolved, companyName);
    sanitized.problemSolved = text;
  }

  return { sanitized, mappings };
}

/**
 * Build a sanitized context string for LLM prompts.
 */
export function buildSanitizedContext(metadata: Record<string, unknown>): {
  context: string;
  mappings: SanitizationMap[];
} {
  const { sanitized, mappings } = sanitizeStartupMetadata(metadata);
  
  const parts: string[] = [];
  
  // Company basics (anonymized)
  parts.push(`Company: ${String(sanitized.companyName || '[COMPANY]')}`);
  
  if (sanitized.industry) parts.push(`Industry: ${String(sanitized.industry)}`);
  if (sanitized.sector) parts.push(`Sector: ${String(sanitized.sector)}`);
  if (sanitized.stage) parts.push(`Stage: ${String(sanitized.stage)}`);
  if (sanitized.businessModel) parts.push(`Business Model: ${String(sanitized.businessModel)}`);
  
  // Location (general)
  if (sanitized.country) {
    const location = sanitized.city ? `${String(sanitized.city)}, ${String(sanitized.country)}` : String(sanitized.country);
    parts.push(`Location: ${location}`);
  }
  
  // Team
  if (sanitized.teamSize) parts.push(`Team Size: ${String(sanitized.teamSize)}`);
  
  // Financials (ranges, not exact)
  if (sanitized.fundingStage) parts.push(`Funding: ${String(sanitized.fundingStage)}`);
  if (sanitized.totalRaised) parts.push(`Raised: ${String(sanitized.totalRaised)}`);
  if (sanitized.monthlyRevenue) parts.push(`Revenue: ${String(sanitized.monthlyRevenue)}`);
  
  return {
    context: parts.join(' | '),
    mappings,
  };
}

// Helper to escape special regex characters
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
