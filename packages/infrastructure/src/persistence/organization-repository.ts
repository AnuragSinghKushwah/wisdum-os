import type {
  Organization,
  OrganizationId,
  OrganizationRepository,
  OrganizationSlug,
} from '@wisdum/domain';
import type { Option } from '@wisdum/types';
import { none, some } from '@wisdum/types';
import { InMemoryRepository } from './in-memory-repository.js';

export class InMemoryOrganizationRepository
  extends InMemoryRepository<OrganizationId, Organization>
  implements OrganizationRepository
{
  findBySlug(slug: OrganizationSlug): Promise<Option<Organization>> {
    const found = this.values().find((organization) => organization.slug.equals(slug));
    return Promise.resolve(found === undefined ? none : some(found));
  }
}
