// components/auth/UserMenu.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLogout } from "@/lib/auth/hooks";
import Link from "next/link";
import { LogOut, Crown } from "lucide-react";

export default function UserMenuFixed() {
  const { user, isAuthenticated } = useAuth();
  const { logout, isLoading } = useLogout();
  const [isOpen, setIsOpen] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // ✅ Wait for client-side mount to avoid hydration mismatch
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ Render nothing or skeleton until mounted to prevent hydration mismatch
  if (!hasMounted) {
    return (
      <div className="fixed top-6 right-6 z-50">
        {/* Skeleton placeholder - same on server and client */}
        <div className="w-12 h-12 rounded-full bg-neutral-800 animate-pulse" />
      </div>
    );
  }

  // ✅ Now safe to render auth-dependent UI (only runs on client after mount)
  if (!isAuthenticated || !user) {
    return (
      <div className="fixed top-6 right-6 z-50 flex items-center gap-3">
        <Link
          href="/login"
          className="px-4 py-2 text-sm font-ui text-neutral-400 hover:text-neutral-100 transition-colors uppercase tracking-wider"
        >
          Login
        </Link>
        <Link
          href="/signup"
          className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-lg font-heading text-xs tracking-[0.2em] uppercase hover:from-red-500 hover:to-red-700 transition-all duration-300 shadow-lg hover:shadow-[#9f1239]/50"
        >
          Sign Up
        </Link>
      </div>
    );
  }

  const getTierColor = () => {
    if (user.tier === "complete") return "from-amber-500 to-yellow-600";
    return "from-green-500 to-emerald-600";
  };

  const getTierBadge = () => {
    if (user.tier === "complete") return "👑 Complete Access";
    if (user.ownedChapters.length > 0)
      return `💎 ${user.ownedChapters.length} Chapters`;
    return "📖 Free";
  };

  const getTierTextColor = () => {
    if (user.tier === "complete") return "text-amber-500";
    if (user.ownedChapters.length > 0) return "text-purple-500";
    return "text-green-500";
  };

  return (
    <div className="fixed top-6 right-6 z-50" ref={menuRef}>
      {/* Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative group"
        title={user.name || user.email}
      >
        <div
          className={`w-12 h-12 rounded-full bg-gradient-to-br ${getTierColor()} flex items-center justify-center ring-2 ring-offset-2 ring-offset-transparent ring-transparent group-hover:ring-neutral-700 transition-all shadow-lg`}
        >
          <span className="text-white font-heading uppercase">
            {user.name?.[0] || user.email[0]}
          </span>
        </div>
        {/* Online Indicator */}
        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-black" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-72 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* User Info Header */}
          <div className="p-4 border-b border-neutral-800 bg-gradient-to-br from-neutral-900 to-neutral-800">
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-12 h-12 rounded-full bg-gradient-to-br ${getTierColor()} flex items-center justify-center`}
              >
                <span className="text-white text-lg font-heading uppercase">
                  {user.name?.[0] || user.email[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-heading text-neutral-100 truncate">
                  {user.name || "User"}
                </div>
                <div className="text-xs text-neutral-400 font-body truncate">
                  {user.email}
                </div>
              </div>
            </div>
            <div
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full bg-black/40 text-xs font-ui uppercase tracking-wider ${getTierTextColor()}`}
            >
              {getTierBadge()}
            </div>
          </div>

          {/* Menu Items */}
          {user.tier !== "complete" && (
            <div className="py-2">
              <MenuItem
                href="/pricing"
                icon={<Crown className="w-4 h-4" />}
                label="Upgrade Plan"
                onClick={() => setIsOpen(false)}
                highlight
              />
            </div>
          )}

          {/* Logout */}
          <div className="border-t border-neutral-800 py-2">
            <button
              onClick={() => {
                logout();
                setIsOpen(false);
              }}
              disabled={isLoading}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left group"
            >
              <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              <span className="font-body text-sm">
                {isLoading ? "Logging out..." : "Logout"}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  href,
  icon,
  label,
  onClick,
  highlight = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2.5 transition-colors group ${
        highlight
          ? "text-amber-400 hover:bg-amber-900/20"
          : "text-neutral-300 hover:bg-neutral-800/50"
      }`}
    >
      <span className="group-hover:scale-110 transition-transform">{icon}</span>
      <span className="font-body text-sm">{label}</span>
    </Link>
  );
}