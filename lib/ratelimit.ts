interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

const WINDOW_SIZE_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 20;

export function checkRateLimit(ip: string): {
  success: boolean;
  limit: number;
  remaining: number;
  resetInMs: number;
} {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, {
      count: 1,
      resetTime: now + WINDOW_SIZE_MS,
    });
    return {
      success: true,
      limit: MAX_REQUESTS_PER_WINDOW,
      remaining: MAX_REQUESTS_PER_WINDOW - 1,
      resetInMs: WINDOW_SIZE_MS,
    };
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return {
      success: false,
      limit: MAX_REQUESTS_PER_WINDOW,
      remaining: 0,
      resetInMs: record.resetTime - now,
    };
  }

  record.count += 1;
  return {
    success: true,
    limit: MAX_REQUESTS_PER_WINDOW,
    remaining: MAX_REQUESTS_PER_WINDOW - record.count,
    resetInMs: record.resetTime - now,
  };
}
