"use client";

import { toast } from "sonner";

import { ExportButton } from "@/components/dashboard/export-button";
import { useSession } from "@/components/dashboard/session";
import { describeApiError } from "@/lib/api";
import { getAuditExport } from "@/src/client";

const OFFLINE = "Could not reach the server. Check your connection and try again.";

export function ExportChainButton({
  children = "Export chain (JSON)",
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  const domain = useSession().merchant?.domain;

  async function chain() {
    try {
      const { data, error } = await getAuditExport();
      if (!data) {
        toast.error(describeApiError(error));
        return undefined;
      }
      return data;
    } catch {
      toast.error(OFFLINE);
      return undefined;
    }
  }

  return (
    <ExportButton
      data={chain}
      filename={`munim-ledger-${domain || "chain"}.json`}
      className={className}
    >
      {children}
    </ExportButton>
  );
}
