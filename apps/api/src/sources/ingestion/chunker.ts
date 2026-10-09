export interface ChunkMeta {
  heading?: string;
  page?: number;
  timestamp?: string;
}

export interface TextChunk {
  content: string;
  meta: ChunkMeta;
}

export interface TextSegment {
  text: string;
  page?: number;
}

const MAX_CHUNK_CHARS = 1400;
const HEADING = /^(#{1,6})\s+(.+)$/;
const TIMESTAMP = /\[(\d{1,2}:\d{2}(?::\d{2})?)\]/;

/**
 * Splits text into ~1400-char chunks that respect markdown sections and
 * paragraphs. Each chunk is prefixed with its section heading so it keeps
 * context once retrieved on its own.
 */
export function chunkSegments(segments: TextSegment[]): TextChunk[] {
  const chunks: TextChunk[] = [];
  for (const segment of segments) {
    for (const section of splitSections(segment.text)) {
      for (const body of packParagraphs(section.body)) {
        const content = section.heading ? `${section.heading}\n${body}` : body;
        const timestamp = body.match(TIMESTAMP)?.[1];
        chunks.push({
          content,
          meta: {
            ...(section.heading && {
              heading: section.heading.replace(/^#+\s*/, ''),
            }),
            ...(segment.page && { page: segment.page }),
            ...(timestamp && { timestamp }),
          },
        });
      }
    }
  }
  return chunks;
}

function splitSections(text: string): { heading?: string; body: string }[] {
  const sections: { heading?: string; lines: string[] }[] = [{ lines: [] }];
  for (const line of text.split(/\r?\n/)) {
    if (HEADING.test(line.trim())) {
      sections.push({ heading: line.trim(), lines: [] });
    } else {
      sections[sections.length - 1].lines.push(line);
    }
  }
  return sections
    .map((s) => ({ heading: s.heading, body: s.lines.join('\n').trim() }))
    .filter((s) => s.body.length > 0);
}

function packParagraphs(body: string): string[] {
  const pieces = body
    .split(/\n\s*\n/)
    .flatMap((paragraph) =>
      paragraph.length <= MAX_CHUNK_CHARS
        ? [paragraph.trim()]
        : splitLongParagraph(paragraph),
    )
    .filter(Boolean);

  const packed: string[] = [];
  let current = '';
  for (const piece of pieces) {
    if (current && current.length + piece.length + 2 > MAX_CHUNK_CHARS) {
      packed.push(current);
      current = piece;
    } else {
      current = current ? `${current}\n\n${piece}` : piece;
    }
  }
  if (current) packed.push(current);
  return packed;
}

/** Long blocks (tables, transcripts, PDF pages) are split by line, then by sentence. */
function splitLongParagraph(paragraph: string): string[] {
  const units = paragraph
    .split(/\r?\n/)
    .flatMap((line) =>
      line.length <= MAX_CHUNK_CHARS ? [line] : line.split(/(?<=[.!?])\s+/),
    );
  const parts: string[] = [];
  let current = '';
  for (const unit of units) {
    if (current && current.length + unit.length + 1 > MAX_CHUNK_CHARS) {
      parts.push(current.trim());
      current = unit;
    } else {
      current = current ? `${current}\n${unit}` : unit;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}
