import { describe, expect, it, vi } from 'vitest';
import { ValidationError } from '@wisdum/errors';
import { preprocessContent } from './preprocess-content.js';

const PROSE =
  'Retrying without backoff turns a small outage into a large one, and every client does the same.\n\n' +
  'Three habits fix most of it. First, back off, then add jitter, then cap the attempts.';

function page(html: string, init: ResponseInit = {}): Response {
  return new Response(html, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
    ...init,
  });
}

function fetchReturning(...responses: Response[]): typeof fetch {
  const queue = [...responses];
  return vi.fn(() => {
    const next = queue.shift();
    if (next === undefined) throw new Error('unexpected extra request');
    return Promise.resolve(next);
  }) as unknown as typeof fetch;
}

describe('preprocessContent: text is stored exactly as given', () => {
  it('leaves prose with commas untouched (it is not a CSV table)', async () => {
    const result = await preprocessContent(PROSE, 'text/plain');

    expect(result).toEqual({ parsedContent: PROSE, mimeType: 'text/plain' });
  });

  it('leaves real CSV untouched too, so quoted commas survive', async () => {
    const csv = 'name,note\n"Smith, Jo","likes, commas"\n';

    const result = await preprocessContent(csv, 'text/csv');

    expect(result.parsedContent).toBe(csv);
  });

  it('leaves prose that merely mentions a link untouched', async () => {
    const text = 'See https://example.com/post for the longer write-up, which covers backoff.';

    const result = await preprocessContent(text, 'text/plain');

    expect(result.parsedContent).toBe(text);
  });

  it('renders a ChatGPT-style export as Markdown', async () => {
    const thread = JSON.stringify([
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there' },
    ]);

    const result = await preprocessContent(thread, 'text/plain');

    expect(result.mimeType).toBe('text/markdown');
    expect(result.parsedContent).toBe(
      '# GPT Conversation Thread\n\n**USER**: Hello\n\n**ASSISTANT**: Hi there',
    );
  });

  it('leaves other JSON alone', async () => {
    const json = '{"a": 1, "b": [1, 2]}';

    expect((await preprocessContent(json, 'application/json')).parsedContent).toBe(json);
  });
});

describe('preprocessContent: a lone web address', () => {
  it('stores the whole page text, not a truncated excerpt', async () => {
    const paragraph = 'A sentence that is part of a real article. '.repeat(100);
    const html = `<html><head><title>Backoff &amp; jitter</title></head><body><h1>Intro</h1><p>${paragraph}</p></body></html>`;

    const result = await preprocessContent('https://example.com/post', 'text/plain', {
      fetch: fetchReturning(page(html)),
    });

    expect(result.mimeType).toBe('text/markdown');
    expect(
      result.parsedContent.startsWith('# Backoff & jitter\nSource: https://example.com/post'),
    ).toBe(true);
    expect(result.parsedContent).toContain('# Intro');
    expect(result.parsedContent.length).toBeGreaterThan(4000);
    expect(result.parsedContent).toContain(paragraph.trim());
  });

  it('follows a redirect to another public page', async () => {
    const redirect = new Response(null, {
      status: 301,
      headers: { location: 'https://www.example.com/post' },
    });

    const result = await preprocessContent('https://example.com/post', 'text/plain', {
      fetch: fetchReturning(redirect, page('<title>T</title><p>Body text</p>')),
    });

    expect(result.parsedContent).toContain('Body text');
  });

  it('never invents text when the page cannot be read', async () => {
    const down = vi.fn(() => Promise.reject(new Error('fetch failed'))) as unknown as typeof fetch;
    const error = await preprocessContent('https://example.com/x', 'text/plain', {
      fetch: down,
    }).catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(ValidationError);
    expect((error as Error).message).toContain('Could not read https://example.com/x');
    expect((error as Error).message).toContain('Paste the text instead');
  });

  it('rejects an error status instead of storing a stand-in', async () => {
    const error = await preprocessContent('https://example.com/x', 'text/plain', {
      fetch: fetchReturning(page('nope', { status: 404 })),
    }).catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(ValidationError);
    expect((error as Error).message).toContain('404');
  });

  it('rejects a PDF address and says to upload the file', async () => {
    const pdf = new Response('%PDF-1.7', {
      status: 200,
      headers: { 'content-type': 'application/pdf' },
    });

    const error = await preprocessContent('https://example.com/a.pdf', 'text/plain', {
      fetch: fetchReturning(pdf),
    }).catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(ValidationError);
    expect((error as Error).message).toContain('Upload the file instead');
  });

  it('rejects a page with no readable text', async () => {
    await expect(
      preprocessContent('https://example.com/empty', 'text/plain', {
        fetch: fetchReturning(page('<html><body><script>1</script></body></html>')),
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('refuses YouTube links rather than fabricating a transcript', async () => {
    const fetchSpy = vi.fn();

    for (const url of ['https://www.youtube.com/watch?v=abc123', 'https://youtu.be/abc123']) {
      const error = await preprocessContent(url, 'text/plain', {
        fetch: fetchSpy as unknown as typeof fetch,
      }).catch((cause: unknown) => cause);
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as Error).message).toContain('Paste the transcript text instead');
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('preprocessContent: private addresses are never fetched', () => {
  const blocked = [
    'http://localhost:3001/health',
    'http://127.0.0.1/',
    'http://10.0.0.5/admin',
    'http://172.16.0.1/',
    'http://192.168.1.1/',
    'http://169.254.169.254/latest/meta-data/',
    'http://[::1]/',
    'http://printer.local/',
    'http://db.internal/',
  ];

  it.each(blocked)('rejects %s without making a request', async (url) => {
    const fetchSpy = vi.fn();

    await expect(
      preprocessContent(url, 'text/plain', { fetch: fetchSpy as unknown as typeof fetch }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects a public address that redirects to a private one', async () => {
    const redirect = new Response(null, {
      status: 302,
      headers: { location: 'http://169.254.169.254/' },
    });
    const fetchPage = fetchReturning(redirect);

    await expect(
      preprocessContent('https://example.com/go', 'text/plain', { fetch: fetchPage }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('gives up after too many redirects', async () => {
    const loop = (): Response =>
      new Response(null, { status: 302, headers: { location: 'https://example.com/again' } });

    await expect(
      preprocessContent('https://example.com/go', 'text/plain', {
        fetch: fetchReturning(loop(), loop(), loop(), loop(), loop()),
      }),
    ).rejects.toThrow('redirected too many times');
  });
});
