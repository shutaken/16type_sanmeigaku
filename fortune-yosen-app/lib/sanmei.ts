import "server-only";
import { env } from "@/lib/env";
import type { FiveStars, StarCode } from "@/lib/types";

const STAR_CODES: StarCode[] = [
  "kansaku", "sekimon", "houkaku", "chousho", "rokuzon",
  "shiroku", "shaki", "kengyu", "ryuko", "gyokudo"
];

function dateNumber(birthDate: string) {
  const [y, m, d] = birthDate.split("-").map(Number);
  if (!y || !m || !d) throw new Error("生年月日の形式が不正です。");
  return y * 372 + m * 31 + d;
}

/**
 * TODO: 正式な算命学ロジックに置き換える入口。
 * 現在はデプロイ検証用の決定的フォールバックです。
 * 同じ生年月日で常に同じ5星を返すため、画面・DB・決済の結合テストに使えます。
 */
export function calculateYosenFiveStars(params: { birthDate: string; birthTime?: string | null }): FiveStars {
  if (env.ALLOW_DETERMINISTIC_SANMEI_FALLBACK !== "true") {
    throw new Error("正式な算命学計算ロジックが未実装です。calculateYosenFiveStars を実装してください。");
  }
  const base = dateNumber(params.birthDate) + (params.birthTime ? params.birthTime.replace(":", "").slice(0, 4).split("").reduce((a, n) => a + Number(n), 0) : 0);
  const pick = (offset: number) => STAR_CODES[Math.abs(base + offset * 7 + Math.floor(base / (offset + 3))) % STAR_CODES.length];
  return {
    head: pick(1),
    chest: pick(2),
    left_hand: pick(3),
    right_hand: pick(4),
    stomach: pick(5)
  };
}
