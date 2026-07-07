import { SystemClock } from '@wisdum/domain';
import { InMemoryEventBus, KebabSlugGenerator, UuidGenerator } from '@wisdum/infrastructure';
import type { Container, KernelModule } from '@wisdum/kernel';
import { CLOCK, EVENT_BUS, ID_GENERATOR, SLUG_GENERATOR } from '../tokens.js';

/** Registers the shared singletons every other module depends on. */
export class CoreModule implements KernelModule {
  readonly name = 'core';

  register(container: Container): void {
    container.registerValue(CLOCK, SystemClock.instance());
    container.registerValue(ID_GENERATOR, new UuidGenerator());
    container.registerValue(SLUG_GENERATOR, new KebabSlugGenerator());
    container.registerValue(EVENT_BUS, new InMemoryEventBus());
  }
}
