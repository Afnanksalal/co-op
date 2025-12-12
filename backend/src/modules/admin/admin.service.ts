import { Injectable, NotFoundException } from '@nestjs/common';
import { UploadPdfDto, ListEmbeddingsQueryDto, EmbeddingResponseDto } from './dto';
import { PaginatedResult } from '@/common/dto/pagination.dto';
import { v4 as uuid } from 'uuid';

@Injectable()
export class AdminService {
  async uploadPdf(dto: UploadPdfDto): Promise<{ id: string; status: string }> {
    // TODO: Implement PDF upload logic
    // - Receive file
    // - Store in object storage
    // - Queue for embedding processing
    return {
      id: uuid(),
      status: 'pending',
    };
  }

  async listEmbeddings(query: ListEmbeddingsQueryDto): Promise<PaginatedResult<EmbeddingResponseDto>> {
    // TODO: Implement list embeddings logic
    return {
      data: [],
      meta: {
        total: 0,
        page: query.page || 1,
        limit: query.limit || 20,
        totalPages: 0,
      },
    };
  }

  async getEmbedding(id: string): Promise<EmbeddingResponseDto> {
    // TODO: Implement get embedding logic
    throw new NotFoundException('Embedding not found');
  }

  async deleteEmbedding(id: string): Promise<void> {
    // TODO: Implement delete embedding logic
    // - Remove from vector store
    // - Remove from database
    // - Remove source file
  }
}
