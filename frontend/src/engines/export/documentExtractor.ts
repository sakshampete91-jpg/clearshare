import Papa from 'papaparse';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import type { DocumentSource } from '../../types/clearshare';

const IS_NODE_ENV =
  typeof globalThis !== 'undefined' &&
  'process' in globalThis &&
  Boolean((globalThis as { process?: { versions?: { node?: string } } }).process?.versions?.node);

if (!IS_NODE_ENV && typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

export const SUPPORTED_EXTENSIONS = ['txt', 'csv', 'pdf', 'docx', 'json'] as const;
export type SupportedFileFormat = (typeof SUPPORTED_EXTENSIONS)[number];

const MAX_TEXT_FILE_BYTES = 2 * 1024 * 1024; // 2 MB for TXT/CSV/JSON
const MAX_BINARY_FILE_BYTES = 5 * 1024 * 1024; // 5 MB for PDF/DOCX
const MAX_PDF_PAGES = 50;
const MAX_EXTRACTED_CHARS = 500_000;

export interface ExtractedDocumentResult {
  text: string;
  source: DocumentSource;
  notice?: string;
}

function detectFileFormat(file: File): SupportedFileFormat | null {
  const name = file.name.toLowerCase();
  if (name.endsWith('.txt')) return 'txt';
  if (name.endsWith('.csv')) return 'csv';
  if (name.endsWith('.pdf')) return 'pdf';
  if (name.endsWith('.docx')) return 'docx';
  if (name.endsWith('.json')) return 'json';

  if (file.type === 'text/plain') return 'txt';
  if (file.type === 'text/csv') return 'csv';
  if (file.type === 'application/pdf') return 'pdf';
  if (file.type === 'application/json') return 'json';
  if (
    file.type ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'docx';
  }
  return null;
}

function clampExtractedText(text: string): { text: string; truncated: boolean } {
  if (text.length <= MAX_EXTRACTED_CHARS) {
    return { text, truncated: false };
  }
  return {
    text: text.slice(0, MAX_EXTRACTED_CHARS),
    truncated: true,
  };
}

export async function extractPdfTextFromBuffer(
  buffer: ArrayBuffer,
  options?: { disableWorker?: boolean }
): Promise<{ text: string; notice?: string }> {
  const bytes = new Uint8Array(buffer);
  const header = String.fromCharCode(...bytes.slice(0, 5));
  if (!header.startsWith('%PDF-')) {
    throw new Error('File does not appear to be a valid PDF document.');
  }

  const loadingTask = pdfjsLib.getDocument({
    data: bytes,
    ...(options?.disableWorker ? { useWorkerFetch: false, isEvalSupported: false } : {}),
  });

  let pdfDoc: Awaited<typeof loadingTask.promise> | null = null;
  try {
    pdfDoc = await loadingTask.promise;
    const totalPages = pdfDoc.numPages;
    const pagesToRead = Math.min(totalPages, MAX_PDF_PAGES);
    const pageTexts: string[] = [];

    for (let pageNum = 1; pageNum <= pagesToRead; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const content = await page.getTextContent();
      const lines: string[] = [];
      let currentLine = '';

      for (const item of content.items) {
        if ('str' in item) {
          currentLine += item.str;
          if ('hasEOL' in item && item.hasEOL) {
            lines.push(currentLine.trimEnd());
            currentLine = '';
          } else {
            currentLine += ' ';
          }
        }
      }
      if (currentLine.trim()) {
        lines.push(currentLine.trimEnd());
      }
      pageTexts.push(lines.join('\n').trim());
    }

    const combined = pageTexts.filter(Boolean).join('\n\n').trim();
    if (!combined) {
      throw new Error(
        'No selectable text was found in this PDF (it may be scanned or image-only).'
      );
    }

    const { text, truncated } = clampExtractedText(combined);
    let notice =
      'PDF text extracted locally. Export uses sanitized plain text or CSV (original PDF layout is not preserved).';
    if (totalPages > MAX_PDF_PAGES) {
      notice = `Extracted the first ${MAX_PDF_PAGES} of ${totalPages} PDF pages. Export uses sanitized plain text or CSV.`;
    } else if (truncated) {
      notice = 'Extracted PDF text was trimmed to the 500,000-character browser limit.';
    }

    return { text, notice };
  } catch (err) {
    if (err instanceof Error) {
      if (
        err.name === 'PasswordException' ||
        /password/i.test(err.message)
      ) {
        throw new Error(
          'This PDF is password-protected. Please unlock it locally before uploading.'
        );
      }
      if (
        err.message.startsWith('No selectable text') ||
        err.message.startsWith('File does not appear')
      ) {
        throw err;
      }
    }
    throw new Error('Could not parse this PDF locally. The file may be malformed or corrupted.');
  } finally {
    if (pdfDoc) {
      await pdfDoc.cleanup();
    }
    await loadingTask.destroy();
  }
}

export async function extractDocxTextFromBuffer(
  buffer: ArrayBuffer
): Promise<{ text: string; notice?: string }> {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    throw new Error('File does not appear to be a valid .docx archive.');
  }

  try {
    const mammothInput =
      IS_NODE_ENV && typeof Buffer !== 'undefined'
        ? ({ buffer: Buffer.from(buffer) } as unknown as { arrayBuffer: ArrayBuffer })
        : { arrayBuffer: buffer };
    const result = await mammoth.extractRawText(mammothInput);
    const raw = (result.value ?? '').trim();
    if (!raw) {
      throw new Error('The uploaded DOCX document contains no readable text.');
    }

    const { text, truncated } = clampExtractedText(raw);
    const notice = truncated
      ? 'Extracted DOCX text was trimmed to 500,000 characters. Export uses sanitized plain text or CSV.'
      : 'DOCX text extracted locally. Export uses sanitized plain text or CSV (original Word formatting is not preserved).';

    return { text, notice };
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message.includes('no readable text') || err.message.includes('valid .docx'))
    ) {
      throw err;
    }
    throw new Error(
      'Could not read this DOCX file. It may be encrypted, corrupted, or not a valid Word (.docx) document.'
    );
  }
}

