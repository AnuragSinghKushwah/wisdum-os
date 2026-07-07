import type { EventBus } from '@wisdum/events';
import { createToken } from '../di/token.js';

/**
 * DI token under which the active EventBus is registered. The kernel does
 * not implement transports — `@wisdum/infrastructure` provides the
 * in-memory bus; brokers arrive as plugins.
 */
export const EVENT_BUS = createToken<EventBus>('kernel.event-bus');
