import { createLogger } from '@wisdum/logger';
import type { Logger } from '@wisdum/logger';

export interface JobPayload<T = unknown> {
  readonly jobId: string;
  readonly type: string;
  readonly data: T;
  readonly createdAt: string;
}

export type JobHandler<T = unknown> = (payload: JobPayload<T>) => Promise<void>;

export interface QueueProcessorOptions {
  readonly redisUrl?: string;
  readonly concurrency?: number;
  readonly logger?: Logger;
}

export class QueueProcessor {
  private readonly handlers = new Map<string, JobHandler<unknown>>();
  private readonly pendingJobs: JobPayload<unknown>[] = [];
  private readonly logger: Logger;
  private isProcessing = false;

  constructor(private readonly options: QueueProcessorOptions = {}) {
    this.logger = options.logger ?? createLogger('jobs');
  }

  registerHandler<T>(type: string, handler: JobHandler<T>): void {
    this.handlers.set(type, handler as JobHandler<unknown>);
  }

  async enqueue<T>(type: string, data: T): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const payload: JobPayload<T> = {
      jobId,
      type,
      data,
      createdAt: new Date().toISOString(),
    };

    this.pendingJobs.push(payload as JobPayload<unknown>);
    void this.processNext();
    return jobId;
  }

  private async processNext(): Promise<void> {
    if (this.isProcessing || this.pendingJobs.length === 0) return;

    this.isProcessing = true;
    const job = this.pendingJobs.shift();
    if (job) {
      const handler = this.handlers.get(job.type);
      if (handler) {
        try {
          await handler(job);
        } catch (cause) {
          this.logger.error('Queue job failed', {
            jobId: job.jobId,
            type: job.type,
            error: cause instanceof Error ? cause.message : cause,
          });
        }
      }
    }
    this.isProcessing = false;

    if (this.pendingJobs.length > 0) {
      void this.processNext();
    }
  }
}
