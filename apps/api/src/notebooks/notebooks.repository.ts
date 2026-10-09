import { Injectable } from '@nestjs/common';
import { NotebookStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const withCounts = {
  _count: { select: { sources: true, proposals: true } },
} satisfies Prisma.NotebookInclude;

@Injectable()
export class NotebooksRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.NotebookCreateInput) {
    return this.prisma.notebook.create({ data, include: withCounts });
  }

  findMany(status?: NotebookStatus) {
    return this.prisma.notebook.findMany({
      where: { status },
      include: withCounts,
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string) {
    return this.prisma.notebook.findUnique({
      where: { id },
      include: withCounts,
    });
  }

  exists(id: string) {
    return this.prisma.notebook
      .count({ where: { id } })
      .then((count) => count > 0);
  }

  delete(id: string) {
    return this.prisma.notebook.delete({ where: { id } });
  }
}
