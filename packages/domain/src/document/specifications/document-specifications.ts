import { ComposableSpecification } from '../../shared/index.js';
import { DocumentStatus } from '../value-objects/document-status.js';
import type { ByteSize } from '../value-objects/byte-size.js';
import type { Document } from '../entities/document.js';

/** Satisfied when the document is the live revision. */
export class DocumentIsActive extends ComposableSpecification<Document> {
  override isSatisfiedBy(candidate: Document): boolean {
    return candidate.status.is('active');
  }
}

/** Satisfied when the document has no content yet. */
export class DocumentIsEmpty extends ComposableSpecification<Document> {
  override isSatisfiedBy(candidate: Document): boolean {
    return candidate.content.isEmpty();
  }
}

/** Satisfied when the document's content is a `text/*` media type. */
export class DocumentIsTextual extends ComposableSpecification<Document> {
  override isSatisfiedBy(candidate: Document): boolean {
    return candidate.mimeType.isText();
  }
}

/** Satisfied when the document's content exceeds the given size. */
export class DocumentExceedsSize extends ComposableSpecification<Document> {
  constructor(private readonly limit: ByteSize) {
    super();
  }

  override isSatisfiedBy(candidate: Document): boolean {
    return candidate.sizeBytes.exceeds(this.limit);
  }
}

/** Satisfied when the document's language has not been determined yet. */
export class DocumentNeedsLanguageDetection extends ComposableSpecification<Document> {
  override isSatisfiedBy(candidate: Document): boolean {
    return candidate.language.isUndetermined();
  }
}

/** Satisfied when the current lifecycle state allows deletion. */
export class DocumentCanBeDeleted extends ComposableSpecification<Document> {
  override isSatisfiedBy(candidate: Document): boolean {
    return candidate.status.canTransitionTo(DocumentStatus.deleted());
  }
}
