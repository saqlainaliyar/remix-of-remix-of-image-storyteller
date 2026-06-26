import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { cacheDel, cacheGet, cacheSet, redis } from "../redis.js";
import { requireAuth } from "../auth/middleware.js";
import { renderTemplate } from "./render.js";

export const templateRoutes = Router();
templateRoutes.use(requireAuth);

const layerPatch = z.record(z.string(), z.any());

const templateBody = z.object({
  name: z.string().min(1).max(200),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  layers: z.array(z.any()),
  thumbnail: z.string().optional(),
});

function tplKey(id: string) { return `tpl:${id}`; }
function listKey(userId: string) { return `tpl:list:${userId}`; }
function historyKey(userId: string, id: string) { return `history:${userId}:${id}`; }
function autosaveKey(userId: string, id: string) { return `autosave:${userId}:${id}`; }

async function loadTemplate(userId: string, id: string) {
  const cached = await cacheGet<any>(tplKey(id));
  if (cached && cached.user_id === userId) return cached;
  const { rows } = await pool.query(
    "SELECT id, user_id, name, width, height, data, thumbnail_path, updated_at FROM templates WHERE id = $1 AND user_id = $2",
    [id, userId],
  );
  if (!rows[0]) return null;
  await cacheSet(tplKey(id), rows[0], 300);
  return rows[0];
}

function rowToTemplate(row: any) {
  return {
    id: row.id,
    name: row.name,
    width: row.width,
    height: row.height,
    layers: row.data?.layers ?? [],
    thumbnail: row.thumbnail_path ?? row.data?.thumbnail,
    createdAt: row.data?.createdAt ?? Date.parse(row.updated_at),
    updatedAt: Date.parse(row.updated_at),
  };
}

templateRoutes.get("/", async (req, res) => {
  const userId = req.user!.sub;
  const cached = await cacheGet<any[]>(listKey(userId));
  if (cached) return res.json({ templates: cached });
  const { rows } = await pool.query(
    "SELECT id, name, width, height, data, thumbnail_path, updated_at FROM templates WHERE user_id = $1 ORDER BY updated_at DESC",
    [userId],
  );
  const list = rows.map(rowToTemplate);
  await cacheSet(listKey(userId), list, 30);
  res.json({ templates: list });
});

templateRoutes.post("/", async (req, res) => {
  const parsed = templateBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid template" });
  const t = parsed.data;
  const userId = req.user!.sub;
  const { rows } = await pool.query(
    `INSERT INTO templates (user_id, name, width, height, data)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING id, name, width, height, data, thumbnail_path, updated_at`,
    [userId, t.name, t.width, t.height, { layers: t.layers, thumbnail: t.thumbnail, createdAt: Date.now() }],
  );
  await cacheDel(listKey(userId));
  res.json({ template: rowToTemplate(rows[0]) });
});

templateRoutes.get("/:id", async (req, res) => {
  const row = await loadTemplate(req.user!.sub, req.params.id);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json({ template: rowToTemplate(row) });
});

templateRoutes.put("/:id", async (req, res) => {
  const parsed = templateBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid template" });
  const t = parsed.data;
  const userId = req.user!.sub;
  const { rows } = await pool.query(
    `UPDATE templates SET name=$1, width=$2, height=$3, data=$4, thumbnail_path=$5, updated_at=now()
     WHERE id=$6 AND user_id=$7
     RETURNING id, name, width, height, data, thumbnail_path, updated_at`,
    [t.name, t.width, t.height, { layers: t.layers, thumbnail: t.thumbnail }, t.thumbnail ?? null, req.params.id, userId],
  );
  if (!rows[0]) return res.status(404).json({ error: "Not found" });
  await cacheDel(tplKey(req.params.id), listKey(userId));
  res.json({ template: rowToTemplate(rows[0]) });
});

