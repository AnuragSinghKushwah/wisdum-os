import {
  Branding,
  Organization,
  OrganizationId,
  OrganizationName,
  type OrganizationRepository,
  OrganizationPolicies,
  OrganizationSlug,
  OrganizationStatus,
  SubscriptionReference,
} from '@wisdum/domain';
import type { OrganizationSnapshot, PolicyValue, SubscriptionState } from '@wisdum/domain';
import type { PgPool } from '@wisdum/database';
import type {
  OrganizationPolicyRow,
  OrganizationRow,
  OrganizationWorkspaceRow,
} from '@wisdum/database';
import type { Option, TenantId, UUID } from '@wisdum/types';
import { none, some } from '@wisdum/types';

function toSnapshot(
  row: OrganizationRow,
  policies: readonly OrganizationPolicyRow[],
  workspaces: readonly OrganizationWorkspaceRow[],
): OrganizationSnapshot {
  return {
    id: OrganizationId.create(row.id),
    tenantId: row.tenant_id as unknown as TenantId,
    name: OrganizationName.create(row.name),
    slug: OrganizationSlug.create(row.slug),
    status: OrganizationStatus.create(row.status),
    workspaceIds: workspaces.map((workspace) => workspace.workspace_id as UUID),
    subscription: SubscriptionReference.create({
      plan: row.subscription_plan,
      externalRef: row.subscription_external_ref,
      state: row.subscription_state as SubscriptionState,
    }),
    branding: Branding.create({
      logoUrl: row.branding_logo_url ?? undefined,
      primaryColor: row.branding_primary_color ?? undefined,
      accentColor: row.branding_accent_color ?? undefined,
    }),
    policies: OrganizationPolicies.create(
      Object.fromEntries(policies.map((policy) => [policy.key, policy.value as PolicyValue])),
    ),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** PostgreSQL-backed `OrganizationRepository`. Row shapes mirror migration 0002. */
export class PostgresOrganizationRepository implements OrganizationRepository {
  constructor(private readonly pool: PgPool) {}

  async findById(id: OrganizationId): Promise<Option<Organization>> {
    return this.findOneWhere('id = $1', [id.value()]);
  }

  async findBySlug(slug: OrganizationSlug): Promise<Option<Organization>> {
    return this.findOneWhere('slug = $1', [slug.value]);
  }

  async exists(id: OrganizationId): Promise<boolean> {
    const result = await this.pool.query('SELECT 1 FROM organizations WHERE id = $1', [
      id.value(),
    ]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  async save(organization: Organization): Promise<void> {
    const client = await this.pool.connect();
    const id = organization.getId().value();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO organizations (
           id, tenant_id, name, slug, status,
           subscription_plan, subscription_external_ref, subscription_state,
           branding_logo_url, branding_primary_color, branding_accent_color,
           created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           slug = EXCLUDED.slug,
           status = EXCLUDED.status,
           subscription_plan = EXCLUDED.subscription_plan,
           subscription_external_ref = EXCLUDED.subscription_external_ref,
           subscription_state = EXCLUDED.subscription_state,
           branding_logo_url = EXCLUDED.branding_logo_url,
           branding_primary_color = EXCLUDED.branding_primary_color,
           branding_accent_color = EXCLUDED.branding_accent_color,
           updated_at = EXCLUDED.updated_at`,
        [
          id,
          organization.tenantId,
          organization.name.value,
          organization.slug.value,
          organization.status.value,
          organization.subscription.plan,
          organization.subscription.externalRef,
          organization.subscription.state,
          organization.branding.logoUrl ?? null,
          organization.branding.primaryColor ?? null,
          organization.branding.accentColor ?? null,
          organization.createdAt,
          organization.updatedAt,
        ],
      );

      await client.query('DELETE FROM organization_policies WHERE organization_id = $1', [id]);
      for (const [key, value] of Object.entries(organization.policies.toRecord())) {
        await client.query(
          'INSERT INTO organization_policies (organization_id, key, value) VALUES ($1, $2, $3)',
          [id, key, JSON.stringify(value)],
        );
      }

      await client.query('DELETE FROM organization_workspaces WHERE organization_id = $1', [id]);
      for (const workspaceId of organization.workspaceIds) {
        await client.query(
          'INSERT INTO organization_workspaces (organization_id, workspace_id) VALUES ($1, $2)',
          [id, workspaceId],
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async delete(organization: Organization): Promise<void> {
    await this.pool.query('DELETE FROM organizations WHERE id = $1', [
      organization.getId().value(),
    ]);
  }

  private async findOneWhere(
    clause: string,
    params: unknown[],
  ): Promise<Option<Organization>> {
    const result = await this.pool.query<OrganizationRow>(
      `SELECT * FROM organizations WHERE ${clause}`,
      params,
    );
    const row = result.rows[0];
    if (row === undefined) return none;
    return some(await this.hydrate(row));
  }

  private async hydrate(row: OrganizationRow): Promise<Organization> {
    const [policies, workspaces] = await Promise.all([
      this.pool.query<OrganizationPolicyRow>(
        'SELECT * FROM organization_policies WHERE organization_id = $1',
        [row.id],
      ),
      this.pool.query<OrganizationWorkspaceRow>(
        'SELECT * FROM organization_workspaces WHERE organization_id = $1',
        [row.id],
      ),
    ]);
    return Organization.reconstitute(toSnapshot(row, policies.rows, workspaces.rows));
  }
}
