#!/usr/bin/env node
// Gives an existing user one of a tenant's system roles (owner, admin, member, viewer).
// See README.md. Run `npm run build` first: this uses the compiled workspace packages.
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';

const ROLES = ['owner', 'admin', 'member', 'viewer'];

const USAGE = `Usage:
  node tools/grant-system-role/grant-system-role.mjs --list-tenants
  node tools/grant-system-role/grant-system-role.mjs --tenant <tenant-id> --email <email> --role <owner|admin|member|viewer>

Options:
  --database-url <url>   PostgreSQL connection string (default: $DATABASE_URL)
  --list-tenants         Print every tenant id and slug, then exit
  --tenant <id>          The tenant the user belongs to
  --email <email>        The user to give the role to
  --role <name>          One of: ${ROLES.join(', ')}
`;

/**
 * The part worth testing: find the user in the tenant and assign the role
 * through the same handler the API uses. `deps` is injected so tests can use
 * in-memory repositories.
 */
export async function grantSystemRole({
  users,
  access,
  assignRole,
  Email,
  tenantId,
  email,
  roleName,
}) {
  if (!ROLES.includes(roleName)) {
    throw new Error(`Unknown role "${roleName}". Choose one of: ${ROLES.join(', ')}`);
  }
  const found = await users.findByEmail(tenantId, Email.create(email));
  if (!found.some) {
    throw new Error(`No user ${email} in tenant ${tenantId}`);
  }
  const userId = found.value.getId().value();
  await assignRole.execute({
    kind: 'command',
    tenantId,
    userId,
    roleId: access.systemRoleId(tenantId, roleName),
    // This is an operator acting directly on the database, so it grants with the role's own rights.
    grantorPermissions: access.permissionsOfSystemRole(roleName).toArray(),
  });
  return { userId, roleId: access.systemRoleId(tenantId, roleName) };
}

async function main() {
  const { values } = parseArgs({
    options: {
      'database-url': { type: 'string' },
      'list-tenants': { type: 'boolean' },
      tenant: { type: 'string' },
      email: { type: 'string' },
      role: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  if (values.help) {
    console.log(USAGE);
    return;
  }
  const url = values['database-url'] ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error('Set DATABASE_URL or pass --database-url.\n\n' + USAGE);
  }

  const { createPgPool } = await import('@wisdum/database');
  const pool = createPgPool({ url });
  try {
    if (values['list-tenants']) {
      const { rows } = await pool.query('SELECT id, slug, name FROM tenants ORDER BY created_at');
      for (const row of rows) console.log(`${row.id}  ${row.slug}  ${row.name}`);
      return;
    }
    if (!values.tenant || !values.email || !values.role) {
      throw new Error('--tenant, --email and --role are all required.\n\n' + USAGE);
    }

    const { AccessPolicy, AssignRoleHandler } = await import('@wisdum/application');
    const { Email, SystemClock } = await import('@wisdum/domain');
    const { EventBusDomainEventPublisher, InMemoryEventBus, PostgresUserRepository } =
      await import('@wisdum/infrastructure');

    const users = new PostgresUserRepository(pool);
    const access = new AccessPolicy();
    // Events from this one-off command have no subscribers, so they go to a throwaway in-process bus.
    const events = new EventBusDomainEventPublisher(new InMemoryEventBus());
    const assignRole = new AssignRoleHandler(users, access, events, SystemClock.instance());

    const result = await grantSystemRole({
      users,
      access,
      assignRole,
      Email,
      tenantId: values.tenant,
      email: values.email,
      roleName: values.role,
    });
    console.log(`Gave ${values.email} the ${values.role} role (role id ${result.roleId}).`);
    console.log('They need to sign in again for it to take effect.');
  } finally {
    await pool.end();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
