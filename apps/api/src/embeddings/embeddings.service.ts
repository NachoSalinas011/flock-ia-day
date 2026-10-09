import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

const MODEL_ID = 'Xenova/multilingual-e5-small';
export const EMBEDDING_DIMENSIONS = 384;

type Extractor = (
  texts: string[],
  options: { pooling: 'mean'; normalize: boolean },
) => Promise<{ tolist(): number[][] }>;

/**
 * Local embeddings (no API quota). e5 models expect "query: " / "passage: "
 * prefixes to separate questions from indexed content.
 */
@Injectable()
export class EmbeddingsService implements OnModuleInit {
  private readonly logger = new Logger(EmbeddingsService.name);
  private extractor: Promise<Extractor> | null = null;

  onModuleInit() {
    // Warm up in background: the first load downloads ~120 MB.
    void this.getExtractor().catch((error) =>
      this.logger.error(`No se pudo cargar ${MODEL_ID}: ${error}`),
    );
  }

  async embedPassages(texts: string[]): Promise<number[][]> {
    return this.embed(texts.map((t) => `passage: ${t}`));
  }

  async embedQuery(text: string): Promise<number[]> {
    const [vector] = await this.embed([`query: ${text}`]);
    return vector;
  }

  private async embed(texts: string[]): Promise<number[][]> {
    const extractor = await this.getExtractor();
    const vectors: number[][] = [];
    for (let i = 0; i < texts.length; i += 16) {
      const output = await extractor(texts.slice(i, i + 16), {
        pooling: 'mean',
        normalize: true,
      });
      vectors.push(...output.tolist());
    }
    return vectors;
  }

  private getExtractor(): Promise<Extractor> {
    this.extractor ??= (async () => {
      const startedAt = Date.now();
      const { pipeline } = await import('@huggingface/transformers');
      const extractor = await pipeline('feature-extraction', MODEL_ID, {
        dtype: 'q8',
      });
      this.logger.log(`${MODEL_ID} listo en ${Date.now() - startedAt} ms`);
      return extractor;
    })();
    return this.extractor;
  }
}
