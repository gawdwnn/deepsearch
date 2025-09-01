import { env } from "~/lib/env";
import Redis from "ioredis";

export const redis = new Redis(env.REDIS_URL);

const CACHE_EXPIRY_SECONDS = 60 * 60 * 6; // 6 hours
const CACHE_KEY_SEPARATOR = ":";

export const cache = <
  T,
  TArgs extends unknown[],
  TFunc extends (...args: TArgs) => Promise<T>,
>(
  keyPrefix: string,
  fn: TFunc,
): TFunc => {
  return (async (...args: Parameters<TFunc>): Promise<T> => {
    const key = `${keyPrefix}${CACHE_KEY_SEPARATOR}${JSON.stringify(args)}`;
    const cachedResult = await redis.get(key);
    if (cachedResult) {
      console.log(`Cache hit for ${key}`);
      return JSON.parse(cachedResult) as T;
    }

    const result = await fn(...args);
    await redis.set(key, JSON.stringify(result), "EX", CACHE_EXPIRY_SECONDS);
    return result;
  }) as TFunc;
};
