import { setTimeout } from "node:timers/promises";
import { redis } from "./redis";
import { logger } from "~/utils/logger";

export interface RateLimitConfig {
  // Maximum number of requests
  maxRequests: number;
  // Time window in milliseconds
  windowMs: number;
  keyPrefix?: string;
  // Maximum number of retries before failing
  maxRetries?: number;
}

export interface GlobalRateLimitResult {
  isAllowed: boolean;
  remainingRequests: number;
  // Unix timestamp when the window resets
  resetTimeMs: number;
  // Current number of requests in window
  requestCount: number;
  // Wait for the rate limit to reset,
  // passing a maximum number of retries
  // to avoid infinite recursion
  retry: () => Promise<boolean>;
}

/**
 * Records a new request in the rate limit window
 */
export async function recordGlobalRequest({
  windowMs,
  keyPrefix = "global_rate_limit",
}: Pick<RateLimitConfig, "windowMs" | "keyPrefix">): Promise<void> {
  const now = Date.now();
  const windowStartTimestamp = Math.floor(now / windowMs) * windowMs;
  const key = `${keyPrefix}:${windowStartTimestamp}`;

  try {
    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, Math.ceil(windowMs / 1000));

    const results = await pipeline.exec();

    if (!results) {
      throw new Error("Redis pipeline execution failed");
    }
  } catch (error) {
    logger.error("Rate limit recording failed", {
      error: error instanceof Error ? error.message : String(error),
      keyPrefix,
      windowMs,
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Checks if a request is allowed under the current rate limit
 * without incrementing the counter
 */
export async function checkGlobalRateLimit({
  maxRequests,
  windowMs,
  keyPrefix = "global_rate_limit",
  maxRetries = 3,
}: RateLimitConfig): Promise<GlobalRateLimitResult> {
  const now = Date.now();
  const windowStartTimestamp = Math.floor(now / windowMs) * windowMs;
  const key = `${keyPrefix}:${windowStartTimestamp}`;

  try {
    const currentCount = await redis.get(key);
    const requestCount = currentCount ? parseInt(currentCount, 10) : 0;

    const isAllowed = requestCount < maxRequests;
    const remainingRequests = Math.max(0, maxRequests - requestCount);
    const resetTimeMs = windowStartTimestamp + windowMs;

    let currentRetryAttempt = 0;

    const retry = async (): Promise<boolean> => {
      if (!isAllowed) {
        const waitTime = resetTimeMs - Date.now();
        if (waitTime > 0) {
          await setTimeout(waitTime);
        }

        // Check rate limit again after waiting
        const retryResult = await checkGlobalRateLimit({
          maxRequests,
          windowMs,
          keyPrefix,
          maxRetries,
        });

        if (!retryResult.isAllowed) {
          if (currentRetryAttempt >= maxRetries) {
            return false;
          }
          currentRetryAttempt++;
          return await retryResult.retry();
        }
        return true;
      }
      return true;
    };

    return {
      isAllowed,
      remainingRequests,
      resetTimeMs,
      requestCount,
      retry,
    };
  } catch (error) {
    logger.error("Rate limit check failed", {
      error: error instanceof Error ? error.message : String(error),
      keyPrefix,
      windowMs,
      maxRequests,
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Fail open - allow the request if Redis fails
    return {
      isAllowed: true,
      remainingRequests: maxRequests - 1,
      resetTimeMs: windowStartTimestamp + windowMs,
      requestCount: 0,
      retry: async () => true,
    };
  }
}
