export interface GitHubReadme {
  readonly content: string;
  readonly htmlUrl: string;
}

export interface GitHubCommit {
  readonly sha: string;
  readonly message: string;
  readonly authorName: string;
  readonly date: string;
  readonly htmlUrl: string;
}

/** Narrow port over the GitHub REST API — what GitHub connectors need. */
export interface GitHubClient {
  /** Resolves to undefined when the repo has no README (a 404), never throws for that case. */
  getReadme(owner: string, repo: string): Promise<GitHubReadme | undefined>;
  /** Fetches recent commits for a repository. */
  getRecentCommits(owner: string, repo: string, limit?: number): Promise<readonly GitHubCommit[]>;
}

interface GitHubReadmeResponse {
  readonly content: string;
  readonly encoding: string;
  readonly html_url: string;
}

interface GitHubCommitResponse {
  readonly sha: string;
  readonly html_url: string;
  readonly commit: {
    readonly message: string;
    readonly author: {
      readonly name: string;
      readonly date: string;
    };
  };
}

const GITHUB_API_BASE = 'https://api.github.com';
const USER_AGENT = 'wisdum-github-connector';

/** `fetch`-based `GitHubClient` — no SDK dependency, GitHub's REST API is small enough to call directly. */
export class RestGitHubClient implements GitHubClient {
  constructor(private readonly token: string) {}

  async getReadme(owner: string, repo: string): Promise<GitHubReadme | undefined> {
    const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/readme`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': USER_AGENT,
      },
    });
    if (response.status === 404) {
      return undefined;
    }
    if (!response.ok) {
      throw new Error(`GitHub API error fetching ${owner}/${repo} README: ${response.status}`);
    }
    const body = (await response.json()) as GitHubReadmeResponse;
    return {
      content: Buffer.from(body.content, 'base64').toString('utf-8'),
      htmlUrl: body.html_url,
    };
  }

  async getRecentCommits(owner: string, repo: string, limit = 10): Promise<readonly GitHubCommit[]> {
    const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/commits?per_page=${limit}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': USER_AGENT,
      },
    });
    if (!response.ok) {
      if (response.status === 404) return [];
      throw new Error(`GitHub API error fetching ${owner}/${repo} commits: ${response.status}`);
    }
    const body = (await response.json()) as readonly GitHubCommitResponse[];
    return body.map((item) => ({
      sha: item.sha,
      message: item.commit.message,
      authorName: item.commit.author.name,
      date: item.commit.author.date,
      htmlUrl: item.html_url,
    }));
  }
}
