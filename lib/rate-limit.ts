import { redis } from "@/lib/redis";

const WINDOW_SECONDS = 15 * 60;
const MAX_ATTEMPTS = 3;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number | null;
}

export async function checkRateLimit(
  identifier: string,
): Promise<RateLimitResult> {
  const key = `pwd_reset:ratelimit:${identifier}`;

  const attempts = await redis.incr(key);

  if (attempts === 1) {
    await redis.expire(key, WINDOW_SECONDS);
  }

  if (attempts > MAX_ATTEMPTS) {
    const ttl = await redis.ttl(key);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: ttl > 0 ? ttl : WINDOW_SECONDS,
    };
  }

  return {
    allowed: true,
    remaining: MAX_ATTEMPTS - attempts,
    retryAfterSeconds: null,
  };
}