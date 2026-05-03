import Link from "next/link";

export default function HomePage() {
  return (
    <div className="container">
      <section className="hero">
        <div className="kicker">性格タイプ × 宿命タイプ</div>
        <h1>性格だけではわからない、あなたの宿命の使い方。</h1>
        <p className="lead">16タイプ性格診断と算命学の陽占5要素をもとに、本質・価値観・仕事・恋愛・長期テーマを文章で読み解きます。</p>
        <div className="actions">
          <Link className="btn" href="/diagnosis">無料で診断する</Link>
          <a className="btn secondary" href="#about">診断内容を見る</a>
        </div>
      </section>
      <section id="about" className="grid grid-2">
        <div className="card"><h3>無料でわかること</h3><p>タイプ名・要約、本質、価値観、仕事、恋愛・人間関係、長期テーマ、性格タイプとの統合コメントを表示します。</p></div>
        <div className="card"><h3>有料化に対応</h3><p>Stripe Checkout、Webhook検証、決済履歴、プレミアムレポート生成まで拡張できる構成です。</p></div>
      </section>
    </div>
  );
}
