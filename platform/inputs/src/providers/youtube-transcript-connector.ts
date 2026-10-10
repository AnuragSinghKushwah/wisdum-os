import type { CapturedItem, InputConnector } from '../input-connector.js';

export interface YouTubeTranscriptConnectorOptions {
  readonly videoUrl: string;
  /** Injected in tests; defaults to the global `fetch`. */
  readonly fetch?: typeof fetch;
}

/**
 * Captures a YouTube video's own captions as timestamped lines. When the
 * video has no captions, or they cannot be fetched, it fails with the reason;
 * it never writes a stand-in transcript, because the transcript becomes
 * source material that drafts are written from.
 */
export class YouTubeTranscriptConnector implements InputConnector {
  readonly capability = 'input.youtube-transcript';
  private readonly videoUrl: string;
  private readonly fetchPage: typeof fetch;

  constructor(options: YouTubeTranscriptConnectorOptions) {
    this.videoUrl = options.videoUrl;
    this.fetchPage = options.fetch ?? fetch;
  }

  async capture(): Promise<readonly CapturedItem[]> {
    const videoIdMatch = this.videoUrl.match(
      /(?:v=|\/live\/|\/embed\/|\/v\/|youtu\.be\/|\/shorts\/)([a-zA-Z0-9_-]{11})/,
    );
    const videoId = videoIdMatch?.[1];
    if (videoId === undefined) {
      throw new Error(`${this.videoUrl} is not a YouTube video address`);
    }

    const pageHtml = await this.read(`https://www.youtube.com/watch?v=${videoId}`);
    const titleMatch = pageHtml.match(/<title>(.*?)<\/title>/i);
    const title =
      titleMatch && titleMatch[1]
        ? titleMatch[1].replace('- YouTube', '').trim()
        : `YouTube Video (${videoId})`;

    const baseUrl = captionTrackUrl(pageHtml);
    if (baseUrl === undefined) {
      throw new Error(
        `No captions were found for "${title}", so there is no transcript to capture`,
      );
    }

    const transcript = captionsToTranscript(await this.read(baseUrl));
    if (transcript.length === 0) {
      throw new Error(`The captions for "${title}" were empty`);
    }
    return [{ title, body: transcript, mimeType: 'text/plain', sourceUrl: this.videoUrl }];
  }

  private async read(url: string): Promise<string> {
    let response: Response;
    try {
      response = await this.fetchPage(url);
    } catch (error) {
      throw new Error(
        `Could not read ${url}: ${error instanceof Error ? error.message : 'the request failed'}`,
      );
    }
    if (!response.ok) {
      throw new Error(`Could not read ${url}: the server answered ${response.status}`);
    }
    return response.text();
  }
}

function captionTrackUrl(pageHtml: string): string | undefined {
  const match = pageHtml.match(/"captionTracks":\s*(\[.*?\])/);
  if (match?.[1] === undefined) return undefined;
  try {
    const tracks = JSON.parse(match[1]) as { baseUrl?: string }[];
    return tracks[0]?.baseUrl;
  } catch {
    return undefined;
  }
}

/** Turns YouTube's caption XML into `[mm:ss] text` lines. */
function captionsToTranscript(xml: string): string {
  const lines: string[] = [];
  for (const match of xml.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)) {
    const start = Number(/start="([\d.]+)"/.exec(match[1] ?? '')?.[1] ?? Number.NaN);
    const text = decodeEntities((match[2] ?? '').replace(/<[^>]+>/g, '')).trim();
    if (text.length === 0) continue;
    lines.push(Number.isNaN(start) ? text : `[${formatTime(start)}] ${text}`);
  }
  return lines.join('\n');
}

function formatTime(seconds: number): string {
  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  return `${String(minutes).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}
