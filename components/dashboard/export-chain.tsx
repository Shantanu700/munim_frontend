"use client";

import { toast } from "sonner";

import { ExportButton } from "@/components/dashboard/export-button";
import { useSession } from "@/components/dashboard/session";
import { describeApiError } from "@/lib/api";
import { getAuditExport } from "@/src/client";

const OFFLINE = "Could not reach the server. Check your connection and try again.";

/**
 * Download the whole hash chain, from genesis, in the form a third party can re-hash.
 *
 * `GET /audit/export` is deliberately unpaginated and unfiltered — a partial chain cannot be
 * verified — so this is a click-time fetch and the response is never held in state: nothing
 * on any screen renders it.
 *
 * A component of its own rather than an `ExportButton` at each call site, because Overview is
 * a server component and a fetching thunk cannot cross that boundary as a prop.
 */
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
