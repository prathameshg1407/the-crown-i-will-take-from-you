"use client";

import { PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import { usePayPal } from "@/lib/paypal/hooks";
import { Loader2 } from "lucide-react";

interface PayPalButtonProps {
  purchaseType: "complete" | "custom";
  chapters?: number[];
  disabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function PayPalButton({
  purchaseType,
  chapters,
  disabled = false,
  onSuccess,
  onError,
}: PayPalButtonProps) {
  const [{ isPending, isRejected }] = usePayPalScriptReducer();
  const { createOrder, captureOrder, isProcessing } = usePayPal();

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
        <span className="ml-2 text-sm text-neutral-400">Loading PayPal...</span>
      </div>
    );
  }

  if (isRejected) {
    return (
      <div className="text-center py-4 text-red-400 text-sm">
        Failed to load PayPal. Please try again.
      </div>
    );
  }

  return (
    <div className={`paypal-button-container ${disabled || isProcessing ? "opacity-50 pointer-events-none" : ""}`}>
      <PayPalButtons
        style={{
          layout: "horizontal",
          color: "black",
          shape: "rect",
          label: "pay",
          height: 45,
        }}
        disabled={disabled || isProcessing}
        forceReRender={[purchaseType, ...(chapters || [])]}
        createOrder={async () => {
          try {
            const orderId = await createOrder({
              purchaseType,
              chapters,
            });
            // PayPal Buttons expect the createOrder callback to return the order ID string
            return orderId;
          } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to create order";
            onError?.(message);
            throw error;
          }
        }}
        onApprove={async (data, actions) => {
          try {
            // Capture server-side using your capture API
            const success = await captureOrder(data.orderID);
            if (success) {
              onSuccess?.();
            } else {
              onError?.("Payment capture failed");
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : "Payment failed";
            onError?.(message);
          }
        }}
        onError={(err) => {
          console.error("PayPal error:", err);
          onError?.("Payment failed. Please try again.");
        }}
        onCancel={() => {
          console.log("Payment cancelled");
        }}
      />
    </div>
  );
}
