import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { env } from "@/lib/env";
import { getResultForSession } from "@/lib/diagnosis";

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get(env.SESSION_COOKIE_NAME)?.value;
  if (!token) notFound();

  let result;
  try {
    result = await getResultForSession(id, token);
  } catch {
    notFound();
  }
  const json = result.result_json;

  return (
    <div className="container">
      <section className="card">
        <div className="badge">無料診断結果</div>
        <h1 className="result-title">{json.title}</h1>
        <p className="lead">{json.summary}</p>
        <div className="grid grid-2" style={{ marginTop: 20 }}>
          <div><strong>性格タイプ</strong><p className="muted">{json.personality.code}｜{json.personality.display_name}</p></div>
          <div><strong>宿命タイプ</strong><p className="muted">{json.destiny.type_name}</p></div>
        </div>
      </section>

      <section className="section-list">
        {json.sections.map((section) => (
          <article className="card" key={section.key}>
            <div className="badge">{section.title}</div>
            <h2>{section.headline}</h2>
            <p>{section.body}</p>
          </article>
        ))}
        <article className="card">
          <div className="badge">{json.integration.title}</div>
          <h2>{json.integration.combination_name}</h2>
          <p>{json.integration.body}</p>
          {json.integration.strength_text && <p><strong>強み：</strong>{json.integration.strength_text}</p>}
          {json.integration.caution_text && <p><strong>注意点：</strong>{json.integration.caution_text}</p>}
        </article>
        <article className="card">
          <h2>{json.premium_teaser.title}</h2>
          <p>{json.premium_teaser.body}</p>
          <div className="actions"><Link className="btn" href={`/premium/${id}`}>{json.premium_teaser.cta_label}</Link><Link className="btn secondary" href="/diagnosis">もう一度診断する</Link></div>
        </article>
      </section>
    </div>
  );
}
