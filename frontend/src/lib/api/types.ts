// === ENUMS ===
export type FounderRole = 'ceo' | 'cto' | 'coo' | 'cfo' | 'cpo' | 'founder' | 'cofounder';

export type Industry =
  | 'saas' | 'fintech' | 'healthtech' | 'edtech' | 'ecommerce' | 'marketplace'
  | 'ai_ml' | 'artificial_intelligence' | 'cybersecurity' | 'cleantech' | 'biotech'
  | 'proptech' | 'insurtech' | 'legaltech' | 'hrtech' | 'agritech' | 'logistics'
  | 'media_entertainment' | 'gaming' | 'food_beverage' | 'travel_hospitality'
  | 'social' | 'developer_tools' | 'hardware' | 'other';

export type Sector = 'fintech' | 'greentech' | 'healthtech' | 'saas' | 'ecommerce';

export type BusinessModel = 'b2b' | 'b2c' | 'b2b2c' | 'marketplace' | 'd2c' | 'enterprise' | 'smb' | 'consumer' | 'platform' | 'api' | 'other';

export type RevenueModel = 'subscription' | 'transaction_fee' | 'freemium' | 'usage_based' | 'licensing' | 'advertising' | 'commission' | 'one_time' | 'hybrid' | 'not_yet';

export type Stage = 'idea' | 'prototype' | 'mvp' | 'beta' | 'launched' | 'growth' | 'scale';

export type TeamSize = '1-5' | '6-20' | '21-50' | '51-200' | '200+';

export type FundingStage = 'bootstrapped' | 'pre_seed' | 'seed' | 'series_a' | 'series_b' | 'series_c_plus' | 'profitable';

export type RevenueStatus = 'yes' | 'no' | 'pre_revenue';

export type AgentType = 'legal' | 'finance' | 'investor' | 'competitor';

export type SessionStatus = 'active' | 'ended' | 'expired';

export type MessageRole = 'user' | 'assistant' | 'system';

// === USER ===
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  authProvider: 'google' | 'email' | null;
  onboardingCompleted: boolean;
  startup: StartupSummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface StartupSummary {
  id: string;
  companyName: string;
  industry: string;
  sector: Sector;
  stage: string;
  fundingStage: string | null;
}

// === STARTUP ===
export interface Startup {
  id: string;
  founderName: string;
  founderRole: string;
  companyName: string;
  tagline: string | null;
  description: string;
  website: string | null;
  industry: string;
  sector: Sector;
  businessModel: string;
  revenueModel: string | null;
  stage: string;
  foundedYear: number;
  launchDate: string | null;
  teamSize: string;
  cofounderCount: number;
  country: string;
  city: string | null;
  operatingRegions: string | null;
  fundingStage: string | null;
  totalRaised: string | null;
  monthlyRevenue: string | null;
  isRevenue: string;
  targetCustomer: string | null;
  problemSolved: string | null;
  competitiveAdvantage: string | null;
  createdAt: string;
  updatedAt: string;
}

// === SESSION ===
export interface Session {
  id: string;
  userId: string;
  startupId: string;
  status: SessionStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// === MESSAGE ===
export interface Message {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  agent: AgentType | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// === AGENT ===
export interface AgentOutput {
  content: string;
  confidence: number;
  sources: string[];
  metadata: Record<string, unknown>;
}

export interface AgentPhaseResult {
  phase: 'draft' | 'critique' | 'final';
  model: string;
  output: AgentOutput;
  timestamp: string;
}

export interface TaskStatus {
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  result?: {
    success: boolean;
    results: AgentPhaseResult[];
    error: string;
    completedAt: string;
  };
  error?: string;
}

// === ONBOARDING ===
export interface OnboardingData {
  founderName: string;
  founderRole: FounderRole;
  companyName: string;
  tagline?: string;
  description: string;
  website?: string;
  industry: Industry;
  sector: Sector;
  businessModel: BusinessModel;
  revenueModel?: RevenueModel;
  stage: Stage;
  foundedYear: number;
  launchDate?: string;
  teamSize: TeamSize;
  cofounderCount: number;
  country: string;
  city?: string;
  operatingRegions?: string;
  fundingStage?: FundingStage;
  totalRaised?: number;
  monthlyRevenue?: number;
  isRevenue: RevenueStatus;
  targetCustomer?: string;
  problemSolved?: string;
  competitiveAdvantage?: string;
}

// === API KEYS ===
export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
}

// === WEBHOOKS ===
export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
}

// === ANALYTICS ===
export interface DashboardStats {
  totalUsers: number;
  totalSessions: number;
  totalStartups: number;
  activeSessions: number;
  eventsToday: number;
  eventsByType: { type: string; count: number }[];
}
