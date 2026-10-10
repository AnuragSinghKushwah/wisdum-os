import { describe, expect, it } from 'vitest';
import { buildDraftPrompt } from './draft-prompt.js';

const prompt = (type: string): string =>
  buildDraftPrompt({
    title: 'my-notes.md',
    rationale: 'Because.',
    type,
    insightSummary: undefined,
    sources: [
      { knowledgeId: 'k', title: 'my-notes.md', text: 'Some source text.', truncated: false },
    ],
    instructions: undefined,
  });

describe('buildDraftPrompt', () => {
  it('does not ask a newsletter for a poll, a read time or a placeholder link', () => {
    const text = prompt('newsletter');

    expect(text).not.toContain('read_time');
    expect(text).not.toMatch(/feedback poll/i);
    expect(text).toContain('Do not mention polls, surveys, forms or links');
  });

  it('writes a blog post to its readers, not about the source document, with no table of contents', () => {
    const text = prompt('blog_post');

    expect(text).toContain('BLOG POST');
    expect(text).toContain('Do not describe the source document itself');
    expect(text).not.toContain('Table of Contents');
  });

  it('tells the model the title may be a file name, and keeps frontmatter out of code blocks', () => {
    const text = prompt('blog_post');

    expect(text).toContain('may be a file name');
    expect(text).toContain('never inside a code block');
  });

  it('still holds an X thread to 280 characters per post', () => {
    expect(prompt('x_thread')).toContain('Every post must be 280 characters or fewer');
    expect(prompt('x_thread')).toContain('six to ten posts');
  });
});
