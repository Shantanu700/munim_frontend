"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Serialises data and hands it to the browser.
 *
 * `data` is either what the page already holds, or a function that fetches it — the audit
 * chain is a real endpoint now, but it stays a download rather than becoming a plain link to
 * it: the `sessionid` cookie belongs to the API origin, so a link would be a cross-origin
 * navigation whose auth depends on the browser's SameSite treatment. A thunk that resolves
 * `undefined` is a fetch that failed and has already said so, so nothing is saved.
 */
export function ExportButton({
  data,
  filename,
  children,
  className,
}: {
  data: unknown | (() => Promise<unknown>);
  filename: string;
  children: React.ReactNode;
  /** For call sites on a surface the outline variant's light tokens do not suit — the
      ledger's navy card, where the button has to carry its own colours. */
  className?: string;
}) {
  // Only meaningful for the thunk form: the whole chain is one unpaginated response, which
  // is long enough that a second click would otherwise start a second download of it.
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
    // Revoking immediately can race the download in Safari; a frame is enough.
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
