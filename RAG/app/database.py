import os
import asyncpg
from dotenv import load_dotenv
from datetime import datetime, timedelta
from typing import Optional, List

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")


class Database:
    def __init__(self):
        self.pool = None

    async def connect(self):
        """Connect to database. Schema is managed by backend via Drizzle."""
        self.pool = await asyncpg.create_pool(DATABASE_URL)

    async def disconnect(self):
        if self.pool:
            await self.pool.close()

    # === File Operations ===
    
    async def register_file(
        self, 
        file_id: str, 
        filename: str, 
        storage_path: str,
        domain: str, 
        sector: str,
        content_type: str = "application/pdf",
        region: str = "global",
        jurisdictions: List[str] = None,
        document_type: str = "guide"
    ) -> bool:
        """Register a file from Supabase Storage with jurisdiction metadata."""
        from uuid import UUID
        async with self.pool.acquire() as conn:
            try:
                uuid_id = UUID(file_id)
                # Store jurisdictions as comma-separated string
                jurisdictions_str = ",".join(jurisdictions) if jurisdictions else "general"
                
                await conn.execute(
                    """INSERT INTO rag_files (id, filename, storage_path, content_type, domain, sector, region, jurisdictions, document_type, vector_status)
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
                       ON CONFLICT (id) DO UPDATE SET
                           filename = $2, storage_path = $3, domain = $5, sector = $6, 
                           region = $7, jurisdictions = $8, document_type = $9, updated_at = NOW()""",
                    uuid_id, filename, storage_path, content_type, domain, sector, region, jurisdictions_str, document_type
                )
                return True
            except ValueError:
                return False
            except Exception:
                return False

    async def get_file(self, file_id: str) -> dict | None:
        """Get file metadata by ID."""
        from uuid import UUID
        async with self.pool.acquire() as conn:
            try:
                uuid_id = UUID(file_id)
                row = await conn.fetchrow(
                    "SELECT * FROM rag_files WHERE id = $1", uuid_id
                )
                if row:
                    result = dict(row)
                    # Parse jurisdictions from comma-separated string
                    if result.get("jurisdictions"):
                        result["jurisdictions"] = result["jurisdictions"].split(",")
                    else:
                        result["jurisdictions"] = ["general"]
                    return result
                return None
            except ValueError:
                return None

    async def list_files(
        self, 
        domain: str = None, 
        sector: str = None,
        region: str = None,
        document_type: str = None
    ) -> list[dict]:
        """List files with optional filtering."""
        async with self.pool.acquire() as conn:
            conditions = []
            params = []
            param_idx = 1
            
            if domain:
                conditions.append(f"domain = ${param_idx}")
                params.append(domain)
                param_idx += 1
            if sector:
                conditions.append(f"sector = ${param_idx}")
                params.append(sector)
                param_idx += 1
            if region:
                conditions.append(f"(region = ${param_idx} OR region = 'global')")
                params.append(region)
                param_idx += 1
            if document_type:
                conditions.append(f"document_type = ${param_idx}")
                params.append(document_type)
                param_idx += 1
            
            where_clause = " AND ".join(conditions) if conditions else "1=1"
            query = f"SELECT * FROM rag_files WHERE {where_clause} ORDER BY created_at DESC"
            
            rows = await conn.fetch(query, *params)
            results = []
            for row in rows:
                result = dict(row)
                if result.get("jurisdictions"):
                    result["jurisdictions"] = result["jurisdictions"].split(",")
                else:
                    result["jurisdictions"] = ["general"]
                results.append(result)
            return results

    async def get_files_for_query(
        self, 
        domain: str, 
        sector: str,
        region: Optional[str] = None,
        jurisdictions: Optional[List[str]] = None,
        document_type: Optional[str] = None
    ) -> list[dict]:
        """
        Get all files matching domain/sector/region/jurisdictions for a query.
        
        Filtering logic:
        - Domain and sector are required exact matches
        - Region: matches exact region OR 'global' (global docs apply everywhere)
        - Jurisdictions: matches if ANY of the requested jurisdictions overlap with file's jurisdictions
        - Document type: optional exact match
        """
        async with self.pool.acquire() as conn:
            conditions = ["domain = $1", "sector = $2"]
            params = [domain, sector]
            param_idx = 3
            
            # Region filter: include global docs + region-specific docs
            if region and region != "global":
                conditions.append(f"(region = ${param_idx} OR region = 'global')")
                params.append(region)
                param_idx += 1
            
            # Document type filter
            if document_type:
                conditions.append(f"document_type = ${param_idx}")
                params.append(document_type)
                param_idx += 1
            
            where_clause = " AND ".join(conditions)
            query = f"SELECT * FROM rag_files WHERE {where_clause} ORDER BY created_at DESC"
            
            rows = await conn.fetch(query, *params)
            results = []
            
            for row in rows:
                result = dict(row)
                file_jurisdictions = result.get("jurisdictions", "general").split(",")
                result["jurisdictions"] = file_jurisdictions
                
                # Jurisdiction filter: check if any requested jurisdiction matches
                if jurisdictions:
                    # Include if file has 'general' OR any overlap with requested jurisdictions
                    if "general" in file_jurisdictions or any(j in file_jurisdictions for j in jurisdictions):
                        results.append(result)
                else:
                    results.append(result)
            
            return results

    async def delete_file(self, file_id: str) -> bool:
        """Delete file metadata."""
        from uuid import UUID
        async with self.pool.acquire() as conn:
            try:
                uuid_id = UUID(file_id)
                result = await conn.execute(
                    "DELETE FROM rag_files WHERE id = $1", uuid_id
                )
                return "DELETE 1" in result
            except ValueError:
                return False

    # === Vector Status Operations ===

    async def update_vector_status(
        self, 
        file_id: str, 
        status: str, 
        chunk_count: int = 0
    ):
        """Update vector status after indexing."""
        from uuid import UUID
        async with self.pool.acquire() as conn:
            try:
                uuid_id = UUID(file_id)
                await conn.execute(
                    """UPDATE rag_files 
                       SET vector_status = $1, chunk_count = $2, 
                           last_accessed = NOW(), updated_at = NOW()
                       WHERE id = $3""",
                    status, chunk_count, uuid_id
                )
            except ValueError:
                pass

    async def touch_file(self, file_id: str):
        """Update last_accessed timestamp when vectors are used."""
        from uuid import UUID
        async with self.pool.acquire() as conn:
            try:
                uuid_id = UUID(file_id)
                await conn.execute(
                    "UPDATE rag_files SET last_accessed = NOW() WHERE id = $1",
                    uuid_id
                )
            except ValueError:
                pass

    async def get_expired_files(self, days: int = 30) -> list[dict]:
        """Get files with vectors not accessed in X days."""
        cutoff = datetime.utcnow() - timedelta(days=days)
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                """SELECT * FROM rag_files 
                   WHERE vector_status = 'indexed' 
                   AND last_accessed < $1
                   ORDER BY last_accessed ASC""",
                cutoff
            )
            results = []
            for row in rows:
                result = dict(row)
                if result.get("jurisdictions"):
                    result["jurisdictions"] = result["jurisdictions"].split(",")
                else:
                    result["jurisdictions"] = ["general"]
                results.append(result)
            return results

    async def get_pending_files(
        self, 
        domain: str, 
        sector: str,
        region: Optional[str] = None
    ) -> list[dict]:
        """Get files that need vectorization for a query."""
        async with self.pool.acquire() as conn:
            conditions = [
                "domain = $1", 
                "sector = $2",
                "vector_status IN ('pending', 'expired')"
            ]
            params = [domain, sector]
            param_idx = 3
            
            if region and region != "global":
                conditions.append(f"(region = ${param_idx} OR region = 'global')")
                params.append(region)
                param_idx += 1
            
            where_clause = " AND ".join(conditions)
            query = f"SELECT * FROM rag_files WHERE {where_clause} ORDER BY created_at DESC"
            
            rows = await conn.fetch(query, *params)
            results = []
            for row in rows:
                result = dict(row)
                if result.get("jurisdictions"):
                    result["jurisdictions"] = result["jurisdictions"].split(",")
                else:
                    result["jurisdictions"] = ["general"]
                results.append(result)
            return results

    async def get_indexed_files(
        self, 
        domain: str, 
        sector: str,
        region: Optional[str] = None
    ) -> list[dict]:
        """Get files that are already indexed."""
        async with self.pool.acquire() as conn:
            conditions = [
                "domain = $1", 
                "sector = $2",
                "vector_status = 'indexed'"
            ]
            params = [domain, sector]
            param_idx = 3
            
            if region and region != "global":
                conditions.append(f"(region = ${param_idx} OR region = 'global')")
                params.append(region)
                param_idx += 1
            
            where_clause = " AND ".join(conditions)
            query = f"SELECT * FROM rag_files WHERE {where_clause} ORDER BY created_at DESC"
            
            rows = await conn.fetch(query, *params)
            results = []
            for row in rows:
                result = dict(row)
                if result.get("jurisdictions"):
                    result["jurisdictions"] = result["jurisdictions"].split(",")
                else:
                    result["jurisdictions"] = ["general"]
                results.append(result)
            return results


db = Database()
