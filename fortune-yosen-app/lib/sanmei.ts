import "server-only";
import type { FiveStars, PositionCode, StarCode } from "@/lib/types";

export type Stem = "甲" | "乙" | "丙" | "丁" | "戊" | "己" | "庚" | "辛" | "壬" | "癸";
export type Branch = "子" | "丑" | "寅" | "卯" | "辰" | "巳" | "午" | "未" | "申" | "酉" | "戌" | "亥";

export type Pillar = {
  stem: Stem;
  branch: Branch;
  sexagenary_index: number; // 0 = 甲子, 59 = 癸亥
};

export type HiddenStemResult = {
  branch: Branch;
  stem: Stem;
  layer: "initial" | "middle" | "main";
  days_from_section_start: number;
  section_start_date: string;
};

export type SanmeiProfile = {
  birth_date: string;
  birth_time: string | null;
  calculation_mode: "production_sanmei";
  precision: "date_only_jst" | "time_aware_jst";
  note: string;
  pillars: {
    year: Pillar;
    month: Pillar;
    day: Pillar;
  };
  hidden_stems: {
    year_branch: HiddenStemResult;
    month_branch: HiddenStemResult;
    day_branch: HiddenStemResult;
  };
  five_stars: FiveStars;
  mapping: Record<PositionCode, {
    source: "year_stem" | "month_stem" | "year_branch_hidden_stem" | "month_branch_hidden_stem" | "day_branch_hidden_stem";
    source_stem: Stem;
    star_code: StarCode;
  }>;
  solar_terms: {
    lichun_date: string;
    current_section: {
      name: string;
      longitude: number;
      date: string;
      month_branch: Branch;
    };
  };
};

const STEMS: Stem[] = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const BRANCHES: Branch[] = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

const STEM_INFO: Record<Stem, { element: "wood" | "fire" | "earth" | "metal" | "water"; polarity: "yang" | "yin" }> = {
  甲: { element: "wood", polarity: "yang" },
  乙: { element: "wood", polarity: "yin" },
  丙: { element: "fire", polarity: "yang" },
  丁: { element: "fire", polarity: "yin" },
  戊: { element: "earth", polarity: "yang" },
  己: { element: "earth", polarity: "yin" },
  庚: { element: "metal", polarity: "yang" },
  辛: { element: "metal", polarity: "yin" },
  壬: { element: "water", polarity: "yang" },
  癸: { element: "water", polarity: "yin" }
};

const PRODUCES: Record<string, string> = {
  wood: "fire",
  fire: "earth",
  earth: "metal",
  metal: "water",
  water: "wood"
};

const CONTROLS: Record<string, string> = {
  wood: "earth",
  fire: "metal",
  earth: "water",
  metal: "wood",
  water: "fire"
};

const STAR_BY_RELATION: Record<string, StarCode> = {
  self_same: "kansaku",
  self_opposite: "sekimon",
  output_same: "houkaku",
  output_opposite: "chousho",
  wealth_same: "rokuzon",
  wealth_opposite: "shiroku",
  officer_same: "shaki",
  officer_opposite: "kengyu",
  resource_same: "ryuko",
  resource_opposite: "gyokudo"
};

const MONTH_STARTS: Array<{ name: string; longitude: number; branch: Branch; ordinal: number; approxMonth: number; approxDay: number }> = [
  { name: "小寒", longitude: 285, branch: "丑", ordinal: 12, approxMonth: 1, approxDay: 6 },
  { name: "立春", longitude: 315, branch: "寅", ordinal: 1, approxMonth: 2, approxDay: 4 },
  { name: "啓蟄", longitude: 345, branch: "卯", ordinal: 2, approxMonth: 3, approxDay: 6 },
  { name: "清明", longitude: 15, branch: "辰", ordinal: 3, approxMonth: 4, approxDay: 5 },
  { name: "立夏", longitude: 45, branch: "巳", ordinal: 4, approxMonth: 5, approxDay: 6 },
  { name: "芒種", longitude: 75, branch: "午", ordinal: 5, approxMonth: 6, approxDay: 6 },
  { name: "小暑", longitude: 105, branch: "未", ordinal: 6, approxMonth: 7, approxDay: 7 },
  { name: "立秋", longitude: 135, branch: "申", ordinal: 7, approxMonth: 8, approxDay: 8 },
  { name: "白露", longitude: 165, branch: "酉", ordinal: 8, approxMonth: 9, approxDay: 8 },
  { name: "寒露", longitude: 195, branch: "戌", ordinal: 9, approxMonth: 10, approxDay: 8 },
  { name: "立冬", longitude: 225, branch: "亥", ordinal: 10, approxMonth: 11, approxDay: 7 },
  { name: "大雪", longitude: 255, branch: "子", ordinal: 11, approxMonth: 12, approxDay: 7 }
];

