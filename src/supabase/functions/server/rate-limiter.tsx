// Rate limiting implementation using in-memory store
// For production, consider using Redis or a dedicated rate limiting service

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

export interface RateLimitConfig {
  requests: number; // Max requests allowed
  windowMs: number; // Time window in milliseconds
}

export const DEFAULT_RATE_LIMITS = {
  // Auth endpoints
  auth: { requests: 5, windowMs: 15 * 60 * 1000 }, // 5 requests per 15 minutes
  login: { requests: 10, windowMs: 15 * 60 * 1000 }, // 10 requests per 15 minutes
  signup: { requests: 3, windowMs: 60 * 60 * 1000 }, // 3 requests per hour

  // API endpoints
  api: { requests: 100, windowMs: 60 * 1000 }, // 100 requests per minute
  
  // Payment endpoints (stricter)
  payment: { requests: 5, windowMs: 60 * 1000 }, // 5 requests per minute
  
  // File upload endpoints
  upload: { requests: 20, windowMs: 60 * 1000 }, // 20 uploads per minute
};

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = identifier;
  
  let entry = rateLimitStore.get(key);

  if (!entry || entry.resetTime < now) {
    // Create new entry
    entry = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);
    return {
      allowed: true,
      remaining: config.requests - 1,
      resetTime: entry.resetTime,
    };
  }

  if (entry.count < config.requests) {
    entry.count++;
    return {
      allowed: true,
      remaining: config.requests - entry.count,
      resetTime: entry.resetTime,
    };
  }

  return {
    allowed: false,
    remaining: 0,
    resetTime: entry.resetTime,
  };
}

export function getRateLimitHeaders(result: {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}): Record<string, string> {
  return {
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetTime / 1000)),
  };
}
