from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum
from datetime import datetime


class Domain(str, Enum):
    LEGAL = "legal"
    FINANCE = "finance"


class Sector(str, Enum):
    FINTECH = "fintech"
    GREENTECH = "greentech"
    HEALTHTECH = "healthtech"
    SAAS = "saas"
    ECOMMERCE = "ecommerce"


class Region(str, Enum):
    GLOBAL = "global"
    EU = "eu"
    US = "us"
    UK = "uk"
    INDIA = "india"
    APAC = "apac"
    LATAM = "latam"
    MENA = "mena"
    CANADA = "canada"


class Jurisdiction(str, Enum):
    GENERAL = "general"
    GDPR = "gdpr"
    CCPA = "ccpa"
    LGPD = "lgpd"
    PIPEDA = "pipeda"
    PDPA = "pdpa"
    DPDP = "dpdp"
    SEC = "sec"
    FINRA = "finra"
    FCA = "fca"
    SEBI = "sebi"
    MAS = "mas"
    ESMA = "esma"
    HIPAA = "hipaa"
    PCI_DSS = "pci_dss"
    SOX = "sox"
    AML_KYC = "aml_kyc"
    DMCA = "dmca"
    PATENT = "patent"
    TRADEMARK = "trademark"
    COPYRIGHT = "copyright"
    EMPLOYMENT = "employment"
    LABOR = "labor"
    CORPORATE = "corporate"
    TAX = "tax"
    CONTRACTS = "contracts"


class DocumentType(str, Enum):
    REGULATION = "regulation"
    GUIDANCE = "guidance"
    CASE_LAW = "case_law"
    TEMPLATE = "template"
    GUIDE = "guide"
    CHECKLIST = "checklist"
    ANALYSIS = "analysis"
    FAQ = "faq"


class VectorStatus(str, Enum):
    PENDING = "pending"
    INDEXED = "indexed"
    EXPIRED = "expired"


class RegisterFileRequest(BaseModel):
    file_id: str
    filename: str
    storage_path: str
    domain: Domain
    sector: Sector
    content_type: str = "application/pdf"
    region: Region = Region.GLOBAL
    jurisdictions: List[Jurisdiction] = [Jurisdiction.GENERAL]
    document_type: DocumentType = DocumentType.GUIDE


class QueryRequest(BaseModel):
    query: str
    domain: Domain
    sector: Sector
    limit: Optional[int] = Field(default=5, ge=1, le=20)
    region: Optional[Region] = None
    jurisdictions: Optional[List[Jurisdiction]] = None
    document_type: Optional[DocumentType] = None


class SourceResponse(BaseModel):
    file_id: str
    filename: str
    score: float
    domain: str
    sector: str
    chunk_index: int = 0
    region: Optional[str] = None
    jurisdictions: Optional[List[str]] = None
    document_type: Optional[str] = None


class QueryResponse(BaseModel):
    context: str
    sources: List[SourceResponse]
    domain: str
    sector: str
    region: Optional[str] = None
    jurisdictions: Optional[List[str]] = None
    vectors_loaded: int
    chunks_found: int
    error: Optional[str] = None


class FileResponse(BaseModel):
    id: str
    filename: str
    storage_path: str
    domain: str
    sector: str
    region: str = "global"
    jurisdictions: List[str] = ["general"]
    document_type: str = "guide"
    vector_status: str
    chunk_count: int
    last_accessed: Optional[datetime]
    created_at: datetime


class RegisterResponse(BaseModel):
    success: bool
    file_id: str
    message: str


class VectorizeResponse(BaseModel):
    success: bool
    file_id: str
    chunks_created: int
    message: str


class CleanupResponse(BaseModel):
    files_cleaned: int
    vectors_removed: int
    message: str


class HealthResponse(BaseModel):
    status: str
    db: str
    vector: str
    storage: str
    domains: List[str]
    sectors: List[str]
    regions: List[str]
    jurisdictions: List[str]
    document_types: List[str]


class CompressionQueryRequest(BaseModel):
    query: str
    domain: Domain
    sector: Sector
    limit: Optional[int] = Field(default=5, ge=1, le=20)
    region: Optional[Region] = None
    jurisdictions: Optional[List[Jurisdiction]] = None
    document_type: Optional[DocumentType] = None


class CompressionQueryResponse(BaseModel):
    context: str
    compressed: bool
    compression_ratio: Optional[float] = None
    processing_time_ms: int
    chunks_found: int
    sources: List[SourceResponse] = []
    error: Optional[str] = None


class CompressionHealthResponse(BaseModel):
    available: bool
    provider: Optional[str] = None
    model: Optional[str] = None
    device: Optional[str] = None
    error: Optional[str] = None


# ============================================
# User Document Schemas (Secure Documents)
# ============================================

class UserDocEmbedRequest(BaseModel):
    """Request to embed a user document chunk."""
    document_id: str
    chunk_index: int
    user_id: str
    content: str  # Plaintext chunk content - will be encrypted before storage
    filename: str


class UserDocEmbedResponse(BaseModel):
    """Response from embedding a user document chunk."""
    success: bool
    vector_id: str
    message: str


class UserDocSearchRequest(BaseModel):
    """Request to search user documents."""
    query: str
    user_id: str
    document_ids: Optional[List[str]] = None  # Filter to specific docs
    limit: int = Field(default=5, ge=1, le=20)
    min_score: float = Field(default=0.5, ge=0.0, le=1.0)


class UserDocSearchResult(BaseModel):
    """Single search result from user documents."""
    document_id: str
    chunk_index: int
    score: float
    filename: str
    content: str  # Decrypted content for LLM context


class UserDocSearchResponse(BaseModel):
    """Response from searching user documents."""
    results: List[UserDocSearchResult]
    query_embedding_time_ms: int
    search_time_ms: int
    error: Optional[str] = None


class UserDocDeleteResponse(BaseModel):
    """Response from deleting user document vectors."""
    success: bool
    vectors_deleted: int
    message: str


class UserDocGetChunksRequest(BaseModel):
    """Request to get specific chunks by indices."""
    document_id: str
    user_id: str
    chunk_indices: List[int]


class UserDocChunk(BaseModel):
    """A decrypted document chunk."""
    document_id: str
    chunk_index: int
    content: str
    filename: str


class UserDocGetChunksResponse(BaseModel):
    """Response with decrypted chunks."""
    chunks: List[UserDocChunk]
    error: Optional[str] = None
