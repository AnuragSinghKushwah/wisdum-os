export interface SyncOptions {
  readonly connector?: string;
  readonly apiUrl?: string;
  readonly tenantId?: string;
}

export async function runSync(options: SyncOptions = {}): Promise<{ success: boolean; message: string }> {
  const apiUrl = options.apiUrl ?? 'http://localhost:3001';
  const tenantId = options.tenantId ?? '00000000-0000-4000-8000-000000000001';
  const connector = options.connector ?? 'all';

  try {
    const res = await fetch(`${apiUrl}/v1/capture/connectors/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId,
      },
      body: JSON.stringify({ connector }),
    });

    if (!res.ok) {
      return { success: false, message: `Sync failed with status code ${res.status}` };
    }

    const data = (await res.json()) as { syncedItems?: number };
    return {
      success: true,
      message: `Connector '${connector}' sync completed successfully (${data.syncedItems ?? 0} items processed).`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: `Failed to connect to Wisdum API at ${apiUrl}: ${(err as Error).message}`,
    };
  }
}
