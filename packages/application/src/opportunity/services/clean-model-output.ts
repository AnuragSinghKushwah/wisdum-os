/**
 * Tidies a model's draft before it is stored.
 *
 * Models often wrap the whole answer in a Markdown code fence even when told
 * not to, which would then appear literally in the draft. The wrapper is
 * removed only when it cannot be confused with the draft's own code blocks:
 * either nothing inside uses a fence, or the wrapper's fence is longer than
 * any inside it. Otherwise the text is left exactly as written, because
 * unwrapping a draft that really does start and end with code would corrupt it.
 *
 * Some models also write look-alike characters in place of plain ones: a non-breaking hyphen (U+2011)
 * in "open-source" or inside a URL, or a narrow no-break space (U+202F). They look right but break a
 * link that is copied out of the draft and stop a search for the word from matching, so they are
 * replaced with the plain hyphen and space.
 */
export function cleanModelOutput(raw: string): string {
  return withPlainCharacters(unwrapFence(raw.trim()));
}

function withPlainCharacters(text: string): string {
  return text.replace(/[\u2010\u2011]/g, '-').replace(/\u202f/g, ' ');
}

function unwrapFence(text: string): string {
  const wrapped = /^(`{3,})[A-Za-z]*[ \t]*\n([\s\S]*)\n\1$/.exec(text);
  if (wrapped?.[1] !== undefined && wrapped[2] !== undefined) {
    const innerFence = new RegExp(`^\`{${wrapped[1].length},}`, 'm');
    if (!innerFence.test(wrapped[2])) return wrapped[2].trim();
  }
  return text;
}
