import type { SlugGenerator } from '@wisdum/application';

const COMBINING_DIACRITICS = /[̀-ͯ]/g;
const NON_ALPHANUMERIC = /[^a-z0-9]+/g;
const LEADING_TRAILING_DASHES = /^-+|-+$/g;

/** Lowercase kebab-case slugs, ASCII-folded. Uniqueness is the caller's responsibility. */
export class KebabSlugGenerator implements SlugGenerator {
  slugify(input: string): string {
    const normalized = input
      .normalize('NFKD')
      .replace(COMBINING_DIACRITICS, '')
      .toLowerCase()
      .replace(NON_ALPHANUMERIC, '-')
      .replace(LEADING_TRAILING_DASHES, '');
    return normalized.length > 0 ? normalized : 'untitled';
  }
}
