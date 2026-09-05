"use client";

import { MandateForm } from "@/components/buyer/mandate-form";
import { useMandates } from "@/hooks/use-mandates";

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
      <div className="grid items-start gap-panel lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_420px]">
        <MandateForm busy={busy} create={create} />
      </div>
    </div>
  );
}
