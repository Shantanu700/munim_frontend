"use client";

import * as React from "react";
import { toast } from "sonner";

import {
  getBuyerMandates,
  postBuyerMandates,
  postBuyerMandatesRevoke,
  type Mandate,
  type MandateIssued,
  type MandateWrite,
} from "@/src/client";
import { describeApiError } from "@/lib/api";

const OFFLINE = "Could not reach the server. Check your connection and try again.";

/**
 * The buyer's whole mandates screen: the list and both mutations.
 *
 * Mirrors hooks/use-policy.ts's conventions — the mount fetch is a `.then` chain (an
 * `await` does not clear `react-hooks/set-state-in-effect`, a `.then` boundary does),
 * mutations are `async` and answer with what actually landed so the caller only reacts
 * to a write that happened, and every mutation re-runs `refresh()` rather than splicing
 * local state.
 */
export function useMandates() {
  const [mandates, setMandates] = React.useState<Mandate[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  const refresh = React.useCallback(
    () =>
      getBuyerMandates()
        .then(({ data, error }) => {
          if (data) setMandates(data);
          else if (error) toast.error(describeApiError(error));
        })
        .catch(() => toast.error(OFFLINE)),
    []
  );

  React.useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  /**
   * Answers with the created row, which is the only response carrying the mandate's
   * token — `GET /buyer/mandates/` never does, so a caller that discards this return
   * value has no other way to show it.
   */
  const create = React.useCallback(
    async (body: MandateWrite): Promise<MandateIssued | null> => {
      setBusy(true);
      try {
        const { data, error } = await postBuyerMandates({ body });
        if (!data) {
          toast.error(describeApiError(error));
          return null;
        }
        toast.success(`Authorised ${body.subject} on ${body.domain}.`);
        await refresh();
        return data;
      } catch {
        toast.error(OFFLINE);
        return null;
      } finally {
        setBusy(false);
      }
    },
    [refresh]
  );

  const revoke = React.useCallback(
    async (uuid: string) => {
      setBusy(true);
      try {
        const { data, error } = await postBuyerMandatesRevoke({ path: { mandate_uuid: uuid } });
        if (!data) {
          toast.error(describeApiError(error));
          return false;
        }
        toast.success("Mandate revoked.");
        await refresh();
        return true;
      } catch {
        toast.error(OFFLINE);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [refresh]
  );

  return { mandates, loading, busy, create, revoke };
}
