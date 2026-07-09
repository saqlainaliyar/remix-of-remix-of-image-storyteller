import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { requireApiKey } from "../apikeys/middleware.js";
import { renderTemplate } from "../templates/render.js";
import { applyModification, applyModifications, type Modification } from "../templates/modifications.js";

export const v1Routes = Router();
v1Routes.use(requireApiKey);

function rowToTemplate(row: any) {
  return {
    id: row.id,
    name: row.name,
    width: row.width,
    height: row.height,
    layers: row.data?.layers ?? [],
    thumbnail: row.thumbnail_path ?? row.data?.thumbnail,
    updatedAt: row.updated_at,
  };
}

v1Routes.get("/templates", async (req, res) => {
  const userId = req.user!.sub;
  const { rows } = await pool.query(
    "SELECT id, name, width, height, data, thumbnail_path, updated_at FROM templates WHERE user_id = $1 ORDER BY updated_at DESC",
    [userId],
  );
  res.json({ templates: rows.map(rowToTemplate) });
});

v1Routes.get("/templates/:id", async (req, res) => {
  const userId = req.user!.sub;
  const { rows } = await pool.query(
    "SELECT id, name, width, height, data, thumbnail_path, updated_at FROM templates WHERE id = $1 AND user_id = $2",
    [req.params.id, userId],
  );
  if (!rows[0]) return res.status(404).json({ error: "Not found" });
  res.json({ template: rowToTemplate(rows[0]) });
});

const patchBody = z.record(z.string(), z.any());

v1Routes.patch("/templates/:id/layers/:layerName", async (req, res) => {
  const userId = req.user!.sub;
  const patch = patchBody.parse(req.body);
  const { rows } = await pool.query(
    "SELECT id, name, width, height, data, thumbnail_path, updated_at FROM templates WHERE id = $1 AND user_id = $2",
    [req.params.id, userId],
  );
  const row = rows[0];
  if (!row) return res.status(404).json({ error: "Not found" });
  const layers: any[] = row.data?.layers ?? [];
  const idx = layers.findIndex((l) => l.name === req.params.layerName);
  if (idx < 0) return res.status(404).json({ error: `Layer "${req.params.layerName}" not found` });
  // Accept either Bannerbear-flat modification fields or a deep-merge patch.
  const mod: Modification = { name: req.params.layerName, ...(patch as any) };
  layers[idx] = applyModification(deepMerge(layers[idx], patch), mod);
  const newData = { ...row.data, layers };
  const upd = await pool.query(
    "UPDATE templates SET data=$1, updated_at=now() WHERE id=$2 AND user_id=$3 RETURNING id, name, width, height, data, thumbnail_path, updated_at",
    [newData, req.params.id, userId],
  );
  res.json({ template: rowToTemplate(upd.rows[0]), patchedLayer: layers[idx] });
});

v1Routes.post("/templates/:id/render", async (req, res) => {
  const userId = req.user!.sub;
  const { rows } = await pool.query(
    "SELECT id, name, width, height, data FROM templates WHERE id = $1 AND user_id = $2",
    [req.params.id, userId],
  );
  const row = rows[0];
  if (!row) return res.status(404).json({ error: "Not found" });
  const baseLayers: any[] = row.data?.layers ?? [];
  const modifications: Modification[] = req.body?.modifications ?? [];
  // Back-compat: also accept the old `patches: [{name, patch}]` shape.
  const patches: Array<{ name: string; patch: any }> = req.body?.patches ?? [];
  let layers = applyModifications(baseLayers, modifications);
  if (patches.length) {
    layers = layers.map((l) => {
      const p = patches.find((x) => x.name === l.name);
      return p ? deepMerge(l, p.patch) : l;
    });
  }
  const result = await renderTemplate({
    id: row.id, userId, name: row.name, width: row.width, height: row.height, layers,
    transparent: !!req.body?.transparent,
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
