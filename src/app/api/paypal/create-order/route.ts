import { NextRequest, NextResponse } from "next/server";
import paypal from "@paypal/checkout-server-sdk";
import { paypalClient, convertINRtoUSD } from "@/lib/paypal/config";
import { supabaseAdmin } from "@/lib/supabase/server";
import { verifyAuth } from "@/lib/auth/verify";
import { PRICING } from "@/data/chapters";
import { z } from "zod";
import { nanoid } from "nanoid";
import type { orders } from "@paypal/checkout-server-sdk";

const createOrderSchema = z.object({
  purchaseType: z.enum(["complete", "custom"]),
  chapters: z.array(z.number()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = createOrderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { purchaseType, chapters } = validation.data;

    // Calculate amount in INR
    let amountINR: number;
    let purchaseData: { chapters: number[] } | null = null;

    if (purchaseType === "complete") {
      amountINR = PRICING.COMPLETE_PACK.price;
    } else if (purchaseType === "custom" && chapters?.length) {
      if (chapters.length < PRICING.CUSTOM_SELECTION.minChapters) {
        return NextResponse.json(
          { error: `Minimum ${PRICING.CUSTOM_SELECTION.minChapters} chapters required` },
          { status: 400 }
        );
      }
      amountINR = chapters.length * PRICING.CUSTOM_SELECTION.pricePerChapter;
      purchaseData = { chapters };
    } else {
      return NextResponse.json({ error: "Invalid purchase configuration" }, { status: 400 });
    }

    // Convert to USD for PayPal (returns string with 2 decimals)
    const amountUSD = convertINRtoUSD(amountINR);

    // Create PayPal order
    const client = paypalClient();
    const orderRequest = new paypal.orders.OrdersCreateRequest();
    orderRequest.prefer("return=representation");
    orderRequest.requestBody({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: nanoid(),
          description:
            purchaseType === "complete"
              ? "Complete Novel Pack - Lifetime Digital Access"
              : `Custom Chapters (${chapters?.length} chapters) - Digital Access`,
          amount: {
            currency_code: "USD",
            value: amountUSD,
          },
          custom_id: JSON.stringify({
            userId: authResult.userId,
            purchaseType,
            chapters: chapters || [],
          }),
        },
      ],
      application_context: {
        brand_name: "Your Novel Title",
        landing_page: "BILLING",
        user_action: "PAY_NOW",
        shipping_preference: "NO_SHIPPING",
      },
    });

    const response = await client.execute<orders.OrderResult>(orderRequest);
    const order = response.result;

    // Store pending purchase in database
    const ipAddress =
      request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null;
    const userAgent = request.headers.get("user-agent") || null;

    const { error: dbError } = await supabaseAdmin.from("purchases").insert({
      user_id: authResult.userId,
      purchase_type: purchaseType,
      purchase_data: purchaseData,
      amount: amountINR,
      currency: "INR",
      original_currency: "USD",
      original_amount: Math.round(parseFloat(amountUSD) * 100), // Store cents
      payment_provider: "paypal",
      paypal_order_id: order.id,
      status: "pending",
      ip_address: ipAddress,
      user_agent: userAgent,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    });

    if (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }

    return NextResponse.json({
      orderId: order.id,
      amountUSD,
      amountINR,
    });
  } catch (error) {
    console.error("PayPal create order error:", error);
    return NextResponse.json({ error: "Failed to create PayPal order" }, { status: 500 });
  }
}