export function extractJsonText(rawContent: string): { text: string; notice?: string } {
  if (!rawContent.trim()) {
    throw new Error('The uploaded JSON file is empty.');
  }
  try {
    const parsed: unknown = JSON.parse(rawContent);
    const formatted = JSON.stringify(parsed, null, 2);
    if (!formatted || formatted === '{}' || formatted === '[]') {
      throw new Error('The uploaded JSON document contains no data fields.');
    }
    const { text, truncated } = clampExtractedText(formatted);
    return {
      text,
      notice: truncated
        ? 'JSON content was trimmed to the 500,000-character browser limit.'
        : undefined,
    };
  } catch (err) {
    if (err instanceof Error && err.message.includes('contains no data')) {
      throw err;
    }
    throw new Error('Malformed JSON file. Check syntax (commas, quotes, or brackets) and try again.');
  }
}

export async function extractDocumentFromFile(file: File): Promise<ExtractedDocumentResult> {
  const format = detectFileFormat(file);
  if (!format) {
    throw new Error(
      'Unsupported file format. Supported local formats: TXT, CSV, PDF, DOCX, JSON.'
    );
  }

  if (file.size === 0) {
    throw new Error('The selected file is empty (0 bytes).');
  }

  const maxBytes =
    format === 'pdf' || format === 'docx'
      ? MAX_BINARY_FILE_BYTES
      : MAX_TEXT_FILE_BYTES;

  if (file.size > maxBytes) {
    const mb = Math.round(maxBytes / (1024 * 1024));
    throw new Error(
      `File exceeds the ${mb} MB browser safety limit for ${format.toUpperCase()} files.`
    );
  }

  if (format === 'txt') {
    const raw = await file.text();
    if (!raw.trim()) {
      throw new Error('The selected TXT file is empty.');
    }
    const { text, truncated } = clampExtractedText(raw);
    return {
      text,
      source: { kind: 'txt', fileName: file.name },
      notice: truncated ? 'TXT content trimmed to 500,000 characters.' : undefined,
    };
  }

  if (format === 'csv') {
    const raw = await file.text();
    if (!raw.trim()) {
      throw new Error('The selected CSV file is empty.');
    }
    const check = Papa.parse<string[]>(raw.replace(/\r\n/g, '\n').replace(/\n$/, ''), {
      header: false,
      skipEmptyLines: false,
    });
    if (check.errors.length > 0 && check.data.length === 0) {
      throw new Error(`Malformed CSV file: ${check.errors[0].message}`);
    }
    const { text, truncated } = clampExtractedText(raw);
    return {
      text,
      source: { kind: 'csv', fileName: file.name },
      notice: truncated ? 'CSV content trimmed to 500,000 characters.' : undefined,
    };
  }

  if (format === 'json') {
    const raw = await file.text();
    const { text, notice } = extractJsonText(raw);
    return {
      text,
      source: { kind: 'json', fileName: file.name },
      notice,
    };
  }

  if (format === 'pdf') {
    const buffer = await file.arrayBuffer();
    const { text, notice } = await extractPdfTextFromBuffer(buffer);
    return {
      text,
      source: { kind: 'pdf', fileName: file.name },
      notice,
    };
  }

  // docx
  const buffer = await file.arrayBuffer();
  const { text, notice } = await extractDocxTextFromBuffer(buffer);
  return {
    text,
    source: { kind: 'docx', fileName: file.name },
    notice,
  };
}
