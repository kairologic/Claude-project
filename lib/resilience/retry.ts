/**
 * lib/resilience/retry.ts
 *
 * #79d-f — Exponential backoff retry + circuit breaker utilities.
 * Used by email notifications, FHIR client, NPPES monitor, and cron jobs.
 */

// ── Retry with exponential backoff ─────────────────────────────

export interface RetryOptions {
  /** Maximum number of attempts (default: 3) */
  maxAttempts?: number;
  /** Base delay in ms (default: 1000) */
  baseDelay?: number;
  /** Maximum delay in ms (default: 30000) */
  maxDelay?: number;
  /** Jitter factor 0-1 to randomize delays (default: 0.2) */
  jitter?: number;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
  /** Called on each retry with attempt number and error */
  onRetry?: (attempt: number, error: Error, nextDelay: number) => void;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalDuration: number;
}

/**
 * Execute a function with exponential backoff retry.
 * Delays: baseDelay, baseDelay*2, baseDelay*4, ... up to maxDelay.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<RetryResult<T>> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    jitter = 0.2,
    signal,
    onRetry,
  } = opts;

  const startTime = Date.now();
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (signal?.aborted) {
      return {
        success: false,
        error: new Error('Retry aborted'),
        attempts: attempt,
        totalDuration: Date.now() - startTime,
      };
    }

    try {
      const data = await fn();
      return {
        success: true,
        data,
        attempts: attempt,
        totalDuration: Date.now() - startTime,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < maxAttempts) {
        // Calculate delay with exponential backoff + jitter
        let delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
        const jitterAmount = delay * jitter * (Math.random() * 2 - 1);
        delay = Math.max(0, delay + jitterAmount);

        onRetry?.(attempt, lastError, delay);

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  return {
    success: false,
    error: lastError,
    attempts: maxAttempts,
    totalDuration: Date.now() - startTime,
  };
}

// ── Circuit Breaker ────────────────────────────────────────────

export type CircuitState = 'closed' | 'open' | 'half_open';

export interface CircuitBreakerOptions {
  /** Failures before opening (default: 5) */
  failureThreshold?: number;
  /** Time in ms before half-open (default: 60000) */
  resetTimeout?: number;
  /** Successes in half-open before closing (default: 2) */
  halfOpenSuccesses?: number;
}

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private successes = 0;
  private lastFailure = 0;
  private readonly failureThreshold: number;
  private readonly resetTimeout: number;
  private readonly halfOpenSuccesses: number;

  constructor(opts: CircuitBreakerOptions = {}) {
    this.failureThreshold = opts.failureThreshold ?? 5;
    this.resetTimeout = opts.resetTimeout ?? 60_000;
    this.halfOpenSuccesses = opts.halfOpenSuccesses ?? 2;
  }

  get currentState(): CircuitState {
    if (this.state === 'open') {
      // Check if reset timeout has elapsed
      if (Date.now() - this.lastFailure >= this.resetTimeout) {
        this.state = 'half_open';
        this.successes = 0;
      }
    }
    return this.state;
  }

  get isAvailable(): boolean {
    return this.currentState !== 'open';
  }

  /**
   * Execute a function through the circuit breaker.
   * Throws immediately if circuit is open.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const state = this.currentState;

    if (state === 'open') {
      throw new Error(
        `Circuit breaker is OPEN — service unavailable. ` +
          `Resets in ${Math.ceil((this.resetTimeout - (Date.now() - this.lastFailure)) / 1000)}s`,
      );
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (err) {
      this.recordFailure();
      throw err;
    }
  }

  private recordSuccess(): void {
    this.failures = 0;
    if (this.state === 'half_open') {
      this.successes++;
      if (this.successes >= this.halfOpenSuccesses) {
        this.state = 'closed';
        this.successes = 0;
      }
    }
  }

  private recordFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();
    if (this.failures >= this.failureThreshold) {
      this.state = 'open';
    }
  }

  /** Reset the circuit breaker to closed state */
  reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.successes = 0;
  }

  /** Get current metrics */
  getMetrics(): {
    state: CircuitState;
    failures: number;
    successes: number;
    lastFailure: number;
  } {
    return {
      state: this.currentState,
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailure,
    };
  }
}

// ── Timeout wrapper ───────────────────────────────────────────

/**
 * Wraps a promise with a timeout.
 * Consistent timeout behavior across all external calls.
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  label = 'Operation',
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const result = await fn();
    return result;
  } catch (err) {
    if (controller.signal.aborted) {
      throw new Error(`${label} timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
