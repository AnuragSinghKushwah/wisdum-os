import type { Knowledge } from '@wisdum/domain';

/** Wire-safe projection of a ContentReference. `reference` is the linked Document's id. */
export interface KnowledgeContentReferenceDto {
  readonly reference: string;
  readonly mimeType: string | null;
}

/** Wire-safe projection of a Knowledge aggregate. No value object leaks through. */
export interface KnowledgeDto {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly description: string;
  readonly type: string;
  readonly status: string;
  readonly visibility: string;
  readonly version: number;
  readonly labels: readonly string[];
  readonly contentReferences: readonly KnowledgeContentReferenceDto[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly properties: Record<string, string>;
}

export function toKnowledgeDto(knowledge: Knowledge): KnowledgeDto {
  return {
    id: knowledge.getId().value(),
    title: knowledge.title.value,
    slug: knowledge.slug.value,
    description: knowledge.description.value,
    type: knowledge.type.value,
    status: knowledge.status.value,
    visibility: knowledge.visibility.value,
    version: knowledge.version.value,
    labels: knowledge.labels.map((label) => label.value),
    contentReferences: knowledge.contentReferences.map((ref) => ({
      reference: ref.reference,
      mimeType: ref.mimeType,
    })),
    createdAt: knowledge.createdAt,
    updatedAt: knowledge.updatedAt,
    properties: {
      parsingStatus: 'pending',
      embeddingStatus: 'pending',
      graphStatus: 'pending',
      processingError: '',
      ...knowledge.properties,
    },
  };
}
