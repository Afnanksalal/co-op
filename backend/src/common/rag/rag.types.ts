// RAG Service Types - Communication with the RAG backend

// Domain types - legal or finance (RAG-enabled agents)
export const RAG_DOMAINS = ['legal', 'finance'] as const;
export type RagDomain = (typeof RAG_DOMAINS)[number];

// Sector types - must match RAG service
export const RAG_SECTORS = ['fintech', 'greentech', 'healthtech', 'saas', 'ecommerce'] as const;
export type RagSector = (typeof RAG_SECTORS)[number];

// Region types - geographic regions for jurisdiction filtering
export const RAG_REGIONS = [
  'global',    // Applies everywhere
  'eu',        // European Union (GDPR, EU regulations)
  'us',        // United States (SEC, FTC, state laws)
  'uk',        // United Kingdom (post-Brexit regulations)
  'india',     // India (SEBI, RBI, IT Act)
  'apac',      // Asia-Pacific (Singapore, Australia, Japan, etc.)
  'latam',     // Latin America (Brazil LGPD, Mexico, etc.)
  'mena',      // Middle East & North Africa
  'canada',    // Canada (PIPEDA, provincial laws)
] as const;
export type RagRegion = (typeof RAG_REGIONS)[number];

// Jurisdiction types - specific regulatory frameworks
export const RAG_JURISDICTIONS = [
  'general',       // General guidance, no specific jurisdiction
  // Privacy & Data Protection
  'gdpr',          // EU General Data Protection Regulation
  'ccpa',          // California Consumer Privacy Act
  'lgpd',          // Brazil Lei Geral de Proteção de Dados
  'pipeda',        // Canada Personal Information Protection
  'pdpa',          // Singapore Personal Data Protection Act
  'dpdp',          // India Digital Personal Data Protection
  // Financial Regulations
  'sec',           // US Securities and Exchange Commission
  'finra',         // US Financial Industry Regulatory Authority
  'fca',           // UK Financial Conduct Authority
  'sebi',          // India Securities and Exchange Board
  'mas',           // Singapore Monetary Authority
  'esma',          // EU European Securities and Markets Authority
  // Industry Compliance
  'hipaa',         // US Health Insurance Portability
  'pci_dss',       // Payment Card Industry Data Security
  'sox',           // Sarbanes-Oxley Act
  'aml_kyc',       // Anti-Money Laundering / Know Your Customer
  // Tech & IP
  'dmca',          // Digital Millennium Copyright Act
  'patent',        // Patent law
  'trademark',     // Trademark law
  'copyright',     // Copyright law
  // Employment
  'employment',    // Employment law (general)
  'labor',         // Labor regulations
  // Corporate
  'corporate',     // Corporate law, governance
  'tax',           // Tax regulations
  'contracts',     // Contract law
] as const;
export type RagJurisdiction = (typeof RAG_JURISDICTIONS)[number];

// Document types - categorization of document content
export const RAG_DOCUMENT_TYPES = [
  'regulation',    // Official regulatory text
  'guidance',      // Regulatory guidance documents
  'case_law',      // Court decisions, precedents
  'template',      // Contract/document templates
  'guide',         // How-to guides, best practices
  'checklist',     // Compliance checklists
  'analysis',      // Legal/financial analysis
  'faq',           // Frequently asked questions
] as const;
export type RagDocumentType = (typeof RAG_DOCUMENT_TYPES)[number];

// Vector status
export type VectorStatus = 'pending' | 'indexed' | 'expired';

