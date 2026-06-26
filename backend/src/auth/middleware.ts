import type { NextFunction, Request, Response } from "express";
import { verifyToken, type JwtPayload } from "./jwt.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request { user?: JwtPayload }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
  const payload = await verifyToken(h.slice(7));
  if (!payload) return res.status(401).json({ error: "Unauthorized" });
  req.user = payload;
  next();
}