const HIDDEN_STEM_RULES: Record<Branch, Array<{ maxDay: number | null; stem: Stem; layer: "initial" | "middle" | "main" }>> = {
  子: [{ maxDay: null, stem: "癸", layer: "main" }],
  丑: [{ maxDay: 9, stem: "癸", layer: "initial" }, { maxDay: 12, stem: "辛", layer: "middle" }, { maxDay: null, stem: "己", layer: "main" }],
  寅: [{ maxDay: 7, stem: "戊", layer: "initial" }, { maxDay: 14, stem: "丙", layer: "middle" }, { maxDay: null, stem: "甲", layer: "main" }],
  卯: [{ maxDay: null, stem: "乙", layer: "main" }],
  辰: [{ maxDay: 9, stem: "乙", layer: "initial" }, { maxDay: 12, stem: "癸", layer: "middle" }, { maxDay: null, stem: "戊", layer: "main" }],
  巳: [{ maxDay: 7, stem: "戊", layer: "initial" }, { maxDay: 14, stem: "庚", layer: "middle" }, { maxDay: null, stem: "丙", layer: "main" }],
  午: [{ maxDay: 9, stem: "丙", layer: "initial" }, { maxDay: 19, stem: "己", layer: "middle" }, { maxDay: null, stem: "丁", layer: "main" }],
  未: [{ maxDay: 9, stem: "丁", layer: "initial" }, { maxDay: 12, stem: "乙", layer: "middle" }, { maxDay: null, stem: "己", layer: "main" }],
  申: [{ maxDay: 7, stem: "戊", layer: "initial" }, { maxDay: 14, stem: "壬", layer: "middle" }, { maxDay: null, stem: "庚", layer: "main" }],
  酉: [{ maxDay: null, stem: "辛", layer: "main" }],
  戌: [{ maxDay: 9, stem: "辛", layer: "initial" }, { maxDay: 12, stem: "丁", layer: "middle" }, { maxDay: null, stem: "戊", layer: "main" }],
  亥: [{ maxDay: 7, stem: "戊", layer: "initial" }, { maxDay: 14, stem: "甲", layer: "middle" }, { maxDay: null, stem: "壬", layer: "main" }]
};

const termDateCache = new Map<string, string>();

function normalizeDegrees(value: number) {
  return ((value % 360) + 360) % 360;
}

function signedAngleDiff(longitude: number, target: number) {
  let diff = normalizeDegrees(longitude - target);
  if (diff > 180) diff -= 360;
  return diff;
}

function julianDayFromUnixMs(ms: number) {
  return ms / 86400000 + 2440587.5;
}

function solarLongitude(ms: number) {
  const jd = julianDayFromUnixMs(ms);
  const n = jd - 2451545.0;
  const meanLongitude = normalizeDegrees(280.46646 + 0.98564736 * n);
  const meanAnomaly = normalizeDegrees(357.52911 + 0.98560028 * n);
  const g = (meanAnomaly * Math.PI) / 180;
  const equation = 1.914602 * Math.sin(g) + 0.019993 * Math.sin(2 * g) + 0.000289 * Math.sin(3 * g);
  return normalizeDegrees(meanLongitude + equation);
}

