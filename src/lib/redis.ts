import "server-only";
import { readConfig } from "./config";

let _redis: import("ioredis").default | null = null;

export function getRedis(): import("ioredis").default | null {
  if (_redis) return _redis;

  try {
    const cfg = readConfig();
    if (!cfg.redis?.url) return null;

    // Dynamic require to avoid bundling issues
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Redis = require("ioredis").default || require("ioredis");
    _redis = new Redis(cfg.redis.url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
    });
    return _redis;
  } catch {
    return null;
  }
}

export function resetRedis() {
  if (_redis) {
    _redis.disconnect();
    _redis = null;
  }
}
