import { vi } from 'vitest';
import type { Kernel } from '@wisdum/kernel';
import type { FastifyInstance } from 'fastify';
import type { LlmSelection } from '../../container/modules/core-module.js';
import { DEV_SEED } from '../../bootstrap/dev-seed.js';
import { buildServer } from '../../server.js';

/** `T` is what the test expects the JSON body to look like; it is not checked at runtime. */
export interface ApiResponse<T = Record<string, string>> {
  readonly status: number;
  readonly body: T;
}

export interface CallOptions {
  readonly headers?: Record<string, string>;
  readonly payload?: unknown;
}

export interface Session {
  readonly userId: string;
  readonly tenantId: string;
  readonly headers: Record<string, string>;
}

/** Narrows a JSON field the test relies on, failing with a useful message when it is missing. */
function field(value: string | undefined, what: string): string {
  if (value === undefined) {
    throw new Error(`expected ${what} in the response`);
  }
  return value;
}

/** The real server, assembled in-memory, for tests that exercise every layer together. */
export class TestApi {
  private constructor(
    private readonly app: FastifyInstance,
    private readonly kernel: Kernel,
  ) {}

  /**
   * Boots the API with the development tenant seeded and sign-up open, so a
   * test can have two tenants. Environment is restored by `close()`. Pass `llm` to
   * back content generation with a scripted model instead of the offline mock.
   */
  static async start(options: { readonly llm?: LlmSelection } = {}): Promise<TestApi> {
    vi.stubEnv('DATABASE_URL', '');
    vi.stubEnv('REDIS_URL', '');
    vi.stubEnv('JWT_SECRET', '');
    vi.stubEnv('EMBEDDING_ENABLED', 'false');
    vi.stubEnv('LOG_LEVEL', 'error');
    vi.stubEnv('WISDUM_ENV', 'test');
    vi.stubEnv('WISDUM_DEV_SEED', 'true');
    vi.stubEnv('WISDUM_ALLOW_SIGNUP', 'true');
    const { app, kernel } = await buildServer(options);
    await app.ready();
    return new TestApi(app, kernel);
  }

  async close(): Promise<void> {
    await this.kernel.stop();
    await this.app.close();
    vi.unstubAllEnvs();
  }

  async call<T = Record<string, string>>(
    method: string,
    url: string,
    options: CallOptions = {},
  ): Promise<ApiResponse<T>> {
    const hasBody = options.payload !== undefined;
    const response = await this.app.inject({
      method: method as 'GET',
      url,
      headers: { ...(hasBody ? { 'content-type': 'application/json' } : {}), ...options.headers },
      payload: hasBody ? JSON.stringify(options.payload) : undefined,
    });
    let body: unknown;
    try {
      body = JSON.parse(response.body);
    } catch {
      body = undefined;
    }
    return { status: response.statusCode, body: body as T };
  }

  /** Signs in as the seeded development owner. */
  async signInAsDevOwner(): Promise<Session> {
    return this.signIn(DEV_SEED.tenantId, DEV_SEED.email, DEV_SEED.password);
  }

  async signIn(tenantId: string, email: string, password: string): Promise<Session> {
    const login = await this.call('POST', '/v1/auth/login', {
      headers: { 'x-tenant-id': tenantId },
      payload: { email, password },
    });
    if (login.status !== 200) {
      throw new Error(`login failed for ${email}: ${login.status}`);
    }
    return {
      userId: field(login.body.userId, 'userId'),
      tenantId,
      headers: { authorization: `Bearer ${field(login.body.token, 'token')}` },
    };
  }

  /** Creates a brand-new tenant through public sign-up and returns its owner's session. */
  async signUpTenant(slug: string): Promise<Session> {
    const email = `owner@${slug}.test`;
    const response = await this.call('POST', '/v1/onboarding/setup', {
      payload: {
        orgName: slug,
        orgSlug: slug,
        displayName: 'Owner',
        email,
        password: 'correct-horse-battery',
      },
    });
    if (response.status !== 201) {
      throw new Error(
        `sign-up failed for ${slug}: ${response.status} ${JSON.stringify(response.body)}`,
      );
    }
    return {
      userId: field(response.body.userId, 'userId'),
      tenantId: field(response.body.tenantId, 'tenantId'),
      headers: { authorization: `Bearer ${field(response.body.token, 'token')}` },
    };
  }

  /** Creates a user in the session's tenant, gives them a system role, and signs them in. */
  async createUserWithRole(
    owner: Session,
    email: string,
    roleName: 'owner' | 'admin' | 'member' | 'viewer' | null,
  ): Promise<Session> {
    const created = await this.call('POST', '/v1/users', {
      headers: owner.headers,
      payload: { email, displayName: email.split('@')[0], password: 'a-long-password-1' },
    });
    if (created.status !== 201) {
      throw new Error(`create user failed: ${created.status}`);
    }
    if (roleName !== null) {
      const roles = await this.call<{ id: string; name: string }[]>('GET', '/v1/identity/roles', {
        headers: owner.headers,
      });
      const roleId = roles.body.find((r) => r.name === roleName)?.id;
      const assigned = await this.call('POST', `/v1/users/${created.body.userId}/roles`, {
        headers: owner.headers,
        payload: { roleId },
      });
      if (assigned.status !== 200) {
        throw new Error(`assign role failed: ${assigned.status}`);
      }
    }
    return this.signIn(owner.tenantId, email, 'a-long-password-1');
  }
}
