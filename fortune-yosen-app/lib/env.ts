import { z } from "zod";

const serverSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SITE_NAME: z.string().default("16宿命タイプ診断"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(10),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10),
  SESSION_COOKIE_NAME: z.string().default("fortune_session_token"),
  SESSION_COOKIE_SECRET: z.string().min(32),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_SUCCESS_PATH: z.string().default("/payment/success"),
  STRIPE_CANCEL_PATH: z.string().default("/payment/cancel"),
  ALLOW_DETERMINISTIC_SANMEI_FALLBACK: z.enum(["true", "false"]).default("true")
});

export const env = serverSchema.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SITE_NAME: process.env.NEXT_PUBLIC_SITE_NAME,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME,
  SESSION_COOKIE_SECRET: process.env.SESSION_COOKIE_SECRET,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  STRIPE_SUCCESS_PATH: process.env.STRIPE_SUCCESS_PATH,
  STRIPE_CANCEL_PATH: process.env.STRIPE_CANCEL_PATH,
  ALLOW_DETERMINISTIC_SANMEI_FALLBACK: process.env.ALLOW_DETERMINISTIC_SANMEI_FALLBACK
});

export const siteUrl = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
