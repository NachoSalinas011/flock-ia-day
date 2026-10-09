import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmCompletion {
  content: string;
  model: string;
  cached: boolean;
}

interface CompleteOptions {
  temperature?: number;
  /** only responses accepted here are cached (avoids replaying a broken answer) */
  accept?: (content: string) => boolean;
  /** canned response used when LLM_MOCK=true */
  mock?: () => string;
  /** skip reading the disk cache (accepted answers are still written to it) */
  skipCache?: boolean;
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const REQUEST_TIMEOUT_MS = 180_000;
/** Free models sometimes answer 200 with no content: retry those once. */
const EMPTY_RESPONSE_ATTEMPTS = 2;

/**
 * Single entry point to OpenRouter. Free models allow ~50 requests/day, so:
 * - responses are cached on disk by prompt hash (LLM_CACHE=false disables it)
 * - LLM_MOCK=true never calls the network (uses each caller's canned response)
 * - the request carries a fallback model list that OpenRouter tries in order
 * - no `response_format`: some free models return broken JSON with it, callers parse instead
 */
@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly apiKey: string;
  private readonly models: string[];
  private readonly mock: boolean;
  private readonly cacheEnabled: boolean;
  private readonly cacheDir = join(process.cwd(), '.cache', 'llm');

  constructor(config: ConfigService) {
    this.apiKey = config.getOrThrow<string>('OPENROUTER_API_KEY');
    this.models = [
      config.getOrThrow<string>('LLM_MODEL'),
      config.get<string>('LLM_FALLBACK_MODEL'),
    ].filter((m): m is string => Boolean(m));
    this.mock = config.get<string>('LLM_MOCK') === 'true';
    this.cacheEnabled = config.get<string>('LLM_CACHE') !== 'false';
  }

  async complete(
    messages: LlmMessage[],
    options: CompleteOptions = {},
  ): Promise<LlmCompletion> {
    if (this.mock && options.mock) {
      return { content: options.mock(), model: 'mock', cached: false };
    }

    const key = this.cacheKey(messages);
    const cached = options.skipCache ? null : await this.readCache(key);
    if (cached) return { ...cached, cached: true };

    let result = await this.request(messages, options);
    for (
      let attempt = 1;
      !result.content.trim() && attempt < EMPTY_RESPONSE_ATTEMPTS;
      attempt++
    ) {
      this.logger.warn('El modelo devolvió una respuesta vacía, reintentando');
      result = await this.request(messages, options);
    }
    if (!result.content.trim()) {
      throw new ServiceUnavailableException(
        'El modelo de IA devolvió una respuesta vacía. Probá de nuevo en unos segundos.',
      );
    }
    if (!options.accept || options.accept(result.content)) {
      await this.writeCache(key, result);
    }
    return { ...result, cached: false };
  }

  private async request(
    messages: LlmMessage[],
    options: CompleteOptions,
  ): Promise<Omit<LlmCompletion, 'cached'>> {
    const body = {
      models: this.models,
      messages,
      temperature: options.temperature ?? 0.2,
    };

    const startedAt = Date.now();
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'X-Title': 'Estimador de propuestas',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const payload: any = await response.json().catch(() => ({}));

    if (!response.ok || payload.error) {
      const message = payload.error?.message ?? response.statusText;
      this.logger.error(`OpenRouter ${response.status}: ${message}`);
      throw new ServiceUnavailableException(
        `El modelo de IA no está disponible en este momento (${message}). Probá de nuevo en unos segundos.`,
      );
    }

    const content: string = payload.choices?.[0]?.message?.content ?? '';
    const model: string = payload.model ?? this.models[0];
    this.logger.log(
      `OpenRouter ${model} respondió en ${Date.now() - startedAt} ms (${payload.usage?.total_tokens ?? '?'} tokens)`,
    );
    return { content, model };
  }

  private cacheKey(messages: LlmMessage[]): string {
    return createHash('sha256')
      .update(JSON.stringify({ messages, m: this.models }))
      .digest('hex');
  }

  private async readCache(
    key: string,
  ): Promise<Omit<LlmCompletion, 'cached'> | null> {
    if (!this.cacheEnabled) return null;
    try {
      return JSON.parse(
        await readFile(join(this.cacheDir, `${key}.json`), 'utf8'),
      );
    } catch {
      return null;
    }
  }

  private async writeCache(
    key: string,
    value: Omit<LlmCompletion, 'cached'>,
  ): Promise<void> {
    if (!this.cacheEnabled) return;
    await mkdir(this.cacheDir, { recursive: true });
    await writeFile(join(this.cacheDir, `${key}.json`), JSON.stringify(value));
  }
}
