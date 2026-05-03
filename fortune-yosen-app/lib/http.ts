import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { env, siteUrl } from "@/lib/env";
import crypto from "node:crypto";

const windows = new Map<string, { count: number; resetAt: number }>();

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function assertSameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return;
  const allowed = new URL(siteUrl).origin;
  if (origin !== allowed && process.env.NODE_ENV === "production") {
    throw new Error("不正なリクエスト元です。");
  }
}

export function rateLimit(req: NextRequest, key: string, limit = 20, windowMs = 60_000) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const bucketKey = `${key}:${ip}`;
  const bucket = windows.get(bucketKey);
  if (!bucket || bucket.resetAt < now) {
    windows.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return;
  }
  bucket.count += 1;
  if (bucket.count > limit) throw new Error("アクセスが集中しています。少し時間をおいて再度お試しください。");
}

export function hashIp(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return crypto.createHmac("sha256", env.SESSION_COOKIE_SECRET).update(ip).digest("hex");
}

export function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(env.SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
}

export function getSessionTokenFromRequest(req: NextRequest) {
  return req.cookies.get(env.SESSION_COOKIE_NAME)?.value ?? null;
}
