export interface StatusOptions {
  readonly apiUrl?: string;
}

export async function runStatus(options: StatusOptions = {}): Promise<{ success: boolean; message: string }> {
  const apiUrl = options.apiUrl ?? 'http://localhost:3001';

  try {
    const res = await fetch(`${apiUrl}/healthz`);
    if (!res.ok) {
      return { success: false, message: `Wisdum API healthcheck failed (HTTP ${res.status})` };
    }

    const data = (await res.json()) as { status?: string };
    return {
      success: true,
      message: `Wisdum OS API Server is online at ${apiUrl} (Status: ${data.status ?? 'ok'})`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: `Could not connect to Wisdum OS API at ${apiUrl}: ${(err as Error).message}`,
    };
  }
}
