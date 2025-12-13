import os
import google.generativeai as genai
from groq import Groq
from supabase import create_client, Client
from upstash_vector import Index
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader
from io import BytesIO
from app.database import db
from app.schemas import Domain, Sector, VectorStatus

# Initialize Clients
genai.configure(api_key=os.getenv("GOOGLE_AI_API_KEY"))
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Supabase Client (for storage access)
supabase: Client = create_client(
    os.getenv("SUPABASE_URL", ""),
    os.getenv("SUPABASE_SERVICE_KEY", "")
)
STORAGE_BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "documents")

# Upstash Vector Client
vector_index = Index(
    url=os.getenv("UPSTASH_VECTOR_REST_URL"),
    token=os.getenv("UPSTASH_VECTOR_REST_TOKEN")
)


async def get_embedding(text: str) -> list[float]:
    """Generate embedding using Gemini text-embedding-004 (768 dimensions)."""
    clean_text = text.replace("\n", " ").strip()
    if not clean_text:
        clean_text = "empty"
    
    result = genai.embed_content(
        model="models/text-embedding-004",
        content=clean_text,
        task_type="retrieval_document"
    )
    return result['embedding']


async def download_from_storage(storage_path: str) -> bytes:
    """Download file from Supabase Storage."""
    try:
        response = supabase.storage.from_(STORAGE_BUCKET).download(storage_path)
        return response
    except Exception as e:
        raise ValueError(f"Failed to download from storage: {str(e)}")


async def extract_text(file_content: bytes, content_type: str) -> str:
    """Extract text from file content."""
    if content_type == "application/pdf":
        pdf = PdfReader(BytesIO(file_content))
        text = ""
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return text
    else:
        return file_content.decode("utf-8")


async def vectorize_file(file_id: str, file_info: dict) -> int:
    """
    Vectorize a file on-demand (lazy loading).
    Downloads from Supabase, chunks, embeds, and stores in Upstash.
    Returns chunk count.
    """
    # Download from Supabase Storage
    file_content = await download_from_storage(file_info["storage_path"])
    
    # Extract text
    text = await extract_text(file_content, file_info.get("content_type", "application/pdf"))
    
    if not text.strip():
        raise ValueError("No text content extracted from file")

    # Chunk text
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        separators=["\n\n", "\n", ". ", " ", ""]
    )
    chunks = splitter.split_text(text)

    if not chunks:
        raise ValueError("No chunks created from document")

    # Embed & upsert to Upstash
    vectors_to_upsert = []
    batch_size = 10

    for i in range(0, len(chunks), batch_size):
        batch = chunks[i:i + batch_size]
        for j, chunk in enumerate(batch):
            chunk_idx = i + j
            embedding = await get_embedding(chunk)
            chunk_id = f"{file_id}_{chunk_idx}"

            vectors_to_upsert.append((
                chunk_id,
                embedding,
                {
                    "file_id": file_id,
                    "filename": file_info["filename"],
                    "chunk_index": chunk_idx,
                    "domain": file_info["domain"],
                    "sector": file_info["sector"]
                },
                chunk  # Store text in 'data' field
            ))

    if vectors_to_upsert:
        vector_index.upsert(vectors=vectors_to_upsert)

    # Update status in DB
    await db.update_vector_status(file_id, VectorStatus.INDEXED.value, len(chunks))
    
    return len(chunks)


async def remove_vectors(file_id: str, chunk_count: int):
    """Remove vectors for a file from Upstash."""
    vector_ids = [f"{file_id}_{i}" for i in range(chunk_count)]
    if vector_ids:
        try:
            vector_index.delete(ids=vector_ids)
        except Exception:
            pass  # Vector might not exist


