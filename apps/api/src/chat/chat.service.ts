import { Injectable } from '@nestjs/common';
import { ChatRole, Prisma } from '@prisma/client';
import { LlmService } from '../llm/llm.service';
import { NotebooksService } from '../notebooks/notebooks.service';
import { ProposalResponseDto } from '../proposals/dto/proposal-response.dto';
import { ProposalsService } from '../proposals/proposals.service';
import { formatChunkLocation } from '../sources/chunk-location';
import { RetrievalService, RetrievedChunk } from '../sources/retrieval.service';
import { ChatMapper } from './chat.mapper';
import { buildChatMessages } from './chat.prompt';
import { ChatRepository } from './chat.repository';
import {
  ChatMessageResponseDto,
  CitationDto,
} from './dto/chat-message-response.dto';
import { SendMessageDto } from './dto/send-message.dto';

const NOTEBOOK_CHUNKS = 8;
const HISTORY_CHUNKS = 4;
const CONVERSATION_TURNS = 6;

@Injectable()
export class ChatService {
  constructor(
    private readonly repository: ChatRepository,
    private readonly notebooks: NotebooksService,
    private readonly retrieval: RetrievalService,
    private readonly proposals: ProposalsService,
    private readonly llm: LlmService,
  ) {}

  async findByNotebook(notebookId: string): Promise<ChatMessageResponseDto[]> {
    await this.notebooks.assertExists(notebookId);
    const messages = await this.repository.findByNotebook(notebookId);
    return messages.map((m) => ChatMapper.toResponse(m));
  }

  async clear(notebookId: string): Promise<void> {
    await this.notebooks.assertExists(notebookId);
    await this.repository.deleteByNotebook(notebookId);
  }

  async send(
    notebookId: string,
    dto: SendMessageDto,
  ): Promise<ChatMessageResponseDto> {
    await this.notebooks.assertExists(notebookId);
    const previous = await this.repository.findRecent(
      notebookId,
      CONVERSATION_TURNS,
    );
    const chunks = await this.retrieve(notebookId, dto);
    const proposals = await this.proposals.findByNotebook(notebookId);
    const current =
      proposals.find((p) => p.options.some((o) => o.isFormal)) ??
      proposals[0] ??
      null;

    const messages = buildChatMessages({
      context: chunks.map((chunk, i) => ({
        index: i + 1,
        label: `${chunk.notebookId === notebookId ? 'Fuente' : `Histórico "${chunk.notebookName}"`}: ${chunk.filename}${formatChunkLocation(chunk.meta) ? ` (${formatChunkLocation(chunk.meta)})` : ''}`,
        content: chunk.content,
      })),
      proposalSummary: current ? summarizeProposal(current) : null,
      history: previous.map((m) => ({
        role: m.role === ChatRole.USER ? 'user' : 'assistant',
        content: m.content,
      })),
      question: dto.message,
    });

    // Persist the question before calling the model: if the LLM fails the user keeps it.
    await this.repository.create({
      notebookId,
      role: ChatRole.USER,
      content: dto.message,
    });

    const completion = await this.llm.complete(messages, {
      temperature: 0.3,
      mock: () =>
        `[MOCK] Encontré ${chunks.length} fragmentos relevantes. El primero dice: "${chunks[0]?.content.slice(0, 160) ?? '—'}…" [1]`,
    });

    const answer = await this.repository.create({
      notebookId,
      role: ChatRole.ASSISTANT,
      content: completion.content,
      citations: toCitations(
        completion.content,
        chunks,
        notebookId,
      ) as unknown as Prisma.InputJsonValue,
    });
    return ChatMapper.toResponse(answer);
  }

  private async retrieve(
    notebookId: string,
    dto: SendMessageDto,
  ): Promise<RetrievedChunk[]> {
    const own = await this.retrieval.search(
      dto.message,
      [notebookId],
      NOTEBOOK_CHUNKS,
    );
    if (dto.includeHistory === false) return own;
    const historyIds = (await this.retrieval.closedNotebookIds()).filter(
      (id) => id !== notebookId,
    );
    const history = await this.retrieval.search(
      dto.message,
      historyIds,
      HISTORY_CHUNKS,
    );
    return [...own, ...history];
  }
}

/** Keeps only the context items the answer actually cites. */
function toCitations(
  answer: string,
  chunks: RetrievedChunk[],
  notebookId: string,
): CitationDto[] {
  const cited = new Set(
    [...answer.matchAll(/\[(\d+)\]/g)].map((match) => Number(match[1])),
  );
  return [...cited]
    .filter((index) => index >= 1 && index <= chunks.length)
    .sort((a, b) => a - b)
    .map((index) => {
      const chunk = chunks[index - 1];
      return {
        index,
        chunkId: chunk.id,
        sourceId: chunk.sourceId,
        filename: chunk.filename,
        notebookId: chunk.notebookId,
        notebookName: chunk.notebookName,
        location: formatChunkLocation(chunk.meta),
        excerpt: chunk.content.slice(0, 600),
        fromHistory: chunk.notebookId !== notebookId,
      };
    });
}

function summarizeProposal(p: ProposalResponseDto): string {
  const modules = p.modules
    .map(
      (m) =>
        `- ${m.name} [${m.priority}, ${m.complexity}]: ${m.totalHours} h completo${m.reducedHours ? ` / versión reducida: ${m.reducedDescription}` : ''}${m.notes ? ` — ${m.notes}` : ''}`,
    )
    .join('\n');
  const options = p.options
    .map((o) => {
      const team = o.team
        .map((t) => `${t.count}× ${t.role} ${t.seniority} ${t.dedication}`)
        .join(', ');
      const scope = o.modules
        .map((m) => `${m.name}${m.variant === 'REDUCED' ? ' (reducido)' : ''}`)
        .join(', ');
      return `- ${o.label}${o.isFormal ? ' (formal, elegida por el cliente)' : ''}: ${o.estimation.totalHours} h, ${o.estimation.team.durationDays ?? '—'} días hábiles. Equipo: ${team}. Incluye: ${scope}.`;
    })
    .join('\n');
  return `Versión ${p.version}. ${p.summary}
Fecha objetivo: ${p.targetDate ? new Date(p.targetDate).toISOString().slice(0, 10) : '—'} (${p.targetSource ?? ''}).
Catálogo de módulos:
${modules}
Opciones:
${options}`;
}
