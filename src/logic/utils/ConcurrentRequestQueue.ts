/**
 * 并发请求队列
 *
 * 特性：
 * - 支持动态控制最大并发数
 * - 请求完成后立即填充新请求（不是等一批全部完成）
 * - 自动重试机制
 * - 错误处理
 */

export interface RetryOptions {
  /** 最大重试次数 */
  maxRetries: number;
  /** 重试延迟（毫秒） */
  retryDelayMs: number;
  /** 是否使用指数退避 */
  exponentialBackoff?: boolean;
}

export interface RequestTask<T> {
  id: string;
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
  retries: number;
}

export class ConcurrentRequestQueue {
  private maxConcurrent: number;
  private retryOptions: RetryOptions;
  private running = 0;
  private queue: RequestTask<unknown>[] = [];

  constructor(maxConcurrent: number, retryOptions: RetryOptions) {
    this.maxConcurrent = maxConcurrent;
    this.retryOptions = retryOptions;
  }

  /**
   * 更新最大并发数
   */
  public setMaxConcurrent(value: number): void {
    this.maxConcurrent = value;
    // 如果有空闲容量，立即处理队列中的请求
    while (this.running < this.maxConcurrent && this.queue.length > 0) {
      const task = this.queue.shift()!;
      this.executeTask(task);
    }
  }

  /**
   * 添加请求到队列
   */
  public async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const task: RequestTask<T> = {
        id: this.generateId(),
        fn,
        resolve,
        reject,
        retries: 0,
      };

      if (this.running < this.maxConcurrent) {
        this.executeTask(task);
      } else {
        this.queue.push(task as RequestTask<unknown>);
      }
    });
  }

  /**
   * 批量添加请求
   * 返回结果数组，保持输入顺序
   */
  public async addAll<T>(fns: Array<() => Promise<T>>): Promise<T[]> {
    const promises = fns.map((fn) => this.add(fn));
    return Promise.all(promises);
  }

  /**
   * 获取当前运行中的请求数量
   */
  public get runningCount(): number {
    return this.running;
  }

  /**
   * 获取队列中等待的请求数量
   */
  public get queueCount(): number {
    return this.queue.length;
  }

  /**
   * 清空队列
   */
  public clear(): void {
    this.queue.forEach((task) => {
      task.reject(new Error("Queue cleared"));
    });
    this.queue = [];
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  private async executeTask<T>(task: RequestTask<T>): Promise<void> {
    this.running++;

    try {
      const result = await task.fn();
      task.resolve(result);
    } catch (error) {
      // 判断是否需要重试
      const shouldRetry = this.shouldRetry(error, task.retries);

      if (shouldRetry) {
        // 延迟后重新加入队列
        const delay = this.getRetryDelay(task.retries);
        task.retries++;

        // 使用 setTimeout 延迟重试
        setTimeout(() => {
          this.queue.unshift(task as RequestTask<unknown>);
          // 立即尝试执行
          if (this.running < this.maxConcurrent) {
            const nextTask = this.queue.shift();
            if (nextTask) {
              this.executeTask(nextTask);
            }
          }
        }, delay);
      } else {
        // 不再重试，返回错误
        task.reject(error);
      }
    } finally {
      this.running--;
      // 处理下一个队列中的请求
      this.processQueue();
    }
  }

  private processQueue(): void {
    while (this.running < this.maxConcurrent && this.queue.length > 0) {
      const task = this.queue.shift()!;
      this.executeTask(task);
    }
  }

  private shouldRetry(error: unknown, retries: number): boolean {
    // 超过最大重试次数
    if (retries >= this.retryOptions.maxRetries) {
      return false;
    }

    // 判断是否是可重试的错误
    return this.isRetriableError(error);
  }

  private isRetriableError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return true; // 未知错误类型，允许重试
    }

    // 网络错误、超时错误等可重试
    const nonRetriableMessages = [
      "Authentication required",
      "Unknown table",
      "Composite key",
      "Empty where clause",
    ];

    for (const msg of nonRetriableMessages) {
      if (error.message.includes(msg)) {
        return false;
      }
    }

    // 以下错误类型可重试
    const retriableNames = [
      "TypeError",
      "NetworkError",
      "AbortError",
      "TimeoutError",
    ];

    if (retriableNames.some((name) => error.name.includes(name))) {
      return true;
    }

    // 包含网络相关关键词的错误
    const retriableMessages = [
      "Failed to fetch",
      "NetworkError",
      "timeout",
      "ETIMEDOUT",
      "ECONNRESET",
      "ECONNREFUSED",
    ];

    return retriableMessages.some((msg) =>
      error.message.toLowerCase().includes(msg.toLowerCase())
    );
  }

  private getRetryDelay(retries: number): number {
    const { retryDelayMs, exponentialBackoff } = this.retryOptions;

    if (exponentialBackoff) {
      // 指数退避：delay * 2^retries
      return retryDelayMs * Math.pow(2, retries);
    }

    return retryDelayMs;
  }
}

/**
 * 全局并发请求队列实例
 * 使用单例模式，确保整个应用共享同一个队列
 */
class GlobalRequestQueue {
  private instance: ConcurrentRequestQueue | null = null;

  public getInstance(): ConcurrentRequestQueue {
    if (!this.instance) {
      // 默认配置，实际使用时应该通过设置获取
      this.instance = new ConcurrentRequestQueue(10, {
        maxRetries: 3,
        retryDelayMs: 500,
        exponentialBackoff: true,
      });
    }
    return this.instance;
  }

  public setInstance(queue: ConcurrentRequestQueue): void {
    this.instance = queue;
  }
}

export const globalRequestQueue = new GlobalRequestQueue();
