import type { UUID } from '@wisdum/types';
import { ComposableSpecification } from '../../shared/index.js';
import type { SearchIndex } from '../entities/search-index.js';

/** Satisfied when the index is active and can serve queries. */
export class SearchIndexIsReady extends ComposableSpecification<SearchIndex> {
  override isSatisfiedBy(candidate: SearchIndex): boolean {
    return candidate.isReady();
  }
}

/** Satisfied when the index contains the given source. */
export class SearchIndexContainsSource extends ComposableSpecification<SearchIndex> {
  constructor(private readonly sourceId: UUID) {
    super();
  }

  override isSatisfiedBy(candidate: SearchIndex): boolean {
    return candidate.containsSource(this.sourceId);
  }
}

/** Satisfied when the index has no indexed content. */
export class SearchIndexIsEmpty extends ComposableSpecification<SearchIndex> {
  override isSatisfiedBy(candidate: SearchIndex): boolean {
    return candidate.documentCount() === 0;
  }
}

/** Satisfied when any document in the index failed its last indexing pass. */
export class SearchIndexHasFailures extends ComposableSpecification<SearchIndex> {
  override isSatisfiedBy(candidate: SearchIndex): boolean {
    return candidate.documents.some((document) => document.state === 'failed');
  }
}
