import { getPersonalityTypes, getQuestionsWithOptions } from "@/lib/diagnosis";
import DiagnosisForm from "@/components/DiagnosisForm";

export default async function DiagnosisPage() {
  const [types, questions] = await Promise.all([getPersonalityTypes(), getQuestionsWithOptions()]);
  return (
    <div className="container">
      <div className="card">
        <div className="kicker">無料診断</div>
        <h1 style={{ fontSize: "44px" }}>あなたの宿命タイプを読み解く</h1>
        <p className="muted">生年月日と性格タイプから、5つのテーマに分けて診断結果を作成します。</p>
        <DiagnosisForm personalityTypes={types} questions={questions} />
      </div>
    </div>
  );
}
