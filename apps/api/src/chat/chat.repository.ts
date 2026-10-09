import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.ChatMessageUncheckedCreateInput) {
    return this.prisma.chatMessage.create({ data });
  }

  findByNotebook(notebookId: string) {
    return this.prisma.chatMessage.findMany({
      where: { notebookId },
      orderBy: { createdAt: 'asc' },
    });
  }

  findRecent(notebookId: string, take: number) {
    return this.prisma.chatMessage
      .findMany({ where: { notebookId }, orderBy: { createdAt: 'desc' }, take })
      .then((messages) => messages.reverse());
  }

  deleteByNotebook(notebookId: string) {
    return this.prisma.chatMessage.deleteMany({ where: { notebookId } });
  }
}
