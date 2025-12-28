"""
RAG Service - Vector Search with Jurisdiction Filtering
"""

import os
import logging
import asyncio
import google.generativeai as genai
from supabase import create_client, Client
from upstash_vector import Index
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader
from io import BytesIO
from typing import Optional, List
from app.database import db
from app.schemas import Domain, Sector, Region, Jurisdiction, DocumentType, VectorStatus

logger = logging.getLogger(__name__)


def _init_google_ai() -> bool:
    api_key = os.getenv("GOOGLE_AI_API_KEY")
    if not api_key:
        logger.warning("GOOGLE_AI_API_KEY not set")
        return False
    genai.configure(api_key=api_key)
    return True


def _init_supabase() -> Client | None:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    if not url or not key:
        logger.warning("Supabase not configured")
        return None
    return create_client(url, key)


def _init_vector_index() -> Index | None:
    url = os.getenv("UPSTASH_VECTOR_REST_URL")
    token = os.getenv("UPSTASH_VECTOR_REST_TOKEN")
    if not url or not token:
        logger.warning("Upstash Vector not configured")
        return None
    return Index(url=url, token=token)


_google_ai_ready = _init_google_ai()
supabase: Client | None = _init_supabase()
vector_index: Index | None = _init_vector_index()
STORAGE_BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "documents")

# Timeout for embedding API calls (30 seconds)
EMBEDDING_TIMEOUT_SECONDS = 30


def _sync_embed_content(text: str, task_type: str) -> list[float]:
    result = genai.embed_content(
        model="models/text-embedding-004",
        content=text,
        task_type=task_type
    )
    return result['embedding']


async def get_embedding(text: str) -> list[float]:
    """
    Generate embedding for document text with timeout protection.
    
    Args:
        text: Text to embed (max 8000 chars)
    
    Returns:
        768-dimensional embedding vector
    
    Raises:
        ValueError: If Google AI not configured
        asyncio.TimeoutError: If embedding takes longer than EMBEDDING_TIMEOUT_SECONDS
    """
    if not _google_ai_ready:
        raise ValueError("Google AI not configured")
    
    clean_text = text.replace("\n", " ").strip() or "empty"
    if len(clean_text) > 8000:
        clean_text = clean_text[:8000]
    
    try:
        return await asyncio.wait_for(
            asyncio.to_thread(_sync_embed_content, clean_text, "retrieval_document"),
            timeout=EMBEDDING_TIMEOUT_SECONDS
        )
    except asyncio.TimeoutError:
        logger.error(f"Embedding timeout after {EMBEDDING_TIMEOUT_SECONDS}s for text of length {len(clean_text)}")
        raise


async def get_query_embedding(text: str) -> list[float]:
    """
    Generate embedding for query text with timeout protection.
    
    Args:
        text: Query text to embed
    
    Returns:
        768-dimensional embedding vector
    
    Raises:
        ValueError: If Google AI not configured or query is empty
        asyncio.TimeoutError: If embedding takes longer than EMBEDDING_TIMEOUT_SECONDS
    """
    if not _google_ai_ready:
        raise ValueError("Google AI not configured")
    
    clean_text = text.replace("\n", " ").strip()
    if not clean_text:
        raise ValueError("Query cannot be empty")
    
    try:
        return await asyncio.wait_for(
            asyncio.to_thread(_sync_embed_content, clean_text, "retrieval_query"),
            timeout=EMBEDDING_TIMEOUT_SECONDS
        )
    except asyncio.TimeoutError:
        logger.error(f"Query embedding timeout after {EMBEDDING_TIMEOUT_SECONDS}s")
        raise


async def download_from_storage(storage_path: str) -> bytes:
    if not supabase:
        raise ValueError("Supabase not configured")
    return supabase.storage.from_(STORAGE_BUCKET).download(storage_path)


async def extract_text(file_content: bytes, content_type: str) -> str:
    if content_type == "application/pdf":
        pdf = PdfReader(BytesIO(file_content))
        text_parts = []
        for page in pdf.pages:
            try:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
            except Exception:
                continue
        return "\n".join(text_parts)
    else:
        try:
            return file_content.decode("utf-8")
        except UnicodeDecodeError:
            return file_content.decode("latin-1")


