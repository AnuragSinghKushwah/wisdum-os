'use client';

import { useAuth } from '../../../lib/auth-context';

export default function SettingsPage() {
  const { session } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Settings</h1>
      <dl className="mt-4 grid grid-cols-1 gap-y-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-neutral-500">User ID</dt>
          <dd className="font-mono">{session?.userId}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Tenant ID</dt>
          <dd className="font-mono">{session?.tenantId}</dd>
        </div>
      </dl>
    </div>
  );
}
