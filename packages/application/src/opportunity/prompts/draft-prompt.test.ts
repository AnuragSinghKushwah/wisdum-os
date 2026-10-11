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

  describe('keeping claims to what the source says', () => {
    const withSource = prompt('blog_post');

    it('treats the discovery-written angle as a hint the source can overrule, not as a fact', () => {
      const text = buildDraftPrompt({
        title: 'How Duplicate Resolution Improves Data Quality',
        rationale: 'Helps readers cut the manual work.',
        type: 'blog_post',
        insightSummary: undefined,
        sources: [
          { knowledgeId: 'k', title: 'notes', text: 'Some source text.', truncated: false },
        ],
        instructions: undefined,
      });

      expect(text).toContain('proposed by automatic discovery before it read the source');
      expect(text).toContain('Helps readers cut the manual work.');
      expect(text).not.toContain('Why this content is valuable');
    });

    it('still gives the rationale as the reason when there is no source to check it against', () => {
      const text = buildDraftPrompt({
        title: 'T',
        rationale: 'Because readers asked.',
        type: 'blog_post',
        insightSummary: undefined,
        sources: [],
        instructions: undefined,
      });

      expect(text).toContain('Why this content is valuable/necessary: Because readers asked.');
    });

    it('asks for status to be reported as the source gives it, and baselines not to become results', () => {
      expect(withSource).toContain('on hold');
      expect(withSource).toContain('never describe it as done, deployed or working');
      expect(withSource).toContain('A measurement taken before a change is a baseline');
      expect(withSource).toContain('Add advice for the reader only where the source gives it');
    });
  });
});
