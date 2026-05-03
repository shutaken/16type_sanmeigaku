import Link from "next/link";

export default async function PaymentCancelPage({ searchParams }: { searchParams: Promise<{ result_id?: string }> }) {
  const { result_id } = await searchParams;
  return (
    <div className="container">
      <div className="card">
        <h1 style={{ fontSize: "44px" }}>決済をキャンセルしました</h1>
        <p className="lead">料金は発生していません。</p>
        {result_id ? <Link className="btn" href={`/result/${result_id}`}>診断結果に戻る</Link> : <Link className="btn" href="/diagnosis">診断ページへ戻る</Link>}
      </div>
    </div>
  );
}
