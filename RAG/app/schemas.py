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


class Region(str, Enum):
    """Geographic region for jurisdiction filtering"""
    GLOBAL = "global"      # Applies everywhere
    EU = "eu"              # European Union (GDPR, EU regulations)
    US = "us"              # United States (SEC, FTC, state laws)
    UK = "uk"              # United Kingdom (post-Brexit regulations)
    INDIA = "india"        # India (SEBI, RBI, IT Act)
    APAC = "apac"          # Asia-Pacific (Singapore, Australia, Japan, etc.)
    LATAM = "latam"        # Latin America (Brazil LGPD, Mexico, etc.)
    MENA = "mena"          # Middle East & North Africa
    CANADA = "canada"      # Canada (PIPEDA, provincial laws)


class Jurisdiction(str, Enum):
    """Specific regulatory frameworks"""
    GENERAL = "general"        # General guidance, no specific jurisdiction
    # Privacy & Data Protection
    GDPR = "gdpr"              # EU General Data Protection Regulation
    CCPA = "ccpa"              # California Consumer Privacy Act
    LGPD = "lgpd"              # Brazil Lei Geral de Proteção de Dados
    PIPEDA = "pipeda"          # Canada Personal Information Protection
    PDPA = "pdpa"              # Singapore Personal Data Protection Act
    DPDP = "dpdp"              # India Digital Personal Data Protection
    # Financial Regulations
    SEC = "sec"                # US Securities and Exchange Commission
    FINRA = "finra"            # US Financial Industry Regulatory Authority
    FCA = "fca"                # UK Financial Conduct Authority
    SEBI = "sebi"              # India Securities and Exchange Board
    MAS = "mas"                # Singapore Monetary Authority
    ESMA = "esma"              # EU European Securities and Markets Authority
    # Industry Compliance
    HIPAA = "hipaa"            # US Health Insurance Portability
    PCI_DSS = "pci_dss"        # Payment Card Industry Data Security
    SOX = "sox"                # Sarbanes-Oxley Act
    AML_KYC = "aml_kyc"        # Anti-Money Laundering / Know Your Customer
    # Tech & IP
    DMCA = "dmca"              # Digital Millennium Copyright Act
    PATENT = "patent"          # Patent law
    TRADEMARK = "trademark"    # Trademark law
    COPYRIGHT = "copyright"    # Copyright law
    # Employment
    EMPLOYMENT = "employment"  # Employment law (general)
    LABOR = "labor"            # Labor regulations
    # Corporate
    CORPORATE = "corporate"    # Corporate law, governance
    TAX = "tax"                # Tax regulations
    CONTRACTS = "contracts"    # Contract law


class DocumentType(str, Enum):
    """Type of document content"""
    REGULATION = "regulation"  # Official regulatory text
    GUIDANCE = "guidance"      # Regulatory guidance documents
    CASE_LAW = "case_law"      # Court decisions, precedents
    TEMPLATE = "template"      # Contract/document templates
    GUIDE = "guide"            # How-to guides, best practices
    CHECKLIST = "checklist"    # Compliance checklists
    ANALYSIS = "analysis"      # Legal/financial analysis
    FAQ = "faq"                # Frequently asked questions


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
    # New jurisdiction fields
    region: Region = Field(default=Region.GLOBAL, description="Geographic region")
    jurisdictions: List[Jurisdiction] = Field(default=[Jurisdiction.GENERAL], description="Applicable regulatory frameworks")
    document_type: DocumentType = Field(default=DocumentType.GUIDE, description="Type of document")


class QueryRequest(BaseModel):
    """Request body for RAG query"""
    query: str = Field(..., description="User question")
    domain: Domain = Field(..., description="Domain to search: legal or finance")
    sector: Sector = Field(..., description="Sector to filter by")
    limit: Optional[int] = Field(default=5, ge=1, le=20, description="Max results")
    # New jurisdiction fields
    region: Optional[Region] = Field(default=None, description="Filter by geographic region")
    jurisdictions: Optional[List[Jurisdiction]] = Field(default=None, description="Filter by regulatory frameworks")
    document_type: Optional[DocumentType] = Field(default=None, description="Filter by document type")


class SourceResponse(BaseModel):
    """Source document reference in query response"""
    file_id: str
    filename: str
    score: float
    domain: str
    sector: str
    chunk_index: int = Field(default=0, description="Index of the chunk within the file")
    region: Optional[str] = Field(default=None, description="Geographic region of the document")
    jurisdictions: Optional[List[str]] = Field(default=None, description="Applicable jurisdictions")
    document_type: Optional[str] = Field(default=None, description="Type of document")


class QueryResponse(BaseModel):
    """
    Response from RAG query - returns context only, NO LLM generation.
    The backend's LLM Council handles answer generation.
    """
    context: str = Field(description="Combined text from relevant document chunks")
    sources: List[SourceResponse]
    domain: str
    sector: str
    region: Optional[str] = Field(default=None, description="Region filter applied")
    jurisdictions: Optional[List[str]] = Field(default=None, description="Jurisdiction filters applied")
    vectors_loaded: int = Field(description="How many docs were lazy-loaded during this query")
    chunks_found: int = Field(description="Number of relevant chunks found")
    error: Optional[str] = Field(default=None, description="Error message if query failed")


class FileResponse(BaseModel):
    """File metadata response"""
    id: str
    filename: str
    storage_path: str
    domain: str
    sector: str
    region: str = Field(default="global")
    jurisdictions: List[str] = Field(default=["general"])
    document_type: str = Field(default="guide")
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
    regions: List[str]
    jurisdictions: List[str]
    document_types: List[str]
