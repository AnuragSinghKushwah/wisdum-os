import type { Knowledge } from '@wisdum/domain';

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
  readonly createdAt: string;
  readonly updatedAt: string;
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
    createdAt: knowledge.createdAt,
    updatedAt: knowledge.updatedAt,
  };
}
