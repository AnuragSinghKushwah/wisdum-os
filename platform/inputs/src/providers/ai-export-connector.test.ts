import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { AiExportConnector } from './ai-export-connector.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('AiExportConnector', () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wisdum-ai-export-test-'));
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('exposes its capability as input.ai-export', () => {
    const connector = new AiExportConnector({ exportDirectory: tempDir });
    expect(connector.capability).toBe('input.ai-export');
  });

  it('correctly parses Claude conversation exports', async () => {
    const claudeExport = [
      {
        uuid: 'claude-uuid-123',
        name: 'React Performance Tips',
        chat_messages: [
          { sender: 'human', text: 'How do I optimize React?' },
          { sender: 'assistant', text: 'Use memoization and virtualize lists.' }
        ]
      }
    ];

    await fs.writeFile(
      path.join(tempDir, 'claude_conversations.json'),
      JSON.stringify(claudeExport),
      'utf-8'
    );

    const connector = new AiExportConnector({ exportDirectory: tempDir });
    const items = await connector.capture();

    // Clean up file for next tests
    await fs.unlink(path.join(tempDir, 'claude_conversations.json'));

    expect(items).toHaveLength(1);
    const item = items[0]!;
    expect(item.title).toBe('AI Chat: React Performance Tips');
    expect(item.mimeType).toBe('text/markdown');
    expect(item.body).toContain('React Performance Tips');
    expect(item.body).toContain('### User:\nHow do I optimize React?');
    expect(item.body).toContain('### Claude:\nUse memoization and virtualize lists.');
  });

  it('correctly parses ChatGPT conversation exports', async () => {
    const chatGptExport = [
      {
        title: 'Dockerizing Node App',
        mapping: {
          'root-id': {
            id: 'root-id',
            parent: null,
            children: ['message-1-id']
          },
          'message-1-id': {
            id: 'message-1-id',
            parent: 'root-id',
            message: {
              author: { role: 'user' },
              content: { parts: ['Write a Dockerfile for NestJS.'] }
            },
            children: ['message-2-id']
          },
          'message-2-id': {
            id: 'message-2-id',
            parent: 'message-1-id',
            message: {
              author: { role: 'assistant' },
              content: { parts: ['FROM node:18-alpine...'] }
            },
            children: []
          }
        }
      }
    ];

    await fs.writeFile(
      path.join(tempDir, 'chatgpt_conversations.json'),
      JSON.stringify(chatGptExport),
      'utf-8'
    );

    const connector = new AiExportConnector({ exportDirectory: tempDir });
    const items = await connector.capture();

    // Clean up file for next tests
    await fs.unlink(path.join(tempDir, 'chatgpt_conversations.json'));

    expect(items).toHaveLength(1);
    const item = items[0]!;
    expect(item.title).toBe('AI Chat: Dockerizing Node App');
    expect(item.mimeType).toBe('text/markdown');
    expect(item.body).toContain('Dockerizing Node App');
    expect(item.body).toContain('### User:\nWrite a Dockerfile for NestJS.');
    expect(item.body).toContain('### ChatGPT:\nFROM node:18-alpine...');
  });
});
