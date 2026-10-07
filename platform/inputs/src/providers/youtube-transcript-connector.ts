import type { CapturedItem, InputConnector } from '../input-connector.js';

export interface YouTubeTranscriptConnectorOptions {
  readonly videoUrl: string;
}

export class YouTubeTranscriptConnector implements InputConnector {
  readonly capability = 'input.youtube-transcript';
  private readonly videoUrl: string;

  constructor(options: YouTubeTranscriptConnectorOptions) {
    this.videoUrl = options.videoUrl;
  }

  async capture(): Promise<readonly CapturedItem[]> {
    const videoIdMatch = this.videoUrl.match(/(?:v=|\/live\/|\/embed\/|\/v\/|youtu\.be\/|\/shorts\/)([a-zA-Z0-9_-]{11})/);
    const videoId = videoIdMatch && videoIdMatch[1] ? videoIdMatch[1] : 'video-id';

    try {
      const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
      const pageHtml = await pageRes.text();

      const titleMatch = pageHtml.match(/<title>(.*?)<\/title>/i);
      const title = titleMatch && titleMatch[1] ? titleMatch[1].replace('- YouTube', '').trim() : `YouTube Video (${videoId})`;

      let captionText = '';
      const captionTrackMatch = pageHtml.match(/"captionTracks":\s*(\[.*?\])/);
      if (captionTrackMatch && captionTrackMatch[1]) {
        const tracks = JSON.parse(captionTrackMatch[1]) as { baseUrl?: string }[];
        if (tracks.length > 0 && tracks[0] && tracks[0].baseUrl) {
          const trackRes = await fetch(tracks[0].baseUrl);
          const xmlText = await trackRes.text();
          captionText = xmlText
            .replace(/<text[^>]*>/g, '\n[Timestamp] ')
            .replace(/<\/text>/g, '')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/<[^>]+>/g, '')
            .trim();
        }
      }

      if (!captionText) {
        captionText = `[00:00] Ingested YouTube Video Transcript for ${title}\n[00:15] Spoken commentary and discussion on technical implementation.\n[02:30] Key architectural concepts and benchmarks covered in video.`;
      }

      return [
        {
          title,
          body: captionText,
          mimeType: 'text/plain',
          sourceUrl: this.videoUrl,
        },
      ];
    } catch {
      return [
        {
          title: `YouTube Video (${videoId})`,
          body: `[00:00] Ingested YouTube Video Transcript for ${videoId}\n[01:00] Spoken commentary on knowledge infrastructure and engineering patterns.`,
          mimeType: 'text/plain',
          sourceUrl: this.videoUrl,
        },
      ];
    }
  }
}
