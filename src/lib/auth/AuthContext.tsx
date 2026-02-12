// lib/auth/AuthContext.tsx
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

// =============================================================================
// TYPES
// =============================================================================

export interface User {
  id: string;
  email: string;
  name: string | null;
  tier: "free" | "complete";
  ownedChapters: number[];
  avatarUrl?: string | null;
  createdAt: string;
}

export interface UserStats {
  activeSessions: number;
  chaptersCompleted: number;
  chaptersInProgress: number;
}

interface AuthContextType {
  user: User | null;
  stats: UserStats | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const TOKEN_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes
const USER_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
const CACHE_KEY = "auth_user";
const CACHE_TIMESTAMP_KEY = "auth_timestamp";
const LOGOUT_KEY = "auth_logout";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// =============================================================================
// UTILITIES
// =============================================================================

function getCachedUser(): User | null {
  if (typeof window === "undefined") return null;

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

    if (cached && timestamp) {
      const age = Date.now() - parseInt(timestamp, 10);
      if (age < CACHE_DURATION) {
        return JSON.parse(cached);
      }
    }
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
  } catch {
    // Ignore
  }
  return null;
}

function setCachedUser(user: User | null): void {
  if (typeof window === "undefined") return;

  try {
    if (user) {
      localStorage.setItem(CACHE_KEY, JSON.stringify(user));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    } else {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
    }
  } catch {
    // Ignore
  }
}

function transformUser(data: Record<string, unknown>): User {
  return {
    id: data.id as string,
    email: data.email as string,
    name: (data.name as string) || null,
    tier: (data.tier as "free" | "complete") || "free",
    ownedChapters: (data.owned_chapters || data.ownedChapters || []) as number[],
    avatarUrl: (data.avatar_url || data.avatarUrl) as string | null,
    createdAt: (data.created_at || data.createdAt) as string,
  };
}

// =============================================================================
// CONTEXT
// =============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getCachedUser());
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();
  const mountedRef = useRef(true);
  const refreshingRef = useRef(false);

  const setUserWithCache = useCallback((newUser: User | null) => {
    if (!mountedRef.current) return;
    setUser(newUser);
    setCachedUser(newUser);
  }, []);

  // ===========================================================================
  // TOKEN REFRESH
  // ===========================================================================

  const refreshTokens = useCallback(async (): Promise<boolean> => {
    if (refreshingRef.current) return true;
    refreshingRef.current = true;

    try {
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });

      return response.ok;
    } catch {
      return false;
    } finally {
      refreshingRef.current = false;
    }
  }, []);

  // ===========================================================================
  // FETCH USER
  // ===========================================================================

  const fetchUser = useCallback(
    async (silent = false): Promise<boolean> => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.user) {
            setUserWithCache(transformUser(data.data.user));
            if (mountedRef.current) {
              setStats(data.data.stats || null);
            }
            return true;
          }
        }

        if (response.status === 401) {
          const refreshed = await refreshTokens();
          if (refreshed) {
            // Retry once
            const retryResponse = await fetch("/api/auth/me", {
              credentials: "include",
              cache: "no-store",
            });

            if (retryResponse.ok) {
              const data = await retryResponse.json();
              if (data.success && data.data?.user) {
                setUserWithCache(transformUser(data.data.user));
                if (mountedRef.current) {
                  setStats(data.data.stats || null);
                }
                return true;
              }
            }
          }

          if (!silent) {
            setUserWithCache(null);
            setStats(null);
          }
        }

        return false;
      } catch {
        return false;
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [refreshTokens, setUserWithCache]
  );

  // ===========================================================================
  // AUTH ACTIONS
  // ===========================================================================

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      setIsLoading(true);

      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error?.message || "Login failed");
        }

        setUserWithCache(transformUser(data.data.user));
        toast.success("Welcome back!");

        const params = new URLSearchParams(window.location.search);
        router.push(params.get("redirect") || "/");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Login failed";
        toast.error(message);
        throw error;
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [router, setUserWithCache]
  );

  const signup = useCallback(
    async (email: string, password: string, name?: string): Promise<void> => {
      setIsLoading(true);

      try {
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, password, name }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error?.message || "Signup failed");
        }

        setUserWithCache(transformUser(data.data.user));
        toast.success(data.data.message || "Account created!");
        router.push("/");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Signup failed";
        toast.error(message);
        throw error;
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [router, setUserWithCache]
  );

  const logout = useCallback(async (): Promise<void> => {
    setUserWithCache(null);
    setStats(null);

    try {
      localStorage.setItem(LOGOUT_KEY, Date.now().toString());
      localStorage.removeItem(LOGOUT_KEY);
    } catch {
      // Ignore
    }

    fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});

    toast.success("Logged out");
    router.push("/");
  }, [router, setUserWithCache]);

  const refreshUser = useCallback(async (): Promise<void> => {
    await fetchUser(true);
  }, [fetchUser]);

  const updateUser = useCallback((data: Partial<User>): void => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...data };
      setCachedUser(updated);
      return updated;
    });
  }, []);

  // ===========================================================================
  // EFFECTS
  // ===========================================================================

  useEffect(() => {
    mountedRef.current = true;
    fetchUser();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchUser]);

  // Token refresh interval
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      if (navigator.onLine) refreshTokens();
    }, TOKEN_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [user, refreshTokens]);

  // User refresh interval
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      if (navigator.onLine) fetchUser(true);
    }, USER_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [user, fetchUser]);

  // Visibility change handler
  useEffect(() => {
    if (!user) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        refreshTokens().then((ok) => {
          if (ok) fetchUser(true);
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [user, refreshTokens, fetchUser]);

  // Cross-tab sync
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === LOGOUT_KEY) {
        setUserWithCache(null);
        setStats(null);
        router.push("/login");
      } else if (e.key === CACHE_KEY && e.newValue) {
        try {
          setUser(JSON.parse(e.newValue));
        } catch {
          // Ignore
        }
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [router, setUserWithCache]);

  // ===========================================================================
  // RENDER
  // ===========================================================================

  return (
    <AuthContext.Provider
      value={{
        user,
        stats,
        isLoading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        refreshUser,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}