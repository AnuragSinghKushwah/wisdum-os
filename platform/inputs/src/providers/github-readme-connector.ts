import type { CapturedItem, InputConnector } from '../input-connector.js';
import type { GitHubClient } from './github-client.js';

/** Captures the README of each configured `owner/repo` as one item per repo. */
export class GitHubReadmeConnector implements InputConnector {
  readonly capability = 'input.github-readme';

  constructor(
    private readonly client: GitHubClient,
    private readonly repositories: readonly string[],
  ) {}

  async capture(): Promise<readonly CapturedItem[]> {
    const items: CapturedItem[] = [];
    for (const fullName of this.repositories) {
      const [owner, repo] = fullName.split('/');
      if (owner === undefined || repo === undefined) continue;
      const readme = await this.client.getReadme(owner, repo);
      if (readme === undefined) continue;
      items.push({
        title: `${fullName} — README`,
        body: readme.content,
        mimeType: 'text/markdown',
        sourceUrl: readme.htmlUrl,
      });
    }
    return items;
  }
}
