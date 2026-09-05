"use client";

import * as React from "react";
import { toast } from "sonner";

import {
  deleteCoreApiKeys,
  getCoreApiKeys,
  postCoreApiKeys,
  type PlatformApiKey,
  type PlatformApiKeyIssued,
} from "@/src/client";
import { describeApiError } from "@/lib/api";

const OFFLINE = "Could not reach the server. Check your connection and try again.";

export function useApiKeys() {
  const [keys, setKeys] = React.useState<PlatformApiKey[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  const refresh = React.useCallback(
    () =>
      getCoreApiKeys()
        .then(({ data, error }) => {
          if (data) setKeys(data);
          else if (error) toast.error(describeApiError(error));
        })
        .catch(() => toast.error(OFFLINE)),
    []
  );

  React.useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const create = React.useCallback(
    async (name: string): Promise<PlatformApiKeyIssued | null> => {
      setBusy(true);
      try {
        const { data, error } = await postCoreApiKeys({ body: { name } });
        if (!data) {
          toast.error(describeApiError(error));
          return null;
        }
        toast.success(`Key “${name}” created.`);
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
        const { error } = await deleteCoreApiKeys({ path: { key_uuid: uuid } });
        if (error) {
          toast.error(describeApiError(error));
          return false;
        }
        toast.success("Key revoked.");
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

  return { keys, loading, busy, create, revoke };
}
