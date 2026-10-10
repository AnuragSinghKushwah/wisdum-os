import { describe, expect, it } from 'vitest';
import { YouTubeTranscriptConnector } from './youtube-transcript-connector.js';
import { WebScraperConnector } from './web-scraper-connector.js';

/** Answers each URL from a fixed table; any other URL fails the test. */
function fetchFrom(table: Record<string, Response | Error>): typeof fetch {
  return ((input: string | URL | Request) => {
    const url =
      typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const answer = table[url];
    if (answer === undefined) return Promise.reject(new Error(`unexpected request to ${url}`));
    return answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer);
  }) as typeof fetch;
}

const VIDEO = 'https://youtube.com/watch?v=dQw4w9WgXcQ';
const WATCH_PAGE = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const CAPTIONS = 'https://captions.example/track';

function watchPage(withCaptions: boolean): Response {
  const tracks = withCaptions
    ? `"captionTracks":[{"baseUrl":"${CAPTIONS}"}]`
    : '"captionTracks":[]';
  return new Response(
    `<html><title>Backoff explained - YouTube</title><script>{${tracks}}</script></html>`,
  );
}

describe('YouTubeTranscriptConnector', () => {
  it('captures the real captions as timestamped lines', async () => {
    const xml =
      '<transcript><text start="0.5" dur="2">Retries need backoff</text>' +
      '<text start="65.2" dur="3">Fish &amp; chips &quot;quoted&quot;</text></transcript>';
    const connector = new YouTubeTranscriptConnector({
      videoUrl: VIDEO,
      fetch: fetchFrom({ [WATCH_PAGE]: watchPage(true), [CAPTIONS]: new Response(xml) }),
    });

    expect(connector.capability).toBe('input.youtube-transcript');
    const items = await connector.capture();

    expect(items).toHaveLength(1);
    expect(items[0]?.title).toBe('Backoff explained');
    expect(items[0]?.sourceUrl).toBe(VIDEO);
    expect(items[0]?.body).toBe('[00:00] Retries need backoff\n[01:05] Fish & chips "quoted"');
  });

  it('fails, rather than inventing a transcript, when the video has no captions', async () => {
    const connector = new YouTubeTranscriptConnector({
      videoUrl: VIDEO,
      fetch: fetchFrom({ [WATCH_PAGE]: watchPage(false) }),
    });

    await expect(connector.capture()).rejects.toThrow('No captions were found');
  });

  it('fails with the reason when YouTube cannot be reached', async () => {
    const connector = new YouTubeTranscriptConnector({
      videoUrl: VIDEO,
      fetch: fetchFrom({ [WATCH_PAGE]: new Error('network down') }),
    });

    await expect(connector.capture()).rejects.toThrow('network down');
  });

  it('rejects an address that is not a video instead of guessing an id', async () => {
    const connector = new YouTubeTranscriptConnector({
      videoUrl: 'https://youtube.com/@somechannel',
      fetch: fetchFrom({}),
    });

    await expect(connector.capture()).rejects.toThrow('not a YouTube video address');
  });
});

describe('WebScraperConnector', () => {
  const URL_UNDER_TEST = 'https://example.com/article';

  it('captures the page as Markdown', async () => {
    const html = '<title>An article</title><h1>Heading</h1><p>First paragraph.</p><li>An item</li>';
    const connector = new WebScraperConnector({
      url: URL_UNDER_TEST,
      fetch: fetchFrom({ [URL_UNDER_TEST]: new Response(html) }),
    });

    expect(connector.capability).toBe('input.web-scraper');
    const items = await connector.capture();

    expect(items).toHaveLength(1);
    expect(items[0]?.title).toBe('An article');
    expect(items[0]?.mimeType).toBe('text/markdown');
    expect(items[0]?.body).toContain('# Heading');
    expect(items[0]?.body).toContain('First paragraph.');
  });

  it('keeps a short page as it is, without padding it with placeholder text', async () => {
    const connector = new WebScraperConnector({
      url: URL_UNDER_TEST,
      fetch: fetchFrom({ [URL_UNDER_TEST]: new Response('<title>T</title><p>Hi</p>') }),
    });

    const items = await connector.capture();

    expect(items[0]?.body).toBe('Hi');
  });

  it('captures nothing from a page with no text', async () => {
    const connector = new WebScraperConnector({
      url: URL_UNDER_TEST,
      fetch: fetchFrom({ [URL_UNDER_TEST]: new Response('<title>T</title><script>x</script>') }),
    });

    expect(await connector.capture()).toEqual([]);
  });

  it('fails with the reason instead of fabricating an article when the page cannot be read', async () => {
    const down = new WebScraperConnector({
      url: URL_UNDER_TEST,
      fetch: fetchFrom({ [URL_UNDER_TEST]: new Error('connection reset') }),
    });
    const missing = new WebScraperConnector({
      url: URL_UNDER_TEST,
      fetch: fetchFrom({ [URL_UNDER_TEST]: new Response('gone', { status: 404 }) }),
    });

    await expect(down.capture()).rejects.toThrow('connection reset');
    await expect(missing.capture()).rejects.toThrow('the server answered 404');
  });
});
