// lib/auth/hooks.ts
"use client";

import { useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { AUTH_CONFIG } from "./config";
import toast from "react-hot-toast";

export function useLogin() {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      setError(null);

      try {
        await login(email, password);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Login failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [login]
  );

  return { login: handleLogin, isLoading, error };
}

export function useSignup() {
  const { signup } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = useCallback(
    async (email: string, password: string, name?: string) => {
      setIsLoading(true);
      setError(null);

      try {
        await signup(email, password, name);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Signup failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [signup]
  );

  return { signup: handleSignup, isLoading, error };
}

export function useLogout() {
  const { logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = useCallback(async () => {
    setIsLoading(true);
    try {
      await logout();
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  return { logout: handleLogout, isLoading };
}

export function useChapterAccess(chapterId: number) {
  const { user } = useAuth();

  const hasAccess = (() => {
    if (!user) return chapterId <= AUTH_CONFIG.FREE_CHAPTER_LIMIT;
    if (user.tier === "complete") return true;
    if (user.ownedChapters.includes(chapterId)) return true;
    return chapterId <= AUTH_CONFIG.FREE_CHAPTER_LIMIT;
  })();

  return {
    hasAccess,
    userTier: user?.tier || "free",
    isAuthenticated: !!user,
  };
}

export function usePasswordReset() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const requestReset = useCallback(async (email: string) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to send reset email");
      }

      setSuccess(true);
      toast.success("Password reset email sent!");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (token: string, password: string) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to reset password");
      }

      setSuccess(true);
      toast.success("Password reset successfully!");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Reset failed";
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { requestReset, resetPassword, isLoading, error, success };
}