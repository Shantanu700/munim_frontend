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

/**
 * The buyer's platform API keys: the list and both mutations.
 *
 * Same conventions as hooks/use-mandates.ts — the mount fetch is a `.then` chain (an `await`
 * does not clear `react-hooks/set-state-in-effect`, a `.then` boundary does), mutations are
 * `async` and answer with what actually landed so the caller only reacts to a write that
 * happened, and every mutation re-runs `refresh()` rather than splicing local state.
 *
 * `GET /core/api-keys/` answers with a bare array, not the `{count, next, previous, results}`
 * wrapper the orders/products/ledger lists use — so there is nothing to page and no `total`
 * to carry forward.
 */
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

  /**
   * Answers with the created row, which is the only response carrying the raw key — only its
   * hash is stored, so `GET /core/api-keys/` can never show it again and a caller that
   * discards this return value has thrown the key away.
   */
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

  /**
   * Branches on `error`, not on `!data` like `useMandates.revoke` — `deleteCoreApiKeys` has no
   * generated success type at all, so `data` types as `unknown` and is legitimately
   * `undefined` on an empty 204. `error` is the only reliable signal here.
   */
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
