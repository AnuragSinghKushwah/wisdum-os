/**
 * Isolation boundary a plugin's code runs within. A real sandbox would
 * restrict global access and enforce the plugin's granted permissions;
 * this phase only fixes the shape of that boundary.
 */
export interface Sandbox {
  run<T>(fn: () => T | Promise<T>): Promise<T>;
}

/**
 * No isolation — runs the function directly in-process. Suitable only for
 * trusted, first-party plugins until a real sandbox (worker threads, a VM
 * context) lands behind this same interface.
 */
export class PassthroughSandbox implements Sandbox {
  async run<T>(fn: () => T | Promise<T>): Promise<T> {
    return await fn();
  }
}
