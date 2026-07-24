import { describe, expect, it } from 'vitest';
import { EmailConnector } from './email-connector.js';

describe('EmailConnector', () => {
  it('exposes its capability as input.email', () => {
    const connector = new EmailConnector({});
    expect(connector.capability).toBe('input.email');
  });

  it('captures email items correctly', async () => {
    const connector = new EmailConnector({ username: 'test-user' });
    const items = await connector.capture();

    expect(items).toHaveLength(1);
    const item = items[0]!;
    expect(item.title).toBe('Email: Feedback on AI Orchestration Design');
    expect(item.mimeType).toBe('text/markdown');
    expect(item.sourceUrl).toBe('mailto:test-user@gmail.com');
    expect(item.body).toContain('Feedback on AI Orchestration Design');
  });
});
