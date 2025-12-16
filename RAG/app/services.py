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


def _sync_embed_content(text: str, task_type: str) -> list[float]:
    result = genai.embed_content(
        model="models/text-embedding-004",
        content=text,
        task_type=task_type
    )
    return result['embedding']


async def get_embedding(text: str) -> list[float]:
    if not _google_ai_ready:
        raise ValueError("Google AI not configured")
    
    clean_text = text.replace("\n", " ").strip() or "empty"
    if len(clean_text) > 8000:
        clean_text = clean_text[:8000]
    
    return await asyncio.to_thread(_sync_embed_content, clean_text, "retrieval_document")


async def get_query_embedding(text: str) -> list[float]:
    if not _google_ai_ready:
        raise ValueError("Google AI not configured")
    
    clean_text = text.replace("\n", " ").strip()
    if not clean_text:
        raise ValueError("Query cannot be empty")
    
    # Use asyncio.to_thread to avoid blocking the event loop
    return await asyncio.to_thread(_sync_embed_content, clean_text, "retrieval_query")


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
