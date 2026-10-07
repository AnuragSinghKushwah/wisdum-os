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
}

export class QueueProcessor {
  private readonly handlers = new Map<string, JobHandler<unknown>>();
  private readonly pendingJobs: JobPayload<unknown>[] = [];
  private isProcessing = false;

  constructor(private readonly options: QueueProcessorOptions = {}) {}

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
          console.error(`Queue job ${job.jobId} (${job.type}) failed:`, cause);
        }
      }
    }
    this.isProcessing = false;

    if (this.pendingJobs.length > 0) {
      void this.processNext();
    }
  }
}
