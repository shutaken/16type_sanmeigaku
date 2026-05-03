import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "16宿命タイプ診断",
  description: "性格タイプと算命学の宿命要素から、本質・価値観・仕事・恋愛・長期テーマを読み解く診断サイトです。",
  robots: { index: true, follow: true }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <div className="site-shell">
          <header className="site-header">
            <a className="brand" href="/">16宿命タイプ診断</a>
            <nav><a href="/diagnosis">無料診断</a></nav>
          </header>
          <main>{children}</main>
          <footer className="site-footer">
            <p>この診断は自己理解を目的としたエンタメ・占いコンテンツです。医療・法律・投資などの専門的判断を代替するものではありません。</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
