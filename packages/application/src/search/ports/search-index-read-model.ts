import type { SearchIndexDto } from '../dto/search-index-dto.js';

export interface SearchIndexReadModel {
  findById(searchIndexId: string): Promise<SearchIndexDto | undefined>;
}
