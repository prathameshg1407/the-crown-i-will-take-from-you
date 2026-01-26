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
  console.log("=== PAYPAL CAPTURE START ===");
  
  try {
    // Verify authentication
    console.log("Step 1: Verifying authentication...");
    const authResult = await verifyAuth(request);
    
    if (!authResult.authenticated || !authResult.userId) {
      console.error("Authentication failed:", authResult);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log("Step 1 ✅ User authenticated:", authResult.userId);

    // Parse request body
    console.log("Step 2: Parsing request body...");
    const body = await request.json();
    console.log("Request body:", body);
    
    const validation = captureOrderSchema.safeParse(body);

    if (!validation.success) {
      console.error("Validation failed:", validation.error.issues);
      return NextResponse.json(
        { error: "Invalid request data", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { orderId } = validation.data;
    console.log("Step 2 ✅ Order ID:", orderId);

    // Verify the order belongs to this user and is pending
    console.log("Step 3: Fetching purchase from database...");
    const { data: purchase, error: fetchError } = await supabaseAdmin
      .from("purchases")
      .select("*")
      .eq("paypal_order_id", orderId)
      .eq("user_id", authResult.userId)
      .eq("status", "pending")
      .single();

    if (fetchError) {
      console.error("Database fetch error:", fetchError);
    }
    
    if (!purchase) {
      console.error("Purchase not found for:", {
        paypal_order_id: orderId,
        user_id: authResult.userId,
        status: "pending"
      });
      
      // Let's check what purchases exist for this order
      const { data: allPurchases } = await supabaseAdmin
        .from("purchases")
        .select("id, user_id, status, paypal_order_id, razorpay_order_id")
        .or(`paypal_order_id.eq.${orderId},user_id.eq.${authResult.userId}`)
        .limit(5);
      
      console.log("Related purchases found:", allPurchases);
      
      return NextResponse.json(
        { error: "Order not found or already processed" },
        { status: 404 }
      );
    }
    console.log("Step 3 ✅ Purchase found:", {
      id: purchase.id,
      status: purchase.status,
      purchase_type: purchase.purchase_type,
      amount: purchase.amount
    });

    // Capture the PayPal order
    console.log("Step 4: Capturing PayPal order...");
    const client = paypalClient();
    const captureRequest = new paypal.orders.OrdersCaptureRequest(orderId);
    captureRequest.requestBody({});

    let response;
    try {
      response = await client.execute<orders.CaptureResult>(captureRequest);
    } catch (paypalError: any) {
      console.error("PayPal API error:", {
        message: paypalError.message,
        statusCode: paypalError.statusCode,
        details: paypalError._originalError?.text || paypalError.details
      });
      
      // Update purchase as failed
      await supabaseAdmin
        .from("purchases")
        .update({ status: "failed" as const })
        .eq("id", purchase.id);
      
      return NextResponse.json(
        { error: "PayPal capture failed: " + (paypalError.message || "Unknown error") },
        { status: 400 }
      );
    }
    
    const capture = response.result;
    console.log("Step 4 ✅ PayPal response:", {
      status: capture.status,
      id: capture.id
    });

    if (capture.status !== "COMPLETED") {
      console.error("Payment not completed. Status:", capture.status);
      
      // Update purchase as failed
      await supabaseAdmin
        .from("purchases")
        .update({ status: "failed" as const })
        .eq("id", purchase.id);

      return NextResponse.json(
        { error: `Payment capture failed. Status: ${capture.status}` },
        { status: 400 }
      );
    }

    // Get capture details
    console.log("Step 5: Extracting capture details...");
    const captureId = capture.purchase_units?.[0]?.payments?.captures?.[0]?.id;
    const payerEmail = capture.payer?.email_address;
    
    console.log("Capture details:", { captureId, payerEmail });

    if (!captureId) {
      console.error("No capture ID in response:", JSON.stringify(capture, null, 2));
      return NextResponse.json(
        { error: "Failed to get capture details" },
        { status: 500 }
      );
    }
    console.log("Step 5 ✅ Capture ID:", captureId);

    // Update purchase as completed
    console.log("Step 6: Updating purchase to completed...");
    const updateData = {
      status: "completed" as const,
      paypal_capture_id: captureId,
      payment_email: payerEmail || null,
      verified_at: new Date().toISOString(),
    };
    console.log("Update data:", updateData);
    
    const { error: updateError } = await supabaseAdmin
      .from("purchases")
      .update(updateData)
      .eq("id", purchase.id);

    if (updateError) {
      console.error("Failed to update purchase:", updateError);
      return NextResponse.json(
        { error: "Failed to complete purchase: " + updateError.message },
        { status: 500 }
      );
    }
    console.log("Step 6 ✅ Purchase updated to completed");

    // Update user access based on purchase type
    console.log("Step 7: Updating user access...");
    console.log("Purchase type:", purchase.purchase_type);
    
    if (purchase.purchase_type === "complete") {
      const { error: tierError } = await supabaseAdmin
        .from("users")
        .update({ tier: "complete" })
        .eq("id", authResult.userId);
      
      if (tierError) {
        console.error("Failed to update user tier:", tierError);
        // Don't return error - purchase is complete, just log it
      } else {
        console.log("Step 7 ✅ User tier updated to 'complete'");
      }
    } else if (purchase.purchase_type === "custom") {
      const purchaseData = purchase.purchase_data as { chapters?: number[] } | null;
      const chapters = purchaseData?.chapters;
      console.log("Chapters to add:", chapters);

      if (chapters && Array.isArray(chapters) && chapters.length > 0) {
        // Try RPC function first
        const { error: rpcError } = await supabaseAdmin.rpc("add_owned_chapters", {
          p_user_id: authResult.userId,
          p_chapters: chapters,
        });

        if (rpcError) {
          console.log("RPC failed, using fallback:", rpcError.message);
          
          // Fallback: manual update
          const { data: currentUser, error: userFetchError } = await supabaseAdmin
            .from("users")
            .select("owned_chapters")
            .eq("id", authResult.userId)
            .single();

          if (userFetchError) {
            console.error("Failed to fetch user:", userFetchError);
          } else {
            const currentOwned = currentUser?.owned_chapters || [];
            const newOwned = Array.from(new Set([...currentOwned, ...chapters])).sort(
              (a: number, b: number) => a - b
            );

            const { error: chaptersError } = await supabaseAdmin
              .from("users")
              .update({ owned_chapters: newOwned })
              .eq("id", authResult.userId);
            
            if (chaptersError) {
              console.error("Failed to update owned_chapters:", chaptersError);
            } else {
              console.log("Step 7 ✅ Chapters added:", newOwned);
            }
          }
        } else {
          console.log("Step 7 ✅ Chapters added via RPC");
        }
      }
    }

    // Log the successful payment (optional - don't fail if this fails)
    console.log("Step 8: Creating audit log...");
    try {
      const ipAddress =
        request.headers.get("x-forwarded-for") || 
        request.headers.get("x-real-ip") || 
        null;
      const userAgent = request.headers.get("user-agent") || null;

      const { error: auditError } = await supabaseAdmin.from("audit_logs").insert({
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

      if (auditError) {
        // Don't fail the request, just log it
        console.warn("Audit log failed (non-critical):", auditError.message);
      } else {
        console.log("Step 8 ✅ Audit log created");
      }
    } catch (auditCatchError) {
      console.warn("Audit log error (non-critical):", auditCatchError);
    }

    console.log("=== PAYPAL CAPTURE SUCCESS ===");
    
    return NextResponse.json({
      success: true,
      purchaseType: purchase.purchase_type,
      message: "Payment successful! Your access has been updated.",
    });
    
  } catch (error: any) {
    console.error("=== PAYPAL CAPTURE ERROR ===");
    console.error("Error type:", error?.constructor?.name);
    console.error("Error message:", error?.message);
    console.error("Error stack:", error?.stack);
    console.error("Full error:", error);
    
    return NextResponse.json(
      { error: "Failed to capture payment: " + (error?.message || "Unknown error") },
      { status: 500 }
    );
  }
}