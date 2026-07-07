import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';
import { ProviderName } from './provider-name.js';

const MODEL_NAME_PATTERN = /^[a-z0-9][a-z0-9._:/-]*$/;
const MAX_MODEL_NAME = 128;

/**
 * A fully qualified pointer to a model at a provider (e.g.
 * `anthropic/claude-sonnet-5`). This is how conversations and pipelines
 * name the model they used without coupling to catalog aggregates.
 */
export class ModelReference extends ValueObject<ModelReference> {
  private constructor(
    private readonly _provider: ProviderName,
    private readonly _modelName: string,
  ) {
    super();
  }

  static create(props: { provider: string; modelName: string }): ModelReference {
    const modelName = props.modelName.trim().toLowerCase();
    if (modelName.length === 0 || modelName.length > MAX_MODEL_NAME) {
      throw new ValidationError('Model name is missing or too long', {
        length: modelName.length,
      });
    }
    if (!MODEL_NAME_PATTERN.test(modelName)) {
      throw new ValidationError('Model name contains invalid characters', { value: modelName });
    }
    return new ModelReference(ProviderName.create(props.provider), modelName);
  }

  get provider(): ProviderName {
    return this._provider;
  }

  get modelName(): string {
    return this._modelName;
  }

  equals(other: unknown): boolean {
    return (
      other instanceof ModelReference &&
      other._provider.equals(this._provider) &&
      other._modelName === this._modelName
    );
  }

  toString(): string {
    return `${this._provider.value}/${this._modelName}`;
  }
}
