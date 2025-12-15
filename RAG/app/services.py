"""
RAG Service - Vector Search with Jurisdiction Filtering
========================================================
This service handles:
1. Document vectorization (PDF → chunks → embeddings → Upstash)
2. Semantic search with geographic/jurisdiction filtering
3. Context retrieval (return relevant chunks to backend)

LLM answer generation is handled by the backend's LLM Council.
This keeps the RAG service focused and removes duplicate LLM dependencies.
"""

import os
import logging
import google.generativeai as genai
from supabase import create_client, Client
from upstash_vector import Index
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader
from io import BytesIO
from typing import Optional, List
from app.database import db
from app.schemas import Domain, Sector, Region, Jurisdiction, DocumentType, VectorStatus

# Configure logging
logger = logging.getLogger(__name__)

# ===========================================
# Client Initialization with Validation
# ===========================================

def _init_google_ai() -> bool:
    """Initialize Google AI for embeddings."""
    api_key = os.getenv("GOOGLE_AI_API_KEY")
    if not api_key:
        logger.warning("GOOGLE_AI_API_KEY not set - embeddings will fail")
        return False
    genai.configure(api_key=api_key)
    return True

def _init_supabase() -> Client | None:
    """Initialize Supabase client for storage access."""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    if not url or not key:
        logger.warning("SUPABASE_URL or SUPABASE_SERVICE_KEY not set - storage access will fail")
        return None
    return create_client(url, key)

def _init_vector_index() -> Index | None:
    """Initialize Upstash Vector index."""
    url = os.getenv("UPSTASH_VECTOR_REST_URL")
    token = os.getenv("UPSTASH_VECTOR_REST_TOKEN")
    if not url or not token:
        logger.warning("UPSTASH_VECTOR_REST_URL or UPSTASH_VECTOR_REST_TOKEN not set - vector search will fail")
        return None
    return Index(url=url, token=token)

# Initialize clients
_google_ai_ready = _init_google_ai()
supabase: Client | None = _init_supabase()
vector_index: Index | None = _init_vector_index()
STORAGE_BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "documents")


# ===========================================
# Embedding Functions
# ===========================================

async def get_embedding(text: str) -> list[float]:
    """
    Generate embedding using Gemini text-embedding-004 (768 dimensions).
    """
    if not _google_ai_ready:
        raise ValueError("Google AI not configured - cannot generate embeddings")
    
    clean_text = text.replace("\n", " ").strip()
    if not clean_text:
        clean_text = "empty"
    
    max_chars = 8000
    if len(clean_text) > max_chars:
        clean_text = clean_text[:max_chars]
    
    try:
        result = genai.embed_content(
            model="models/text-embedding-004",
            content=clean_text,
            task_type="retrieval_document"
        )
        return result['embedding']
    except Exception as e:
        logger.error(f"Embedding generation failed: {e}")
        raise ValueError(f"Failed to generate embedding: {str(e)}")


async def get_query_embedding(text: str) -> list[float]:
    """Generate embedding for a query (uses retrieval_query task type)."""
    if not _google_ai_ready:
        raise ValueError("Google AI not configured - cannot generate embeddings")
    
    clean_text = text.replace("\n", " ").strip()
    if not clean_text:
        raise ValueError("Query cannot be empty")
    
    try:
        result = genai.embed_content(
            model="models/text-embedding-004",
            content=clean_text,
            task_type="retrieval_query"
        )
        return result['embedding']
    except Exception as e:
        logger.error(f"Query embedding generation failed: {e}")
        raise ValueError(f"Failed to generate query embedding: {str(e)}")


# ===========================================
# Storage Functions
# ===========================================

async def download_from_storage(storage_path: str) -> bytes:
    """Download file from Supabase Storage."""
    if not supabase:
        raise ValueError("Supabase not configured - cannot download files")
    
    try:
        response = supabase.storage.from_(STORAGE_BUCKET).download(storage_path)
        return response
    except Exception as e:
        logger.error(f"Storage download failed for {storage_path}: {e}")
        raise ValueError(f"Failed to download from storage: {str(e)}")


