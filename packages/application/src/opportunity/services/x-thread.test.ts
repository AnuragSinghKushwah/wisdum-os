import { describe, expect, it } from 'vitest';
import { X_POST_LIMIT, fitThread, overlongPosts, splitThread } from './x-thread.js';

describe('splitThread', () => {
  it('treats each paragraph as a post', () => {
    expect(splitThread('1/ One.\n\n2/ Two.\n\n\n3/ Three.')).toEqual([
      '1/ One.',
      '2/ Two.',
      '3/ Three.',
    ]);
  });

  it('also starts a new post at each numbered line, since models often skip the blank lines', () => {
    expect(splitThread('A hook.\n2/ Two.\n3/ Three.')).toEqual(['A hook.', '2/ Two.', '3/ Three.']);
  });

  it('keeps a numbered mention inside a sentence in the same post', () => {
    expect(splitThread('2/ Version 3/4 of the plan\ncontinues here.')).toEqual([
      '2/ Version 3/4 of the plan\ncontinues here.',
    ]);
  });
});

describe('overlongPosts', () => {
  it(`allows exactly ${String(X_POST_LIMIT)} characters and flags one more`, () => {
    const exactly = 'a'.repeat(X_POST_LIMIT);
    expect(overlongPosts(exactly)).toEqual([]);
    expect(overlongPosts(`${exactly}\n\n${exactly}a`)).toEqual([
      { number: 2, length: X_POST_LIMIT + 1 },
    ]);
  });
});

describe('fitThread', () => {
  const sentence = (n: number): string =>
    `Sentence number ${String(n)} says something specific and complete.`;
  const paragraph = Array.from({ length: 12 }, (_, i) => sentence(i + 1)).join(' ');

  it('returns a thread that already fits exactly as written', () => {
    const thread = 'A hook with no number.\n2/ Two.\n\n3/ Three.';
    expect(fitThread(thread)).toBe(thread);
  });

  it('splits a long post between sentences and renumbers the whole thread in order', () => {
    const fitted = fitThread(`A hook.\n\n2/ ${paragraph}\n\n3/ The end.`);

    const posts = fitted.split('\n\n');
    expect(posts.length).toBeGreaterThan(3);
    expect(posts.every((post) => post.length <= X_POST_LIMIT)).toBe(true);
    expect(posts[0]).toBe('A hook.');
    posts.slice(1).forEach((post, index) => {
      expect(post.startsWith(`${String(index + 2)}/ `)).toBe(true);
    });
    expect(posts.at(-1)).toBe(`${String(posts.length)}/ The end.`);
  });

  it('breaks only between sentences when it can, and loses and adds no words', () => {
    const fitted = fitThread(`1/ ${paragraph}`);

    const posts = fitted.split('\n\n');
    for (const post of posts) {
      expect(post.replace(/^\d+\/ /, '')).toMatch(/^Sentence number \d+ .*complete\.$/);
    }
    const words = (text: string): string[] => text.replace(/\b\d+\/ /g, '').split(/\s+/);
    expect(words(fitted.replace(/^1\/ /, ''))).toEqual(words(paragraph));
  });

  it('keeps the first post unnumbered when the model left it so, and numbered when it did not', () => {
    expect(fitThread(`${paragraph}\n\n2/ Two.`).startsWith('Sentence number 1')).toBe(true);
    expect(fitThread(`1/ ${paragraph}\n\n2/ Two.`).startsWith('1/ Sentence number 1')).toBe(true);
  });

  it('breaks between words for a sentence longer than a post, and cuts a word longer than a post', () => {
    const run = 'word '.repeat(120).trim();
    const fittedRun = fitThread(run).split('\n\n');
    expect(fittedRun.every((post) => post.length <= X_POST_LIMIT)).toBe(true);
    expect(fittedRun.join(' ').replace(/\b\d+\/ /g, '')).toBe(run);

    const fittedWord = fitThread('x'.repeat(700)).split('\n\n');
    expect(fittedWord.length).toBeGreaterThan(2);
    expect(fittedWord.every((post) => post.length <= X_POST_LIMIT)).toBe(true);
  });

  it('leaves no post over the limit even with three-digit numbers', () => {
    const many = Array.from({ length: 150 }, (_, i) => `${String(i + 1)}/ ${'y'.repeat(278)}`).join(
      '\n\n',
    );
    const fitted = fitThread(`${many}\n\n151/ ${'z'.repeat(400)}`);
    expect(overlongPosts(fitted)).toEqual([]);
  });
});
