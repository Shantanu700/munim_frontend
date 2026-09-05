"use client";

import { ShieldPlusIcon } from "lucide-react";
import Link from "next/link";

import { MandateList } from "@/components/buyer/mandate-list";
import { Button } from "@/components/ui/button";
import { useMandates } from "@/hooks/use-mandates";

export function MandatesScreen() {
  const { mandates, loading, busy, revoke } = useMandates();

  return (
    <div className="grid gap-panel">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 px-1.5 py-1">
        <div>
          <h1 className="text-page-title">Mandates</h1>
          <p className="mt-1.5 max-w-none text-body text-muted-ink">
            What each assistant may spend, what is left of it, and when it lapses. Revoke any
            of them at any time.
          </p>
        </div>
        <Button asChild className="h-11 px-5">
          <Link href="/buyer">
            <ShieldPlusIcon />
            Create mandate
          </Link>
        </Button>
      </div>
      <MandateList mandates={mandates} loading={loading} busy={busy} revoke={revoke} />
    </div>
  );
}
