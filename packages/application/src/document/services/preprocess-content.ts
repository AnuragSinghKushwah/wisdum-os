import { ValidationError } from '@wisdum/errors';

export interface PreprocessedContent {
  readonly parsedContent: string;
  readonly mimeType: string;
}

export interface PreprocessDependencies {
  /** Injected in tests; defaults to the global `fetch`. */
  readonly fetch?: typeof fetch;
}

const FETCH_TIMEOUT_MS = 10_000;
const MAX_PAGE_CHARS = 200_000;
const MAX_REDIRECTS = 3;
const READABLE_CONTENT_TYPES = [
  'text/html',
  'application/xhtml+xml',
  'text/plain',
  'text/markdown',
];

/**
 * Prepares incoming content for storage. It changes content only where the
 * input is unambiguous, and never invents any:
 *
 * - a lone web address is fetched and stored as the page's text;
 * - a ChatGPT-style conversation export (JSON) is rendered as Markdown;
 * - everything else, prose and data alike, is stored exactly as given.
 *
 * Anything that cannot be read (a link that fails to load, a YouTube link,
 * a PDF address) is rejected with a message saying what to do instead. The
 * source text is the ground truth every draft is written from, so a stand-in
 * for text that could not be read would quietly poison everything built on it.
 */
export async function preprocessContent(
  content: string,
  mimeType: string,
  dependencies: PreprocessDependencies = {},
): Promise<PreprocessedContent> {
  const trimmed = content.trim();

  if (isSingleUrl(trimmed)) {
    if (isYouTubeUrl(trimmed)) {
      throw new ValidationError(
        'YouTube links are not turned into transcripts automatically yet. Paste the transcript text instead.',
        { url: trimmed },
      );
    }
    return readWebPage(trimmed, dependencies.fetch ?? fetch);
  }

  const conversation = renderConversationExport(trimmed);
  if (conversation !== undefined) {
    return { parsedContent: conversation, mimeType: 'text/markdown' };
  }

  return { parsedContent: content, mimeType };
}

function isSingleUrl(text: string): boolean {
  return /^https?:\/\/\S+$/i.test(text) && URL.canParse(text);
}

function isYouTubeUrl(url: string): boolean {
  const host = new URL(url).hostname.toLowerCase();
  return host === 'youtu.be' || host === 'youtube.com' || host.endsWith('.youtube.com');
}

function renderConversationExport(text: string): string | undefined {
  if (!text.startsWith('[') && !text.startsWith('{')) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (Array.isArray(parsed) && parsed.length > 0 && isChatMessage(parsed[0])) {
    const log = (parsed as readonly { role: string; content: string }[])
      .map((message) => `**${message.role.toUpperCase()}**: ${message.content}`)
      .join('\n\n');
    return `# GPT Conversation Thread\n\n${log}`;
  }
  if (typeof parsed === 'object' && parsed !== null) {
    const { prompt, response } = parsed as { prompt?: unknown; response?: unknown };
    if (typeof prompt === 'string' && typeof response === 'string') {
      return `# GPT Conversation Thread\n\n**USER**: ${prompt}\n\n**ASSISTANT**: ${response}`;
    }
  }
  return undefined;
}

function isChatMessage(value: unknown): value is { role: string; content: string } {
  if (typeof value !== 'object' || value === null) return false;
  const message = value as { role?: unknown; content?: unknown };
  return typeof message.role === 'string' && typeof message.content === 'string';
}

async function readWebPage(url: string, fetchPage: typeof fetch): Promise<PreprocessedContent> {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    assertPublicHost(new URL(current).hostname);

    let response: Response;
    try {
      response = await fetchPage(current, {
        redirect: 'manual',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; WisdumBot/1.0)',
          accept: 'text/html,text/plain;q=0.9',
        },
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'the request failed';
      throw new ValidationError(`Could not read ${url}: ${reason}. Paste the text instead.`, {
        url,
      });
    }

    const location = response.headers.get('location');
    if (response.status >= 300 && response.status < 400 && location !== null) {
      current = new URL(location, current).toString();
      continue;
    }
    if (!response.ok) {
      throw new ValidationError(
        `Could not read ${url}: the server answered ${response.status}. Paste the text instead.`,
        { url, status: response.status },
      );
    }

    const contentType =
      (response.headers.get('content-type') ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
    if (!READABLE_CONTENT_TYPES.includes(contentType)) {
      throw new ValidationError(
        `${url} is ${contentType === '' ? 'not a web page' : `a ${contentType} file, not a web page`}. ` +
          'Upload the file instead.',
        { url, contentType },
      );
    }

    const raw = await response.text();
    const { title, body } =
      contentType === 'text/plain' || contentType === 'text/markdown'
        ? { title: url, body: raw.trim() }
        : htmlToText(raw, url);
    if (body.length === 0) {
      throw new ValidationError(`No readable text was found at ${url}. Paste the text instead.`, {
        url,
      });
    }
    return {
      parsedContent: `# ${title}\nSource: ${url}\n\n${body.slice(0, MAX_PAGE_CHARS)}`,
      mimeType: 'text/markdown',
    };
  }
  throw new ValidationError(`${url} redirected too many times.`, { url });
}

function htmlToText(html: string, fallbackTitle: string): { title: string; body: string } {
  const rawTitle = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];
  const title =
    rawTitle !== undefined && rawTitle.trim().length > 0
      ? decodeEntities(rawTitle.trim())
      : fallbackTitle;
  const body = decodeEntities(
    html
      .replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(
        /<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi,
        (_match, level: string, text: string) => `\n${'#'.repeat(Number(level))} ${text}\n`,
      )
      .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1')
      .replace(/<\/(p|div|section|article|tr)>|<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return { title, body };
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/**
 * Refuses addresses on the local machine or a private network, so a pasted
 * link cannot be used to make the server read its own internal services. This
 * checks the address as written; it does not resolve DNS, so a public name
 * that points at a private address is not caught here.
 */
function assertPublicHost(hostname: string): void {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const blockedName =
    host === 'localhost' ||
    ['.localhost', '.local', '.internal', '.lan'].some((s) => host.endsWith(s));
  if (blockedName || isPrivateIpv4(host) || isPrivateIpv6(host)) {
    throw new ValidationError(
      'That address points at a private or local network, which Wisdum will not fetch.',
      {
        host,
      },
    );
  }
}

function isPrivateIpv4(host: string): boolean {
  const parts = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host)?.slice(1).map(Number);
  if (parts === undefined) return false;
  const [a = 0, b = 0] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function isPrivateIpv6(host: string): boolean {
  if (!host.includes(':')) return false;
  return (
    host === '::' ||
    host === '::1' ||
    /^f[cd]/.test(host) ||
    /^fe[89ab]/.test(host) ||
    host.startsWith('::ffff:')
  );
}
