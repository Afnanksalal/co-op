// RAG Service Types - Communication with the RAG backend

// Domain types - legal or finance (RAG-enabled agents)
export type RagDomain = 'legal' | 'finance';

// Sector types - must match RAG service
export const RAG_SECTORS = ['fintech', 'greentech', 'healthtech', 'saas', 'ecommerce'] as const;
export type RagSector = (typeof RAG_SECTORS)[number];

// Vector status
export type VectorStatus = 'pending' | 'indexed' | 'expired';

// === Request Types ===

export interface RegisterFileRequest {
  fileId: string;
  filename: string;
  storagePath: string;
  domain: RagDomain;
  sector: RagSector;
  contentType: string;
}

export interface QueryRequest {
  query: string;
  domain: RagDomain;
  sector: RagSector;
  limit?: number;
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
}

export interface QueryResponse {
  answer: string;
  sources: QuerySource[];
  domain: string;
  sector: string;
  vectorsLoaded: number;
}

export interface RagFileInfo {
  id: string;
  filename: string;
  storagePath: string;
  domain: string;
  sector: string;
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
