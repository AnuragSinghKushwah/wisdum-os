import { ValidationError } from '@wisdum/errors';
import { PDFParse } from 'pdf-parse';

/**
 * Reads the text of a PDF, page by page, joined with blank lines.
 *
 * Throws a `ValidationError` that says what to do when the file is not a
 * readable PDF, is password-protected, or has no text layer (a scan), so the
 * caller never stores an empty or invented document as someone's source.
 */
export async function extractPdfText(data: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(data) });
  try {
    const result = await parser.getText();
    const text = result.pages
      .map((page) => page.text.trim())
      .filter((page) => page.length > 0)
      .join('\n\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    if (text.length === 0) {
      throw new ValidationError(
        'No text could be read from this PDF. It may be a scan; run it through OCR, or paste the text instead.',
      );
    }
    return text;
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    const name = error instanceof Error ? error.name : '';
    if (name === 'PasswordException') {
      throw new ValidationError(
        'This PDF is password-protected. Remove the password and upload it again.',
      );
    }
    throw new ValidationError(
      'This file could not be read as a PDF. Check that it is not corrupted.',
      {
        reason: error instanceof Error ? error.message : String(error),
      },
    );
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}
