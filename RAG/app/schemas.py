from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum
from datetime import datetime


class Domain(str, Enum):
    """Document domain - legal or finance"""
    LEGAL = "legal"
    FINANCE = "finance"


class Sector(str, Enum):
    """Industry sector for document categorization"""
    FINTECH = "fintech"
    GREENTECH = "greentech"
    HEALTHTECH = "healthtech"
    SAAS = "saas"
    ECOMMERCE = "ecommerce"


class VectorStatus(str, Enum):
    """Vector indexing status"""
    PENDING = "pending"        # File uploaded, not yet vectorized
    INDEXED = "indexed"        # Vectors in Upstash
    EXPIRED = "expired"        # Vectors removed due to inactivity


# === Request/Response Models ===

class RegisterFileRequest(BaseModel):
    """Register a file that's already in Supabase Storage"""
    file_id: str = Field(..., description="UUID of the file")
    filename: str = Field(..., description="Original filename")
    storage_path: str = Field(..., description="Path in Supabase Storage")
    domain: Domain = Field(..., description="Document domain: legal or finance")
    sector: Sector = Field(..., description="Industry sector")
    content_type: str = Field(default="application/pdf")


class QueryRequest(BaseModel):
    """Request body for RAG query"""
    query: str = Field(..., description="User question")
    domain: Domain = Field(..., description="Domain to search: legal or finance")
    sector: Sector = Field(..., description="Sector to filter by")
    limit: Optional[int] = Field(default=5, ge=1, le=20, description="Max results")


class SourceResponse(BaseModel):
    """Source document reference in query response"""
    file_id: str
    filename: str
    score: float
    domain: str
    sector: str


class QueryResponse(BaseModel):
    """Response from RAG query"""
    answer: str
    sources: List[SourceResponse]
    domain: str
    sector: str
    vectors_loaded: int  # How many docs were lazy-loaded


class FileResponse(BaseModel):
    """File metadata response"""
    id: str
    filename: str
    storage_path: str
    domain: str
    sector: str
    vector_status: str
    chunk_count: int
    last_accessed: Optional[datetime]
    created_at: datetime


class RegisterResponse(BaseModel):
    """Response from file registration"""
    success: bool
    file_id: str
    message: str


class VectorizeResponse(BaseModel):
    """Response from vectorization"""
    success: bool
    file_id: str
    chunks_created: int
    message: str


class CleanupResponse(BaseModel):
    """Response from cleanup job"""
    files_cleaned: int
    vectors_removed: int
    message: str


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    db: str
    vector: str
    storage: str
    domains: List[str]
    sectors: List[str]
