import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { assertSameOrigin, getSessionTokenFromRequest, hashIp, jsonError, rateLimit, setSessionCookie } from "@/lib/http";
import { createDiagnosis } from "@/lib/diagnosis";

const schema = z.object({
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  birth_time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  gender: z.enum(["male", "female", "other", "unspecified"]).nullable().optional(),
  personality_code: z.string().regex(/^[IE][NS][TF][JP]$/).nullable().optional(),
  quiz_answers: z.record(z.string(), z.string()).nullable().optional()
});

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    rateLimit(req, "diagnosis-submit", 10);
    const body = schema.parse(await req.json());
    const token = getSessionTokenFromRequest(req) ?? crypto.randomUUID().replaceAll("-", "");
    const result = await createDiagnosis({
      sessionToken: token,
      birthDate: body.birth_date,
      birthTime: body.birth_time ?? null,
      gender: body.gender ?? "unspecified",
      personalityCode: body.personality_code ?? null,
      quizAnswers: body.quiz_answers ?? null,
      userAgent: req.headers.get("user-agent"),
      ipHash: hashIp(req)
    });
    const res = NextResponse.json({ diagnosis_result_id: result.diagnosisResultId, result_url: `/result/${result.diagnosisResultId}` });
    setSessionCookie(res, token);
    return res;
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "診断結果を生成できませんでした。", 400);
  }
}
