import { Source } from '@prisma/client';
import { SourceResponseDto } from './dto/source-response.dto';

export type SourceWithCount = Source & { _count?: { chunks: number } };

export class SourceMapper {
  static toResponse(source: SourceWithCount): SourceResponseDto {
    return {
      id: source.id,
      notebookId: source.notebookId,
      type: source.type,
      filename: source.filename,
      status: source.status,
      errorMessage: source.errorMessage,
      chunksCount: source._count?.chunks ?? 0,
      createdAt: source.createdAt,
    };
  }
}