async def vectorize_file(file_id: str, file_info: dict) -> int:
    if not vector_index:
        raise ValueError("Vector index not configured")
    
    storage_path = file_info["storage_path"]
    logger.info(f"Vectorizing file {file_id}")
    
    file_content = await download_from_storage(storage_path)
    text = await extract_text(file_content, file_info.get("content_type", "application/pdf"))
    
    if not text.strip():
        raise ValueError("No text content extracted")

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_text(text)

    if not chunks:
        raise ValueError("No chunks created")

    region = file_info.get("region", "global")
    jurisdictions = file_info.get("jurisdictions", ["general"])
    if isinstance(jurisdictions, str):
        jurisdictions = jurisdictions.split(",")
    document_type = file_info.get("document_type", "guide")

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
                
            vectors_to_upsert.append({
                "id": f"{file_id}_{chunk_idx}",
                "vector": embedding,
                "metadata": {
                    "file_id": file_id,
                    "filename": file_info["filename"],
                    "chunk_index": chunk_idx,
                    "domain": file_info["domain"],
                    "sector": file_info["sector"],
                    "region": region,
                    "jurisdictions": ",".join(jurisdictions),
                    "document_type": document_type,
                },
                "data": chunk
            })

    if not vectors_to_upsert:
        raise ValueError("No vectors created")

    vector_index.upsert(vectors=vectors_to_upsert)
    await db.update_vector_status(file_id, VectorStatus.INDEXED.value, len(vectors_to_upsert))
    
    logger.info(f"Vectorized {file_id}: {len(vectors_to_upsert)} vectors")
    return len(vectors_to_upsert)


async def remove_vectors(file_id: str, chunk_count: int) -> None:
    if not vector_index or chunk_count == 0:
        return
    vector_ids = [f"{file_id}_{i}" for i in range(chunk_count)]
    try:
        vector_index.delete(ids=vector_ids)
    except Exception as e:
        logger.warning(f"Failed to remove vectors: {e}")


async def ensure_vectors_loaded(
    domain: Domain, 
    sector: Sector,
    region: Optional[Region] = None
) -> int:
    region_val = region.value if region else None
    pending_files = await db.get_pending_files(domain.value, sector.value, region_val)
    loaded_count = 0
    
    for file_info in pending_files:
        try:
            await vectorize_file(str(file_info["id"]), file_info)
            loaded_count += 1
        except Exception as e:
            logger.error(f"Failed to vectorize {file_info['id']}: {e}")
    
    return loaded_count


def _build_vector_filter(
    domain: Domain,
    sector: Sector,
    region: Optional[Region] = None,
    jurisdictions: Optional[List[Jurisdiction]] = None,
    document_type: Optional[DocumentType] = None
) -> str:
    filters = [
        f"domain = '{domain.value}'",
        f"sector = '{sector.value}'"
    ]
    
    if region and region != Region.GLOBAL:
        filters.append(f"(region = '{region.value}' OR region = 'global')")
    
    if document_type:
        filters.append(f"document_type = '{document_type.value}'")
    
    return " AND ".join(filters)


