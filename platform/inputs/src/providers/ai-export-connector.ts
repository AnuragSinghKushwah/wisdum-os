import type { CapturedItem, InputConnector } from '../input-connector.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface AiExportConnectorConfig {
  readonly exportDirectory: string;
}

export class AiExportConnector implements InputConnector {
  readonly capability = 'input.ai-export';

  constructor(private readonly config: AiExportConnectorConfig) {}

  async capture(): Promise<readonly CapturedItem[]> {
    const items: CapturedItem[] = [];

    try {
      const stats = await fs.stat(this.config.exportDirectory);
      if (!stats.isDirectory()) {
        return [];
      }
    } catch {
      // Directory doesn't exist or is not readable
      return [];
    }

    const files = await fs.readdir(this.config.exportDirectory);
    for (const file of files) {
      if (!file.endsWith('.json')) {
        continue;
      }

      const filePath = path.join(this.config.exportDirectory, file);
      try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const parsed = JSON.parse(fileContent);
        const arrayToProcess = Array.isArray(parsed) ? parsed : [parsed];

        for (const entry of arrayToProcess) {
          if (isClaudeConversation(entry)) {
            const item = parseClaudeConversation(entry, filePath);
            if (item !== undefined) {
              items.push(item);
            }
          } else if (isChatGptConversation(entry)) {
            const item = parseChatGptConversation(entry, filePath);
            if (item !== undefined) {
              items.push(item);
            }
          }
        }
      } catch (err) {
        // Skip malformed file
        continue;
      }
    }

    return items;
  }
}

function isClaudeConversation(entry: any): boolean {
  return (
    entry !== null &&
    typeof entry === 'object' &&
    typeof entry.uuid === 'string' &&
    Array.isArray(entry.chat_messages)
  );
}

function parseClaudeConversation(entry: any, filePath: string): CapturedItem | undefined {
  const title = entry.name || `Claude Chat (${entry.uuid.slice(0, 8)})`;

  const transcriptLines: string[] = [];
  transcriptLines.push(`# ${title}`);
  transcriptLines.push(`*Source: Claude Conversation Export*`);
  transcriptLines.push('');

  for (const msg of entry.chat_messages) {
    if (msg.sender === 'human') {
      transcriptLines.push(`### User:\n${msg.text}\n`);
    } else if (msg.sender === 'assistant') {
      transcriptLines.push(`### Claude:\n${msg.text}\n`);
    }
  }

  return {
    title: `AI Chat: ${title}`,
    body: transcriptLines.join('\n'),
    mimeType: 'text/markdown',
    sourceUrl: `file://${filePath}#${entry.uuid}`,
  };
}

function isChatGptConversation(entry: any): boolean {
  return (
    entry !== null &&
    typeof entry === 'object' &&
    typeof entry.title === 'string' &&
    entry.mapping !== null &&
    typeof entry.mapping === 'object'
  );
}

function parseChatGptConversation(entry: any, filePath: string): CapturedItem | undefined {
  const title = entry.title || 'ChatGPT Chat';

  const mapping = entry.mapping;
  const nodes = Object.values(mapping) as any[];

  const rootNode = nodes.find((node) => !node.parent);
  if (!rootNode) return undefined;

  const messageSequence: any[] = [];
  let currentNode = rootNode;

  while (currentNode) {
    if (currentNode.message) {
      messageSequence.push(currentNode.message);
    }

    const children = currentNode.children || [];
    if (children.length === 0) {
      break;
    }

    const nextId = children[children.length - 1]; // take the latest child in case of edits/branches
    currentNode = mapping[nextId];
  }

  const transcriptLines: string[] = [];
  transcriptLines.push(`# ${title}`);
  transcriptLines.push(`*Source: ChatGPT Conversation Export*`);
  transcriptLines.push('');

  for (const msg of messageSequence) {
    const role = msg.author?.role;
    const parts = msg.content?.parts;
    if (!role || !parts || !Array.isArray(parts)) continue;

    const text = parts
      .map((p: any) => (typeof p === 'string' ? p : JSON.stringify(p)))
      .join('\n')
      .trim();
    if (text.length === 0) continue;

    if (role === 'user') {
      transcriptLines.push(`### User:\n${text}\n`);
    } else if (role === 'assistant') {
      transcriptLines.push(`### ChatGPT:\n${text}\n`);
    } else if (role === 'system') {
      transcriptLines.push(`*System: ${text}*\n`);
    }
  }

  return {
    title: `AI Chat: ${title}`,
    body: transcriptLines.join('\n'),
    mimeType: 'text/markdown',
    sourceUrl: `file://${filePath}#${entry.id || 'chatgpt'}`,
  };
}
