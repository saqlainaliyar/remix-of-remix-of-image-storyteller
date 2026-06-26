import Redis from "ioredis";
import { env } from "./env.js";

export const redis = new Redis(env.REDIS_URL, { lazyConnect: false });

export async function cacheGet<T>(key: string): Promise<T | null> {
  const v = await redis.get(key);
  return v ? (JSON.parse(v) as T) : null;
}

export async function cacheSet(key: string, value: unknown, ttlSec = 300) {
  await redis.set(key, JSON.stringify(value), "EX", ttlSec);
}

export async function cacheDel(...keys: string[]) {
  if (keys.length) await redis.del(...keys);
}
