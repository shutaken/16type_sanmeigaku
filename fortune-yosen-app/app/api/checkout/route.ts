import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, getSessionTokenFromRequest, jsonError, rateLimit } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";
import { getStripe } from "@/lib/stripe";
import { siteUrl } from "@/lib/env";

const schema = z.object({
  diagnosis_result_id: z.string().uuid(),
  product_code: z.literal("premium_report")
});

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    rateLimit(req, "checkout", 8);
    const token = getSessionTokenFromRequest(req);
    if (!token) return jsonError("診断セッションが見つかりません。", 401);
    const body = schema.parse(await req.json());

    const { data: result, error: resultError } = await supabaseAdmin
      .from("diagnosis_results")
      .select("id, session_id, result_title, diagnosis_sessions!inner(session_token)")
      .eq("id", body.diagnosis_result_id)
      .eq("diagnosis_sessions.session_token", token)
      .single();
    if (resultError || !result) return jsonError("診断結果が見つかりません。", 404);

    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("id, code, name, description, price_jpy, currency, stripe_price_id, product_type")
      .eq("code", body.product_code)
      .eq("is_active", true)
      .single();
    if (productError || !product) return jsonError("商品が見つかりません。", 404);

    const { data: premium, error: premiumError } = await supabaseAdmin
      .from("premium_reports")
      .upsert({ session_id: result.session_id, diagnosis_result_id: result.id, product_id: product.id, status: "pending_payment", report_title: product.name }, { onConflict: "diagnosis_result_id,product_id" })
      .select("id")
      .single();
    if (premiumError) throw premiumError;

    const stripe = getStripe();
    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [product.stripe_price_id ? { price: product.stripe_price_id, quantity: 1 } : {
        quantity: 1,
        price_data: { currency: product.currency, unit_amount: product.price_jpy, product_data: { name: product.name, description: product.description ?? undefined } }
      }],
      success_url: `${siteUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/payment/cancel?result_id=${result.id}`,
      metadata: { premium_report_id: premium.id, diagnosis_result_id: result.id, session_id: result.session_id, product_id: product.id }
    });

    const { error: paymentError } = await supabaseAdmin.from("payments").insert({
      session_id: result.session_id,
      premium_report_id: premium.id,
      product_id: product.id,
      provider: "stripe",
      provider_checkout_session_id: checkout.id,
      product_type: product.product_type,
      amount: product.price_jpy,
      currency: product.currency,
      status: "pending"
    });
    if (paymentError) throw paymentError;

    return NextResponse.json({ url: checkout.url });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "決済を開始できませんでした。", 400);
  }
}
