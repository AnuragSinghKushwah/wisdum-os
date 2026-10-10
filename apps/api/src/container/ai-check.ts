import type { LlmProvider } from '@wisdum/platform-ai';

/** The outcome of asking the configured AI provider one tiny question. */
export type AiCheck =
  | { status: 'pending' }
  | { status: 'ok'; latencyMs: number }
  | { status: 'failed'; message: string }
  /** The provider was supplied by the caller (a test), so nothing was asked of it. */
  | { status: 'skipped' };

export interface AiCheckTarget {
  readonly provider: LlmProvider;
  readonly model: string;
  /** Short provider name: `anthropic`, `openai`, `gemini`, `nvidia-nim` or `ollama`. */
  readonly name: string;
  /** Lists the models this account can use, to help when the configured one is missing. */
  readonly listModels?: () => Promise<readonly string[]>;
}

const SETTING_FOR_PROVIDER: Readonly<Record<string, string>> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  gemini: 'GEMINI_API_KEY',
  'nvidia-nim': 'NVIDIA_API_KEY',
  ollama: 'OLLAMA_HOST',
};

const CHECK_TIMEOUT_MS = 30_000;
const MAX_LISTED_MODELS = 10;

function statusOf(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as { status?: unknown }).status;
    return typeof status === 'number' ? status : undefined;
  }
  return undefined;
}

function messageOf(error: unknown): string {
  return error instanceof Error && error.message.length > 0 ? error.message : String(error);
}

/**
 * Turns a provider failure into something a person can act on: which setting
 * to fix, or what is wrong with the account, instead of a raw status code.
 */
export function describeAiFailure(
  error: unknown,
  target: Pick<AiCheckTarget, 'name' | 'model'>,
  availableModels: readonly string[] = [],
): string {
  const setting = SETTING_FOR_PROVIDER[target.name] ?? 'the provider settings';
  const raw = messageOf(error);
  const status =
    statusOf(error) ??
    Number(/\((\d{3})\)|\b(?:status|answered)\s+(\d{3})\b/i.exec(raw)?.slice(1).find(Boolean));
  const models =
    availableModels.length > 0
      ? ` Models this key can use include: ${availableModels.slice(0, MAX_LISTED_MODELS).join(', ')}.`
      : '';

  if (/REASONING_LLM_MODEL/.test(raw)) {
    return `${raw}${models}`;
  }
  if (
    status === 401 ||
    status === 403 ||
    /api key not valid|invalid api key|incorrect api key|invalid x-api-key/i.test(raw)
  ) {
    return `${target.name} rejected the credentials. Check ${setting} in .env, then restart.`;
  }
  if (status === 404) {
    return (
      `${target.name} has no model called "${target.model}" for this account. ` +
      `Set REASONING_LLM_MODEL in .env to one you can use, then restart.${models}`
    );
  }
  // 410 Gone: the model existed and has been switched off (NVIDIA's hosted catalog answers this way).
  if (status === 410) {
    return (
      `${target.name} has retired the model "${target.model}" and no longer serves it. ` +
      `Set REASONING_LLM_MODEL in .env to a current one, then restart.${models}`
    );
  }
  if (status === 429 || /quota|credit|billing|insufficient/i.test(raw)) {
    return `${target.name} refused the request: the account is rate limited, out of credit, or over its quota. (${raw.slice(0, 160)})`;
  }
  if (
    /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|fetch failed|timed out|Could not reach|connection error/i.test(
      raw,
    )
  ) {
    return `Could not reach ${target.name}: ${raw.slice(0, 200)}`;
  }
  return `${target.name} returned an error: ${raw.slice(0, 240)}${models}`;
}

/**
 * Asks the provider one tiny question to confirm the key and the model
 * actually work, so a problem shows up at start-up instead of on the first
 * draft. Never throws: every outcome is returned as an `AiCheck`.
 */
export async function checkAiProvider(target: AiCheckTarget): Promise<AiCheck> {
  const started = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      target.provider.complete({
        model: target.model,
        messages: [{ role: 'user', content: 'Reply with the single word OK.' }],
        maxOutputTokens: 256,
      }),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error('timed out waiting for a reply')),
          CHECK_TIMEOUT_MS,
        );
      }),
    ]);
    return { status: 'ok', latencyMs: Date.now() - started };
  } catch (error) {
    let available: readonly string[] = [];
    const missingModel =
      statusOf(error) === 404 ||
      statusOf(error) === 410 ||
      /REASONING_LLM_MODEL/.test(messageOf(error));
    if (missingModel && target.listModels !== undefined) {
      available = await target.listModels().catch(() => []);
    }
    return { status: 'failed', message: describeAiFailure(error, target, available) };
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
