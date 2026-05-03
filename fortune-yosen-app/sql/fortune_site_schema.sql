-- fortune_site_schema.sql
-- 性格タイプ × 算命学 陽占 5位置 診断サイト
-- Supabase / PostgreSQL 用 DDL
-- 実行場所: Supabase SQL Editor
-- 作成日: 2026-05-04
--
-- 方針:
-- - MVP: 無料診断結果を固定マスタ文章から生成
-- - 将来拡張: 有料レポート、Stripe決済、AI相談、相性診断に対応
-- - フロントから直接ユーザー系テーブルを操作するより、Next.js Server Actions / API Routes / Supabase Edge Functions から
--   service_role で書き込む運用を推奨

-- =========================================================
-- 0. Extensions
-- =========================================================

create extension if not exists pgcrypto;

-- =========================================================
-- 1. Utility: updated_at trigger
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- 2. Master tables
-- =========================================================

-- 16性格タイプ
create table if not exists public.personality_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  display_name text not null,
  short_description text not null,
  long_description text,
  energy_axis text not null check (energy_axis in ('introvert', 'extrovert')),
  perception_axis text not null check (perception_axis in ('intuitive', 'sensing')),
  decision_axis text not null check (decision_axis in ('thinking', 'feeling')),
  lifestyle_axis text not null check (lifestyle_axis in ('judging', 'perceiving')),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_personality_types_updated_at on public.personality_types;
create trigger trg_personality_types_updated_at
before update on public.personality_types
for each row execute function public.set_updated_at();

-- 性格タイプ簡易診断の質問
create table if not exists public.personality_questions (
  id uuid primary key default gen_random_uuid(),
  axis text not null check (axis in ('energy', 'perception', 'decision', 'lifestyle')),
  question_text text not null,
  sort_order integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_personality_questions_updated_at on public.personality_questions;
create trigger trg_personality_questions_updated_at
before update on public.personality_questions
for each row execute function public.set_updated_at();

-- 性格タイプ簡易診断の選択肢
create table if not exists public.personality_question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.personality_questions(id) on delete cascade,
  option_label text not null, -- A / B など
  option_text text not null,
  score_code text not null check (score_code in ('I', 'E', 'N', 'S', 'T', 'F', 'J', 'P')),
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (question_id, option_label)
);

drop trigger if exists trg_personality_question_options_updated_at on public.personality_question_options;
create trigger trg_personality_question_options_updated_at
before update on public.personality_question_options
for each row execute function public.set_updated_at();

-- 算命学 十大主星
create table if not exists public.sanmei_stars (
  id uuid primary key default gen_random_uuid(),
  code text not null unique, -- kansaku, sekimon, houkaku, chousho, rokuzon, shiroku, shaki, kengyu, ryuko, gyokudo
  name text not null, -- 貫索星など
  type_name text not null, -- 守りの自立者など、ユーザー向け宿命タイプ名
  short_description text not null,
  long_description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_sanmei_stars_updated_at on public.sanmei_stars;
create trigger trg_sanmei_stars_updated_at
before update on public.sanmei_stars
for each row execute function public.set_updated_at();

-- 陽占5位置
create table if not exists public.sanmei_positions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code in ('head', 'chest', 'left_hand', 'right_hand', 'stomach')),
  name text not null, -- 頭の星など
  user_facing_label text not null, -- ものごとの捉え方など
  result_section_key text not null unique check (result_section_key in ('values', 'essence', 'work', 'relationship', 'longterm')),
  description text not null,
  sort_order integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_sanmei_positions_updated_at on public.sanmei_positions;
create trigger trg_sanmei_positions_updated_at
before update on public.sanmei_positions
for each row execute function public.set_updated_at();

-- 十大主星 × 5位置の文章マスタ
create table if not exists public.star_position_texts (
  id uuid primary key default gen_random_uuid(),
  star_id uuid not null references public.sanmei_stars(id) on delete cascade,
  position_id uuid not null references public.sanmei_positions(id) on delete cascade,
  title text not null,
  free_text text not null,
  premium_text text,
  advice_text text,
  version integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (star_id, position_id, version)
);

