import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import {
  extractDocumentFromFile,
  extractDocxTextFromBuffer,
  extractJsonText,
  extractPdfTextFromBuffer,
} from '../src/engines/export/documentExtractor';

function buildMinimalPdfBuffer(textContent: string): ArrayBuffer {
  const escaped = textContent.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const stream = `BT /F1 12 Tf 72 720 Td (${escaped}) Tj ET`;
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n',
    `4 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream\nendobj\n`,
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new TextEncoder().encode(pdf).buffer;
}

async function buildMinimalDocxBuffer(paragraphText: string): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'
  );
  zip.file(
    '_rels/.rels',
    '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'
  );
  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${paragraphText}</w:t></w:r></w:p></w:body></w:document>`
  );
  return await zip.generateAsync({ type: 'arraybuffer' });
}

describe('Multi-Format Document Extractor', () => {
  it('extracts valid JSON and rejects malformed or empty JSON', () => {
    const valid = extractJsonText('{"email":"rahul@example.in","phone":"9876543210"}');
    expect(valid.text).toContain('"email": "rahul@example.in"');

    expect(() => extractJsonText('{bad json')).toThrow(/Malformed JSON/i);
    expect(() => extractJsonText('{}')).toThrow(/no data/i);
  });

  it('extracts text from TXT, CSV, and JSON File objects and rejects empty, unsupported, or oversized files', async () => {
    const txtFile = new File(['Email: a@example.com'], 'notes.txt', { type: 'text/plain' });
    const txtOut = await extractDocumentFromFile(txtFile);
    expect(txtOut.source.kind).toBe('txt');
    expect(txtOut.text).toContain('a@example.com');

    const csvFile = new File(['Name,Email\nRahul,a@example.com'], 'users.csv', {
      type: 'text/csv',
    });
    const csvOut = await extractDocumentFromFile(csvFile);
    expect(csvOut.source.kind).toBe('csv');

    const jsonFile = new File(['{"user":"a@example.com"}'], 'payload.json', {
      type: 'application/json',
    });
    const jsonOut = await extractDocumentFromFile(jsonFile);
    expect(jsonOut.source.kind).toBe('json');

    const emptyFile = new File([''], 'empty.txt', { type: 'text/plain' });
    await expect(extractDocumentFromFile(emptyFile)).rejects.toThrow(/empty/i);

    const exeFile = new File(['MZ'], 'app.exe', { type: 'application/octet-stream' });
    await expect(extractDocumentFromFile(exeFile)).rejects.toThrow(/Unsupported file format/i);

    const oversized = new File([new Uint8Array(2 * 1024 * 1024 + 10)], 'huge.txt', {
      type: 'text/plain',
    });
    await expect(extractDocumentFromFile(oversized)).rejects.toThrow(/safety limit/i);
  });

  it('extracts text from valid DOCX buffers and rejects invalid archives', async () => {
    const docxBuffer = await buildMinimalDocxBuffer('Candidate rahul@example.in phone 9876543210');
    const res = await extractDocxTextFromBuffer(docxBuffer);
    expect(res.text).toContain('rahul@example.in');
    expect(res.notice).toContain('original Word formatting is not preserved');

    const invalidBuffer = new TextEncoder().encode('not-a-docx').buffer;
    await expect(extractDocxTextFromBuffer(invalidBuffer)).rejects.toThrow(/valid \.docx/i);
  });

  it('extracts text from valid PDF buffers and rejects malformed PDFs', async () => {
    const pdfBuffer = buildMinimalPdfBuffer('Patient: Vikram Kulkarni rahul@example.in');
    const res = await extractPdfTextFromBuffer(pdfBuffer, { disableWorker: true });
    expect(res.text).toContain('Vikram Kulkarni');
    expect(res.text).toContain('rahul@example.in');

    const badPdf = new TextEncoder().encode('not-a-pdf').buffer;
    await expect(extractPdfTextFromBuffer(badPdf, { disableWorker: true })).rejects.toThrow(
      /valid PDF/i
    );
  });
});