function jstDateStringFromMs(ms: number) {
  const d = new Date(ms + 9 * 60 * 60 * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function findSolarTermDate(year: number, longitude: number, approxMonth: number, approxDay: number) {
  const key = `${year}:${longitude}`;
  const cached = termDateCache.get(key);
  if (cached) return cached;

  const approx = Date.UTC(year, approxMonth - 1, approxDay, 0, 0, 0);
  let low = approx - 4 * 86400000;
  let high = approx + 4 * 86400000;

  // 12時間刻みで符号変化を探し、太陽黄経が該当度数を越える瞬間を挟む。
  let previous = low;
  let previousDiff = signedAngleDiff(solarLongitude(previous), longitude);
  for (let t = low + 12 * 3600000; t <= high; t += 12 * 3600000) {
    const diff = signedAngleDiff(solarLongitude(t), longitude);
    if (previousDiff <= 0 && diff >= 0) {
      low = previous;
      high = t;
      break;
    }
    previous = t;
    previousDiff = diff;
  }

  for (let i = 0; i < 48; i += 1) {
    const mid = Math.floor((low + high) / 2);
    const diff = signedAngleDiff(solarLongitude(mid), longitude);
    if (diff >= 0) high = mid;
    else low = mid;
  }

  const date = jstDateStringFromMs(high);
  termDateCache.set(key, date);
  return date;
}

function getMonthStartTermsForYear(year: number) {
  return MONTH_STARTS.map((term) => ({
    ...term,
    date: findSolarTermDate(year, term.longitude, term.approxMonth, term.approxDay)
  }));
}

function getCurrentSection(birthDate: string) {
  const year = Number(birthDate.slice(0, 4));
  const terms = [
    ...getMonthStartTermsForYear(year - 1),
    ...getMonthStartTermsForYear(year),
    ...getMonthStartTermsForYear(year + 1)
  ].sort((a, b) => a.date.localeCompare(b.date));

  let current = terms[0];
  for (const term of terms) {
    if (term.date <= birthDate) current = term;
    else break;
  }
  return current;
}

function parseBirthDate(birthDate: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!match) throw new Error("生年月日の形式が不正です。");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error("存在しない生年月日です。");
  }
  return { year, month, day };
}

function daysBetweenInclusive(startDate: string, birthDate: string) {
  const start = Date.UTC(Number(startDate.slice(0, 4)), Number(startDate.slice(5, 7)) - 1, Number(startDate.slice(8, 10)));
  const birth = Date.UTC(Number(birthDate.slice(0, 4)), Number(birthDate.slice(5, 7)) - 1, Number(birthDate.slice(8, 10)));
  return Math.max(1, Math.floor((birth - start) / 86400000) + 1);
}

function sexagenaryPillar(index: number): Pillar {
  const normalized = ((index % 60) + 60) % 60;
  return {
    stem: STEMS[normalized % 10],
    branch: BRANCHES[normalized % 12],
    sexagenary_index: normalized
  };
}

function getYearPillar(birthDate: string) {
  const { year } = parseBirthDate(birthDate);
  const lichun = findSolarTermDate(year, 315, 2, 4);
  const solarYear = birthDate >= lichun ? year : year - 1;
  return { pillar: sexagenaryPillar(solarYear - 1984), solarYear, lichunDate: lichun };
}

function getMonthStem(yearStem: Stem, monthOrdinalFromTiger: number) {
  const yearStemIndex = STEMS.indexOf(yearStem);
  const tigerStartStemIndex = [0, 5].includes(yearStemIndex)
    ? 2
    : [1, 6].includes(yearStemIndex)
      ? 4
      : [2, 7].includes(yearStemIndex)
        ? 6
        : [3, 8].includes(yearStemIndex)
          ? 8
          : 0;
  return STEMS[(tigerStartStemIndex + monthOrdinalFromTiger - 1) % 10];
}

function getMonthPillar(yearStem: Stem, currentSection: ReturnType<typeof getCurrentSection>) {
  const stem = getMonthStem(yearStem, currentSection.ordinal);
  const stemIndex = STEMS.indexOf(stem);
  const branchIndex = BRANCHES.indexOf(currentSection.branch);
  const sexagenaryIndex = Array.from({ length: 60 }, (_, i) => i).find((i) => i % 10 === stemIndex && i % 12 === branchIndex);
  if (sexagenaryIndex === undefined) throw new Error("月干支の算出に失敗しました。");
  return sexagenaryPillar(sexagenaryIndex);
}

function gregorianJulianDayNumber(year: number, month: number, day: number) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

function getDayPillar(birthDate: string) {
  const { year, month, day } = parseBirthDate(birthDate);
  const jdn = gregorianJulianDayNumber(year, month, day);
  return sexagenaryPillar(jdn + 49);
}

