import type { IsoTimestamp, TenantId } from '@wisdum/types';
import { ValidationError } from '@wisdum/errors';
import { AggregateRoot } from '../../shared/index.js';
import type { Clock } from '../../shared/index.js';
import type { PromptBody } from '../value-objects/prompt-body.js';
import type { PromptTemplateId } from '../value-objects/ai-ids.js';
import {
  AI_EVENT_SCHEMA_VERSION,
  PROMPT_TEMPLATE_CREATED,
  PROMPT_TEMPLATE_UPDATED,
} from '../events/ai-events.js';
import type { AnyAIEvent } from '../events/ai-events.js';

const NAME_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*(\.[a-z][a-z0-9]*(-[a-z0-9]+)*)*$/;
const MAX_NAME_LENGTH = 128;

/** What callers provide to create a prompt template. */
export interface CreatePromptTemplateProps {
  readonly id: PromptTemplateId;
  readonly tenantId: TenantId;
  /** Dot-namespaced kebab-case (e.g. `knowledge.summarize`). */
  readonly name: string;
  readonly description: string;
  readonly body: PromptBody;
}

/** Full state needed to rehydrate a prompt template (no events are raised). */
export interface PromptTemplateSnapshot {
  readonly id: PromptTemplateId;
  readonly tenantId: TenantId;
  readonly name: string;
  readonly description: string;
  readonly body: PromptBody;
  readonly revision: number;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

/**
 * A versioned, reusable prompt. Workflows reference templates by name;
 * every body change bumps the revision so AI outputs stay attributable
 * to the exact prompt that produced them.
 */
export class PromptTemplate extends AggregateRoot<PromptTemplateId> {
  private readonly _tenantId: TenantId;
  private readonly _name: string;
  private _description: string;
  private _body: PromptBody;
  private _revision: number;
  private readonly _createdAt: IsoTimestamp;
  private _updatedAt: IsoTimestamp;

  private constructor(snapshot: PromptTemplateSnapshot) {
    super(snapshot.id);
    this._tenantId = snapshot.tenantId;
    this._name = snapshot.name;
    this._description = snapshot.description;
    this._body = snapshot.body;
    this._revision = snapshot.revision;
    this._createdAt = snapshot.createdAt;
    this._updatedAt = snapshot.updatedAt;
  }

  static create(props: CreatePromptTemplateProps, clock: Clock): PromptTemplate {
    const name = props.name.trim().toLowerCase();
    if (name.length === 0 || name.length > MAX_NAME_LENGTH || !NAME_PATTERN.test(name)) {
      throw new ValidationError('Prompt template name must be dot-namespaced kebab-case', {
        name: props.name,
      });
    }
    const now = clock.now();
    const template = new PromptTemplate({
      id: props.id,
      tenantId: props.tenantId,
      name,
      description: props.description,
      body: props.body,
      revision: 1,
      createdAt: now,
      updatedAt: now,
    });
    template.raise({
      ...template.eventEnvelope(now),
      eventType: PROMPT_TEMPLATE_CREATED,
      payload: {
        promptTemplateId: props.id.value(),
        name,
        variables: props.body.variables,
      },
    });
    return template;
  }

  /** Rehydrate an existing template from persisted state. Raises no events. */
  static reconstitute(snapshot: PromptTemplateSnapshot): PromptTemplate {
    return new PromptTemplate(snapshot);
  }

  /** Replace the body, bumping the revision. */
  updateBody(body: PromptBody, clock: Clock): void {
    if (this._body.equals(body)) return;
    const now = clock.now();
    this._body = body;
    this._revision += 1;
    this._updatedAt = now;
    this.raise({
      ...this.eventEnvelope(now),
      eventType: PROMPT_TEMPLATE_UPDATED,
      payload: {
        promptTemplateId: this.id.value(),
        revision: this._revision,
        variables: body.variables,
      },
    });
  }

  describe(description: string, clock: Clock): void {
    if (this._description === description) return;
    this._description = description;
    this._updatedAt = clock.now();
  }

  /** Render the current revision with the given variable values. */
  render(values: Readonly<Record<string, string>>): string {
    return this._body.render(values);
  }

  get tenantId(): TenantId {
    return this._tenantId;
  }

  get name(): string {
    return this._name;
  }

  get description(): string {
    return this._description;
  }

  get body(): PromptBody {
    return this._body;
  }

  get revision(): number {
    return this._revision;
  }

  get createdAt(): IsoTimestamp {
    return this._createdAt;
  }

  get updatedAt(): IsoTimestamp {
    return this._updatedAt;
  }

  private raise(event: AnyAIEvent): void {
    this.addDomainEvent(event);
  }

  private eventEnvelope(occurredAt: IsoTimestamp): {
    aggregateId: PromptTemplateId;
    tenantId: TenantId;
    occurredAt: IsoTimestamp;
    version: number;
  } {
    return {
      aggregateId: this.id,
      tenantId: this._tenantId,
      occurredAt,
      version: AI_EVENT_SCHEMA_VERSION,
    };
  }
}
