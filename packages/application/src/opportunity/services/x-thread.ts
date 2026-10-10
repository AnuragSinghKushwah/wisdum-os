/** The most characters X accepts in one post. */
export const X_POST_LIMIT = 280;

/** Room kept for a "123/ " number in front of a post. */
const NUMBER_ROOM = 5;
const NUMBER_PREFIX = /^\d+\/\s*/;

/** One post of a thread that is too long to publish, numbered from 1 in reading order. */
export interface OverlongPost {
  readonly number: number;
  readonly length: number;
}

/**
 * Splits a thread into its posts: one per paragraph, and a new numbered line ("2/ …") also starts a
 * new post, since models often put the posts on consecutive lines.
 */
export function splitThread(thread: string): readonly string[] {
  return thread
    .split(/\n\s*\n|\n(?=\d+\/\s)/)
    .map((post) => post.trim())
    .filter((post) => post.length > 0);
}

/** The posts of a thread that are longer than X allows. */
export function overlongPosts(thread: string): readonly OverlongPost[] {
  return splitThread(thread).flatMap((post, index) =>
    post.length > X_POST_LIMIT ? [{ number: index + 1, length: post.length }] : [],
  );
}

/** Packs words into pieces of at most `budget` characters; a single longer word is cut. */
function packWords(text: string, budget: number): string[] {
  const pieces: string[] = [];
  let current = '';
  for (const word of text.split(/\s+/).filter((w) => w.length > 0)) {
    if (word.length > budget) {
      if (current.length > 0) pieces.push(current);
      current = '';
      for (let at = 0; at < word.length; at += budget) pieces.push(word.slice(at, at + budget));
    } else if (current.length === 0) {
      current = word;
    } else if (current.length + 1 + word.length <= budget) {
      current += ` ${word}`;
    } else {
      pieces.push(current);
      current = word;
    }
  }
  if (current.length > 0) pieces.push(current);
  return pieces;
}

/** Cuts text into pieces of at most `budget` characters, preferring to break between sentences. */
function chunk(text: string, budget: number): string[] {
  if (text.length <= budget) return [text];
  const pieces: string[] = [];
  let current = '';
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    if (sentence.length > budget) {
      if (current.length > 0) pieces.push(current);
      current = '';
      pieces.push(...packWords(sentence, budget));
    } else if (current.length === 0) {
      current = sentence;
    } else if (current.length + 1 + sentence.length <= budget) {
      current += ` ${sentence}`;
    } else {
      pieces.push(current);
      current = sentence;
    }
  }
  if (current.length > 0) pieces.push(current);
  return pieces;
}

/**
 * Makes every post fit X's limit. A thread that already fits comes back exactly as written. Otherwise
 * the posts that are too long are split between sentences (or between words, for a sentence that is
 * longer than a post) and the numbers are rewritten to run in order. Nothing is added or reworded.
 *
 * Models are unreliable at counting characters, even when told the limit and asked to fix a thread
 * that breaks it, so this is done in code rather than by asking again.
 */
export function fitThread(thread: string): string {
  const posts = splitThread(thread);
  if (overlongPosts(thread).length === 0) return thread;

  const firstWasNumbered = NUMBER_PREFIX.test(posts[0] ?? '');
  const pieces = posts.flatMap((post) =>
    chunk(post.replace(NUMBER_PREFIX, ''), X_POST_LIMIT - NUMBER_ROOM),
  );
  return pieces
    .map((text, index) =>
      index === 0 && !firstWasNumbered ? text : `${String(index + 1)}/ ${text}`,
    )
    .join('\n\n');
}
