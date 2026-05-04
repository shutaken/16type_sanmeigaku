import "server-only";
import { supabaseAdmin } from "@/lib/supabase";
import { calculateSanmeiProfile } from "@/lib/sanmei";
import type { DiagnosisResultJson, FiveStars, PositionCode, ResultSectionKey, StarCode } from "@/lib/types";

type PersonalityRow = { id: string; code: string; display_name: string; short_description: string };
type StarRow = { id: string; code: StarCode; name: string; type_name: string; short_description: string };
type TextRow = { star_code: StarCode; star_name: string; position_code: PositionCode; result_section_key: ResultSectionKey; title: string; free_text: string; version: number };
type ComboRow = { combination_name: string; summary_text: string; strength_text: string | null; caution_text: string | null; free_integration_text: string; version: number };

const SECTION_CONFIG: Array<{ key: ResultSectionKey; title: string; position: PositionCode }> = [
  { key: "essence", title: "本質", position: "chest" },
  { key: "values", title: "価値観", position: "head" },
  { key: "work", title: "仕事", position: "left_hand" },
  { key: "relationship", title: "恋愛・人間関係", position: "right_hand" },
  { key: "longterm", title: "長期テーマ", position: "stomach" }
];

export async function getPersonalityTypes() {
  const { data, error } = await supabaseAdmin
    .from("personality_types")
    .select("code, display_name, short_description, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getQuestionsWithOptions() {
  const { data: questions, error: qError } = await supabaseAdmin
    .from("personality_questions")
    .select("id, axis, question_text, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (qError) throw qError;
  const { data: options, error: oError } = await supabaseAdmin
    .from("personality_question_options")
    .select("question_id, option_label, option_text, score_code, sort_order")
    .order("sort_order", { ascending: true });
  if (oError) throw oError;
  return (questions ?? []).map((q) => ({ ...q, options: (options ?? []).filter((o) => o.question_id === q.id) }));
}

export function derivePersonalityCodeFromAnswers(answers: Record<string, string>) {
  const scores: Record<string, number> = { I: 0, E: 0, N: 0, S: 0, T: 0, F: 0, J: 0, P: 0 };
  Object.values(answers).forEach((code) => { if (scores[code] !== undefined) scores[code] += 1; });
  return `${scores.E > scores.I ? "E" : "I"}${scores.N >= scores.S ? "N" : "S"}${scores.F > scores.T ? "F" : "T"}${scores.P > scores.J ? "P" : "J"}`;
}

export async function createDiagnosis(params: {
  sessionToken: string;
  birthDate: string;
  birthTime?: string | null;
  gender?: "male" | "female" | "other" | "unspecified" | null;
  personalityCode?: string | null;
  quizAnswers?: Record<string, string> | null;
  userAgent?: string | null;
  ipHash?: string | null;
}) {
  const personalityCode = params.personalityCode || (params.quizAnswers ? derivePersonalityCodeFromAnswers(params.quizAnswers) : null);
  if (!personalityCode) throw new Error("性格タイプを選択するか、簡易診断に回答してください。");

  const sanmeiProfile = calculateSanmeiProfile({ birthDate: params.birthDate, birthTime: params.birthTime });
  const fiveStars = sanmeiProfile.five_stars;
  const { data: session, error: sessionError } = await supabaseAdmin
    .from("diagnosis_sessions")
    .upsert({ session_token: params.sessionToken, status: "started", user_agent: params.userAgent, ip_hash: params.ipHash }, { onConflict: "session_token" })
    .select("id")
    .single();
  if (sessionError) throw sessionError;

  const { data: personality, error: personalityError } = await supabaseAdmin
    .from("personality_types")
    .select("id, code, display_name, short_description")
    .eq("code", personalityCode)
    .eq("is_active", true)
    .single();
  if (personalityError || !personality) throw new Error("性格タイプが見つかりません。");

  const { data: input, error: inputError } = await supabaseAdmin
    .from("diagnosis_inputs")
    .insert({
      session_id: session.id,
      birth_date: params.birthDate,
      birth_time: params.birthTime ?? null,
      gender: params.gender ?? "unspecified",
      personality_type_id: personality.id,
      personality_source: params.quizAnswers ? "simple_test" : "selected",
      quiz_answers: params.quizAnswers ?? null,
      consent_version: "2026-05-04"
    })
    .select("id")
    .single();
  if (inputError) throw inputError;

  const { resultJson, ids, freeText } = await buildDiagnosisResultJson(personality as PersonalityRow, sanmeiProfile);

  const { data: result, error: resultError } = await supabaseAdmin
    .from("diagnosis_results")
    .insert({
      session_id: session.id,
      input_id: input.id,
      personality_type_id: personality.id,
      head_star_id: ids.head,
      chest_star_id: ids.chest,
      left_hand_star_id: ids.left_hand,
      right_hand_star_id: ids.right_hand,
      stomach_star_id: ids.stomach,
      combination_id: ids.combination ?? null,
      year_stem: sanmeiProfile.pillars.year.stem,
      year_branch: sanmeiProfile.pillars.year.branch,
      month_stem: sanmeiProfile.pillars.month.stem,
      month_branch: sanmeiProfile.pillars.month.branch,
      day_stem: sanmeiProfile.pillars.day.stem,
      day_branch: sanmeiProfile.pillars.day.branch,
      result_title: resultJson.title,
      free_result_text: freeText,
      result_json: resultJson,
      calculation_json: sanmeiProfile,
      content_version: resultJson.meta.content_version,
      generated_by: "template"
    })
    .select("id")
    .single();
  if (resultError) throw resultError;

  await supabaseAdmin.from("diagnosis_sessions").update({ status: "completed" }).eq("id", session.id);
  return { diagnosisResultId: result.id };
}

async function buildDiagnosisResultJson(personality: PersonalityRow, sanmeiProfile: ReturnType<typeof calculateSanmeiProfile>) {
  const fiveStars = sanmeiProfile.five_stars;
  const starCodes = Array.from(new Set(Object.values(fiveStars)));
  const { data: starsData, error: starsError } = await supabaseAdmin
    .from("sanmei_stars")
    .select("id, code, name, type_name, short_description")
    .in("code", starCodes)
    .eq("is_active", true);
  if (starsError) throw starsError;

  const stars = new Map((starsData as StarRow[] | null ?? []).map((s) => [s.code, s]));
  for (const code of starCodes) if (!stars.has(code)) throw new Error(`星マスタが不足しています: ${code}`);

  const { data: textData, error: textError } = await supabaseAdmin
    .from("v_active_star_position_texts")
    .select("star_code, star_name, position_code, result_section_key, title, free_text, version");
  if (textError) throw textError;
  const textRows = (textData as TextRow[] | null ?? []).filter((r) => fiveStars[r.position_code] === r.star_code);
  if (textRows.length < 5) throw new Error("結果文の一部が不足しています。star_position_texts を確認してください。");
  const textByPosition = new Map(textRows.map((r) => [r.position_code, r]));

  const mainStar = stars.get(fiveStars.chest)!;
  const { data: comboData, error: comboError } = await supabaseAdmin
    .from("v_active_personality_star_combinations")
    .select("combination_name, summary_text, strength_text, caution_text, free_integration_text, version")
    .eq("personality_code", personality.code)
    .eq("star_code", mainStar.code)
    .maybeSingle();
  if (comboError) throw comboError;
  const combo = comboData as ComboRow | null;

  const title = combo?.combination_name ?? `${personality.display_name} × ${mainStar.type_name}`;
  const summary = combo?.summary_text ?? `${personality.display_name}の性格傾向と、${mainStar.type_name}の宿命傾向をあわせ持つタイプです。`;
  const sections = SECTION_CONFIG.map(({ key, title, position }) => {
    const row = textByPosition.get(position)!;
    const star = stars.get(fiveStars[position])!;
    return { key, title, position_code: position, source_star_code: star.code, source_star_name: star.name, headline: row.title, body: row.free_text };
  });

  const resultJson: DiagnosisResultJson = {
    version: 1,
    result_type: "free",
    generated_at: new Date().toISOString(),
    title,
    summary,
    personality: { code: personality.code, display_name: personality.display_name, short_description: personality.short_description },
    destiny: { main_star_code: mainStar.code, main_star_name: mainStar.name, type_name: mainStar.type_name, short_description: mainStar.short_description },
    sections,
    integration: {
      title: "性格タイプとの統合",
      combination_name: title,
      strength_text: combo?.strength_text ?? null,
      caution_text: combo?.caution_text ?? null,
      body: combo?.free_integration_text ?? `性格タイプでは「${personality.display_name}」の傾向を持ち、宿命タイプでは「${mainStar.type_name}」の性質が中心にあります。自分の考え方だけでなく、どの環境で力が自然に出るかを意識すると、選択が明確になります。`
    },
    premium_teaser: {
      title: "さらに詳しく読み解く",
      body: "プレミアムレポートでは、向いている仕事、避けた方がよい環境、恋愛で繰り返しやすいパターン、相性の良いタイプまで詳しく解説します。",
      cta_label: "プレミアムレポートを見る"
    },
    meta: {
      content_version: Math.max(...textRows.map((r) => r.version), combo?.version ?? 1),
      used_tables: { personality_types: personality.code, sanmei_stars_main: mainStar.code, star_position_texts_version: Math.max(...textRows.map((r) => r.version)), personality_star_combinations_version: combo?.version },
      calculation_mode: "production_sanmei",
      sanmei: {
        pillars: sanmeiProfile.pillars,
        hidden_stems: sanmeiProfile.hidden_stems,
        mapping: sanmeiProfile.mapping,
        solar_terms: sanmeiProfile.solar_terms,
        precision: sanmeiProfile.precision,
        note: sanmeiProfile.note
      }
    }
  };

  const freeText = [resultJson.title, resultJson.summary, ...sections.map((s) => `${s.title}: ${s.body}`), `${resultJson.integration.title}: ${resultJson.integration.body}`].join("\n\n");
  return { resultJson, freeText, ids: { head: stars.get(fiveStars.head)!.id, chest: stars.get(fiveStars.chest)!.id, left_hand: stars.get(fiveStars.left_hand)!.id, right_hand: stars.get(fiveStars.right_hand)!.id, stomach: stars.get(fiveStars.stomach)!.id, combination: combo ? undefined : undefined } };
}

export async function getResultForSession(resultId: string, sessionToken: string) {
  const { data, error } = await supabaseAdmin
    .from("diagnosis_results")
    .select("id, session_id, result_json, created_at, diagnosis_sessions!inner(session_token)")
    .eq("id", resultId)
    .eq("diagnosis_sessions.session_token", sessionToken)
    .single();
  if (error) throw new Error("診断結果が見つかりません。");
  return data as unknown as { id: string; result_json: DiagnosisResultJson; created_at: string };
}
