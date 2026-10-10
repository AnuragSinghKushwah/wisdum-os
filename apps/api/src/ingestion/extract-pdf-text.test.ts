import { describe, expect, it } from 'vitest';
import { ValidationError } from '@wisdum/errors';
import { extractPdfText } from './extract-pdf-text.js';

/** Builds a valid PDF with one page per entry; an entry of `null` is a page with no text (like a scan). */
function buildPdf(pages: readonly (string | null)[]): Buffer {
  const objects: string[] = [];
  const kids = pages.map((_, i) => `${3 + i * 2} 0 R`).join(' ');
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  objects.push(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`);
  pages.forEach((text, i) => {
    const contentId = 4 + i * 2;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentId} 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >>`,
    );
    const stream = text === null ? '' : `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`;
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });

  let body = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((object, i) => {
    offsets.push(body.length);
    body += `${i + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefAt = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) body += `${String(offset).padStart(10, '0')} 00000 n \n`;
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
  return Buffer.from(body, 'latin1');
}

describe('extractPdfText', () => {
  it('returns the text of every page, joined cleanly with no page markers', async () => {
    const pdf = buildPdf(['First page about retries', 'Second page about jitter']);

    const text = await extractPdfText(pdf);

    expect(text).toContain('First page about retries');
    expect(text).toContain('Second page about jitter');
    expect(text).not.toMatch(/-- \d+ of \d+ --/);
  });

  it('says a scanned (text-less) PDF needs OCR instead of storing an empty document', async () => {
    const error = await extractPdfText(buildPdf([null])).catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(ValidationError);
    expect((error as Error).message).toContain('No text could be read from this PDF');
  });

  it('rejects a file that is not a PDF with a readable message', async () => {
    const error = await extractPdfText(Buffer.from('definitely not a pdf')).catch(
      (cause: unknown) => cause,
    );

    expect(error).toBeInstanceOf(ValidationError);
    expect((error as Error).message).toContain('could not be read as a PDF');
  });
});
