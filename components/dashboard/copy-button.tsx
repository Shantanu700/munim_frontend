"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/**
 * Copies `value` to the clipboard. Everything else is an ordinary Button, so the same
 * component serves the full-width "Copy address" pill on a dark panel and the icon-sized
 * one at the end of a ledger row.
 */
export function CopyButton({
  value,
  copiedLabel = "Copied.",
  ...props
}: React.ComponentProps<typeof Button> & { value: string; copiedLabel?: string }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(copiedLabel);
    } catch {
      toast.warning("Your browser blocked the clipboard. Select the text and copy it.");
    }
  }

  return <Button {...props} onClick={copy} />;
}
