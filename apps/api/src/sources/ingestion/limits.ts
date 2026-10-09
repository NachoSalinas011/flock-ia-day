/** Upper bounds that keep a single upload from exhausting memory or CPU. */
export const INGESTION_LIMITS = {
  maxFileSizeBytes: 15 * 1024 * 1024,
  maxFilesPerUpload: 5,
  maxPdfPages: 300,
  /** DOCX are zip files: reject archives that expand beyond this (zip bombs) */
  maxDocxUncompressedBytes: 60 * 1024 * 1024,
  /** text kept per source; the rest is dropped (with a warning) */
  maxSourceChars: 400_000,
  /** chunks embedded per source */
  maxChunks: 500,
} as const;

/**
 * Sums the uncompressed sizes declared in a zip's central directory, without
 * inflating anything. Returns null if the buffer is not a readable zip.
 */
export function zipUncompressedSize(buffer: Buffer): number | null {
  const EOCD = 0x06054b50;
  const CENTRAL_HEADER = 0x02014b50;
  const searchFrom = Math.max(0, buffer.length - 0xffff - 22);
  let eocd = -1;
  for (let i = buffer.length - 22; i >= searchFrom; i--) {
    if (buffer.readUInt32LE(i) === EOCD) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;
  const entries = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  let total = 0;
  for (let n = 0; n < entries; n++) {
    if (
      offset + 46 > buffer.length ||
      buffer.readUInt32LE(offset) !== CENTRAL_HEADER
    ) {
      return null;
    }
    total += buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return total;
}
