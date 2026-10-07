import { describe, expect, it } from 'vitest';
import { YouTubeTranscriptConnector } from './youtube-transcript-connector.js';
import { WebScraperConnector } from './web-scraper-connector.js';

describe('YouTubeTranscriptConnector', () => {
  it('extracts video ID and returns captured items with capability input.youtube-transcript', async () => {
    const connector = new YouTubeTranscriptConnector({ videoUrl: 'https://youtube.com/watch?v=dQw4w9WgXcQ' });
    expect(connector.capability).toBe('input.youtube-transcript');

    const items = await connector.capture();
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]?.sourceUrl).toBe('https://youtube.com/watch?v=dQw4w9WgXcQ');
  });
});

describe('WebScraperConnector', () => {
  it('captures webpage content with capability input.web-scraper', async () => {
    const connector = new WebScraperConnector({ url: 'https://example.com/article' });
    expect(connector.capability).toBe('input.web-scraper');

    const items = await connector.capture();
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]?.mimeType).toBe('text/markdown');
  });
});