drop trigger if exists trg_star_position_texts_updated_at on public.star_position_texts;
create trigger trg_star_position_texts_updated_at
before update on public.star_position_texts
for each row execute function public.set_updated_at();

create index if not exists idx_star_position_texts_star_position
on public.star_position_texts (star_id, position_id)
where is_active = true;

-- 16性格タイプ × 胸の星 の統合文
create table if not exists public.personality_star_combinations (
  id uuid primary key default gen_random_uuid(),
  personality_type_id uuid not null references public.personality_types(id) on delete cascade,
  main_star_id uuid not null references public.sanmei_stars(id) on delete cascade,
  combination_name text not null,
  summary_text text not null,
  strength_text text,
  caution_text text,
  free_integration_text text not null,
  premium_integration_text text,
  version integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (personality_type_id, main_star_id, version)
);

drop trigger if exists trg_personality_star_combinations_updated_at on public.personality_star_combinations;
create trigger trg_personality_star_combinations_updated_at
before update on public.personality_star_combinations
for each row execute function public.set_updated_at();

create index if not exists idx_personality_star_combinations_lookup
on public.personality_star_combinations (personality_type_id, main_star_id)
where is_active = true;

-- 有料商品マスタ
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  code text not null unique, -- premium_report, compatibility_report, ai_consultation_10
  name text not null,
  description text,
  product_type text not null check (product_type in ('premium_report', 'compatibility_report', 'ai_consultation')),
  price_jpy integer not null check (price_jpy >= 0),
  currency text not null default 'jpy',
  stripe_price_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

-- =========================================================
-- 3. Diagnosis user/session tables
-- =========================================================

-- 診断セッション
create table if not exists public.diagnosis_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid, -- Supabase Authを使う場合に auth.users.id を格納。匿名診断ではnull。
  session_token text not null unique default encode(gen_random_bytes(32), 'hex'),
  status text not null default 'started' check (status in ('started', 'completed', 'paid', 'expired')),
  ip_hash text,
  user_agent text,
  referrer text,
  landing_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_diagnosis_sessions_updated_at on public.diagnosis_sessions;
create trigger trg_diagnosis_sessions_updated_at
before update on public.diagnosis_sessions
for each row execute function public.set_updated_at();

create index if not exists idx_diagnosis_sessions_user_id
on public.diagnosis_sessions (user_id);

create index if not exists idx_diagnosis_sessions_status_created
on public.diagnosis_sessions (status, created_at desc);

-- 診断入力
create table if not exists public.diagnosis_inputs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.diagnosis_sessions(id) on delete cascade,

  birth_date date not null,
  birth_time time,
  gender text check (gender in ('male', 'female', 'other', 'unspecified')),

  personality_type_id uuid references public.personality_types(id),
  personality_source text not null default 'selected' check (personality_source in ('selected', 'simple_test', 'unknown')),

  quiz_answers jsonb, -- 簡易診断回答
  consent_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_diagnosis_inputs_updated_at on public.diagnosis_inputs;
create trigger trg_diagnosis_inputs_updated_at
before update on public.diagnosis_inputs
for each row execute function public.set_updated_at();

create index if not exists idx_diagnosis_inputs_session
on public.diagnosis_inputs (session_id);

-- 診断結果
create table if not exists public.diagnosis_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.diagnosis_sessions(id) on delete cascade,
  input_id uuid not null references public.diagnosis_inputs(id) on delete cascade,

  personality_type_id uuid not null references public.personality_types(id),

  -- 陽占5位置
  head_star_id uuid references public.sanmei_stars(id),
  chest_star_id uuid references public.sanmei_stars(id),
  left_hand_star_id uuid references public.sanmei_stars(id),
  right_hand_star_id uuid references public.sanmei_stars(id),
  stomach_star_id uuid references public.sanmei_stars(id),

  combination_id uuid references public.personality_star_combinations(id),

  result_title text,
  free_result_text text,
  result_json jsonb not null default '{}'::jsonb,

  -- 算命学計算結果の生データ。後からロジック検証できるよう保持。
  calculation_json jsonb not null default '{}'::jsonb,

  content_version integer not null default 1,
  generated_by text not null default 'template' check (generated_by in ('template', 'ai', 'template_ai')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (session_id, input_id)
);

