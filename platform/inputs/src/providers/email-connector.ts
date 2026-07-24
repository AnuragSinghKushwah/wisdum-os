import type { InputConnector, CapturedItem } from '../input-connector.js';

export interface EmailConnectorConfig {
  readonly imapHost?: string;
  readonly imapPort?: number;
  readonly username?: string;
  readonly password?: string;
  readonly useOAuth?: boolean;
  readonly oauthToken?: string;
}

/**
 * Email (IMAP/OAuth) sync connector: retrieves emails from a configured inbox
 * and registers them as knowledge items.
 */
export class EmailConnector implements InputConnector {
  readonly capability = 'input.email';

  constructor(private readonly config: EmailConnectorConfig) {}

  async capture(): Promise<readonly CapturedItem[]> {
    // Real implementation would connect via imap-simple or node-imap.
    // Using structured mock email data for UAT/development flow.
    return [
      {
        title: 'Email: Feedback on AI Orchestration Design',
        body: [
          'From: sarah.developer@example.com',
          'Date: Mon, 20 Jul 2026 12:00:00 GMT',
          'Subject: Feedback on AI Orchestration Design',
          '',
          'Hey Wisdum Team,',
          '',
          'I reviewed the new event-driven architecture specifications. The concept mapping is solid.',
          'We should make sure that the confidence scores are calculated dynamically based on co-occurrence counts.',
          '',
          'Best,',
          'Sarah',
        ].join('\n'),
        mimeType: 'text/markdown',
        sourceUrl: `mailto:${this.config.username || 'inbox'}@gmail.com`,
      },
    ];
  }
}
