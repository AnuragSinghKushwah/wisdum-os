import type { CapturedItem, InputConnector } from '../input-connector.js';
import type { GitHubClient } from './github-client.js';

/** Captures recent commit activity of configured `owner/repo` repositories as Knowledge items. */
export class GitHubRepoConnector implements InputConnector {
  readonly capability = 'input.github-repo';

  constructor(
    private readonly client: GitHubClient,
    private readonly repositories: readonly string[],
    private readonly maxCommitsPerRepo = 10,
  ) {}

  async capture(): Promise<readonly CapturedItem[]> {
    const items: CapturedItem[] = [];
    for (const fullName of this.repositories) {
      const [owner, repo] = fullName.split('/');
      if (owner === undefined || repo === undefined) continue;
      const commits = await this.client.getRecentCommits(owner, repo, this.maxCommitsPerRepo);
      if (commits.length === 0) continue;

      const commitSummaries = commits
        .map((c) => `- [${c.sha.substring(0, 7)}] ${c.message.split('\n')[0]} (${c.authorName})`)
        .join('\n');

      items.push({
        title: `${fullName} — Recent Repository Commits`,
        body: `# Recent Commits for ${fullName}\n\n${commitSummaries}`,
        mimeType: 'text/markdown',
        sourceUrl: `https://github.com/${fullName}/commits`,
      });
    }
    return items;
  }
}