function getHiddenStem(branch: Branch, sectionStartDate: string, birthDate: string): HiddenStemResult {
  const dayIndex = daysBetweenInclusive(sectionStartDate, birthDate);
  const rule = HIDDEN_STEM_RULES[branch].find((r) => r.maxDay === null || dayIndex <= r.maxDay);
  if (!rule) throw new Error(`蔵干の算出に失敗しました: ${branch}`);
  return {
    branch,
    stem: rule.stem,
    layer: rule.layer,
    days_from_section_start: dayIndex,
    section_start_date: sectionStartDate
  };
}

function deriveStarFromStemRelation(dayStem: Stem, targetStem: Stem): StarCode {
  const day = STEM_INFO[dayStem];
  const target = STEM_INFO[targetStem];
  const samePolarity = day.polarity === target.polarity;

  if (day.element === target.element) return STAR_BY_RELATION[samePolarity ? "self_same" : "self_opposite"];
  if (PRODUCES[day.element] === target.element) return STAR_BY_RELATION[samePolarity ? "output_same" : "output_opposite"];
  if (CONTROLS[day.element] === target.element) return STAR_BY_RELATION[samePolarity ? "wealth_same" : "wealth_opposite"];
  if (CONTROLS[target.element] === day.element) return STAR_BY_RELATION[samePolarity ? "officer_same" : "officer_opposite"];
  if (PRODUCES[target.element] === day.element) return STAR_BY_RELATION[samePolarity ? "resource_same" : "resource_opposite"];

  throw new Error(`十大主星の算出に失敗しました: ${dayStem} -> ${targetStem}`);
}

export function calculateSanmeiProfile(params: { birthDate: string; birthTime?: string | null }): SanmeiProfile {
  parseBirthDate(params.birthDate);
  const year = getYearPillar(params.birthDate);
  const currentSection = getCurrentSection(params.birthDate);
  const month = getMonthPillar(year.pillar.stem, currentSection);
  const day = getDayPillar(params.birthDate);

  const yearHidden = getHiddenStem(year.pillar.branch, year.lichunDate, params.birthDate);
  const monthHidden = getHiddenStem(month.branch, currentSection.date, params.birthDate);
  const dayHidden = getHiddenStem(day.branch, currentSection.date, params.birthDate);

  const mapping: SanmeiProfile["mapping"] = {
    head: {
      source: "year_stem",
      source_stem: year.pillar.stem,
      star_code: deriveStarFromStemRelation(day.stem, year.pillar.stem)
    },
    stomach: {
      source: "month_stem",
      source_stem: month.stem,
      star_code: deriveStarFromStemRelation(day.stem, month.stem)
    },
    left_hand: {
      source: "year_branch_hidden_stem",
      source_stem: yearHidden.stem,
      star_code: deriveStarFromStemRelation(day.stem, yearHidden.stem)
    },
    chest: {
      source: "month_branch_hidden_stem",
      source_stem: monthHidden.stem,
      star_code: deriveStarFromStemRelation(day.stem, monthHidden.stem)
    },
    right_hand: {
      source: "day_branch_hidden_stem",
      source_stem: dayHidden.stem,
      star_code: deriveStarFromStemRelation(day.stem, dayHidden.stem)
    }
  };

  const fiveStars: FiveStars = {
    head: mapping.head.star_code,
    chest: mapping.chest.star_code,
    left_hand: mapping.left_hand.star_code,
    right_hand: mapping.right_hand.star_code,
    stomach: mapping.stomach.star_code
  };

  return {
    birth_date: params.birthDate,
    birth_time: params.birthTime ?? null,
    calculation_mode: "production_sanmei",
    precision: "date_only_jst",
    note: "MVPでは出生時間を陽占5位置の計算に使用せず、日本時間の日単位で節入りを判定します。節入り当日は、その日全体を新しい節月として扱います。",
    pillars: {
      year: year.pillar,
      month,
      day
    },
    hidden_stems: {
      year_branch: yearHidden,
      month_branch: monthHidden,
      day_branch: dayHidden
    },
    five_stars: fiveStars,
    mapping,
    solar_terms: {
      lichun_date: year.lichunDate,
      current_section: {
        name: currentSection.name,
        longitude: currentSection.longitude,
        date: currentSection.date,
        month_branch: currentSection.branch
      }
    }
  };
}

export function calculateYosenFiveStars(params: { birthDate: string; birthTime?: string | null }): FiveStars {
  return calculateSanmeiProfile(params).five_stars;
}