async def extract_text(file_content: bytes, content_type: str) -> str:
    """Extract text from file content (PDF or plain text)."""
    if content_type == "application/pdf":
        try:
            pdf = PdfReader(BytesIO(file_content))
            text_parts = []
            for page_num, page in enumerate(pdf.pages):
                try:
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(page_text)
                except Exception as e:
                    logger.warning(f"Failed to extract text from page {page_num}: {e}")
                    continue
            return "\n".join(text_parts)
        except Exception as e:
            logger.error(f"PDF extraction failed: {e}")
            raise ValueError(f"Failed to extract text from PDF: {str(e)}")
    else:
        try:
            return file_content.decode("utf-8")
        except UnicodeDecodeError:
            return file_content.decode("latin-1")


# ===========================================
# Vectorization Functions
# ===========================================

async def vectorize_file(file_id: str, file_info: dict) -> int:
    """
    Vectorize a file on-demand (lazy loading).
    
    Stores jurisdiction metadata in vectors for filtering.
    """
    if not vector_index:
        raise ValueError("Vector index not configured")
    
    storage_path = file_info["storage_path"]
    logger.info(f"Vectorizing file {file_id}")
    logger.info(f"Storage path: {storage_path}")
    logger.info(f"Domain: {file_info.get('domain')}, Sector: {file_info.get('sector')}")
    logger.info(f"Region: {file_info.get('region', 'global')}, Jurisdictions: {file_info.get('jurisdictions', ['general'])}")
    
    # Download from Supabase Storage
    try:
        file_content = await download_from_storage(storage_path)
        logger.info(f"Downloaded {len(file_content)} bytes from storage")
    except Exception as e:
        logger.error(f"Failed to download from storage path: {storage_path}")
        raise ValueError(f"Storage download failed for path '{storage_path}': {str(e)}")
    
    # Extract text
    text = await extract_text(file_content, file_info.get("content_type", "application/pdf"))
    
    if not text.strip():
        raise ValueError("No text content extracted from file")

    # Chunk text
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        separators=["\n\n", "\n", ". ", " ", ""],
        length_function=len,
    )
    chunks = splitter.split_text(text)

    if not chunks:
        raise ValueError("No chunks created from document")

    logger.info(f"Vectorizing {file_id}: {len(chunks)} chunks")

    # Get jurisdiction metadata
    region = file_info.get("region", "global")
    jurisdictions = file_info.get("jurisdictions", ["general"])
    if isinstance(jurisdictions, str):
        jurisdictions = jurisdictions.split(",")
    document_type = file_info.get("document_type", "guide")

    # Embed & upsert to Upstash in batches
    vectors_to_upsert = []
    batch_size = 10

    for i in range(0, len(chunks), batch_size):
        batch = chunks[i:i + batch_size]
        for j, chunk in enumerate(batch):
            chunk_idx = i + j
            try:
                embedding = await get_embedding(chunk)
            except Exception as e:
                logger.warning(f"Failed to embed chunk {chunk_idx}: {e}")
                continue
                
            chunk_id = f"{file_id}_{chunk_idx}"

            vectors_to_upsert.append({
                "id": chunk_id,
                "vector": embedding,
                "metadata": {
                    "file_id": file_id,
                    "filename": file_info["filename"],
                    "chunk_index": chunk_idx,
                    "domain": file_info["domain"],
                    "sector": file_info["sector"],
                    # Jurisdiction metadata for filtering
                    "region": region,
                    "jurisdictions": ",".join(jurisdictions),  # Store as comma-separated for Upstash
                    "document_type": document_type,
                },
                "data": chunk
            })

    if not vectors_to_upsert:
        raise ValueError("No vectors created - all embeddings failed")

    # Upsert to Upstash
    try:
        vector_index.upsert(vectors=vectors_to_upsert)
    except Exception as e:
        logger.error(f"Vector upsert failed: {e}")
        raise ValueError(f"Failed to store vectors: {str(e)}")

    # Update status in DB
    await db.update_vector_status(file_id, VectorStatus.INDEXED.value, len(vectors_to_upsert))
    
    logger.info(f"Vectorized {file_id}: {len(vectors_to_upsert)} vectors stored")
    return len(vectors_to_upsert)


async def remove_vectors(file_id: str, chunk_count: int) -> None:
    """Remove vectors for a file from Upstash."""
    if not vector_index or chunk_count == 0:
        return
        
    vector_ids = [f"{file_id}_{i}" for i in range(chunk_count)]
    try:
        vector_index.delete(ids=vector_ids)
        logger.info(f"Removed {len(vector_ids)} vectors for {file_id}")
    except Exception as e:
        logger.warning(f"Failed to remove vectors for {file_id}: {e}")


