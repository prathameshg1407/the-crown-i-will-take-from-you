// lib/auth/guards.ts
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthContext";
import toast from "react-hot-toast";

interface AuthGuardOptions {
  requireAuth?: boolean;
  requiredTier?: "free" | "complete";
  redirectTo?: string;
}

export function useAuthGuard(options: AuthGuardOptions = {}) {
  const { requireAuth = false, requiredTier, redirectTo = "/login" } = options;
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (requireAuth && !isAuthenticated) {
      toast.error("Please login to continue");
      const currentPath = window.location.pathname;
      router.push(`${redirectTo}?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }

    if (requiredTier === "complete" && user?.tier !== "complete") {
      toast.error("Upgrade to Complete Pack to access this content");
      router.push("/pricing");
      return;
    }
  }, [isLoading, isAuthenticated, user, requireAuth, requiredTier, redirectTo, router]);

  const isAuthorized =
    !isLoading &&
    (!requireAuth || isAuthenticated) &&
    (!requiredTier || requiredTier === "free" || user?.tier === "complete");

  return { isLoading, isAuthenticated, user, isAuthorized };
}

export function useRequireAuth(redirectTo = "/login") {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const currentPath = window.location.pathname;
      router.push(`${redirectTo}?redirect=${encodeURIComponent(currentPath)}`);
    }
  }, [isLoading, isAuthenticated, router, redirectTo]);

  return { user, isLoading, isAuthenticated };
}