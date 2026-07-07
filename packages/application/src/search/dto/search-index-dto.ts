import type { SearchIndex } from '@wisdum/domain';

export interface SearchIndexDto {
  readonly id: string;
  readonly name: string;
  readonly mode: string;
  readonly status: string;
  readonly documentCount: number;
  readonly createdAt: string;
}

export function toSearchIndexDto(index: SearchIndex): SearchIndexDto {
  return {
    id: index.getId().value(),
    name: index.name,
    mode: index.mode,
    status: index.status,
    documentCount: index.documentCount(),
    createdAt: index.createdAt,
  };
}
