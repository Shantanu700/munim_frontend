"use client";

import { MandateForm } from "@/components/buyer/mandate-form";
import { useMandates } from "@/hooks/use-mandates";

/**
 * `/buyer` — creation only; the mandates it produces are read at `/buyer/mandates`.
 * Still `useMandates`, whose `create` refreshes a list this screen does not draw: one
 * spare GET, against splitting a hook that owns the screen's whole flow.
 */
export function CreateMandateScreen() {
  const { busy, create } = useMandates();

  return (
    <div className="grid gap-panel">
      <div className="px-1.5 py-1">
        <h1 className="text-page-title">Create mandate</h1>
        <p className="mt-1.5 max-w-none text-body text-muted-ink">
          Set what an assistant may spend on your behalf. Every mandate is revocable at any
          time.
        </p>
      </div>
      <MandateForm busy={busy} create={create} />
    </div>
  );
}
