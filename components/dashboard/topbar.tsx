"use client";

import { SearchIcon } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type { Login, Merchant } from "@/src/client";

/**
 * The header bar above every dashboard screen.
 *
 * `merchant` is `Login.merchant`, already fetched by the layout's own auth guard — no second
 * request for a name/domain this screen could otherwise get from `GET /dashboard/`.
 *
 * `agentsOn` is owned by `app/dashboard/layout.tsx` because the sidebar's kill switch is the
 * same boolean.
 */
export function Topbar({
  user,
  merchant,
  agentsOn,
  onToggleAgents,
}: {
  user: Login;
  merchant: Merchant | null;
  agentsOn: boolean;
  onToggleAgents: () => void;
}) {
  const initials = (merchant?.business_name || user.name).slice(0, 1).toUpperCase();

  return (
    <header className="flex shrink-0 flex-wrap items-center gap-5 rounded-xl bg-panel px-5 py-3.5 shadow-card">
      <SidebarTrigger />

      <div className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-full bg-panel-2 px-4 md:max-w-105">
        <SearchIcon className="size-3.5 shrink-0 text-muted-ink" />
        <input
          type="search"
          placeholder="Search orders, products, reason codes"
          aria-label="Search orders, products, reason codes"
          className="min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-muted-ink"
        />
        <kbd className="shrink-0 rounded-sm bg-faint px-2 py-1 text-eyebrow tracking-normal text-muted-ink">
          ⌘K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-2.5 rounded-full bg-panel-2 py-1.5 pr-2 pl-4">
        <span className="text-eyebrow uppercase tracking-[0.08em] text-muted-ink">Agent traffic</span>
        <button
          type="button"
          role="switch"
          aria-checked={agentsOn}
          aria-label="Agent traffic"
          onClick={onToggleAgents}
          className="flex cursor-pointer items-center gap-2.5"
        >
          <span
            className={cn(
              "relative block h-5.5 w-10 rounded-full transition-colors",
              agentsOn ? "bg-navy-700" : "bg-step"
            )}
          >
            {/* Transform, not `left`: the knob is the one thing on screen that has to
                move, and moving it by a layout property re-lays-out the switch on every
                frame. 260ms on the quint curve — a shade longer and more decisive than
                the 180ms default, because this is the control that arms and disarms the
                whole store, and it should read as a lever being thrown rather than a
                colour quietly changing. */}
            <span
              className={cn(
                "absolute top-[3px] left-[3px] size-4 rounded-full bg-panel transition-transform duration-260 ease-out-quint",
                agentsOn ? "translate-x-[18px]" : "translate-x-0"
              )}
            />
          </span>
          <span className={cn("text-meta font-medium", agentsOn ? "text-foreground" : "text-step")}>
            {agentsOn ? "ON" : "OFF"}
          </span>
        </button>
      </div>

      <ThemeToggle />

      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-navy-200 font-medium text-navy-900">
          {initials}
        </span>
        <div className="leading-tight">
          <div className="text-body font-medium">{merchant?.business_name || user.name}</div>
          <div className="text-meta text-muted-ink">{merchant?.domain || user.email}</div>
        </div>
      </div>
    </header>
  );
}
