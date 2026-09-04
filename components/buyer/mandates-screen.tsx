"use client";

import { MandateList } from "@/components/buyer/mandate-list";
import { useMandates } from "@/hooks/use-mandates";

/** `/buyer/mandates` — the read side: every mandate this buyer has issued, and revoke. */
export function MandatesScreen() {
  const { mandates, loading, busy, revoke } = useMandates();

  return (
    <div className="grid gap-panel">
      <div className="px-1.5 py-1">
        <h1 className="text-page-title">Mandates</h1>
        <p className="mt-1.5 max-w-none text-body text-muted-ink">
          What each assistant may spend, what is left of it, and when it lapses. Revoke any
          of them at any time.
        </p>
      </div>
      <MandateList mandates={mandates} loading={loading} busy={busy} revoke={revoke} />
    </div>
  );
}
