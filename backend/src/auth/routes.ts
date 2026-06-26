import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { hashPassword, verifyPassword } from "./password.js";
import { revokeToken, signToken } from "./jwt.js";
import { requireAuth } from "./middleware.js";

const credentials = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

export const authRoutes = Router();

authRoutes.post("/register", async (req, res) => {
  const parsed = credentials.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const { email, password } = parsed.data;
  const hash = await hashPassword(password);
  try {
    const { rows } = await pool.query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
      [email, hash],
    );
    const user = rows[0];
    const { token } = signToken(user);
    res.json({ token, user });
  } catch (e: any) {
    if (e.code === "23505") return res.status(409).json({ error: "Email already in use" });
    throw e;
  }
});

authRoutes.post("/login", async (req, res) => {
  const parsed = credentials.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const { email, password } = parsed.data;
  const { rows } = await pool.query(
    "SELECT id, email, password_hash FROM users WHERE email = $1",
    [email],
  );
  const row = rows[0];
  if (!row || !(await verifyPassword(row.password_hash, password))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const { token } = signToken({ id: row.id, email: row.email });
  res.json({ token, user: { id: row.id, email: row.email } });
});

authRoutes.post("/logout", requireAuth, async (req, res) => {
  await revokeToken(req.user!.jti);
  res.json({ ok: true });
});

authRoutes.get("/me", requireAuth, async (req, res) => {
  res.json({ user: { id: req.user!.sub, email: req.user!.email } });
});
