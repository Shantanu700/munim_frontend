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
