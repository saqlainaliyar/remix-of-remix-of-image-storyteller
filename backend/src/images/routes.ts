import { Router } from "express";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { pool } from "../db.js";
import { requireApiKey } from "../apikeys/middleware.js";
import { renderTemplate } from "../templates/render.js";
import { applyModifications, type Modification } from "../templates/modifications.js";

export const imagesRoutes = Router();
imagesRoutes.use(requireApiKey);

const modSchema = z.object({ name: z.string() }).passthrough();
const createBody = z.object({
  template: z.string(),
  modifications: z.array(modSchema).default([]),
  webhook_url: z.string().url().optional(),
  metadata: z.string().max(1024).optional(),
  transparent: z.boolean().optional(),
  render_pdf: z.boolean().optional(),
  template_version: z.number().int().optional(),
});

function uid() {
  return `img_${randomBytes(12).toString("hex")}`;
}

function shape(row: any) {
  return {
    uid: row.uid,
    status: row.status,
    template: row.template_id,
    image_url: row.image_url,
    width: row.width,
    height: row.height,
    render_time_ms: row.render_time_ms,
    webhook_url: row.webhook_url,
    metadata: row.metadata,
    transparent: row.transparent,
    render_pdf: row.render_pdf,
    modifications: row.modifications,
    error: row.error,
    created_at: row.created_at,
    completed_at: row.completed_at,
    self: `/api/v1/images/${row.uid}`,
  };
}

async function runJob(jobUid: string, userId: string) {
  const started = Date.now();
  try {
    const { rows: jrows } = await pool.query(
      "SELECT * FROM image_jobs WHERE uid = $1 AND user_id = $2",
      [jobUid, userId],
    );
    const job = jrows[0];
    if (!job) return;

    const { rows: trows } = await pool.query(
      "SELECT id, name, width, height, data FROM templates WHERE id = $1 AND user_id = $2",
      [job.template_id, userId],
    );
    const tpl = trows[0];
    if (!tpl) {
      await pool.query(
        "UPDATE image_jobs SET status='failed', error=$2, completed_at=now() WHERE uid=$1",
        [jobUid, "Template not found"],
      );
      return;
    }

    const layers = applyModifications(
      tpl.data?.layers ?? [],
      (job.modifications as Modification[]) ?? [],
    );
    const result = await renderTemplate({
      id: tpl.id,
      userId,
      name: tpl.name,
      width: tpl.width,
      height: tpl.height,
      layers,
      transparent: !!job.transparent,
    });

    await pool.query(
      `UPDATE image_jobs
       SET status='completed', image_url=$2, width=$3, height=$4,
           render_time_ms=$5, completed_at=now()
       WHERE uid=$1`,
      [jobUid, result.imageUrl, result.width, result.height, Date.now() - started],
    );

    if (job.webhook_url) {
      void deliverWebhook(job.webhook_url, jobUid, userId);
    }
  } catch (e: any) {
    await pool.query(
      "UPDATE image_jobs SET status='failed', error=$2, completed_at=now() WHERE uid=$1",
      [jobUid, String(e?.message ?? e)],
    );
  }
}

async function deliverWebhook(url: string, jobUid: string, userId: string) {
  const { rows } = await pool.query(
    "SELECT * FROM image_jobs WHERE uid=$1 AND user_id=$2",
    [jobUid, userId],
  );
  const payload = shape(rows[0]);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Frameforge-Webhook/1.0",
          "X-Frameforge-Event": "image.completed",
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) return;
    } catch (e) {
      console.warn("webhook attempt failed", attempt, e);
    }
    await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
  }
}

// POST /api/v1/images
imagesRoutes.post("/", async (req, res) => {
  const parsed = createBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", issues: parsed.error.issues });
  }
  const userId = req.user!.sub;
  const body = parsed.data;
  const jobUid = uid();

  await pool.query(
    `INSERT INTO image_jobs (uid, user_id, template_id, status, webhook_url,
       metadata, transparent, render_pdf, modifications)
     VALUES ($1,$2,$3,'pending',$4,$5,$6,$7,$8)`,
    [
      jobUid,
      userId,
      body.template,
      body.webhook_url ?? null,
      body.metadata ?? null,
      !!body.transparent,
      !!body.render_pdf,
      JSON.stringify(body.modifications),
    ],
  );

  const synchronous = String(req.query.synchronous ?? "") === "1"
    || String(req.query.synchronous ?? "") === "true";

  if (synchronous) {
    await runJob(jobUid, userId);
    const { rows } = await pool.query(
      "SELECT * FROM image_jobs WHERE uid=$1 AND user_id=$2",
      [jobUid, userId],
    );
    return res.status(200).json(shape(rows[0]));
  }

  setImmediate(() => {
    void runJob(jobUid, userId);
  });

  const { rows } = await pool.query(
    "SELECT * FROM image_jobs WHERE uid=$1 AND user_id=$2",
    [jobUid, userId],
  );
  res.status(202).json(shape(rows[0]));
});

// GET /api/v1/images/:uid
imagesRoutes.get("/:uid", async (req, res) => {
  const userId = req.user!.sub;
  const { rows } = await pool.query(
    "SELECT * FROM image_jobs WHERE uid=$1 AND user_id=$2",
    [req.params.uid, userId],
  );
  if (!rows[0]) return res.status(404).json({ error: "Not found" });
  res.json(shape(rows[0]));
});

// GET /api/v1/images
imagesRoutes.get("/", async (req, res) => {
  const userId = req.user!.sub;
  const limit = Math.max(1, Math.min(100, Number(req.query.limit ?? 20)));
  const status = typeof req.query.status === "string" ? req.query.status : null;
  const params: any[] = [userId];
  let where = "user_id = $1";
  if (status) { params.push(status); where += ` AND status = $${params.length}`; }
  params.push(limit);
  const { rows } = await pool.query(
    `SELECT * FROM image_jobs WHERE ${where} ORDER BY created_at DESC LIMIT $${params.length}`,
    params,
  );
  res.json({ images: rows.map(shape) });
});