async def ensure_vectors_loaded(
    domain: Domain, 
    sector: Sector,
    region: Optional[Region] = None
) -> int:
    """Ensure all files for domain/sector/region are vectorized."""
    region_val = region.value if region else None
    pending_files = await db.get_pending_files(domain.value, sector.value, region_val)
    loaded_count = 0
    
    for file_info in pending_files:
        try:
            await vectorize_file(str(file_info["id"]), file_info)
            loaded_count += 1
        except Exception as e:
            logger.error(f"Failed to vectorize {file_info['id']}: {e}")
            continue
    
    return loaded_count


# ===========================================
# Query Functions (Context Retrieval Only)
# ===========================================

def _build_vector_filter(
    domain: Domain,
    sector: Sector,
    region: Optional[Region] = None,
    jurisdictions: Optional[List[Jurisdiction]] = None,
    document_type: Optional[DocumentType] = None
) -> str:
    """
    Build Upstash vector filter string.
    
    Filter logic:
    - Domain and sector are required exact matches
    - Region: matches exact region OR 'global'
    - Jurisdictions: uses CONTAINS for comma-separated string matching
    - Document type: optional exact match
    """
    filters = [
        f"domain = '{domain.value}'",
        f"sector = '{sector.value}'"
    ]
    
    # Region filter: include global docs + region-specific
    if region and region != Region.GLOBAL:
        filters.append(f"(region = '{region.value}' OR region = 'global')")
    
    # Document type filter
    if document_type:
        filters.append(f"document_type = '{document_type.value}'")
    
    return " AND ".join(filters)


def _matches_jurisdictions(
    file_jurisdictions: str,
    requested_jurisdictions: Optional[List[Jurisdiction]]
) -> bool:
    """Check if file jurisdictions match any requested jurisdiction."""
    if not requested_jurisdictions:
        return True
    
    file_juris_list = file_jurisdictions.split(",")
    
    # Include if file has 'general' OR any overlap
    if "general" in file_juris_list:
        return True
    
    requested_values = [j.value for j in requested_jurisdictions]
    return any(j in file_juris_list for j in requested_values)


