"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { Login } from "@/src/client";

/**
 * The buyer header bar. Stripped down from `components/dashboard/topbar.tsx`: no search
 * (two destinations, nothing to search), no agent-traffic switch (a store-wide concept,
 * meaningless for a buyer), and no heading — each screen carries its own `h1`, and a
 * fixed one here was wrong on whichever route it did not name. `user.merchant` is always
 * null here — a buyer's name/email are the only identity this account has.
 */
export function Topbar({ user }: { user: Login }) {
  const initials = user.name.slice(0, 1).toUpperCase();

  return (
    <header className="flex shrink-0 flex-wrap items-center gap-5 rounded-xl bg-panel px-5 py-3.5 shadow-card">
      <SidebarTrigger />
      <ThemeToggle />

      <div className="ml-auto flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-navy-200 font-medium text-navy-900">
          {initials}
        </span>
        <div className="leading-tight">
          <div className="text-body font-medium">{user.name}</div>
          <div className="text-meta text-muted-ink">{user.email}</div>
        </div>
      </div>
    </header>
  );
}
