"use client";
import { useState } from "react";

export default function CheckoutButton({ diagnosisResultId }: { diagnosisResultId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function checkout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ diagnosis_result_id: diagnosisResultId, product_code: "premium_report" }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "決済を開始できませんでした。");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "決済を開始できませんでした。");
    } finally {
      setLoading(false);
    }
  }
  return <div className="form">{error && <div className="error">{error}</div>}<button className="btn" onClick={checkout} disabled={loading}>{loading ? "決済ページを準備中..." : "購入して詳しく見る"}</button></div>;
}
