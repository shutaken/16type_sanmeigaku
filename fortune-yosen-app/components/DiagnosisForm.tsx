"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type PersonalityType = { code: string; display_name: string; short_description: string; sort_order: number };
type Question = { id: string; axis: string; question_text: string; sort_order: number; options: Array<{ option_label: string; option_text: string; score_code: string }> };

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 1920;

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function buildBirthDate(year: number, month: number, day: number) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function BirthDateDial({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const today = new Date();
  const initialYear = value ? Number(value.slice(0, 4)) : 1990;
  const initialMonth = value ? Number(value.slice(5, 7)) : today.getMonth() + 1;
  const initialDay = value ? Number(value.slice(8, 10)) : today.getDate();

  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [day, setDay] = useState(Math.min(initialDay, daysInMonth(initialYear, initialMonth)));

  const years = useMemo(() => Array.from({ length: CURRENT_YEAR - MIN_YEAR + 1 }, (_, i) => CURRENT_YEAR - i), []);
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
  const days = useMemo(() => Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1), [year, month]);

  function update(nextYear: number, nextMonth: number, nextDay: number) {
    const safeDay = Math.min(nextDay, daysInMonth(nextYear, nextMonth));
    setYear(nextYear);
    setMonth(nextMonth);
    setDay(safeDay);
    onChange(buildBirthDate(nextYear, nextMonth, safeDay));
  }

  return (
    <div className="date-dial" role="group" aria-label="生年月日">
      <label className="dial-select">
        <span>年</span>
        <select value={year} onChange={(e) => update(Number(e.target.value), month, day)}>
          {years.map((y) => <option key={y} value={y}>{y}年</option>)}
        </select>
      </label>
      <label className="dial-select">
        <span>月</span>
        <select value={month} onChange={(e) => update(year, Number(e.target.value), day)}>
          {months.map((m) => <option key={m} value={m}>{m}月</option>)}
        </select>
      </label>
      <label className="dial-select">
        <span>日</span>
        <select value={day} onChange={(e) => update(year, month, Number(e.target.value))}>
          {days.map((d) => <option key={d} value={d}>{d}日</option>)}
        </select>
      </label>
    </div>
  );
}

export default function DiagnosisForm({ personalityTypes, questions }: { personalityTypes: PersonalityType[]; questions: Question[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"selected" | "quiz">("selected");
  const [birthDate, setBirthDate] = useState(buildBirthDate(1990, 1, 1));
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
        <div className="field">
          <label>生年月日</label>
          <BirthDateDial value={birthDate} onChange={setBirthDate} />
          <p className="field-help">年・月・日をそれぞれ選択してください。</p>
        </div>
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