drop trigger if exists trg_diagnosis_results_updated_at on public.diagnosis_results;
create trigger trg_diagnosis_results_updated_at
before update on public.diagnosis_results
for each row execute function public.set_updated_at();

create index if not exists idx_diagnosis_results_session
on public.diagnosis_results (session_id);

create index if not exists idx_diagnosis_results_personality_chest
on public.diagnosis_results (personality_type_id, chest_star_id);

create index if not exists idx_diagnosis_results_created
on public.diagnosis_results (created_at desc);

-- =========================================================
-- 4. Paid reports / payments
-- =========================================================

-- 有料レポート
create table if not exists public.premium_reports (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.diagnosis_sessions(id) on delete cascade,
  diagnosis_result_id uuid not null references public.diagnosis_results(id) on delete cascade,
  product_id uuid references public.products(id),

  status text not null default 'locked' check (status in ('locked', 'pending_payment', 'generated', 'viewed', 'refunded', 'cancelled')),

  report_title text,
  report_text text,
  report_json jsonb not null default '{}'::jsonb,
  pdf_url text,

  generated_by text not null default 'template' check (generated_by in ('template', 'ai', 'template_ai')),
  generated_at timestamptz,
  viewed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (diagnosis_result_id, product_id)
);

drop trigger if exists trg_premium_reports_updated_at on public.premium_reports;
create trigger trg_premium_reports_updated_at
before update on public.premium_reports
for each row execute function public.set_updated_at();

create index if not exists idx_premium_reports_session_status
on public.premium_reports (session_id, status);

create index if not exists idx_premium_reports_result
on public.premium_reports (diagnosis_result_id);

-- 決済履歴
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.diagnosis_sessions(id) on delete set null,
  premium_report_id uuid references public.premium_reports(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,

  provider text not null default 'stripe' check (provider in ('stripe')),
  provider_payment_id text,
  provider_checkout_session_id text,
  provider_customer_id text,

  product_type text not null check (product_type in ('premium_report', 'compatibility_report', 'ai_consultation')),
  amount integer not null check (amount >= 0),
  currency text not null default 'jpy',
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'cancelled', 'refunded')),

  paid_at timestamptz,
  raw_event jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_payments_updated_at on public.payments;
create trigger trg_payments_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

create index if not exists idx_payments_session_status
on public.payments (session_id, status);

create index if not exists idx_payments_checkout_session
on public.payments (provider_checkout_session_id);

create index if not exists idx_payments_provider_payment
on public.payments (provider_payment_id);

-- Stripe Webhook等のイベント受信ログ。冪等性管理用。
create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'stripe' check (provider in ('stripe')),
  provider_event_id text not null unique,
  event_type text not null,
  processed boolean not null default false,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_payment_events_processed
on public.payment_events (processed, created_at);

-- =========================================================
-- 5. Future extension: compatibility
-- =========================================================

