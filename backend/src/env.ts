import "dotenv/config";

function req(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

export const env = {
  PORT: Number(process.env.PORT ?? 4000),
  DATABASE_URL: req("DATABASE_URL"),
  REDIS_URL: req("REDIS_URL", "redis://localhost:6379"),
  JWT_SECRET: req("JWT_SECRET", "dev-only-change-me"),
  STORAGE_DIR: process.env.STORAGE_DIR ?? "./storage",
  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL ?? "http://localhost:4000",
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "*",
};