async def query_rag(
    query: str,
    domain: Domain,
    sector: Sector,
    limit: int = 5,
    region: Optional[Region] = None,
    jurisdictions: Optional[List[Jurisdiction]] = None,
    document_type: Optional[DocumentType] = None
) -> dict:
    """
    Query the RAG system with jurisdiction filtering.
    
    Returns context only, NO LLM generation.
    The backend's LLM Council handles answer generation.
    """
    if not vector_index:
        return {
            "context": "",
            "sources": [],
            "domain": domain.value,
            "sector": sector.value,
            "region": region.value if region else None,
            "jurisdictions": [j.value for j in jurisdictions] if jurisdictions else None,
            "vectors_loaded": 0,
            "chunks_found": 0,
            "error": "Vector index not configured"
        }

    # Lazy load: vectorize any pending files
    vectors_loaded = await ensure_vectors_loaded(domain, sector, region)
    
    # Generate query embedding
    try:
        query_embedding = await get_query_embedding(query)
    except Exception as e:
        return {
            "context": "",
            "sources": [],
            "domain": domain.value,
            "sector": sector.value,
            "region": region.value if region else None,
            "jurisdictions": [j.value for j in jurisdictions] if jurisdictions else None,
            "vectors_loaded": vectors_loaded,
            "chunks_found": 0,
            "error": f"Failed to embed query: {str(e)}"
        }

    # Build filter for vector search
    vector_filter = _build_vector_filter(domain, sector, region, jurisdictions, document_type)
    
    # Search Upstash with metadata filter
    try:
        results = vector_index.query(
            vector=query_embedding,
            top_k=limit * 3,  # Get more results for jurisdiction filtering
            include_metadata=True,
            include_data=True,
            filter=vector_filter
        )
    except Exception as e:
        logger.error(f"Vector search failed: {e}")
        return {
            "context": "",
            "sources": [],
            "domain": domain.value,
            "sector": sector.value,
            "region": region.value if region else None,
            "jurisdictions": [j.value for j in jurisdictions] if jurisdictions else None,
            "vectors_loaded": vectors_loaded,
            "chunks_found": 0,
            "error": f"Vector search failed: {str(e)}"
        }

    # Filter by jurisdictions (post-filter since Upstash doesn't support CONTAINS well)
    filtered_results = []
    for r in results:
        if r.score < 0.5:  # Minimum relevance threshold
            continue
        
        file_jurisdictions = r.metadata.get("jurisdictions", "general")
        if _matches_jurisdictions(file_jurisdictions, jurisdictions):
            filtered_results.append(r)
        
        if len(filtered_results) >= limit:
            break

    if not filtered_results:
        return {
            "context": "",
            "sources": [],
            "domain": domain.value,
            "sector": sector.value,
            "region": region.value if region else None,
            "jurisdictions": [j.value for j in jurisdictions] if jurisdictions else None,
            "vectors_loaded": vectors_loaded,
            "chunks_found": 0
        }

    # Update access timestamps for used files
    used_file_ids = set(r.metadata.get("file_id") for r in filtered_results if r.metadata.get("file_id"))
    for file_id in used_file_ids:
        await db.touch_file(file_id)

    # Build context from chunks with jurisdiction info
    context_parts = []
    for res in filtered_results:
        source = res.metadata.get("filename", "Unknown")
        region_info = res.metadata.get("region", "global")
        juris_info = res.metadata.get("jurisdictions", "general")
        chunk_text = res.data if res.data else ""
        context_parts.append(f"[Source: {source} | Region: {region_info} | Jurisdictions: {juris_info}]\n{chunk_text}")
    
    context_text = "\n\n---\n\n".join(context_parts)

    # Build sources list with jurisdiction info
    sources = [
        {
            "file_id": r.metadata.get("file_id", ""),
            "filename": r.metadata.get("filename", "Unknown"),
            "score": round(r.score, 4),
            "domain": r.metadata.get("domain", domain.value),
            "sector": r.metadata.get("sector", sector.value),
            "chunk_index": r.metadata.get("chunk_index", 0),
            "region": r.metadata.get("region", "global"),
            "jurisdictions": r.metadata.get("jurisdictions", "general").split(","),
            "document_type": r.metadata.get("document_type", "guide"),
        }
        for r in filtered_results
    ]

    return {
        "context": context_text,
        "sources": sources,
        "domain": domain.value,
        "sector": sector.value,
        "region": region.value if region else None,
        "jurisdictions": [j.value for j in jurisdictions] if jurisdictions else None,
        "vectors_loaded": vectors_loaded,
        "chunks_found": len(filtered_results)
    }


# ===========================================
# Maintenance Functions
# ===========================================

async def cleanup_expired_vectors(days: int = 30) -> dict:
    """Remove vectors for files not accessed in X days."""
    expired_files = await db.get_expired_files(days)
    files_cleaned = 0
    vectors_removed = 0
    
    for file_info in expired_files:
        file_id = str(file_info["id"])
        chunk_count = file_info.get("chunk_count", 0)
        
        await remove_vectors(file_id, chunk_count)
        await db.update_vector_status(file_id, VectorStatus.EXPIRED.value, 0)
        
        files_cleaned += 1
        vectors_removed += chunk_count
    
    logger.info(f"Cleanup: {files_cleaned} files, {vectors_removed} vectors removed")
    
    return {
        "files_cleaned": files_cleaned,
        "vectors_removed": vectors_removed,
        "message": f"Cleaned {files_cleaned} files, removed {vectors_removed} vectors"
    }


async def delete_file_completely(file_id: str) -> dict:
    """Delete file metadata and vectors."""
    file_info = await db.get_file(file_id)
    
    if not file_info:
        return {"success": False, "message": "File not found", "chunks_deleted": 0}

    chunk_count = file_info.get("chunk_count", 0)
    
    if file_info.get("vector_status") == VectorStatus.INDEXED.value:
        await remove_vectors(file_id, chunk_count)
    
    await db.delete_file(file_id)

    logger.info(f"Deleted file {file_id}: {chunk_count} chunks removed")

    return {
        "success": True,
        "message": "File deleted",
        "chunks_deleted": chunk_count
    }
