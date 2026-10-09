import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { SourceStatus, SourceType } from '@prisma/client';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { NotebooksService } from '../notebooks/notebooks.service';
import { CreateTextSourceDto } from './dto/create-text-source.dto';
import { SourceResponseDto } from './dto/source-response.dto';
import { chunkSegments } from './ingestion/chunker';
import {
  detectSourceType,
  extractSegments,
  SUPPORTED_EXTENSIONS,
} from './ingestion/text-extractor';
import { SourceMapper } from './source.mapper';
import { SourcesRepository } from './sources.repository';

interface IncomingFile {
  originalname: string;
  buffer: Buffer;
}

const INTERRUPTED_MESSAGE =
  'El procesamiento se interrumpió (la API se reinició). Volvé a subir la fuente.';

@Injectable()
export class SourcesService implements OnModuleInit {
  private readonly logger = new Logger(SourcesService.name);

  constructor(
    private readonly repository: SourcesRepository,
    private readonly notebooks: NotebooksService,
    private readonly embeddings: EmbeddingsService,
  ) {}

  /**
   * Processing runs in background inside this process: anything still pending
   * at boot was interrupted by a restart and will never finish.
   */
  async onModuleInit(): Promise<void> {
    const count = await this.repository.failUnfinished(INTERRUPTED_MESSAGE);
    if (count > 0) {
      this.logger.warn(
        `${count} fuente(s) pendientes o en proceso marcadas con error tras el reinicio`,
      );
    }
  }

  /** Registers the files and processes them in background (the client polls the status). */
  async uploadFiles(
    notebookId: string,
    files: IncomingFile[],
  ): Promise<SourceResponseDto[]> {
    await this.notebooks.assertExists(notebookId);
    if (!files?.length) {
      throw new BadRequestException('Adjuntá al menos un archivo.');
    }
    const unsupported = files.filter((f) => !detectSourceType(f.originalname));
    if (unsupported.length) {
      throw new BadRequestException(
        `Formato no soportado: ${unsupported.map((f) => f.originalname).join(', ')}. Formatos válidos: ${Object.keys(SUPPORTED_EXTENSIONS).join(', ')}.`,
      );
    }

    const created = await Promise.all(
      files.map(async (file) => {
        const type = detectSourceType(file.originalname)!;
        const source = await this.repository.create({
          notebookId,
          type,
          filename: Buffer.from(file.originalname, 'latin1').toString('utf8'),
        });
        void this.process(source.id, notebookId, type, file.buffer);
        return source;
      }),
    );
    return created.map((s) => SourceMapper.toResponse(s));
  }

  async createText(
    notebookId: string,
    dto: CreateTextSourceDto,
  ): Promise<SourceResponseDto> {
    await this.notebooks.assertExists(notebookId);
    const source = await this.repository.create({
      notebookId,
      type: SourceType.TEXT,
      filename: dto.title,
    });
    void this.process(
      source.id,
      notebookId,
      SourceType.TEXT,
      Buffer.from(dto.content, 'utf8'),
    );
    return SourceMapper.toResponse(source);
  }

  /** Synchronous variant used by the seed script. */
  async ingestNow(
    notebookId: string,
    filename: string,
    buffer: Buffer,
  ): Promise<void> {
    const type = detectSourceType(filename) ?? SourceType.TEXT;
    const source = await this.repository.create({ notebookId, type, filename });
    await this.process(source.id, notebookId, type, buffer);
  }

  async findByNotebook(notebookId: string): Promise<SourceResponseDto[]> {
    await this.notebooks.assertExists(notebookId);
    const sources = await this.repository.findByNotebook(notebookId);
    return sources.map((s) => SourceMapper.toResponse(s));
  }

  async getRawText(id: string): Promise<{ filename: string; text: string }> {
    const source = await this.repository.findById(id);
    if (!source) throw new NotFoundException('La fuente no existe.');
    return { filename: source.filename, text: source.rawText ?? '' };
  }

  async remove(id: string): Promise<void> {
    const source = await this.repository.findById(id);
    if (!source) throw new NotFoundException('La fuente no existe.');
    await this.repository.delete(id);
  }

  private async process(
    sourceId: string,
    notebookId: string,
    type: SourceType,
    buffer: Buffer,
  ): Promise<void> {
    const startedAt = Date.now();
    try {
      await this.repository.updateStatus(sourceId, SourceStatus.PROCESSING);
      const segments = await extractSegments(type, buffer);
      const rawText = segments
        .map((s) => s.text)
        .join('\n\n')
        .trim();
      if (!rawText) throw new Error('No se pudo extraer texto del archivo.');

      const chunks = chunkSegments(segments);
      const vectors = await this.embeddings.embedPassages(
        chunks.map((c) => c.content),
      );
      await this.repository.replaceChunks(
        sourceId,
        notebookId,
        chunks,
        vectors,
      );
      await this.repository.updateStatus(sourceId, SourceStatus.READY, {
        rawText,
        errorMessage: null,
      });
      this.logger.log(
        `Fuente ${sourceId} lista: ${chunks.length} chunks en ${Date.now() - startedAt} ms`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Fuente ${sourceId} falló: ${message}`);
      await this.repository
        .updateStatus(sourceId, SourceStatus.ERROR, { errorMessage: message })
        .catch((e) => this.logger.error(`No se pudo marcar el error: ${e}`));
    }
  }
}
