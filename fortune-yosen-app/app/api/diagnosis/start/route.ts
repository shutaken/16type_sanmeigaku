import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { assertSameOrigin, hashIp, jsonError, rateLimit, setSessionCookie } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    rateLimit(req, "diagnosis-start", 30);
    const token = crypto.randomBytes(32).toString("hex");
    const { error } = await supabaseAdmin.from("diagnosis_sessions").insert({
      session_token: token,
      status: "started",
      ip_hash: hashIp(req),
      user_agent: req.headers.get("user-agent") ?? null,
      referrer: req.headers.get("referer") ?? null
    });
    if (error) throw error;
    const res = NextResponse.json({ session_token: token });
    setSessionCookie(res, token);
    return res;
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "セッションを開始できませんでした。", 400);
  }
}
