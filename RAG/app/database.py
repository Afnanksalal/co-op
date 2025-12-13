import os
import asyncpg
from dotenv import load_dotenv
from datetime import datetime, timedelta

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")


class Database:
    def __init__(self):
        self.pool = None

    async def connect(self):
        self.pool = await asyncpg.create_pool(DATABASE_URL)
        await self.init_db()

    async def disconnect(self):
        if self.pool:
            await self.pool.close()

    async def init_db(self):
        """Initialize metadata table with lazy vectorization support."""
        async with self.pool.acquire() as conn:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS rag_files (
                    id UUID PRIMARY KEY,
                    filename TEXT NOT NULL,
                    storage_path TEXT NOT NULL,
                    content_type TEXT DEFAULT 'application/pdf',
                    domain TEXT NOT NULL,
                    sector TEXT NOT NULL,
                    vector_status TEXT DEFAULT 'pending',
                    chunk_count INT DEFAULT 0,
                    last_accessed TIMESTAMP WITH TIME ZONE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                
                CREATE INDEX IF NOT EXISTS idx_rag_files_domain ON rag_files(domain);
                CREATE INDEX IF NOT EXISTS idx_rag_files_sector ON rag_files(sector);
                CREATE INDEX IF NOT EXISTS idx_rag_files_domain_sector ON rag_files(domain, sector);
                CREATE INDEX IF NOT EXISTS idx_rag_files_vector_status ON rag_files(vector_status);
                CREATE INDEX IF NOT EXISTS idx_rag_files_last_accessed ON rag_files(last_accessed);
            """)

    # === File Operations ===
    
    async def register_file(
        self, 
        file_id: str, 
        filename: str, 
        storage_path: str,
        domain: str, 
        sector: str,
        content_type: str = "application/pdf"
    ) -> bool:
        """Register a file from Supabase Storage."""
        async with self.pool.acquire() as conn:
            try:
                await conn.execute(
                    """INSERT INTO rag_files (id, filename, storage_path, content_type, domain, sector, vector_status)
                       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
                       ON CONFLICT (id) DO UPDATE SET
                           filename = $2, storage_path = $3, domain = $5, sector = $6, updated_at = NOW()""",
                    file_id, filename, storage_path, content_type, domain, sector
                )
                return True
            except Exception:
                return False

    async def get_file(self, file_id: str) -> dict | None:
        """Get file metadata by ID."""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM rag_files WHERE id = $1", file_id
            )
            return dict(row) if row else None

    async def list_files(self, domain: str = None, sector: str = None) -> list[dict]:
        """List files with optional filtering."""
        async with self.pool.acquire() as conn:
            if domain and sector:
                rows = await conn.fetch(
                    """SELECT * FROM rag_files WHERE domain = $1 AND sector = $2 
                       ORDER BY created_at DESC""",
                    domain, sector
                )
            elif domain:
                rows = await conn.fetch(
                    "SELECT * FROM rag_files WHERE domain = $1 ORDER BY created_at DESC",
                    domain
                )
            elif sector:
                rows = await conn.fetch(
                    "SELECT * FROM rag_files WHERE sector = $1 ORDER BY created_at DESC",
                    sector
                )
            else:
                rows = await conn.fetch(
                    "SELECT * FROM rag_files ORDER BY created_at DESC"
                )
            return [dict(row) for row in rows]

    async def get_files_for_query(self, domain: str, sector: str) -> list[dict]:
        """Get all files matching domain/sector for a query."""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                """SELECT * FROM rag_files 
                   WHERE domain = $1 AND sector = $2 
                   ORDER BY created_at DESC""",
                domain, sector
            )
            return [dict(row) for row in rows]

    async def delete_file(self, file_id: str) -> bool:
        """Delete file metadata."""
        async with self.pool.acquire() as conn:
            result = await conn.execute(
                "DELETE FROM rag_files WHERE id = $1", file_id
            )
            return "DELETE 1" in result

    # === Vector Status Operations ===

    async def update_vector_status(
        self, 
        file_id: str, 
        status: str, 
        chunk_count: int = 0
    ):
        """Update vector status after indexing."""
        async with self.pool.acquire() as conn:
            await conn.execute(
                """UPDATE rag_files 
                   SET vector_status = $1, chunk_count = $2, 
                       last_accessed = NOW(), updated_at = NOW()
                   WHERE id = $3""",
                status, chunk_count, file_id
            )

    async def touch_file(self, file_id: str):
        """Update last_accessed timestamp when vectors are used."""
        async with self.pool.acquire() as conn:
            await conn.execute(
                "UPDATE rag_files SET last_accessed = NOW() WHERE id = $1",
                file_id
            )

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
            return [dict(row) for row in rows]

    async def get_pending_files(self, domain: str, sector: str) -> list[dict]:
        """Get files that need vectorization for a query."""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                """SELECT * FROM rag_files 
                   WHERE domain = $1 AND sector = $2 
                   AND vector_status IN ('pending', 'expired')
                   ORDER BY created_at DESC""",
                domain, sector
            )
            return [dict(row) for row in rows]

    async def get_indexed_files(self, domain: str, sector: str) -> list[dict]:
        """Get files that are already indexed."""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                """SELECT * FROM rag_files 
                   WHERE domain = $1 AND sector = $2 
                   AND vector_status = 'indexed'
                   ORDER BY created_at DESC""",
                domain, sector
            )
            return [dict(row) for row in rows]


db = Database()
