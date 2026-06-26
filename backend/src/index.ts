import express from "express";
import cors from "cors";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { env } from "./env.js";
import { authRoutes } from "./auth/routes.js";
import { templateRoutes } from "./templates/routes.js";
import { uploadRoutes } from "./uploads/routes.js";

await mkdir(join(env.STORAGE_DIR, "uploads"), { recursive: true });
await mkdir(join(env.STORAGE_DIR, "thumbnails"), { recursive: true });
await mkdir(join(env.STORAGE_DIR, "exports"), { recursive: true });
await mkdir(join(env.STORAGE_DIR, "templates"), { recursive: true });

const app = express();
app.use(cors({ origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(","), credentials: false }));
app.use(express.json({ limit: "10mb" }));

// Static storage (uploads, thumbnails, exports)
app.use("/uploads", express.static(join(env.STORAGE_DIR, "uploads")));
app.use("/thumbnails", express.static(join(env.STORAGE_DIR, "thumbnails")));
app.use("/exports", express.static(join(env.STORAGE_DIR, "exports")));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/uploads", uploadRoutes);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message ?? "Server error" });
});

app.listen(env.PORT, () => console.log(`Frameforge API on :${env.PORT}`));
