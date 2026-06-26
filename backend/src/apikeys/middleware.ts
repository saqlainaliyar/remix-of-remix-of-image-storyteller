import type { NextFunction, Request, Response } from "express";
import { createHash } from "node:crypto";
import { pool } from "../db.js";
import { redis } from "../redis.js";

export const MONTHLY_LIMIT = 30;

function currentPeriod() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function nextPeriodResetISO() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString();
}

function hashKey(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

function extractKey(req: Request): string | null {
  const h = req.headers.authorization;
  if (h?.startsWith("Bearer ")) return h.slice(7).trim();
  const x = req.headers["x-api-key"];
  if (typeof x === "string") return x.trim();
  return null;
}

export async function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const raw = extractKey(req);
  if (!raw || !raw.startsWith("ff_live_")) {
    return res.status(401).json({ error: "Missing or invalid API key" });
  }
  const key_hash = hashKey(raw);
  const { rows } = await pool.query(
    "SELECT id, user_id, revoked_at FROM api_keys WHERE key_hash = $1",
    [key_hash],
  );
  const row = rows[0];
  if (!row || row.revoked_at) {
    return res.status(401).json({ error: "Invalid API key" });
  }

  const period = currentPeriod();
  const redisKey = `apikey:${row.id}:${period}`;
  const count = await redis.incr(redisKey);
  if (count === 1) {
    // expire roughly two months out so the counter survives till month rollover
    await redis.expire(redisKey, 60 * 60 * 24 * 62);
  }
  if (count > MONTHLY_LIMIT) {
    const resetsAt = nextPeriodResetISO();
    res.setHeader("X-RateLimit-Limit", String(MONTHLY_LIMIT));
    res.setHeader("X-RateLimit-Remaining", "0");
    res.setHeader("X-RateLimit-Reset", resetsAt);
    return res.status(429).json({
      error: "Monthly limit reached",
      limit: MONTHLY_LIMIT,
      used: MONTHLY_LIMIT,
      resetsAt,
    });
  }

  // best-effort persistence (non-blocking semantics)
  void pool
    .query(
      `INSERT INTO api_key_usage (key_id, period, count) VALUES ($1, $2, 1)
       ON CONFLICT (key_id, period) DO UPDATE SET count = api_key_usage.count + 1`,
      [row.id, period],
    )
    .catch((e) => console.error("usage persist failed", e));
  void pool
    .query("UPDATE api_keys SET last_used_at = now() WHERE id = $1", [row.id])
    .catch(() => {});

  res.setHeader("X-RateLimit-Limit", String(MONTHLY_LIMIT));
  res.setHeader("X-RateLimit-Remaining", String(Math.max(0, MONTHLY_LIMIT - count)));
  // shape user as the JWT middleware does, so handlers can read req.user!.sub
  req.user = { sub: row.user_id, email: "", jti: `apikey:${row.id}` } as any;
  next();
}

export function hashApiKey(raw: string) {
  return hashKey(raw);
}

export function currentBillingPeriod() {
  return currentPeriod();
}
