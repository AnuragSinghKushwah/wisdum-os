import { TRUNCATION_NOTICE } from '../../shared/ports.js';
import { renderSources } from '../prompts/draft-prompt.js';
import type { SourceExcerpt } from './source-material-loader.js';

/** The reviewed draft must keep at least this share of the original's length, or the review is not used. */
const MIN_KEPT_FRACTION = 0.5;

/**
 * Asks the model to check a draft against the material it was written from and take out what that
 * material does not support. Writing for a platform pulls a model toward its genre (a blog post gets
 * "benefits" and "next steps"), so a first draft can claim things the source never said, and a
 * second look with only one job (is this supported?) catches most of them.
 */
export function buildDraftReviewPrompt(sources: readonly SourceExcerpt[], draft: string): string {
  return [
    'You are a fact-checking editor. Below are SOURCE MATERIAL and a DRAFT that was written from it.',
    'Rewrite the DRAFT so that everything it asserts is supported by the SOURCE MATERIAL:',
    '- Remove or rewrite any claim, benefit, result, effect, number, cause, status or piece of advice that the source does not state. Do not add anything new.',
    '- Titles and headlines are claims too: if a title says something improves, reduces, speeds up or fixes something, the source must say so for this work.',
    '- Status must match the source: if the source says something is planned, on hold, blocked, in progress or waiting for a decision, the draft must say so and must not describe it as done.',
    '- A measurement taken before a change is a baseline, not a result of the change.',
    "- Keep everything the source does support. Keep the draft's structure, tone and formatting, and keep any front matter between --- lines at the top of the draft (correcting its title if the title overclaims). Do not shorten supported content.",
    'Return only the corrected draft in full: no commentary, no list of changes, no code block around it.',
    renderSources(sources),
    ['DRAFT:', '"""', draft, '"""'].join('\n'),
  ].join('\n\n');
}

export type ReviewVerdict =
  | { readonly accepted: true; readonly text: string }
  | { readonly accepted: false; readonly reason: string };

/**
 * Decides whether a reviewed draft can replace the original. A reviewer can fail in ways that would
 * make the draft worse (return nothing, stop mid-answer, drop the front matter, or cut most of the
 * text), and then the original is kept.
 */
export function judgeReview(original: string, reviewed: string): ReviewVerdict {
  const text = reviewed.trim();
  if (text.length === 0) return { accepted: false, reason: 'the reviewer returned nothing' };
  if (text.includes(TRUNCATION_NOTICE)) {
    return { accepted: false, reason: 'the reviewer stopped at its output limit' };
  }
  if (original.trimStart().startsWith('---') && !text.startsWith('---')) {
    return { accepted: false, reason: 'the reviewer dropped the front matter' };
  }
  if (text.length < original.length * MIN_KEPT_FRACTION) {
    return { accepted: false, reason: 'the reviewer removed more than half of the draft' };
  }
  return { accepted: true, text };
}