async def ensure_vectors_loaded(domain: Domain, sector: Sector) -> int:
    """
    Ensure all files for domain/sector are vectorized.
    Returns count of newly vectorized files.
    """
    pending_files = await db.get_pending_files(domain.value, sector.value)
    loaded_count = 0
    
    for file_info in pending_files:
        try:
            await vectorize_file(str(file_info["id"]), file_info)
            loaded_count += 1
        except Exception as e:
            print(f"Failed to vectorize {file_info['id']}: {e}")
            continue
    
    return loaded_count


async def query_rag(
    query: str,
    domain: Domain,
    sector: Sector,
    limit: int = 5
) -> dict:
    """
    Query the RAG system with lazy vectorization.
    1. Ensure all matching files are vectorized
    2. Search vectors
    3. Update access timestamps
    4. Generate answer
    """
    # Lazy load: vectorize any pending files
    vectors_loaded = await ensure_vectors_loaded(domain, sector)
    
    # Embed query
    query_embedding = await get_embedding(query)

    # Search Upstash with metadata filter
    results = vector_index.query(
        vector=query_embedding,
        top_k=limit * 2,
        include_metadata=True,
        include_data=True,
        filter=f"domain = '{domain.value}' AND sector = '{sector.value}'"
    )

    # Filter results
    filtered_results = [
        r for r in results
        if r.metadata.get("domain") == domain.value
        and r.metadata.get("sector") == sector.value
    ][:limit]

    if not filtered_results:
        return {
            "answer": f"No relevant {domain.value} documents found for {sector.value} sector.",
            "sources": [],
            "domain": domain.value,
            "sector": sector.value,
            "vectors_loaded": vectors_loaded
        }

    # Update access timestamps for used files
    used_file_ids = set(r.metadata.get("file_id") for r in filtered_results)
    for file_id in used_file_ids:
        if file_id:
            await db.touch_file(file_id)

    # Build context
    context_parts = []
    for res in filtered_results:
        source = res.metadata.get("filename", "Unknown")
        context_parts.append(f"[Source: {source}]\n{res.data}")
    
    context_text = "\n\n---\n\n".join(context_parts)

    # Generate answer with Groq
    system_prompt = f"""You are an expert {domain.value} advisor for {sector.value} startups.
Answer the user's question strictly based on the Context provided below.
Be concise, use bullet points, and cite sources when relevant.

CONTEXT:
{context_text}
"""

    chat_completion = groq_client.chat.completions.create(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": query}
        ],
        model="llama-3.3-70b-versatile",
        temperature=0.1,
        max_tokens=2048
    )

    return {
        "answer": chat_completion.choices[0].message.content,
        "sources": [
            {
                "file_id": r.metadata.get("file_id", ""),
                "filename": r.metadata.get("filename", "Unknown"),
                "score": r.score,
                "domain": r.metadata.get("domain", domain.value),
                "sector": r.metadata.get("sector", sector.value)
            }
            for r in filtered_results
        ],
        "domain": domain.value,
        "sector": sector.value,
        "vectors_loaded": vectors_loaded
    }


async def cleanup_expired_vectors(days: int = 30) -> dict:
    """
    Remove vectors for files not accessed in X days.
    Files remain in Supabase Storage, only vectors are removed.
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
    
    return {
        "files_cleaned": files_cleaned,
        "vectors_removed": vectors_removed,
        "message": f"Cleaned {files_cleaned} files, removed {vectors_removed} vectors"
    }


async def delete_file_completely(file_id: str) -> dict:
    """Delete file metadata and vectors (storage deletion handled by backend)."""
    file_info = await db.get_file(file_id)
    
    if not file_info:
        return {"success": False, "message": "File not found", "chunks_deleted": 0}

    chunk_count = file_info.get("chunk_count", 0)
    
    # Remove vectors if indexed
    if file_info.get("vector_status") == VectorStatus.INDEXED.value:
        await remove_vectors(file_id, chunk_count)
    
    # Delete from DB
    await db.delete_file(file_id)

    return {
        "success": True,
        "message": "File deleted",
        "chunks_deleted": chunk_count
    }
