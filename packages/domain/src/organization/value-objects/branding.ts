import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/;
const MAX_URL_LENGTH = 2048;

export interface BrandingProps {
  /** Absolute URL of the logo asset; storage is an infrastructure concern. */
  readonly logoUrl?: string;
  /** Six-digit lowercase hex color, e.g. `#1a2b3c`. */
  readonly primaryColor?: string;
  readonly accentColor?: string;
}

/**
 * The organization's visual identity applied across its workspaces.
 * Deliberately minimal — theming systems build on top of these tokens.
 */
export class Branding extends ValueObject<Branding> {
  private constructor(private readonly props: Readonly<BrandingProps>) {
    super();
  }

  static create(props: BrandingProps = {}): Branding {
    if (props.logoUrl !== undefined) {
      if (props.logoUrl.length > MAX_URL_LENGTH || !URL.canParse(props.logoUrl)) {
        throw new ValidationError('Branding logo URL is malformed', { logoUrl: props.logoUrl });
      }
    }
    for (const key of ['primaryColor', 'accentColor'] as const) {
      const color = props[key];
      if (color !== undefined && !HEX_COLOR_PATTERN.test(color.toLowerCase())) {
        throw new ValidationError(`Branding ${key} must be a six-digit hex color`, {
          [key]: color,
        });
      }
    }
    return new Branding(
      Object.freeze({
        logoUrl: props.logoUrl,
        primaryColor: props.primaryColor?.toLowerCase(),
        accentColor: props.accentColor?.toLowerCase(),
      }),
    );
  }

  static none(): Branding {
    return new Branding(Object.freeze({}));
  }

  get logoUrl(): string | undefined {
    return this.props.logoUrl;
  }

  get primaryColor(): string | undefined {
    return this.props.primaryColor;
  }

  get accentColor(): string | undefined {
    return this.props.accentColor;
  }

  equals(other: unknown): boolean {
    return other instanceof Branding && this.deepEquals(other.props, this.props);
  }

  toString(): string {
    return JSON.stringify(this.props);
  }
}
