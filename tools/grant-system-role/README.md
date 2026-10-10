# grant-system-role

Gives an existing user one of a tenant's system roles: `owner`, `admin`, `member`, or `viewer`.

## When to run it

Wisdum checks a permission on every request, and permissions come from roles
([ADR 0016](../../docs/adr/0016-authentication-authorization-and-tenant-isolation.md)). Users created before
that change have no role, so they can still sign in but every request returns `403`. Run this once per
user to give them a role. New tenants do not need it: the person who signs up becomes the owner.

## Usage

Build first, because the tool uses the compiled workspace packages:

```bash
npm run build
```

Find the tenant:

```bash
DATABASE_URL=postgresql://wisdum:wisdum@localhost:5432/wisdum \
  node tools/grant-system-role/grant-system-role.mjs --list-tenants
```

Give a user a role:

```bash
DATABASE_URL=postgresql://wisdum:wisdum@localhost:5432/wisdum \
  node tools/grant-system-role/grant-system-role.mjs \
  --tenant 00000000-0000-4000-8000-000000000001 --email you@example.com --role owner
```

The user must sign in again, because roles are read from the session token.

## Notes

- It assigns through the same `AssignRoleHandler` the API uses, so the usual validation applies and
  `identity.user.role-assigned` is raised. That event goes to a throwaway in-process bus, so live
  subscribers (for example the SSE stream) do not see it.
- It acts directly on the database as an operator, so it grants with the role's own rights and does not
  need an owner's session.
- Assigning a role the user already has is a no-op.
