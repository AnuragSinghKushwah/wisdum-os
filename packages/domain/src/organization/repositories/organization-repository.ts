import type { Option } from '@wisdum/types';
import type { Repository } from '../../shared/index.js';
import type { Organization } from '../entities/organization.js';
import type { OrganizationId } from '../value-objects/organization-id.js';
import type { OrganizationSlug } from '../value-objects/organization-slug.js';

/**
 * Persistence port of the Organization aggregate. Interface only — the
 * implementation lives outside the domain (ADR 0007). Slugs are unique
 * platform-wide, so slug lookup is not tenant-scoped.
 */
export interface OrganizationRepository extends Repository<Organization> {
  findById(id: OrganizationId): Promise<Option<Organization>>;
  findBySlug(slug: OrganizationSlug): Promise<Option<Organization>>;
  exists(id: OrganizationId): Promise<boolean>;
  save(organization: Organization): Promise<void>;
  delete(organization: Organization): Promise<void>;
}
