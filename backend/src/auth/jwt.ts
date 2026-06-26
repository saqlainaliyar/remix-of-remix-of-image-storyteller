import jwt from "jsonwebtoken";
import { v4 as uuid } from "uuid";
import { env } from "../env.js";
import { redis } from "../redis.js";

export interface JwtPayload { sub: string; jti: string; email: string }

export function signToken(user: { id: string; email: string }) {
  const jti = uuid();
  const token = jwt.sign({ sub: user.id, email: user.email, jti } satisfies JwtPayload, env.JWT_SECRET, { expiresIn: "7d" });
  return { token, jti };
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    const revoked = await redis.get(`revoked:${payload.jti}`);
    if (revoked) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function revokeToken(jti: string) {
  await redis.set(`revoked:${jti}`, "1", "EX", 60 * 60 * 24 * 7);
}