def _matches_jurisdictions(
    file_jurisdictions: str,
    requested_jurisdictions: Optional[List[Jurisdiction]]
) -> bool:
    if not requested_jurisdictions:
        return True
    
    file_juris_list = file_jurisdictions.split(",")
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

    vectors_loaded = await ensure_vectors_loaded(domain, sector, region)
    
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

    vector_filter = _build_vector_filter(domain, sector, region, jurisdictions, document_type)
    
    try:
        results = vector_index.query(
            vector=query_embedding,
            top_k=limit * 3,
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

    filtered_results = []
    for r in results:
        if r.score < 0.5:
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

    used_file_ids = set(r.metadata.get("file_id") for r in filtered_results if r.metadata.get("file_id"))
    for file_id in used_file_ids:
        await db.touch_file(file_id)

    context_parts = []
    for res in filtered_results:
        source = res.metadata.get("filename", "Unknown")
        region_info = res.metadata.get("region", "global")
        juris_info = res.metadata.get("jurisdictions", "general")
        chunk_text = res.data if res.data else ""
        context_parts.append(f"[Source: {source} | Region: {region_info} | Jurisdictions: {juris_info}]\n{chunk_text}")
    
    context_text = "\n\n---\n\n".join(context_parts)

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


async def cleanup_expired_vectors(days: int = 30) -> dict:
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
    
    return {
        "files_cleaned": files_cleaned,
        "vectors_removed": vectors_removed,
        "message": f"Cleaned {files_cleaned} files, removed {vectors_removed} vectors"
    }


async def delete_file_completely(file_id: str) -> dict:
    file_info = await db.get_file(file_id)
    
    if not file_info:
        return {"success": False, "message": "File not found", "chunks_deleted": 0}

    chunk_count = file_info.get("chunk_count", 0)
    
    if file_info.get("vector_status") == VectorStatus.INDEXED.value:
        await remove_vectors(file_id, chunk_count)
    
    await db.delete_file(file_id)

    return {
        "success": True,
        "message": "File deleted",
        "chunks_deleted": chunk_count
    }


# Optional compression provider support
_compression_provider = None
_compression_error = None


def init_compression_provider() -> tuple[bool, str | None]:
    """Initialize optional compression provider using HuggingFace Inference API."""
    global _compression_provider, _compression_error
    
    if os.getenv("COMPRESSION_ENABLED", "false").lower() != "true":
        _compression_error = "Compression disabled"
        return False, _compression_error
    
    provider_type = os.getenv("COMPRESSION_PROVIDER", "none")
    
    if provider_type == "huggingface":
        # Use HuggingFace Inference API - no local model download
        api_key = os.getenv("HUGGINGFACE_API_KEY")
        if not api_key:
            _compression_error = "HUGGINGFACE_API_KEY not set"
            return False, _compression_error
        
        model_name = os.getenv("COMPRESSION_MODEL", "mistralai/Mistral-7B-Instruct-v0.2")
        
        _compression_provider = {
            "type": "huggingface",
            "api_key": api_key,
            "model_name": model_name,
            "api_url": f"https://api-inference.huggingface.co/models/{model_name}",
        }
        logger.info(f"Compression provider configured: HuggingFace Inference API ({model_name})")
        return True, None
    
    elif provider_type == "clara":
        # Clara via HuggingFace Inference API (if available)
        api_key = os.getenv("HUGGINGFACE_API_KEY")
        if not api_key:
            _compression_error = "HUGGINGFACE_API_KEY not set for Clara"
            return False, _compression_error
        
        model_name = os.getenv("COMPRESSION_MODEL", "apple/CLaRa-7B-Instruct")
        
        _compression_provider = {
            "type": "huggingface",
            "api_key": api_key,
            "model_name": model_name,
            "api_url": f"https://api-inference.huggingface.co/models/{model_name}",
        }
        logger.info(f"Compression provider configured: Clara via HuggingFace Inference API")
        return True, None
    
    _compression_error = f"Unknown provider: {provider_type}"
    return False, _compression_error


def compression_health() -> dict:
    return {
        "available": _compression_provider is not None,
        "provider": _compression_provider.get("type") if _compression_provider else None,
        "model": _compression_provider.get("model_name") if _compression_provider else None,
        "device": "cloud" if _compression_provider else None,
        "error": _compression_error,
    }


async def compress_context(documents: List[str], query: str, max_tokens: int = 512) -> tuple[str, float]:
    """Compress documents using HuggingFace Inference API."""
    import httpx
    
    if not _compression_provider:
        raise ValueError("Compression provider not available")
    
    if _compression_provider["type"] == "huggingface":
        # Build prompt for compression
        combined_docs = "\n\n".join(documents)
        prompt = f"""<s>[INST] You are a document compression assistant. Given the following documents and query, extract and summarize only the most relevant information.

Query: {query}

Documents:
{combined_docs[:6000]}

Provide a concise summary focusing only on information relevant to the query. [/INST]"""

        headers = {
            "Authorization": f"Bearer {_compression_provider['api_key']}",
            "Content-Type": "application/json",
        }
        
        payload = {
            "inputs": prompt,
            "parameters": {
                "max_new_tokens": max_tokens,
                "temperature": 0.3,
                "return_full_text": False,
            }
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                _compression_provider["api_url"],
                headers=headers,
                json=payload,
            )
            
            if response.status_code != 200:
                raise ValueError(f"HuggingFace API error: {response.status_code} - {response.text}")
            
            result = response.json()
            
            # Handle different response formats
            if isinstance(result, list) and len(result) > 0:
                output = result[0].get("generated_text", "")
            elif isinstance(result, dict):
                output = result.get("generated_text", "")
            else:
                output = str(result)
            
            original_length = sum(len(d) for d in documents)
            compressed_length = len(output) if output else 1
            ratio = original_length / compressed_length if compressed_length > 0 else 1.0
            
            return output, ratio
    
    raise ValueError(f"Unknown provider type: {_compression_provider['type']}")


async def query_rag_compressed(
    query: str,
    domain: Domain,
    sector: Sector,
    limit: int = 5,
    region: Optional[Region] = None,
    jurisdictions: Optional[List[Jurisdiction]] = None,
    document_type: Optional[DocumentType] = None,
) -> dict:
    """Query RAG with optional compression."""
    import time
    start_time = time.time()
    
    rag_result = await query_rag(
        query=query,
        domain=domain,
        sector=sector,
        limit=limit,
        region=region,
        jurisdictions=jurisdictions,
        document_type=document_type,
    )
    
    if rag_result.get("error") or rag_result.get("chunks_found", 0) == 0:
        return {
            "context": rag_result.get("context", ""),
            "compressed": False,
            "compression_ratio": None,
            "processing_time_ms": int((time.time() - start_time) * 1000),
            "chunks_found": rag_result.get("chunks_found", 0),
            "sources": rag_result.get("sources", []),
            "error": rag_result.get("error"),
        }
    
    if not _compression_provider:
        return {
            "context": rag_result.get("context", ""),
            "compressed": False,
            "compression_ratio": None,
            "processing_time_ms": int((time.time() - start_time) * 1000),
            "chunks_found": rag_result.get("chunks_found", 0),
            "sources": rag_result.get("sources", []),
            "error": None,
        }
    
    context = rag_result.get("context", "")
    chunks = [part.split("\n", 1)[-1] for part in context.split("\n\n---\n\n")]
    
    try:
        compressed_context, compression_ratio = await compress_context(chunks, query)
        
        sources = rag_result.get("sources", [])
        source_list = "\n".join([
            f"[{i+1}] {s.get('filename', 'Unknown')} - {s.get('region', 'global')}"
            for i, s in enumerate(sources)
        ])
        
        formatted_context = (
            f"\n\n--- Compressed Context ({domain.value}/{sector.value}) ---\n"
            f"{compressed_context}\n\n"
            f"Sources:\n{source_list}\n"
            f"--- End Context (compressed {compression_ratio:.1f}x) ---\n"
        )
        
        return {
            "context": formatted_context,
            "compressed": True,
            "compression_ratio": compression_ratio,
            "processing_time_ms": int((time.time() - start_time) * 1000),
            "chunks_found": rag_result.get("chunks_found", 0),
            "sources": sources,
            "error": None,
        }
    except Exception as e:
        logger.error(f"Compression failed: {e}")
        return {
            "context": rag_result.get("context", ""),
            "compressed": False,
            "compression_ratio": None,
            "processing_time_ms": int((time.time() - start_time) * 1000),
            "chunks_found": rag_result.get("chunks_found", 0),
            "sources": rag_result.get("sources", []),
            "error": f"Compression failed: {str(e)}",
        }


init_compression_provider()


# ============================================
# User Document Functions (Secure Documents)
# Vector-only storage with AES-256-GCM encryption
# ============================================

import hashlib
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

# Encryption key derived from env var
_user_docs_encryption_key: bytes | None = None


def _init_user_docs_encryption() -> bool:
    """Initialize encryption key for user documents."""
    global _user_docs_encryption_key
    key = os.getenv("USER_DOCS_ENCRYPTION_KEY") or os.getenv("ENCRYPTION_KEY")
    if not key:
        logger.warning("USER_DOCS_ENCRYPTION_KEY not set - user docs will NOT be encrypted")
        return False
    # Derive 32-byte key using SHA-256
    _user_docs_encryption_key = hashlib.sha256(key.encode()).digest()
    logger.info("User docs encryption initialized (AES-256-GCM)")
    return True


def _encrypt_content(plaintext: str) -> str:
    """
    Encrypt content using AES-256-GCM.
    Returns format: iv:ciphertext (hex encoded)
    """
    if not _user_docs_encryption_key:
        # Return plaintext if encryption not configured (dev mode only)
        return plaintext
    
    iv = os.urandom(12)  # 96-bit nonce for GCM
    aesgcm = AESGCM(_user_docs_encryption_key)
    ciphertext = aesgcm.encrypt(iv, plaintext.encode('utf-8'), None)
    # Format: iv:ciphertext (both hex encoded)
    return f"{iv.hex()}:{ciphertext.hex()}"


def _decrypt_content(encrypted: str) -> str:
    """
    Decrypt content encrypted with AES-256-GCM.
    Expects format: iv:ciphertext (hex encoded)
    """
    if not _user_docs_encryption_key:
        # Return as-is if encryption not configured
        return encrypted
    
    # Check if this looks like encrypted data
    if ':' not in encrypted or len(encrypted.split(':')) != 2:
        # Not encrypted format - return as-is (legacy data)
        return encrypted
    
    try:
        iv_hex, ciphertext_hex = encrypted.split(':')
        iv = bytes.fromhex(iv_hex)
        ciphertext = bytes.fromhex(ciphertext_hex)
        
        aesgcm = AESGCM(_user_docs_encryption_key)
        plaintext = aesgcm.decrypt(iv, ciphertext, None)
        return plaintext.decode('utf-8')
    except Exception as e:
        logger.error(f"Decryption failed: {e}")
        raise ValueError("Failed to decrypt content - key may have changed")


# Initialize encryption on module load
_user_docs_encryption_ready = _init_user_docs_encryption()


async def embed_user_document_chunk(
    document_id: str,
    chunk_index: int,
    user_id: str,
    content: str,
    filename: str
) -> dict:
    """
    Embed a user document chunk and store in Upstash Vector.
    Content is encrypted before storage - only embeddings are searchable.
    
    Args:
        document_id: UUID of the document
        chunk_index: Index of the chunk within the document
        user_id: UUID of the user who owns the document
        content: Plaintext content of the chunk (will be encrypted)
        filename: Original filename for metadata
    
    Returns:
        dict with success, vector_id, message
    """
    import time
    start_time = time.time()
    
    if not vector_index:
        return {
            "success": False,
            "vector_id": "",
            "message": "Vector index not configured"
        }
    
    if not content or not content.strip():
        return {
            "success": False,
            "vector_id": "",
            "message": "Content cannot be empty"
        }
    
    try:
        # Generate embedding from plaintext (for semantic search)
        embedding = await get_embedding(content)
        
        # Encrypt content before storage
        encrypted_content = _encrypt_content(content)
        
        # Create vector ID: user_{document_id}_{chunk_index}
        vector_id = f"user_{document_id}_{chunk_index}"
        
        # Upsert to Upstash with encrypted content in data field
        vector_index.upsert(vectors=[{
            "id": vector_id,
            "vector": embedding,
            "metadata": {
                "user_id": user_id,
                "document_id": document_id,
                "chunk_index": chunk_index,
                "filename": filename,
                "type": "user_document",
                "encrypted": _user_docs_encryption_ready
            },
            "data": encrypted_content  # Full encrypted content stored here
        }])
        
        elapsed_ms = int((time.time() - start_time) * 1000)
        logger.info(f"Embedded user doc chunk: {vector_id} (encrypted={_user_docs_encryption_ready}, {elapsed_ms}ms)")
        
        return {
            "success": True,
            "vector_id": vector_id,
            "message": f"Embedded chunk {chunk_index} of document {document_id}"
        }
        
    except Exception as e:
        logger.error(f"Failed to embed user doc chunk: {e}")
        return {
            "success": False,
            "vector_id": "",
            "message": f"Embedding failed: {str(e)}"
        }


async def search_user_documents(
    query: str,
    user_id: str,
    document_ids: Optional[List[str]] = None,
    limit: int = 5,
    min_score: float = 0.5
) -> dict:
    """
    Search user documents using semantic similarity.
    Returns decrypted content for LLM context.
    
    Args:
        query: Search query text
        user_id: UUID of the user (for isolation)
        document_ids: Optional list of document IDs to filter
        limit: Maximum number of results
        min_score: Minimum similarity score threshold
    
    Returns:
        dict with results (including decrypted content), timing info, and optional error
    """
    import time
    
    if not vector_index:
        return {
            "results": [],
            "query_embedding_time_ms": 0,
            "search_time_ms": 0,
            "error": "Vector index not configured"
        }
    
    # Generate query embedding
    embed_start = time.time()
    try:
        query_embedding = await get_query_embedding(query)
    except Exception as e:
        return {
            "results": [],
            "query_embedding_time_ms": 0,
            "search_time_ms": 0,
            "error": f"Failed to embed query: {str(e)}"
        }
    embed_time_ms = int((time.time() - embed_start) * 1000)
    
    # Build filter for user isolation
    vector_filter = f"user_id = '{user_id}' AND type = 'user_document'"
    
    # If specific documents requested, add document filter
    if document_ids and len(document_ids) > 0:
        doc_filter = " OR ".join([f"document_id = '{doc_id}'" for doc_id in document_ids])
        vector_filter = f"({vector_filter}) AND ({doc_filter})"
    
    # Search Upstash - include data for decryption
    search_start = time.time()
    try:
        results = vector_index.query(
            vector=query_embedding,
            top_k=limit * 2,  # Fetch extra to filter by score
            include_metadata=True,
            include_data=True,  # Need data for decryption
            filter=vector_filter
        )
    except Exception as e:
        logger.error(f"User doc search failed: {e}")
        return {
            "results": [],
            "query_embedding_time_ms": embed_time_ms,
            "search_time_ms": 0,
            "error": f"Search failed: {str(e)}"
        }
    search_time_ms = int((time.time() - search_start) * 1000)
    
    # Filter by minimum score, decrypt content, and format results
    filtered_results = []
    for r in results:
        if r.score >= min_score:
            # Decrypt content
            try:
                decrypted_content = _decrypt_content(r.data) if r.data else ""
            except ValueError as e:
                logger.error(f"Failed to decrypt chunk {r.id}: {e}")
                decrypted_content = "[Decryption failed]"
            
            filtered_results.append({
                "document_id": r.metadata.get("document_id", ""),
                "chunk_index": r.metadata.get("chunk_index", 0),
                "score": round(r.score, 4),
                "filename": r.metadata.get("filename", "Unknown"),
                "content": decrypted_content
            })
        if len(filtered_results) >= limit:
            break
    
    logger.info(f"User doc search: {len(filtered_results)} results for user {user_id[:8]}...")
    
    return {
        "results": filtered_results,
        "query_embedding_time_ms": embed_time_ms,
        "search_time_ms": search_time_ms,
        "error": None
    }


async def get_user_document_chunks(
    document_id: str,
    user_id: str,
    chunk_indices: List[int]
) -> dict:
    """
    Get specific chunks by indices with decrypted content.
    Used when you know which chunks you need (e.g., from search results).
    
    Args:
        document_id: UUID of the document
        user_id: UUID of the user (for verification)
        chunk_indices: List of chunk indices to retrieve
    
    Returns:
        dict with chunks (decrypted) and optional error
    """
    if not vector_index:
        return {
            "chunks": [],
            "error": "Vector index not configured"
        }
    
    if not chunk_indices:
        return {
            "chunks": [],
            "error": None
        }
    
    try:
        # Fetch vectors by ID
        vector_ids = [f"user_{document_id}_{i}" for i in chunk_indices]
        results = vector_index.fetch(ids=vector_ids, include_metadata=True, include_data=True)
        
        chunks = []
        for vector_id, vector_data in results.items():
            if vector_data is None:
                continue
            
            # Verify user ownership
            if vector_data.metadata.get("user_id") != user_id:
                logger.warning(f"User {user_id[:8]} tried to access chunk owned by another user")
                continue
            
            # Decrypt content
            try:
                decrypted_content = _decrypt_content(vector_data.data) if vector_data.data else ""
            except ValueError as e:
                logger.error(f"Failed to decrypt chunk {vector_id}: {e}")
                decrypted_content = "[Decryption failed]"
            
            chunks.append({
                "document_id": vector_data.metadata.get("document_id", ""),
                "chunk_index": vector_data.metadata.get("chunk_index", 0),
                "content": decrypted_content,
                "filename": vector_data.metadata.get("filename", "Unknown")
            })
        
        # Sort by chunk index
        chunks.sort(key=lambda x: x["chunk_index"])
        
        return {
            "chunks": chunks,
            "error": None
        }
    except Exception as e:
        logger.error(f"Failed to get user doc chunks: {e}")
        return {
            "chunks": [],
            "error": f"Failed to retrieve chunks: {str(e)}"
        }


async def delete_user_document_vectors(document_id: str, chunk_count: int = 100) -> dict:
    """
    Delete all vectors for a specific user document.
    
    Args:
        document_id: UUID of the document
        chunk_count: Maximum number of chunks to delete (default 100)
    
    Returns:
        dict with success, vectors_deleted, message
    """
    if not vector_index:
        return {
            "success": False,
            "vectors_deleted": 0,
            "message": "Vector index not configured"
        }
    
    # Generate vector IDs to delete
    vector_ids = [f"user_{document_id}_{i}" for i in range(chunk_count)]
    
    try:
        # Delete vectors (Upstash ignores non-existent IDs)
        vector_index.delete(ids=vector_ids)
        logger.info(f"Deleted vectors for user document: {document_id}")
        
        return {
            "success": True,
            "vectors_deleted": chunk_count,
            "message": f"Deleted vectors for document {document_id}"
        }
    except Exception as e:
        logger.error(f"Failed to delete user doc vectors: {e}")
        return {
            "success": False,
            "vectors_deleted": 0,
            "message": f"Delete failed: {str(e)}"
        }


async def delete_user_vectors(user_id: str) -> dict:
    """
    Delete ALL vectors for a user (purge operation).
    
    Args:
        user_id: UUID of the user
    
    Returns:
        dict with success, vectors_deleted, message
    """
    if not vector_index:
        return {
            "success": False,
            "vectors_deleted": 0,
            "message": "Vector index not configured"
        }
    
    try:
        # Query to find all user's vectors (up to 1000)
        dummy_embedding = await get_embedding("document")
        
        results = vector_index.query(
            vector=dummy_embedding,
            top_k=1000,
            include_metadata=True,
            include_data=False,
            filter=f"user_id = '{user_id}' AND type = 'user_document'"
        )
        
        if not results:
            return {
                "success": True,
                "vectors_deleted": 0,
                "message": "No vectors found for user"
            }
        
        # Extract vector IDs
        vector_ids = [r.id for r in results]
        
        # Delete all found vectors
        vector_index.delete(ids=vector_ids)
        
        logger.info(f"Purged {len(vector_ids)} vectors for user: {user_id[:8]}...")
        
        return {
            "success": True,
            "vectors_deleted": len(vector_ids),
            "message": f"Purged {len(vector_ids)} vectors for user"
        }
    except Exception as e:
        logger.error(f"Failed to purge user vectors: {e}")
        return {
            "success": False,
            "vectors_deleted": 0,
            "message": f"Purge failed: {str(e)}"
        }
