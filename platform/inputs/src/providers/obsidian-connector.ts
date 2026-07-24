import type { InputConnector, CapturedItem } from '../input-connector.js';

export interface ObsidianConnectorConfig {
  readonly vaultPath: string;
}

/** Obsidian vault input connector stub: captures notes from a local Obsidian vault directory. */
export class ObsidianConnector implements InputConnector {
  readonly capability = 'input.obsidian';

  constructor(private readonly config: ObsidianConnectorConfig) {}

  async capture(): Promise<readonly CapturedItem[]> {
    // Real implementation would read local markdown vault
    // Using mock data for UAT demonstration
    return [
      {
        title: 'Obsidian Note: Knowledge Graph Principles',
        body: 'Every concept in Wisdum represents a node. A co-occurrence of concepts within two knowledge assets creates a concept relationship edge. If edge weight > threshold, we generate insights.',
        mimeType: 'text/markdown',
        sourceUrl: `file://${this.config.vaultPath}/Principles.md`,
      },
    ];
  }
}
