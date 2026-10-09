import { Injectable, NotFoundException } from '@nestjs/common';
import { NotebookStatus } from '@prisma/client';
import { CreateNotebookDto } from './dto/create-notebook.dto';
import { NotebookResponseDto } from './dto/notebook-response.dto';
import { NotebookMapper } from './notebook.mapper';
import { NotebooksRepository } from './notebooks.repository';

@Injectable()
export class NotebooksService {
  constructor(private readonly repository: NotebooksRepository) {}

  async create(dto: CreateNotebookDto): Promise<NotebookResponseDto> {
    return NotebookMapper.toResponse(await this.repository.create(dto));
  }

  async findAll(status?: NotebookStatus): Promise<NotebookResponseDto[]> {
    const notebooks = await this.repository.findMany(status);
    return notebooks.map((n) => NotebookMapper.toResponse(n));
  }

  async findOne(id: string): Promise<NotebookResponseDto> {
    const notebook = await this.repository.findById(id);
    if (!notebook) throw new NotFoundException('El notebook no existe.');
    return NotebookMapper.toResponse(notebook);
  }

  async assertExists(id: string): Promise<void> {
    if (!(await this.repository.exists(id))) {
      throw new NotFoundException('El notebook no existe.');
    }
  }

  async remove(id: string): Promise<void> {
    await this.assertExists(id);
    await this.repository.delete(id);
  }
}
