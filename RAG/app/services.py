"""
RAG Service - Vector Search Only
================================
This service handles:
1. Document vectorization (PDF → chunks → embeddings → Upstash)
2. Semantic search (query → embedding → vector search)
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
from app.database import db
from app.schemas import Domain, Sector, VectorStatus

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
    
    Raises:
        ValueError: If Google AI is not configured or embedding fails
    """
    if not _google_ai_ready:
        raise ValueError("Google AI not configured - cannot generate embeddings")
    
    # Clean and validate text
    clean_text = text.replace("\n", " ").strip()
    if not clean_text:
        clean_text = "empty"
    
    # Truncate if too long (Gemini has token limits)
    max_chars = 8000  # Safe limit for embedding
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
    """
    Generate embedding for a query (uses retrieval_query task type).
    """
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
    """
    Download file from Supabase Storage.
    
    Raises:
        ValueError: If Supabase is not configured or download fails
    """
    if not supabase:
        raise ValueError("Supabase not configured - cannot download files")
    
    try:
        response = supabase.storage.from_(STORAGE_BUCKET).download(storage_path)
        return response
    except Exception as e:
        logger.error(f"Storage download failed for {storage_path}: {e}")
        raise ValueError(f"Failed to download from storage: {str(e)}")


async def extract_text(file_content: bytes, content_type: str) -> str:
    """
    Extract text from file content.
    
    Supports:
    - PDF files (application/pdf)
    - Plain text files
    """
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
    
    Process:
    1. Download from Supabase Storage
    2. Extract text from PDF
    3. Chunk text into segments
    4. Generate embeddings for each chunk
    5. Store vectors in Upstash
    6. Update database status
    
    Returns:
        Number of chunks created
        
    Raises:
        ValueError: If vectorization fails
    """
    if not vector_index:
        raise ValueError("Vector index not configured")
    
    storage_path = file_info["storage_path"]
    logger.info(f"Vectorizing file {file_id}")
    logger.info(f"Storage path: {storage_path}")
    logger.info(f"Domain: {file_info.get('domain')}, Sector: {file_info.get('sector')}")
    
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

    # Chunk text with optimal settings for RAG
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

    # Embed & upsert to Upstash in batches
    vectors_to_upsert = []
    batch_size = 10  # Process 10 chunks at a time

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
                    "sector": file_info["sector"]
                },
                "data": chunk  # Store text in 'data' field for retrieval
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


async def ensure_vectors_loaded(domain: Domain, sector: Sector) -> int:
    """
    Ensure all files for domain/sector are vectorized.
    
    Returns:
        Count of newly vectorized files
    """
    pending_files = await db.get_pending_files(domain.value, sector.value)
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

async def query_rag(
    query: str,
    domain: Domain,
    sector: Sector,
    limit: int = 5
) -> dict:
    """
    Query the RAG system - returns context only, NO LLM generation.
    
    The backend's LLM Council handles answer generation.
    This keeps RAG focused on retrieval and removes duplicate dependencies.
    
    Process:
    1. Ensure all matching files are vectorized (lazy loading)
    2. Generate query embedding
    3. Search vectors with domain/sector filter
    4. Update access timestamps for used files
    5. Return context chunks and sources
    
    Returns:
        {
            "context": str,           # Combined text from relevant chunks
            "sources": [...],         # Source file information
            "domain": str,
            "sector": str,
            "vectors_loaded": int,    # Files vectorized during this query
            "chunks_found": int       # Number of relevant chunks found
        }
    """
    if not vector_index:
        return {
            "context": "",
            "sources": [],
            "domain": domain.value,
            "sector": sector.value,
            "vectors_loaded": 0,
            "chunks_found": 0,
            "error": "Vector index not configured"
        }

    # Lazy load: vectorize any pending files
    vectors_loaded = await ensure_vectors_loaded(domain, sector)
    
    # Generate query embedding
    try:
        query_embedding = await get_query_embedding(query)
    except Exception as e:
        return {
            "context": "",
            "sources": [],
            "domain": domain.value,
            "sector": sector.value,
            "vectors_loaded": vectors_loaded,
            "chunks_found": 0,
            "error": f"Failed to embed query: {str(e)}"
        }

    # Search Upstash with metadata filter
    try:
        results = vector_index.query(
            vector=query_embedding,
            top_k=limit * 2,  # Get more results for filtering
            include_metadata=True,
            include_data=True,
            filter=f"domain = '{domain.value}' AND sector = '{sector.value}'"
        )
    except Exception as e:
        logger.error(f"Vector search failed: {e}")
        return {
            "context": "",
            "sources": [],
            "domain": domain.value,
            "sector": sector.value,
            "vectors_loaded": vectors_loaded,
            "chunks_found": 0,
            "error": f"Vector search failed: {str(e)}"
        }

    # Filter and limit results
    filtered_results = [
        r for r in results
        if r.metadata.get("domain") == domain.value
        and r.metadata.get("sector") == sector.value
        and r.score >= 0.5  # Minimum relevance threshold
    ][:limit]

    if not filtered_results:
        return {
            "context": "",
            "sources": [],
            "domain": domain.value,
            "sector": sector.value,
            "vectors_loaded": vectors_loaded,
            "chunks_found": 0
        }

    # Update access timestamps for used files
    used_file_ids = set(r.metadata.get("file_id") for r in filtered_results if r.metadata.get("file_id"))
    for file_id in used_file_ids:
        await db.touch_file(file_id)

    # Build context from chunks
    context_parts = []
    for res in filtered_results:
        source = res.metadata.get("filename", "Unknown")
        chunk_text = res.data if res.data else ""
        context_parts.append(f"[Source: {source}]\n{chunk_text}")
    
    context_text = "\n\n---\n\n".join(context_parts)

    # Build sources list
    sources = [
        {
            "file_id": r.metadata.get("file_id", ""),
            "filename": r.metadata.get("filename", "Unknown"),
            "score": round(r.score, 4),
            "domain": r.metadata.get("domain", domain.value),
            "sector": r.metadata.get("sector", sector.value),
            "chunk_index": r.metadata.get("chunk_index", 0)
        }
        for r in filtered_results
    ]

    return {
        "context": context_text,
        "sources": sources,
        "domain": domain.value,
        "sector": sector.value,
        "vectors_loaded": vectors_loaded,
        "chunks_found": len(filtered_results)
    }


# ===========================================
# Maintenance Functions
# ===========================================

async def cleanup_expired_vectors(days: int = 30) -> dict:
    """
    Remove vectors for files not accessed in X days.
    Files remain in Supabase Storage for future re-vectorization.
    
    Returns:
        {
            "files_cleaned": int,
            "vectors_removed": int,
            "message": str
        }
    """
    expired_files = await db.get_expired_files(days)
    files_cleaned = 0
    vectors_removed = 0
    
    for file_info in expired_files:
        file_id = str(file_info["id"])
        chunk_count = file_info.get("chunk_count", 0)
        
        # Remove vectors from Upstash
        await remove_vectors(file_id, chunk_count)
        
        # Update status to expired
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
    """
    Delete file metadata and vectors.
    Storage deletion is handled by the backend.
    
    Returns:
        {
            "success": bool,
            "message": str,
            "chunks_deleted": int
        }
    """
    file_info = await db.get_file(file_id)
    
    if not file_info:
        return {"success": False, "message": "File not found", "chunks_deleted": 0}

    chunk_count = file_info.get("chunk_count", 0)
    
    # Remove vectors if indexed
    if file_info.get("vector_status") == VectorStatus.INDEXED.value:
        await remove_vectors(file_id, chunk_count)
    
    # Delete from DB
    await db.delete_file(file_id)

    logger.info(f"Deleted file {file_id}: {chunk_count} chunks removed")

    return {
        "success": True,
        "message": "File deleted",
        "chunks_deleted": chunk_count
    }
