import { cookies } from "next/headers";
import Link from "next/link";
import { env } from "@/lib/env";
import { getResultForSession } from "@/lib/diagnosis";

type SafeSection = {
  key?: string;
  title?: string;
  headline?: string;
  body?: string;
};

type SafeResultJson = {
  title?: string;
  summary?: string;
  personality?: { code?: string; display_name?: string };
  destiny?: { type_name?: string };
  sections?: SafeSection[];
  integration?: {
    title?: string;
    combination_name?: string;
    body?: string;
    strength_text?: string | null;
    caution_text?: string | null;
  };
  premium_teaser?: {
    title?: string;
    body?: string;
    cta_label?: string;
  };
};

function ResultUnavailable({ message }: { message: string }) {
  return (
    <div className="container">
      <section className="card">
        <div className="badge">診断結果</div>
        <h1 className="result-title">診断結果を表示できませんでした</h1>
        <p className="lead">{message}</p>
        <div className="actions" style={{ marginTop: 24 }}>
          <Link className="btn" href="/diagnosis">もう一度診断する</Link>
          <Link className="btn secondary" href="/">トップへ戻る</Link>
        </div>
      </section>
    </div>
  );
}

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get(env.SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return <ResultUnavailable message="診断セッションを確認できませんでした。ブラウザのCookieが無効になっているか、別の端末・ブラウザで結果URLを開いている可能性があります。" />;
  }

  let resultJson: SafeResultJson | null = null;
  try {
    const result = await getResultForSession(id, token);
    resultJson = result.result_json as SafeResultJson;
  } catch (error) {
    console.error("Failed to load diagnosis result", error);
    return <ResultUnavailable message="診断結果が見つからないか、現在のセッションでは表示できません。お手数ですが、もう一度診断してください。" />;
  }

  if (!resultJson || !Array.isArray(resultJson.sections)) {
    console.error("Invalid diagnosis result_json", { id, resultJson });
    return <ResultUnavailable message="診断結果データの形式が正しくありません。お手数ですが、もう一度診断してください。" />;
  }

  const title = resultJson.title || "診断結果";
  const summary = resultJson.summary || "あなたの性格タイプと宿命タイプをもとに、診断結果をまとめました。";
  const personalityCode = resultJson.personality?.code || "";
  const personalityName = resultJson.personality?.display_name || "性格タイプ";
  const destinyName = resultJson.destiny?.type_name || "宿命タイプ";
  const integration = resultJson.integration;
  const premiumTeaser = resultJson.premium_teaser;

  return (
    <div className="container">
      <section className="card">
        <div className="badge">無料診断結果</div>
        <h1 className="result-title">{title}</h1>
        <p className="lead">{summary}</p>
        <div className="grid grid-2" style={{ marginTop: 20 }}>
          <div>
            <strong>性格タイプ</strong>
            <p className="muted">{personalityCode ? `${personalityCode}｜` : ""}{personalityName}</p>
          </div>
          <div>
            <strong>宿命タイプ</strong>
            <p className="muted">{destinyName}</p>
          </div>
        </div>
      </section>

      <section className="section-list">
        {resultJson.sections.map((section, index) => (
          <article className="card" key={section.key || `${section.title || "section"}-${index}`}>
            <div className="badge">{section.title || "診断"}</div>
            <h2>{section.headline || section.title || "診断結果"}</h2>
            <p>{section.body || "この項目の診断文を準備中です。"}</p>
          </article>
        ))}

        {integration && (
          <article className="card">
            <div className="badge">{integration.title || "性格タイプとの統合"}</div>
            <h2>{integration.combination_name || title}</h2>
            {integration.body && <p>{integration.body}</p>}
            {integration.strength_text && <p><strong>強み：</strong>{integration.strength_text}</p>}
            {integration.caution_text && <p><strong>注意点：</strong>{integration.caution_text}</p>}
          </article>
        )}

        <article className="card">
          <h2>{premiumTeaser?.title || "さらに詳しく読み解く"}</h2>
          <p>{premiumTeaser?.body || "プレミアムレポートは現在準備中です。"}</p>
          <div className="actions">
            <Link className="btn" href={`/premium/${id}`}>{premiumTeaser?.cta_label || "プレミアムレポートを見る"}</Link>
            <Link className="btn secondary" href="/diagnosis">もう一度診断する</Link>
          </div>
        </article>
      </section>
    </div>
  );
}
