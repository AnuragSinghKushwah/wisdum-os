import { describe, expect, it } from 'vitest';
import type { IsoTimestamp, TenantId, UUID } from '@wisdum/types';
import type { Clock } from '../../shared/index.js';
import { ORGANIZATION_CREATED } from '../events/organization-events.js';
import { OrganizationId } from '../value-objects/organization-id.js';
import { OrganizationName } from '../value-objects/organization-name.js';
import { OrganizationSlug } from '../value-objects/organization-slug.js';
import { Organization } from './organization.js';

const TENANT_ID = 'tenant-1' as TenantId;
const clock: Clock = { now: () => '2024-01-01T00:00:00.000Z' as IsoTimestamp };

function createOrganization() {
  return Organization.create(
    {
      id: OrganizationId.create('11111111-1111-1111-1111-111111111111'),
      tenantId: TENANT_ID,
      name: OrganizationName.create('Acme Corp'),
      slug: OrganizationSlug.create('acme-corp'),
    },
    clock,
  );
}

describe('Organization', () => {
  it('is created active on the free tier and raises OrganizationCreated', () => {
    const organization = createOrganization();
    expect(organization.status.is('active')).toBe(true);
    expect(organization.subscription.plan).toBe('free');

    const events = organization.pullDomainEvents();
    expect(events.some((event) => event.eventType === ORGANIZATION_CREATED)).toBe(true);
  });

  it('attachWorkspace() then detachWorkspace() round-trips workspace membership', () => {
    const organization = createOrganization();
    const workspaceId = '22222222-2222-2222-2222-222222222222' as UUID;

    organization.attachWorkspace(workspaceId, clock);
    expect(organization.hasWorkspace(workspaceId)).toBe(true);
    expect(organization.workspaceCount()).toBe(1);

    organization.detachWorkspace(workspaceId, clock);
    expect(organization.hasWorkspace(workspaceId)).toBe(false);
  });

  it('markDeleted() refuses while any workspace is still attached', () => {
    const organization = createOrganization();
    organization.attachWorkspace('22222222-2222-2222-2222-222222222222' as UUID, clock);

    expect(() => organization.markDeleted(clock)).toThrow(/attached workspaces/i);
  });

  it('markDeleted() succeeds once every workspace has been detached', () => {
    const organization = createOrganization();
    const workspaceId = '22222222-2222-2222-2222-222222222222' as UUID;
    organization.attachWorkspace(workspaceId, clock);
    organization.detachWorkspace(workspaceId, clock);

    organization.markDeleted(clock);

    expect(organization.status.is('deleted')).toBe(true);
  });

  it('setPolicy()/removePolicy() round-trip a governance policy', () => {
    const organization = createOrganization();
    organization.setPolicy('sharing.allow-public', false, clock);
    expect(organization.policies.get('sharing.allow-public')).toBe(false);

    organization.removePolicy('sharing.allow-public', clock);
    expect(organization.policies.has('sharing.allow-public')).toBe(false);
  });

  it('suspend() then reactivate() round-trips the lifecycle', () => {
    const organization = createOrganization();
    organization.suspend('unpaid invoice', clock);
    expect(organization.status.is('suspended')).toBe(true);

    organization.reactivate(clock);
    expect(organization.status.is('active')).toBe(true);
  });
});