// Country to region mapping
export const COUNTRY_TO_REGION: Record<string, RagRegion> = {
  // EU Countries
  'germany': 'eu', 'france': 'eu', 'italy': 'eu', 'spain': 'eu', 'netherlands': 'eu',
  'belgium': 'eu', 'austria': 'eu', 'poland': 'eu', 'sweden': 'eu', 'denmark': 'eu',
  'finland': 'eu', 'ireland': 'eu', 'portugal': 'eu', 'greece': 'eu', 'czech republic': 'eu',
  'romania': 'eu', 'hungary': 'eu', 'slovakia': 'eu', 'bulgaria': 'eu', 'croatia': 'eu',
  'slovenia': 'eu', 'lithuania': 'eu', 'latvia': 'eu', 'estonia': 'eu', 'cyprus': 'eu',
  'luxembourg': 'eu', 'malta': 'eu',
  // US
  'united states': 'us', 'usa': 'us', 'us': 'us',
  // UK
  'united kingdom': 'uk', 'uk': 'uk', 'england': 'uk', 'scotland': 'uk', 'wales': 'uk',
  // India
  'india': 'india',
  // Canada
  'canada': 'canada',
  // APAC
  'australia': 'apac', 'japan': 'apac', 'singapore': 'apac', 'south korea': 'apac',
  'hong kong': 'apac', 'taiwan': 'apac', 'new zealand': 'apac', 'malaysia': 'apac',
  'thailand': 'apac', 'indonesia': 'apac', 'philippines': 'apac', 'vietnam': 'apac',
  'china': 'apac',
  // LATAM
  'brazil': 'latam', 'mexico': 'latam', 'argentina': 'latam', 'chile': 'latam',
  'colombia': 'latam', 'peru': 'latam', 'venezuela': 'latam', 'ecuador': 'latam',
  // MENA
  'united arab emirates': 'mena', 'uae': 'mena', 'saudi arabia': 'mena', 'israel': 'mena',
  'egypt': 'mena', 'turkey': 'mena', 'qatar': 'mena', 'kuwait': 'mena', 'bahrain': 'mena',
  'oman': 'mena', 'jordan': 'mena', 'lebanon': 'mena', 'morocco': 'mena',
};

// Helper to get region from country
export function getRegionFromCountry(country: string): RagRegion {
  const normalized = country.toLowerCase().trim();
  return COUNTRY_TO_REGION[normalized] || 'global';
}

// === Request Types ===

export interface RegisterFileRequest {
  fileId: string;
  filename: string;
  storagePath: string;
  domain: RagDomain;
  sector: RagSector;
  contentType: string;
  // New fields for jurisdiction filtering
  region?: RagRegion;
  jurisdictions?: RagJurisdiction[];
  documentType?: RagDocumentType;
}

export interface QueryRequest {
  query: string;
  domain: RagDomain;
  sector: RagSector;
  limit?: number;
  // New fields for jurisdiction filtering
  region?: RagRegion;
  jurisdictions?: RagJurisdiction[];
  documentType?: RagDocumentType;
}

// === Response Types ===

export interface RegisterFileResponse {
  success: boolean;
  fileId: string;
  message: string;
}

export interface VectorizeResponse {
  success: boolean;
  fileId: string;
  chunksCreated: number;
  message: string;
}

export interface QuerySource {
  fileId: string;
  filename: string;
  score: number;
  domain: string;
  sector: string;
  chunkIndex: number;
  region?: string;
  jurisdictions?: string[];
  documentType?: string;
}

export interface QueryResponse {
  /** Combined text from relevant document chunks - NO LLM generation */
  context: string;
  sources: QuerySource[];
  domain: string;
  sector: string;
  region?: string;
  jurisdictions?: string[];
  vectorsLoaded: number;
  chunksFound: number;
  error?: string;
}

export interface RagFileInfo {
  id: string;
  filename: string;
  storagePath: string;
  domain: string;
  sector: string;
  region?: string;
  jurisdictions?: string[];
  documentType?: string;
  vectorStatus: VectorStatus;
  chunkCount: number;
  lastAccessed: string | null;
  createdAt: string;
}

export interface ListFilesResponse {
  files: RagFileInfo[];
  count: number;
}

export interface DeleteFileResponse {
  success: boolean;
  message: string;
  chunksDeleted: number;
}

export interface CleanupResponse {
  filesCleaned: number;
  vectorsRemoved: number;
  message: string;
}
