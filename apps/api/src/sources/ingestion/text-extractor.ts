import { extname } from 'node:path';
import { SourceType } from '@prisma/client';
import mammoth from 'mammoth';
import { TextSegment } from './chunker';

export const SUPPORTED_EXTENSIONS: Record<string, SourceType> = {
  '.txt': 'TEXT',
  '.md': 'MARKDOWN',
  '.markdown': 'MARKDOWN',
  '.pdf': 'PDF',
  '.docx': 'DOCX',
};

export function detectSourceType(filename: string): SourceType | null {
  return SUPPORTED_EXTENSIONS[extname(filename).toLowerCase()] ?? null;
}

export async function extractSegments(
  type: SourceType,
  buffer: Buffer,
): Promise<TextSegment[]> {
  switch (type) {
    case 'TEXT':
    case 'MARKDOWN':
      return [{ text: buffer.toString('utf8') }];
    case 'DOCX': {
      const { value } = await mammoth.extractRawText({ buffer });
      return [{ text: value }];
    }
    case 'PDF':
      return extractPdfPages(buffer);
    case 'VIDEO':
      throw new Error('Las fuentes de video todavía no están soportadas.');
  }
}

async function extractPdfPages(buffer: Buffer): Promise<TextSegment[]> {
  // Import the implementation file directly: the package index runs a debug script.
  const { default: pdfParse } = await import('pdf-parse/lib/pdf-parse.js');
  const pages: string[] = [];
  await pdfParse(buffer, {
    pagerender: async (pageData: any) => {
      const content = await pageData.getTextContent();
      let lastY: number | undefined;
      let text = '';
      for (const item of content.items) {
        text +=
          lastY === undefined || lastY === item.transform[5]
            ? item.str
            : `\n${item.str}`;
        lastY = item.transform[5];
      }
      pages.push(text);
      return text;
    },
  });
  return pages.map((text, index) => ({ text, page: index + 1 }));
}