create table if not exists public.compatibility_results (
  id uuid primary key default gen_random_uuid(),

  session_id uuid references public.diagnosis_sessions(id) on delete cascade,
  person_a_result_id uuid references public.diagnosis_results(id) on delete set null,
  person_b_result_id uuid references public.diagnosis_results(id) on delete set null,
  product_id uuid references public.products(id),

  status text not null default 'free' check (status in ('free', 'locked', 'paid', 'generated', 'refunded')),

  compatibility_score integer check (compatibility_score between 0 and 100),
  summary_text text,
  love_text text,
  conflict_text text,
  advice_text text,
  result_json jsonb not null default '{}'::jsonb,

  generated_by text not null default 'template' check (generated_by in ('template', 'ai', 'template_ai')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_compatibility_results_updated_at on public.compatibility_results;
create trigger trg_compatibility_results_updated_at
before update on public.compatibility_results
for each row execute function public.set_updated_at();

create index if not exists idx_compatibility_results_session
on public.compatibility_results (session_id);

-- =========================================================
-- 6. Future extension: AI consultation
-- =========================================================

create table if not exists public.ai_consultations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.diagnosis_sessions(id) on delete cascade,
  diagnosis_result_id uuid references public.diagnosis_results(id) on delete set null,
  product_id uuid references public.products(id),

  theme text not null check (theme in ('work', 'love', 'relationship', 'career', 'self_understanding', 'other')),
  status text not null default 'active' check (status in ('active', 'closed', 'expired', 'refunded')),
  remaining_messages integer not null default 10 check (remaining_messages >= 0),

  system_context jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_ai_consultations_updated_at on public.ai_consultations;
create trigger trg_ai_consultations_updated_at
before update on public.ai_consultations
for each row execute function public.set_updated_at();

create index if not exists idx_ai_consultations_session_status
on public.ai_consultations (session_id, status);

create table if not exists public.ai_consultation_messages (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.ai_consultations(id) on delete cascade,

  role text not null check (role in ('system', 'user', 'assistant')),
  content text not null,

  model text,
  input_tokens integer,
  output_tokens integer,
  cost_usd numeric(12, 6),
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists idx_ai_consultation_messages_consultation_created
on public.ai_consultation_messages (consultation_id, created_at);

-- =========================================================
-- 7. Optional: content generation jobs
-- =========================================================

-- マスタ文章をAIやバッチで生成・レビューする場合の作業テーブル
create table if not exists public.content_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  target_table text not null,
  target_key text,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  prompt text,
  result jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

drop trigger if exists trg_content_generation_jobs_updated_at on public.content_generation_jobs;
create trigger trg_content_generation_jobs_updated_at
before update on public.content_generation_jobs
for each row execute function public.set_updated_at();

-- =========================================================
-- 8. Views for app consumption
-- =========================================================

-- 結果ページ作成時に使いやすいマスタ結合ビュー
create or replace view public.v_active_star_position_texts as
select
  s.code as star_code,
  s.name as star_name,
  s.type_name as star_type_name,
  p.code as position_code,
  p.user_facing_label,
  p.result_section_key,
  t.title,
  t.free_text,
  t.premium_text,
  t.advice_text,
  t.version
from public.star_position_texts t
join public.sanmei_stars s on s.id = t.star_id
join public.sanmei_positions p on p.id = t.position_id
where t.is_active = true
  and s.is_active = true
  and p.is_active = true;

create or replace view public.v_active_personality_star_combinations as
select
  pt.code as personality_code,
  pt.display_name as personality_display_name,
  st.code as star_code,
  st.name as star_name,
  c.combination_name,
  c.summary_text,
  c.strength_text,
  c.caution_text,
  c.free_integration_text,
  c.premium_integration_text,
  c.version
from public.personality_star_combinations c
join public.personality_types pt on pt.id = c.personality_type_id
join public.sanmei_stars st on st.id = c.main_star_id
where c.is_active = true
  and pt.is_active = true
  and st.is_active = true;

-- =========================================================
-- 9. Row Level Security
-- =========================================================
-- 推奨運用:
-- - マスタ系は anon/authenticated から read 可能
-- - ユーザー診断・決済・AI相談系は Next.js API / Server Actions から service_role で操作
-- - フロント直アクセスを避けるため、ユーザー系テーブルには一般公開ポリシーを作らない

alter table public.personality_types enable row level security;
alter table public.personality_questions enable row level security;
alter table public.personality_question_options enable row level security;
alter table public.sanmei_stars enable row level security;
alter table public.sanmei_positions enable row level security;
alter table public.star_position_texts enable row level security;
alter table public.personality_star_combinations enable row level security;
alter table public.products enable row level security;

alter table public.diagnosis_sessions enable row level security;
alter table public.diagnosis_inputs enable row level security;
alter table public.diagnosis_results enable row level security;
alter table public.premium_reports enable row level security;
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
alter table public.compatibility_results enable row level security;
alter table public.ai_consultations enable row level security;
alter table public.ai_consultation_messages enable row level security;
alter table public.content_generation_jobs enable row level security;

-- マスタ系 read policies
drop policy if exists "Public read active personality types" on public.personality_types;
create policy "Public read active personality types"
on public.personality_types
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Public read active personality questions" on public.personality_questions;
create policy "Public read active personality questions"
on public.personality_questions
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Public read personality question options" on public.personality_question_options;
create policy "Public read personality question options"
on public.personality_question_options
for select
to anon, authenticated
using (
  exists (
    select 1 from public.personality_questions q
    where q.id = personality_question_options.question_id
      and q.is_active = true
  )
);

drop policy if exists "Public read active sanmei stars" on public.sanmei_stars;
create policy "Public read active sanmei stars"
on public.sanmei_stars
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Public read active sanmei positions" on public.sanmei_positions;
create policy "Public read active sanmei positions"
on public.sanmei_positions
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Public read active star position texts" on public.star_position_texts;
create policy "Public read active star position texts"
on public.star_position_texts
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Public read active combinations" on public.personality_star_combinations;
create policy "Public read active combinations"
on public.personality_star_combinations
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Public read active products" on public.products;
create policy "Public read active products"
on public.products
for select
to anon, authenticated
using (is_active = true);

-- ログインユーザーが自分のセッションのみ読める最低限のポリシー。
-- 匿名診断は service_role 経由で読み書きする想定。
drop policy if exists "Authenticated read own diagnosis sessions" on public.diagnosis_sessions;
create policy "Authenticated read own diagnosis sessions"
on public.diagnosis_sessions
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Authenticated read own diagnosis inputs" on public.diagnosis_inputs;
create policy "Authenticated read own diagnosis inputs"
on public.diagnosis_inputs
for select
to authenticated
using (
  exists (
    select 1 from public.diagnosis_sessions s
    where s.id = diagnosis_inputs.session_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "Authenticated read own diagnosis results" on public.diagnosis_results;
create policy "Authenticated read own diagnosis results"
on public.diagnosis_results
for select
to authenticated
using (
  exists (
    select 1 from public.diagnosis_sessions s
    where s.id = diagnosis_results.session_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "Authenticated read own premium reports" on public.premium_reports;
create policy "Authenticated read own premium reports"
on public.premium_reports
for select
to authenticated
using (
  exists (
    select 1 from public.diagnosis_sessions s
    where s.id = premium_reports.session_id
      and s.user_id = auth.uid()
  )
);

-- =========================================================
-- 10. Minimal seed products
-- =========================================================
-- 文章マスタや性格タイプ等の本格データは別途投入予定。
-- ここでは決済設計確認用の商品だけ作成。

insert into public.products (code, name, description, product_type, price_jpy, currency, is_active)
values
  ('premium_report', '才能地図プレミアムレポート', '性格タイプと宿命タイプから、仕事・恋愛・人間関係・長期テーマを詳しく読み解く有料レポート。', 'premium_report', 1480, 'jpy', true),
  ('compatibility_report', '相性診断レポート', '自分と相手の性格タイプ・宿命タイプから、惹かれる理由とすれ違いのポイントを読み解くレポート。', 'compatibility_report', 980, 'jpy', true),
  ('ai_consultation_10', 'AI相談 10往復', '診断結果を前提に、仕事・恋愛・人間関係の悩みに10往復まで相談できるメニュー。', 'ai_consultation', 500, 'jpy', true)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  product_type = excluded.product_type,
  price_jpy = excluded.price_jpy,
  currency = excluded.currency,
  is_active = excluded.is_active,
  updated_at = now();

-- =========================================================
-- End
-- =========================================================
