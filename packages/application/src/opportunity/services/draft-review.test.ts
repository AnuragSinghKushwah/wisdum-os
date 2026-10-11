import { describe, expect, it } from 'vitest';
import { TRUNCATION_NOTICE } from '../../shared/ports.js';
import { buildDraftReviewPrompt, judgeReview } from './draft-review.js';

const SOURCE = [
  { knowledgeId: 'k', title: 'notes', text: 'The migration is on hold.', truncated: false },
];
const DRAFT = '---\ntitle: "T"\n---\n\nThe migration cuts costs. It is finished.';

describe('buildDraftReviewPrompt', () => {
  it('gives the model the source and the draft, and the rules for what to remove', () => {
    const prompt = buildDraftReviewPrompt(SOURCE, DRAFT);

    expect(prompt).toContain('The migration is on hold.');
    expect(prompt).toContain(DRAFT);
    expect(prompt).toContain('Status must match the source');
    expect(prompt).toContain('A measurement taken before a change is a baseline');
    expect(prompt).toContain('Titles and headlines are claims too');
    expect(prompt).toContain('keep any front matter');
  });
});

describe('judgeReview', () => {
  const REVIEWED = '---\ntitle: "T"\n---\n\nThe migration is on hold.';

  it('accepts a usable review, trimmed', () => {
    expect(judgeReview(DRAFT, `\n${REVIEWED}  \n`)).toEqual({ accepted: true, text: REVIEWED });
  });

  it.each([
    ['nothing', '', 'returned nothing'],
    ['the truncation notice', `${REVIEWED}\n\n${TRUNCATION_NOTICE}`, 'output limit'],
    [
      'no front matter when the draft had some',
      'The migration is on hold, in plain text only.',
      'front matter',
    ],
    ['under half the length', '---\nx\n---', 'more than half'],
  ])('rejects %s', (_name, reviewed, why) => {
    const verdict = judgeReview(DRAFT, reviewed);

    expect(verdict.accepted).toBe(false);
    expect(verdict.accepted ? '' : verdict.reason).toContain(why);
  });

  it('does not ask for front matter the draft never had', () => {
    expect(
      judgeReview('Plain post text that is fairly short.', 'Plain post text, fixed.').accepted,
    ).toBe(true);
  });
});
