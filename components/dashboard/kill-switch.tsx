"use client";

import * as React from "react";
import { PowerIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

/**
 * The one control that stops every agent purchase at once.
 *
 * It shares its boolean with the topbar's agent-traffic switch, so the state lives in
 * `app/dashboard/layout.tsx` — the layout renders both consumers, which is why props do the
 * job and no context is needed.
 *
 * `PUT /policy/kill-switch/` is behind it, and the layout owns the request. Deliberately not
 * a policy rule: it has to be reachable when the store has no active policy, which is exactly
 * when a merchant most wants it, and it overrides every rule rather than sitting among them.
 */
export function KillSwitch({
  agentsOn,
  onToggle,
}: {
  agentsOn: boolean;
  onToggle: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const { state, isMobile } = useSidebar();
  // Branch in JS, not CSS: two hidden triggers would both register as the popover's anchor
  // and the one without a layout box wins. On mobile the rail is a Sheet, always expanded.
  const collapsed = state === "collapsed" && !isMobile;

  // The layout owns the request and everything it has to say about it. Announcing success
  // here as well would mean a toast celebrating a change the PUT can still reverse.
  function confirm() {
    onToggle();
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {collapsed ? (
        <SidebarMenu>
          <SidebarMenuItem>
            {/* A SidebarMenuButton so the icon lands on the same 24px centre as the nav. */}
            <PopoverTrigger asChild>
              <SidebarMenuButton
                tooltip={agentsOn ? "Kill switch · agents live" : "Kill switch · agents stopped"}
                className="rounded-md"
              >
                <PowerIcon className={agentsOn ? undefined : "text-step"} />
                <span>Kill switch</span>
              </SidebarMenuButton>
            </PopoverTrigger>
          </SidebarMenuItem>
        </SidebarMenu>
      ) : (
        <div className="rounded-lg bg-navy-900 p-4.5 text-navy-050">
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                "size-2 shrink-0 animate-pulse rounded-full",
                agentsOn ? "bg-navy-200" : "bg-step"
              )}
            />
            <span className="text-eyebrow uppercase text-navy-200">
              {agentsOn ? "agents live" : "agents stopped"}
            </span>
          </div>
          <div className="mt-2.5 text-card-title">Kill switch</div>
          <p className="mt-1.5 max-w-none text-meta text-navy-200">
            Stops every agent purchase at once. Your storefront keeps selling.
          </p>
          {/* §6: on a dark panel the fill is --navy-200 with --navy-900 text. */}
          <PopoverTrigger asChild>
            <Button
              className={cn(
                "mt-3.5 h-10 w-full text-navy-900",
                agentsOn ? "bg-navy-200 hover:bg-navy-200/85" : "bg-step hover:bg-step/85"
              )}
            >
              {agentsOn ? "Stop agent purchases" : "Resume agent purchases"}
            </Button>
          </PopoverTrigger>
        </div>
      )}

      <PopoverContent side="right" align="end" className="shadow-card ring-0">
        <PopoverHeader>
          <PopoverTitle className="text-card-title">
            {agentsOn ? "Stop agent purchases?" : "Resume agent purchases?"}
          </PopoverTitle>
          <PopoverDescription className="max-w-none text-meta text-muted-ink">
            {agentsOn
              ? "Every agent checkout starts refusing immediately, with STORE_AGENTS_DISABLED on the ledger. Your storefront keeps selling to people, and orders already paid for are untouched."
              : "Agents can buy again straight away, under your existing store policy and each buyer's own mandate."}
          </PopoverDescription>
        </PopoverHeader>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant={agentsOn ? "destructive" : "default"} onClick={confirm}>
            {agentsOn ? "Stop purchases" : "Resume purchases"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
