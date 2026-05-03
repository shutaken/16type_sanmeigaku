import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { env } from "@/lib/env";
import { getResultForSession } from "@/lib/diagnosis";
import CheckoutButton from "@/components/CheckoutButton";

export default async function PremiumPage({ params }: { params: Promise<{ resultId: string }> }) {
  const { resultId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get(env.SESSION_COOKIE_NAME)?.value;
  if (!token) notFound();
  let result;
  try { result = await getResultForSession(resultId, token); } catch { notFound(); }
  return (
    <div className="container">
      <section className="card">
        <div className="badge">有料レポート</div>
        <h1 style={{ fontSize: "44px" }}>才能地図プレミアムレポート</h1>
        <p className="lead">「{result.result_json.title}」を、仕事・恋愛・人間関係・長期テーマの具体的な行動指針まで深掘りします。</p>
        <div className="grid grid-2" style={{ marginTop: 20 }}>
          <div className="notice"><strong>価格</strong><br />1,480円（税込想定）</div>
          <div className="notice"><strong>内容</strong><br />向いている仕事、避けたい環境、恋愛パターン、具体アドバイス</div>
        </div>
        <div style={{ marginTop: 24 }}><CheckoutButton diagnosisResultId={resultId} /></div>
      </section>
    </div>
  );
}
