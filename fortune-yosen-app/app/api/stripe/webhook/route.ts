import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getStripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  if (!env.STRIPE_WEBHOOK_SECRET) return NextResponse.json({ error: "Webhook secret is not configured" }, { status: 500 });
  const stripe = getStripe();
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });

  let event;
  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Invalid signature" }, { status: 400 });
  }

  const { error: eventError } = await supabaseAdmin.from("payment_events").insert({
    provider: "stripe",
    provider_event_id: event.id,
    event_type: event.type,
    payload: event as unknown as Record<string, unknown>,
    processed: false
  });
  if (eventError && !eventError.message.includes("duplicate")) {
    return NextResponse.json({ error: eventError.message }, { status: 500 });
  }
  if (eventError?.message.includes("duplicate")) return NextResponse.json({ received: true, duplicate: true });

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const premiumReportId = session.metadata?.premium_report_id;
      await supabaseAdmin.from("payments").update({
        status: "paid",
        provider_payment_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
        provider_customer_id: typeof session.customer === "string" ? session.customer : null,
        paid_at: new Date().toISOString(),
        raw_event: event as unknown as Record<string, unknown>
      }).eq("provider_checkout_session_id", session.id);

      if (premiumReportId) {
        await supabaseAdmin.from("premium_reports").update({
          status: "generated",
          generated_at: new Date().toISOString(),
          generated_by: "template",
          report_title: "才能地図プレミアムレポート",
          report_json: { generated: true, note: "MVPではテンプレート生成。AI詳細生成は有料版拡張時に実装。" }
        }).eq("id", premiumReportId);
      }
    }
    await supabaseAdmin.from("payment_events").update({ processed: true, processed_at: new Date().toISOString() }).eq("provider_event_id", event.id);
    return NextResponse.json({ received: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Webhook processing failed" }, { status: 500 });
  }
}
