import { createHmac } from 'node:crypto';
import type { PublishingProvider, PublishResult, PublishTarget } from '../publishing-provider.js';

export interface GhostPublishingProviderConfig {
  readonly adminApiUrl: string;
  /** Admin API Key (format: 'id:secret') */
  readonly apiKey: string;
}

/** Ghost publishing provider: publishes drafts directly to Ghost Admin API. */
export class GhostPublishingProvider implements PublishingProvider {
  readonly capability = 'publishing.ghost';

  constructor(private readonly config: GhostPublishingProviderConfig) {}

  async publish(target: PublishTarget): Promise<PublishResult> {
    const [keyId, secret] = this.config.apiKey.split(':');
    if (!keyId || !secret) {
      throw new Error('Invalid Ghost Admin API key format. Expected "id:secret".');
    }

    const token = this.generateJwt(keyId, secret);

    const response = await fetch(`${this.config.adminApiUrl}/ghost/api/admin/posts/?source=html`, {
      method: 'POST',
      headers: {
        Authorization: `Ghost ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        posts: [
          {
            title: target.title,
            html: `<p>${target.body.replace(/\n/g, '<br/>')}</p>`,
            status: 'draft',
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Ghost API error: ${response.status} ${response.statusText}`);
    }

    const body = (await response.json()) as { posts: readonly { url: string; id: string }[] };
    const post = body.posts[0];
    if (!post) {
      throw new Error('Ghost API returned no posts in response.');
    }

    return {
      externalUrl: post.url,
      externalId: post.id,
    };
  }

  private generateJwt(keyId: string, secret: string): string {
    const header = { alg: 'HS256', kid: keyId, typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    // JWT token is valid for 5 minutes
    const payload = {
      iat: now,
      exp: now + 5 * 60,
      aud: '/admin/',
    };

    const headerSegment = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadSegment = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signatureInput = `${headerSegment}.${payloadSegment}`;

    const secretBuffer = Buffer.from(secret, 'hex');
    const signatureSegment = createHmac('sha256', secretBuffer)
      .update(signatureInput)
      .digest('base64url');

    return `${headerSegment}.${payloadSegment}.${signatureSegment}`;
  }
}
