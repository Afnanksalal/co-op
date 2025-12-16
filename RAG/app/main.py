import os
import secrets
from fastapi import FastAPI, HTTPException, Depends, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from contextlib import asynccontextmanager
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

from app.database import db
from app.services import (
    query_rag, 
    cleanup_expired_vectors, 
    delete_file_completely,
    vectorize_file,
    compression_health,
    query_rag_compressed,
)
from app.schemas import (
    Domain, Sector, Region, Jurisdiction, DocumentType,
    RegisterFileRequest, QueryRequest, QueryResponse,
    FileResponse, RegisterResponse, VectorizeResponse,
    CleanupResponse, HealthResponse,
    CompressionQueryRequest, CompressionQueryResponse, CompressionHealthResponse,
)

RAG_API_KEY = os.getenv("RAG_API_KEY", "")
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(api_key: str = Security(api_key_header)):
    if not RAG_API_KEY:
        return True
    if not api_key:
        raise HTTPException(status_code=401, detail="Missing API key")
    if not secrets.compare_digest(api_key, RAG_API_KEY):
        raise HTTPException(status_code=401, detail="Invalid API key")
    return True


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.connect()
    yield
    await db.disconnect()


CORS_ORIGINS = os.getenv("CORS_ORIGINS", "").split(",") if os.getenv("CORS_ORIGINS") else ["*"]

app = FastAPI(
    title="Co-Op RAG Service",
    description="RAG with jurisdiction filtering - Supabase Storage + Upstash Vector",
    version="3.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health_check():
    return {
        "status": "ok",
        "db": "Neon",
        "vector": "Upstash",
        "storage": "Supabase",
        "domains": [d.value for d in Domain],
        "sectors": [s.value for s in Sector],
        "regions": [r.value for r in Region],
        "jurisdictions": [j.value for j in Jurisdiction],
        "document_types": [dt.value for dt in DocumentType]
    }


@app.post("/rag/register", response_model=RegisterResponse)
async def register_file(request: RegisterFileRequest, _: bool = Depends(verify_api_key)):
    try:
        jurisdictions = [j.value for j in request.jurisdictions] if request.jurisdictions else ["general"]
        
        success = await db.register_file(
            file_id=request.file_id,
            filename=request.filename,
            storage_path=request.storage_path,
            domain=request.domain.value,
            sector=request.sector.value,
            content_type=request.content_type,
            region=request.region.value if request.region else "global",
            jurisdictions=jurisdictions,
            document_type=request.document_type.value if request.document_type else "guide"
        )
        
        if success:
            return {
                "success": True,
                "file_id": request.file_id,
                "message": f"File registered for {request.domain.value}/{request.sector.value}"
            }
        raise HTTPException(status_code=500, detail="Failed to register file")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/rag/vectorize/{file_id}", response_model=VectorizeResponse)
async def force_vectorize(file_id: str, _: bool = Depends(verify_api_key)):
    try:
        file_info = await db.get_file(file_id)
        if not file_info:
            raise HTTPException(status_code=404, detail="File not found")
        
        chunks = await vectorize_file(file_id, file_info)
        
        return {
            "success": True,
            "file_id": file_id,
            "chunks_created": chunks,
            "message": f"Vectorized {chunks} chunks"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/rag/query", response_model=QueryResponse)
async def ask_question(request: QueryRequest, _: bool = Depends(verify_api_key)):
    try:
        return await query_rag(
            query=request.query,
            domain=request.domain,
            sector=request.sector,
            limit=request.limit,
            region=request.region,
            jurisdictions=request.jurisdictions,
            document_type=request.document_type
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")


@app.get("/rag/files")
async def list_files(
    domain: Optional[Domain] = None,
    sector: Optional[Sector] = None,
    region: Optional[Region] = None,
    document_type: Optional[DocumentType] = None,
    _: bool = Depends(verify_api_key)
):
    try:
        files = await db.list_files(
            domain=domain.value if domain else None,
            sector=sector.value if sector else None,
            region=region.value if region else None,
            document_type=document_type.value if document_type else None
        )
        return {
            "files": [
                {
                    "id": str(f["id"]),
                    "filename": f["filename"],
                    "storage_path": f["storage_path"],
                    "domain": f["domain"],
                    "sector": f["sector"],
                    "region": f.get("region", "global"),
                    "jurisdictions": f.get("jurisdictions", ["general"]),
                    "document_type": f.get("document_type", "guide"),
                    "vector_status": f["vector_status"],
                    "chunk_count": f["chunk_count"],
                    "last_accessed": f["last_accessed"].isoformat() if f["last_accessed"] else None,
                    "created_at": f["created_at"].isoformat()
                }
                for f in files
            ],
            "count": len(files)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/rag/files/{file_id}", response_model=FileResponse)
async def get_file(file_id: str, _: bool = Depends(verify_api_key)):
    try:
        file_info = await db.get_file(file_id)
        if not file_info:
            raise HTTPException(status_code=404, detail="File not found")
        
        return {
            "id": str(file_info["id"]),
            "filename": file_info["filename"],
            "storage_path": file_info["storage_path"],
            "domain": file_info["domain"],
            "sector": file_info["sector"],
            "region": file_info.get("region", "global"),
            "jurisdictions": file_info.get("jurisdictions", ["general"]),
            "document_type": file_info.get("document_type", "guide"),
            "vector_status": file_info["vector_status"],
            "chunk_count": file_info["chunk_count"],
            "last_accessed": file_info["last_accessed"],
            "created_at": file_info["created_at"]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/rag/files/{file_id}")
async def remove_file(file_id: str, _: bool = Depends(verify_api_key)):
    try:
        result = await delete_file_completely(file_id)
        if not result["success"]:
            raise HTTPException(status_code=404, detail=result["message"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/rag/cleanup", response_model=CleanupResponse)
async def cleanup_vectors(days: int = 30, _: bool = Depends(verify_api_key)):
    try:
        return await cleanup_expired_vectors(days)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/rag/compression/health", response_model=CompressionHealthResponse)
async def compression_health_check():
    return compression_health()


@app.post("/rag/compression/query", response_model=CompressionQueryResponse)
async def compressed_query(request: CompressionQueryRequest, _: bool = Depends(verify_api_key)):
    try:
        return await query_rag_compressed(
            query=request.query,
            domain=request.domain,
            sector=request.sector,
            limit=request.limit,
            region=request.region,
            jurisdictions=request.jurisdictions,
            document_type=request.document_type,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
