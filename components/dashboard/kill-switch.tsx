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

export function KillSwitch({
  agentsOn,
  onToggle,
}: {
  agentsOn: boolean;
  onToggle: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const { state, isMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;

  function confirm() {
    onToggle();
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {collapsed ? (
        <SidebarMenu>
          <SidebarMenuItem>
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
                "size-2 shrink-0 rounded-full transition-colors",
                agentsOn ? "animate-heartbeat bg-navy-200" : "bg-step"
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
