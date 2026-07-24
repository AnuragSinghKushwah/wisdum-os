import { describe, expect, it, vi } from 'vitest';
import type { GitHubClient, GitHubCommit } from './github-client.js';
import { GitHubRepoConnector } from './github-repo-connector.js';

describe('GitHubRepoConnector', () => {
  it('captures commit history and formats as markdown items', async () => {
    const mockCommits: readonly GitHubCommit[] = [
      {
        sha: 'abc123456789',
        message: 'feat: add user authentication',
        authorName: 'Developer One',
        date: '2026-07-24T10:00:00Z',
        htmlUrl: 'https://github.com/acme/app/commit/abc123456789',
      },
    ];

    const mockClient: GitHubClient = {
      getReadme: vi.fn(),
      getRecentCommits: vi.fn().mockResolvedValue(mockCommits),
    };

    const connector = new GitHubRepoConnector(mockClient, ['acme/app']);
    const items = await connector.capture();

    expect(items).toHaveLength(1);
    expect(items[0]!.title).toBe('acme/app — Recent Repository Commits');
    expect(items[0]!.body).toContain('feat: add user authentication');
    expect(items[0]!.sourceUrl).toBe('https://github.com/acme/app/commits');
  });

  it('returns empty array when repo has no commits', async () => {
    const mockClient: GitHubClient = {
      getReadme: vi.fn(),
      getRecentCommits: vi.fn().mockResolvedValue([]),
    };

    const connector = new GitHubRepoConnector(mockClient, ['acme/empty']);
    const items = await connector.capture();

    expect(items).toHaveLength(0);
  });
});
