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
      {/* The form takes the width and the read-back is the fixed rail — the two-column shape
          every other screen in this app uses (api-keys, ledger, products, razorpay). Alone in
          one column the form stretched pill inputs across 1300px at xl, which made a
          seven-field money form read as a landing page. `items-start` so the shorter rail
          sizes to its content instead of stretching to the form's height; below `lg` the form
          comes first, which is the order it is filled in. */}
      <div className="grid items-start gap-panel lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_420px]">
        <MandateForm busy={busy} create={create} />
      </div>
    </div>
  );
}
