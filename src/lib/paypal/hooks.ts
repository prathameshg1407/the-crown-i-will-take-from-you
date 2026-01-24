"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface PayPalOrderData {
  purchaseType: "complete" | "custom";
  chapters?: number[];
}

export interface UsePayPalReturn {
  createOrder: (data: PayPalOrderData) => Promise<string>;
  captureOrder: (orderId: string) => Promise<boolean>;
  isProcessing: boolean;
  error: string | null;
}

/**
 * usePayPal
 *
 * - createOrder -> calls /api/paypal/create-order and returns orderId
 * - captureOrder -> calls /api/paypal/capture-order and returns boolean success
 *
 * Safeguards:
 * - Uses AbortController to cancel in-flight requests on unmount
 * - Prevents state updates after unmount
 * - Provides clear toast messages
 */
export function usePayPal(): UsePayPalReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const mountedRef = useRef(true);
  const activeControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Abort any in-flight request on unmount
      if (activeControllerRef.current) {
        activeControllerRef.current.abort();
      }
    };
  }, []);

  const createOrder = useCallback(async (data: PayPalOrderData): Promise<string> => {
    setIsProcessing(true);
    setError(null);

    const controller = new AbortController();
    activeControllerRef.current = controller;

    try {
      const res = await fetch("/api/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      // Safe JSON parse with fallback
      let payload: any;
      try {
        payload = await res.json();
      } catch {
        payload = null;
      }

      if (!res.ok) {
        const msg = (payload && (payload.error || payload.message)) || `Create order failed (${res.status})`;
        throw new Error(msg);
      }

      if (!payload || typeof payload.orderId !== "string") {
        throw new Error("Invalid response from server when creating order");
      }

      return payload.orderId;
    } catch (err) {
      if ((err as any)?.name === "AbortError") {
        const message = "Request cancelled";
        setError(message);
        toast.error(message);
        throw err;
      }

      const message = err instanceof Error ? err.message : "Failed to create order";
      setError(message);
      toast.error(message);
      throw new Error(message);
    } finally {
      // only update state if component still mounted
      if (mountedRef.current) {
        setIsProcessing(false);
      }
      // clear controller reference
      if (activeControllerRef.current === controller) {
        activeControllerRef.current = null;
      }
    }
  }, []);

  const captureOrder = useCallback(
    async (orderId: string): Promise<boolean> => {
      setIsProcessing(true);
      setError(null);

      const controller = new AbortController();
      activeControllerRef.current = controller;

      try {
        const res = await fetch("/api/paypal/capture-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
          signal: controller.signal,
        });

        let payload: any;
        try {
          payload = await res.json();
        } catch {
          payload = null;
        }

        if (!res.ok) {
          const msg = (payload && (payload.error || payload.message)) || `Capture failed (${res.status})`;
          throw new Error(msg);
        }

        // success path: show toast and refresh client data
        const successMessage = payload?.message || "Payment successful!";
        toast.success(successMessage);

        // refresh user data / page (guarded for client)
        try {
          router.refresh();
        } catch (refreshErr) {
          // non-fatal; continue
          console.warn("router.refresh() failed:", refreshErr);
        }

        return true;
      } catch (err) {
        if ((err as any)?.name === "AbortError") {
          const message = "Request cancelled";
          setError(message);
          toast.error(message);
          return false;
        }

        const message = err instanceof Error ? err.message : "Payment failed";
        setError(message);
        toast.error(message);
        return false;
      } finally {
        if (mountedRef.current) {
          setIsProcessing(false);
        }
        if (activeControllerRef.current === controller) {
          activeControllerRef.current = null;
        }
      }
    },
    [router]
  );

  return {
    createOrder,
    captureOrder,
    isProcessing,
    error,
  };
}
