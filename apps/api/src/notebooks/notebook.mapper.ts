import { Notebook } from '@prisma/client';
import { NotebookResponseDto } from './dto/notebook-response.dto';

export type NotebookWithCounts = Notebook & {
  _count: { sources: number; proposals: number };
};

export class NotebookMapper {
  static toResponse(notebook: NotebookWithCounts): NotebookResponseDto {
    return {
      id: notebook.id,
      name: notebook.name,
      client: notebook.client,
      industry: notebook.industry,
      code: notebook.code,
      year: notebook.year,
      description: notebook.description,
      status: notebook.status,
      sourcesCount: notebook._count.sources,
      proposalsCount: notebook._count.proposals,
      createdAt: notebook.createdAt,
    };
  }
}
