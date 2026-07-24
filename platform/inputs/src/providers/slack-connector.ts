import type { InputConnector, CapturedItem } from '../input-connector.js';

export interface SlackConnectorConfig {
  readonly botToken: string;
  readonly channelId: string;
}

/** Slack input connector stub: captures threaded messages from a specific Slack channel. */
export class SlackConnector implements InputConnector {
  readonly capability = 'input.slack';

  constructor(private readonly config: SlackConnectorConfig) {}

  async capture(): Promise<readonly CapturedItem[]> {
    // Real implementation would fetch history from slack channel
    // Using fake mock data for UAT demonstration
    return [
      {
        title: 'Slack Thread: Wisdum Deployment Architecture',
        body: 'Discussion on deployment topology: we decided on sharding PostgreSQL databases by tenant ID using pgvector for the local indexes and a single coordinator. Redis will manage background task locks.',
        mimeType: 'text/plain',
        sourceUrl: `https://slack.com/archives/${this.config.channelId}/p123456789`,
      },
    ];
  }
}
