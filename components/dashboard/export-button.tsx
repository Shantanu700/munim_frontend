"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ExportButton({
  data,
  filename,
  children,
  className,
}: {
  data: unknown | (() => Promise<unknown>);
  filename: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [busy, setBusy] = React.useState(false);

  async function download() {
    setBusy(true);
    const payload = typeof data === "function" ? await (data as () => Promise<unknown>)() : data;
    setBusy(false);
    if (payload === undefined) return;

    const url = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    requestAnimationFrame(() => URL.revokeObjectURL(url));
    toast.success(`Saved ${filename}.`);
  }

  return (
    <Button
      variant="outline"
      className={cn("h-10 px-4.5", className)}
      disabled={busy}
      onClick={download}
    >
      {children}
    </Button>
  );
}
