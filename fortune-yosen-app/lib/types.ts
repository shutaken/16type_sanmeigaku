export type ResultSectionKey = "essence" | "values" | "work" | "relationship" | "longterm";
export type PositionCode = "head" | "chest" | "left_hand" | "right_hand" | "stomach";
export type StarCode = "kansaku" | "sekimon" | "houkaku" | "chousho" | "rokuzon" | "shiroku" | "shaki" | "kengyu" | "ryuko" | "gyokudo";

export type FiveStars = Record<PositionCode, StarCode>;

export type DiagnosisResultJson = {
  version: number;
  result_type: "free" | "premium";
  generated_at: string;
  title: string;
  summary: string;
  personality: { code: string; display_name: string; short_description: string };
  destiny: { main_star_code: string; main_star_name: string; type_name: string; short_description: string };
  sections: Array<{
    key: ResultSectionKey;
    title: string;
    position_code: PositionCode;
    source_star_code: StarCode;
    source_star_name: string;
    headline: string;
    body: string;
  }>;
  integration: {
    title: string;
    combination_name: string;
    strength_text?: string | null;
    caution_text?: string | null;
    body: string;
  };
  premium_teaser: { title: string; body: string; cta_label: string };
  meta: {
    content_version: number;
    used_tables: Record<string, string | number | undefined>;
    calculation_mode: "deterministic_fallback" | "production_sanmei";
  };
};
