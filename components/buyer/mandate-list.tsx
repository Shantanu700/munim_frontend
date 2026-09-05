"use client";

import * as React from "react";

import { PanelHeader, Row, moment, rupees } from "@/components/dashboard/parts";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Mandate } from "@/src/client";

/**
 * `state` is `revoked / expired / pending / live`, one word, derived by the backend —
 * not `VerdictPill`'s ALLOW/STEP_UP/DENY, a different domain entirely. §1 rule 2 still
 * applies: colour never carries the meaning alone, the word does.
 */
const STATE: Record<string, { label: string; className: string }> = {
  live: { label: "Live", className: "bg-allow-tint text-allow" },
  pending: { label: "Pending", className: "bg-step-tint text-step" },
  expired: { label: "Expired", className: "bg-faint text-muted-ink" },
  revoked: { label: "Revoked", className: "bg-deny-tint text-deny" },
};

function StatePill({ state }: { state: string }) {
  const { label, className } = STATE[state] ?? { label: state, className: "bg-faint text-muted-ink" };
  return (
    <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-meta font-medium", className)}>
      {label}
    </span>
  );
}

/** `Mandate.store` is an untyped blob on the wire; read its domain defensively. */
function domainOf(mandate: Mandate): string {
  const domain = mandate.store.domain;
  return typeof domain === "string" && domain ? domain : "a store";
}

function RevokeButton({
  mandate,
  busy,
  revoke,
}: {
  mandate: Mandate;
  busy: boolean;
  revoke: (uuid: string) => Promise<boolean>;
}) {
  const [open, setOpen] = React.useState(false);

  // Same split as the kill-switch's confirm: this closes the popover, `useMandates` owns
  // the request and its own toast.
  async function confirm() {
    await revoke(mandate.uuid);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" disabled={busy} className="shrink-0">
          Revoke
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="shadow-card ring-0">
        <PopoverHeader>
          <PopoverTitle className="text-card-title">Revoke this mandate?</PopoverTitle>
          <PopoverDescription className="max-w-none text-meta text-muted-ink">
            {mandate.subject} loses the ability to spend on {domainOf(mandate)} immediately.
            This cannot be undone — create a new authorisation to let it buy again.
          </PopoverDescription>
        </PopoverHeader>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirm}>
            Revoke
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function MandateList({
  mandates,
  loading,
  busy,
  revoke,
}: {
  mandates: Mandate[];
  loading: boolean;
  busy: boolean;
  revoke: (uuid: string) => Promise<boolean>;
}) {
  return (
    <div className="rounded-xl bg-panel p-6 shadow-card">
      <PanelHeader title="Mandates you generated" meta={mandates.length || undefined} />
      <div className="mt-3.5 grid gap-2.5">
        {loading ? (
          <p className="text-body text-muted-ink">Loading…</p>
        ) : mandates.length === 0 ? (
          /* No second button here: the header's "Create mandate" is a few rows up and both
             would be on screen at once, so the copy names it rather than repeating it. */
          <p className="text-body text-muted-ink">
            Nothing authorised yet. Create a mandate to let an assistant buy on your behalf,
            inside limits you set.
          </p>
        ) : (
          mandates.map((mandate) => (
            <Row key={mandate.uuid} className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5">
                  <span className="text-body font-medium">{mandate.subject}</span>
                  <StatePill state={mandate.state} />
                </div>
                <div className="mt-1 text-meta text-muted-ink">
                  {domainOf(mandate)} · up to {rupees(mandate.per_txn_cap_paise, mandate.currency)} per
                  purchase, {rupees(mandate.remaining_paise, mandate.currency)} left of{" "}
                  {rupees(mandate.total_cap_paise, mandate.currency)} · expires{" "}
                  {moment(mandate.expires_at)}
                </div>
              </div>
              {mandate.state === "live" || mandate.state === "pending" ? (
                <RevokeButton mandate={mandate} busy={busy} revoke={revoke} />
              ) : null}
            </Row>
          ))
        )}
      </div>
    </div>
  );
}
