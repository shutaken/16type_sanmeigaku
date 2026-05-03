"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type PersonalityType = { code: string; display_name: string; short_description: string; sort_order: number };
type Question = { id: string; axis: string; question_text: string; sort_order: number; options: Array<{ option_label: string; option_text: string; score_code: string }> };

export default function DiagnosisForm({ personalityTypes, questions }: { personalityTypes: PersonalityType[]; questions: Question[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"selected" | "quiz">("selected");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [gender, setGender] = useState("unspecified");
  const [personalityCode, setPersonalityCode] = useState("INTJ");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (!birthDate) return false;
    if (mode === "selected") return Boolean(personalityCode);
    return questions.length > 0 && questions.every((q) => answers[q.id]);
  }, [birthDate, mode, personalityCode, questions, answers]);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/diagnosis/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          birth_date: birthDate,
          birth_time: birthTime || null,
          gender,
          personality_code: mode === "selected" ? personalityCode : null,
          quiz_answers: mode === "quiz" ? answers : null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "診断に失敗しました。");
      router.push(data.result_url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "診断に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="form" style={{ marginTop: 24 }}>
      {error && <div className="error">{error}</div>}
      <div className="grid grid-2">
        <div className="field"><label>生年月日</label><input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required /></div>
        <div className="field"><label>出生時間 任意</label><input type="time" value={birthTime} onChange={(e) => setBirthTime(e.target.value)} /></div>
      </div>
      <div className="field"><label>性別 任意</label><select value={gender} onChange={(e) => setGender(e.target.value)}><option value="unspecified">回答しない</option><option value="male">男性</option><option value="female">女性</option><option value="other">その他</option></select></div>
      <div className="field">
        <label>性格タイプ</label>
        <div className="actions"><button className={mode === "selected" ? "btn" : "btn secondary"} type="button" onClick={() => setMode("selected")}>タイプを選ぶ</button><button className={mode === "quiz" ? "btn" : "btn secondary"} type="button" onClick={() => setMode("quiz")}>簡易診断する</button></div>
      </div>
      {mode === "selected" ? (
        <div className="field"><label>16タイプを選択</label><select value={personalityCode} onChange={(e) => setPersonalityCode(e.target.value)}>{personalityTypes.map((t) => <option key={t.code} value={t.code}>{t.code}｜{t.display_name}</option>)}</select></div>
      ) : (
        <div className="grid">
          {questions.map((q, i) => (
            <div key={q.id} className="card" style={{ boxShadow: "none" }}>
              <h3>Q{i + 1}. {q.question_text}</h3>
              <div className="grid">
                {q.options.map((o) => (
                  <label key={o.option_label} className="radio-card">
                    <input type="radio" name={q.id} value={o.score_code} checked={answers[q.id] === o.score_code} onChange={() => setAnswers({ ...answers, [q.id]: o.score_code })} />
                    {o.option_text}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="notice">診断結果は自己理解のヒントとして提供されます。重要な意思決定は専門家の助言や現実的な情報とあわせて判断してください。</div>
      <button className="btn" disabled={!canSubmit || loading} onClick={submit}>{loading ? "診断中..." : "診断結果を見る"}</button>
    </div>
  );
}
