import { describe, expect, it } from 'vitest';
import { cleanModelOutput } from './clean-model-output.js';

describe('cleanModelOutput', () => {
  it('removes a fence that wraps the whole answer', () => {
    expect(cleanModelOutput('```markdown\n# Title\n\nBody text\n```')).toBe('# Title\n\nBody text');
    expect(cleanModelOutput('```\nplain\n```')).toBe('plain');
    expect(cleanModelOutput('  ```md\nHi\n```  \n')).toBe('Hi');
  });

  it('keeps fences that belong to the draft', () => {
    const withCode = '# Title\n\n```ts\nconst a = 1;\n```\n\nMore text';
    expect(cleanModelOutput(withCode)).toBe(withCode);
  });

  it('keeps a draft that starts and ends with its own code blocks', () => {
    const draft = '```ts\nfirst();\n```\n\nIn between\n\n```ts\nsecond();\n```';
    expect(cleanModelOutput(draft)).toBe(draft);
  });

  it('unwraps a longer fence that holds code blocks of its own', () => {
    const inner = '# Title\n\n```ts\nconst a = 1;\n```\n\nMore';
    expect(cleanModelOutput(`\`\`\`\`markdown\n${inner}\n\`\`\`\``)).toBe(inner);
  });

  it('leaves a same-length wrapper alone when code blocks sit inside, since it cannot tell them apart', () => {
    const ambiguous = '```markdown\n# Title\n\n```ts\nconst a = 1;\n```\n\nMore\n```';
    expect(cleanModelOutput(ambiguous)).toBe(ambiguous);
  });

  it('only trims ordinary text', () => {
    expect(cleanModelOutput('\n  A plain draft.  \n')).toBe('A plain draft.');
  });

  it('replaces look-alike hyphens and spaces that break links and searches with plain ones', () => {
    const raw =
      'An open\u2011source tool at http://localhost:3000/sign\u2011up costs 10\u202f000 tokens.';

    expect(cleanModelOutput(raw)).toBe(
      'An open-source tool at http://localhost:3000/sign-up costs 10 000 tokens.',
    );
  });

  it('replaces them inside an unwrapped fence too, and leaves ordinary dashes and quotes alone', () => {
    expect(cleanModelOutput('```md\nsign\u2011up \u2014 “quoted” – range\n```')).toBe(
      'sign-up \u2014 “quoted” – range',
    );
  });
});
