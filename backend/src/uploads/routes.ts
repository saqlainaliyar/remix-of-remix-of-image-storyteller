import { Router } from "express";
import multer from "multer";
import { v4 as uuid } from "uuid";
import { extname, join } from "node:path";
import { mkdir } from "node:fs/promises";
import sharp from "sharp";
import { env } from "../env.js";
import { requireAuth } from "../auth/middleware.js";
import { pool } from "../db.js";

const uploadsDir = join(env.STORAGE_DIR, "uploads");
const thumbsDir = join(env.STORAGE_DIR, "thumbnails");
await mkdir(uploadsDir, { recursive: true });
await mkdir(thumbsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => cb(null, `${uuid()}${extname(file.originalname).toLowerCase()}`),
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

export const uploadRoutes = Router();
uploadRoutes.use(requireAuth);

uploadRoutes.post("/", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });
  const f = req.file;
  const meta = await sharp(f.path).metadata();
  const thumbName = `thumb-${f.filename}.jpg`;
  await sharp(f.path).resize({ width: 400 }).jpeg({ quality: 80 }).toFile(join(thumbsDir, thumbName));

  await pool.query(
    `INSERT INTO assets (user_id, kind, path, filename, width, height, size_bytes, mime)
     VALUES ($1,'upload',$2,$3,$4,$5,$6,$7),
            ($1,'thumbnail',$8,$9,400,NULL,0,'image/jpeg')`,
    [req.user!.sub, `/uploads/${f.filename}`, f.filename, meta.width ?? null, meta.height ?? null, f.size, f.mimetype,
     `/thumbnails/${thumbName}`, thumbName],
  );

  res.json({
    url: `/uploads/${f.filename}`,
    thumbnailUrl: `/thumbnails/${thumbName}`,
    width: meta.width,
    height: meta.height,
    size: f.size,
    mime: f.mimetype,
  });
});
