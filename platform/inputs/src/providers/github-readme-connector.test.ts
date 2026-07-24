import { describe, expect, it } from 'vitest';
import type { GitHubClient, GitHubReadme } from './github-client.js';
import { GitHubReadmeConnector } from './github-readme-connector.js';

class FakeGitHubClient implements GitHubClient {
  constructor(private readonly readmes: ReadonlyMap<string, GitHubReadme>) {}
  getReadme(owner: string, repo: string): Promise<GitHubReadme | undefined> {
    return Promise.resolve(this.readmes.get(`${owner}/${repo}`));
  }
  getRecentCommits(): Promise<readonly []> {
    return Promise.resolve([]);
  }
}

describe('GitHubReadmeConnector', () => {
  it('captures a README for each configured repo, skipping repos with no README (404)', async () => {
    const client = new FakeGitHubClient(
      new Map([
        ['acme/has-readme', { content: '# Hello', htmlUrl: 'https://github.com/acme/has-readme' }],
      ]),
    );
    const connector = new GitHubReadmeConnector(client, ['acme/has-readme', 'acme/no-readme']);

    const items = await connector.capture();

    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({
      title: 'acme/has-readme — README',
      body: '# Hello',
      mimeType: 'text/markdown',
      sourceUrl: 'https://github.com/acme/has-readme',
    });
  });

  it('exposes its capability as input.github-readme', () => {
    const connector = new GitHubReadmeConnector(new FakeGitHubClient(new Map()), []);
    expect(connector.capability).toBe('input.github-readme');
  });
});
