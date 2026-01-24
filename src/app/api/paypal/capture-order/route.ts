import { NextRequest, NextResponse } from "next/server";
import paypal from "@paypal/checkout-server-sdk";
import { paypalClient } from "@/lib/paypal/config";
import { supabaseAdmin } from "@/lib/supabase/server";
import { verifyAuth } from "@/lib/auth/verify";
import { z } from "zod";
import type { orders } from "@paypal/checkout-server-sdk";

const captureOrderSchema = z.object({
  orderId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = captureOrderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { orderId } = validation.data;

    // Verify the order belongs to this user and is pending
    const { data: purchase, error: fetchError } = await supabaseAdmin
      .from("purchases")
      .select("*")
      .eq("paypal_order_id", orderId)
      .eq("user_id", authResult.userId)
      .eq("status", "pending")
      .single();

    if (fetchError || !purchase) {
      return NextResponse.json({ error: "Order not found or already processed" }, { status: 404 });
    }

    // Capture the PayPal order
    const client = paypalClient();
    const captureRequest = new paypal.orders.OrdersCaptureRequest(orderId);
    captureRequest.requestBody({});

    const response = await client.execute<orders.CaptureResult>(captureRequest);
    const capture = response.result;

    if (capture.status !== "COMPLETED") {
      // Update purchase as failed
      await supabaseAdmin.from("purchases").update({ status: "failed" as const }).eq("id", purchase.id);

      return NextResponse.json({ error: "Payment capture failed" }, { status: 400 });
    }

    // Get capture details
    const captureId = capture.purchase_units?.[0]?.payments?.captures?.[0]?.id;
    const payerEmail = capture.payer?.email_address;

    if (!captureId) {
      return NextResponse.json({ error: "Failed to get capture details" }, { status: 500 });
    }

    // Update purchase as completed
    const { error: updateError } = await supabaseAdmin
      .from("purchases")
      .update({
        status: "completed" as const,
        paypal_capture_id: captureId,
        payment_email: payerEmail || null,
        verified_at: new Date().toISOString(),
      })
      .eq("id", purchase.id);

    if (updateError) {
      console.error("Failed to update purchase:", updateError);
      return NextResponse.json({ error: "Failed to complete purchase" }, { status: 500 });
    }

    // Update user access based on purchase type
    if (purchase.purchase_type === "complete") {
      await supabaseAdmin.from("users").update({ tier: "complete" }).eq("id", authResult.userId);
    } else if (purchase.purchase_type === "custom") {
      const purchaseData = purchase.purchase_data as { chapters?: number[] } | null;
      const chapters = purchaseData?.chapters;

      if (chapters && Array.isArray(chapters)) {
        // Try RPC function first
        const { error: rpcError } = await supabaseAdmin.rpc("add_owned_chapters", {
          p_user_id: authResult.userId,
          p_chapters: chapters,
        });

        if (rpcError) {
          // Fallback: manual update
          const { data: currentUser } = await supabaseAdmin
            .from("users")
            .select("owned_chapters")
            .eq("id", authResult.userId)
            .single();

          const currentOwned = currentUser?.owned_chapters || [];
          const newOwned = Array.from(new Set([...currentOwned, ...chapters])).sort(
            (a: number, b: number) => a - b
          );

          await supabaseAdmin.from("users").update({ owned_chapters: newOwned }).eq("id", authResult.userId);
        }
      }
    }

    // Log the successful payment
    const ipAddress =
      request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null;
    const userAgent = request.headers.get("user-agent") || null;

    await supabaseAdmin.from("audit_logs").insert({
      user_id: authResult.userId,
      event_type: "payment_completed",
      resource_type: "purchase",
      resource_id: purchase.id,
      metadata: {
        payment_provider: "paypal",
        paypal_order_id: orderId,
        paypal_capture_id: captureId,
        amount: purchase.amount,
        purchase_type: purchase.purchase_type,
      },
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    return NextResponse.json({
      success: true,
      purchaseType: purchase.purchase_type,
      message: "Payment successful! Your access has been updated.",
    });
  } catch (error) {
    console.error("PayPal capture error:", error);
    return NextResponse.json({ error: "Failed to capture payment" }, { status: 500 });
  }
}
