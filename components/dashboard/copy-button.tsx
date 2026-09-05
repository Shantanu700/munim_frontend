"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

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
