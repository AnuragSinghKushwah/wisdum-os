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
      } catch {
        // Skip malformed file
        continue;
      }
    }

    return items;
  }
}

function isClaudeConversation(entry: unknown): entry is { uuid: string; chat_messages: { sender?: string; text?: string; content?: { parts?: unknown[] }; author?: { role?: string } }[]; name?: string } {
  return (
    entry !== null &&
    typeof entry === 'object' &&
    'uuid' in entry && typeof (entry as Record<string, unknown>).uuid === 'string' &&
    'chat_messages' in entry && Array.isArray((entry as Record<string, unknown>).chat_messages)
  );
}

function parseClaudeConversation(entry: { uuid: string; chat_messages: { sender?: string; text?: string; content?: { parts?: unknown[] }; author?: { role?: string } }[]; name?: string }, filePath: string): CapturedItem | undefined {
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

function isChatGptConversation(entry: unknown): entry is { title?: string; mapping: Record<string, { parent?: string; message?: { author?: { role?: string }; content?: { parts?: unknown[] } }; children?: string[] }>; id?: string } {
  return (
    entry !== null &&
    typeof entry === 'object' &&
    'title' in entry && typeof (entry as Record<string, unknown>).title === 'string' &&
    'mapping' in entry && (entry as Record<string, unknown>).mapping !== null &&
    typeof (entry as Record<string, unknown>).mapping === 'object'
  );
}

function parseChatGptConversation(entry: { title?: string; mapping: Record<string, { parent?: string; message?: { author?: { role?: string }; content?: { parts?: unknown[] } }; children?: string[] }>; id?: string }, filePath: string): CapturedItem | undefined {
  const title = entry.title || 'ChatGPT Chat';

  const mapping = entry.mapping;
  const nodes = Object.values(mapping);

  const rootNode = nodes.find((node) => !node.parent);
  if (!rootNode) return undefined;

  const messageSequence: { author?: { role?: string }; content?: { parts?: unknown[] } }[] = [];
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
    currentNode = mapping[nextId as string] as typeof currentNode;
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
      .map((p: unknown) => (typeof p === 'string' ? p : JSON.stringify(p)))
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