templateRoutes.delete("/:id", async (req, res) => {
  const userId = req.user!.sub;
  await pool.query("DELETE FROM templates WHERE id=$1 AND user_id=$2", [req.params.id, userId]);
  await cacheDel(tplKey(req.params.id), listKey(userId));
  res.json({ ok: true });
});

templateRoutes.patch("/:id/layers/:layerName", async (req, res) => {
  const userId = req.user!.sub;
  const patch = layerPatch.parse(req.body);
  const row = await loadTemplate(userId, req.params.id);
  if (!row) return res.status(404).json({ error: "Not found" });
  const layers: any[] = row.data?.layers ?? [];
  const idx = layers.findIndex((l) => l.name === req.params.layerName);
  if (idx < 0) return res.status(404).json({ error: `Layer "${req.params.layerName}" not found` });

  // push prior state to history (Redis list, capped at 50)
  await redis.lpush(historyKey(userId, req.params.id), JSON.stringify({ layers }));
  await redis.ltrim(historyKey(userId, req.params.id), 0, 49);

  layers[idx] = deepMerge(layers[idx], patch);
  const newData = { ...row.data, layers };
  const { rows } = await pool.query(
    "UPDATE templates SET data=$1, updated_at=now() WHERE id=$2 AND user_id=$3 RETURNING id, name, width, height, data, thumbnail_path, updated_at",
    [newData, req.params.id, userId],
  );
  await cacheDel(tplKey(req.params.id), listKey(userId));
  res.json({ template: rowToTemplate(rows[0]), patchedLayer: layers[idx] });
});

templateRoutes.post("/:id/autosave", async (req, res) => {
  const userId = req.user!.sub;
  await redis.set(autosaveKey(userId, req.params.id), JSON.stringify(req.body), "EX", 60 * 60 * 24);
  res.json({ ok: true });
});

templateRoutes.get("/:id/autosave", async (req, res) => {
  const userId = req.user!.sub;
  const data = await redis.get(autosaveKey(userId, req.params.id));
  res.json({ data: data ? JSON.parse(data) : null });
});

templateRoutes.post("/:id/undo", async (req, res) => {
  const userId = req.user!.sub;
  const popped = await redis.lpop(historyKey(userId, req.params.id));
  if (!popped) return res.status(204).end();
  const prev = JSON.parse(popped);
  const row = await loadTemplate(userId, req.params.id);
  if (!row) return res.status(404).json({ error: "Not found" });
  const newData = { ...row.data, layers: prev.layers };
  const { rows } = await pool.query(
    "UPDATE templates SET data=$1, updated_at=now() WHERE id=$2 AND user_id=$3 RETURNING id, name, width, height, data, thumbnail_path, updated_at",
    [newData, req.params.id, userId],
  );
  await cacheDel(tplKey(req.params.id), listKey(userId));
  res.json({ template: rowToTemplate(rows[0]) });
});

templateRoutes.post("/:id/render", async (req, res) => {
  const userId = req.user!.sub;
  const row = await loadTemplate(userId, req.params.id);
  if (!row) return res.status(404).json({ error: "Not found" });
  const patches: Array<{ name: string; patch: any }> = req.body?.patches ?? [];
  const layers = (row.data?.layers ?? []).map((l: any) => {
    const p = patches.find((x) => x.name === l.name);
    return p ? deepMerge(l, p.patch) : l;
  });
  const result = await renderTemplate({
    id: row.id,
    userId,
    name: row.name,
    width: row.width,
    height: row.height,
    layers,
  });
  res.json(result);
});

function deepMerge<A extends Record<string, any>, B extends Record<string, any>>(a: A, b: B): A & B {
  const out: any = { ...a };
  for (const k of Object.keys(b)) {
    const av = (a as any)[k];
    const bv = (b as any)[k];
    if (av && bv && typeof av === "object" && typeof bv === "object" && !Array.isArray(av) && !Array.isArray(bv)) {
      out[k] = deepMerge(av, bv);
    } else {
      out[k] = bv;
    }
  }
  return out;
}
