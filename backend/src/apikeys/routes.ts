import { Router } from "express";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { pool } from "../db.js";
import { requireAuth } from "../auth/middleware.js";
import { currentBillingPeriod, hashApiKey, MONTHLY_LIMIT } from "./middleware.js";
import { redis } from "../redis.js";

export const apiKeyRoutes = Router();
apiKeyRoutes.use(requireAuth);

const createBody = z.object({ name: z.string().min(1).max(100) });

apiKeyRoutes.get("/", async (req, res) => {
  const userId = req.user!.sub;
  const period = currentBillingPeriod();
  const { rows } = await pool.query(
    `SELECT k.id, k.name, k.key_prefix, k.created_at, k.last_used_at, k.revoked_at,
            COALESCE(u.count, 0) AS used
     FROM api_keys k
     LEFT JOIN api_key_usage u ON u.key_id = k.id AND u.period = $2
     WHERE k.user_id = $1
     ORDER BY k.created_at DESC`,
    [userId, period],
  );
  // hydrate from redis for live counts
  const keys = await Promise.all(
    rows.map(async (r) => {
      const live = await redis.get(`apikey:${r.id}:${period}`);
      const used = live ? Number(live) : Number(r.used);
      return {
        id: r.id,
        name: r.name,
        prefix: r.key_prefix,
        createdAt: r.created_at,
        lastUsedAt: r.last_used_at,
        revokedAt: r.revoked_at,
        used,
        limit: MONTHLY_LIMIT,
      };
    }),
  );
  res.json({ keys });
});

apiKeyRoutes.post("/", async (req, res) => {
  const parsed = createBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const userId = req.user!.sub;
  const raw = `ff_live_${randomBytes(24).toString("hex")}`;
  const prefix = raw.slice(0, 16); // ff_live_ + first 8 hex chars
  const { rows } = await pool.query(
    `INSERT INTO api_keys (user_id, name, key_prefix, key_hash)
     VALUES ($1,$2,$3,$4)
     RETURNING id, name, key_prefix, created_at`,
    [userId, parsed.data.name, prefix, hashApiKey(raw)],
  );
  res.json({
    key: raw, // shown ONCE
    id: rows[0].id,
    name: rows[0].name,
    prefix: rows[0].key_prefix,
    createdAt: rows[0].created_at,
    limit: MONTHLY_LIMIT,
  });
});

apiKeyRoutes.delete("/:id", async (req, res) => {
  const userId = req.user!.sub;
  await pool.query(
    "UPDATE api_keys SET revoked_at = now() WHERE id = $1 AND user_id = $2",
    [req.params.id, userId],
  );
  res.json({ ok: true });
});
