"use client";

import * as React from "react";
import { toast } from "sonner";

import {
  getCoreRazorpay,
  postCoreRazorpayTestEvent,
  postCoreRazorpayVerify,
  postCoreRazorpayWebhookSecret,
  putCoreRazorpay,
  type RazorpayCredentialsWriteWritable,
  type RazorpayState,
  type RazorpayVerifyRequestWritable,
} from "@/src/client";
import { describeApiError } from "@/lib/api";

const OFFLINE = "Could not reach the server. Check your connection and try again.";

export type RazorpayBusy = null | "save" | "verify" | "secret" | "test";

export function useRazorpay() {
  const [state, setState] = React.useState<RazorpayState | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState<RazorpayBusy>(null);

  const refresh = React.useCallback(
    () =>
      getCoreRazorpay()
        .then(({ data, error }) => {
          if (!data) {
            if (error) toast.error(describeApiError(error));
            return;
          }
          setState(data);
        })
        .catch(() => toast.error(OFFLINE)),
    []
  );

  React.useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const save = React.useCallback(async (body: RazorpayCredentialsWriteWritable) => {
    setBusy("save");
    try {
      const { data, error } = await putCoreRazorpay({ body });
      if (!data) {
        toast.error(describeApiError(error));
        return false;
      }
      setState(data);
      toast.success("Saved. Verify the pair to confirm Razorpay accepts it.");
      return true;
    } catch {
      toast.error(OFFLINE);
      return false;
    } finally {
      setBusy(null);
    }
  }, []);

  const verify = React.useCallback(
    async (body: RazorpayVerifyRequestWritable) => {
      setBusy("verify");
      const id = toast.loading("Asking Razorpay…");
      try {
        const { data, error } = await postCoreRazorpayVerify({ body });
        if (!data) {
          toast.error(describeApiError(error), { id });
          return false;
        }
        if (!data.ok) {
          toast.error(data.message, { id });
          return false;
        }
        toast.success(data.message, { id });
        await refresh();
        return true;
      } catch {
        toast.error(OFFLINE, { id });
        return false;
      } finally {
        setBusy(null);
      }
    },
    [refresh]
  );

  const mintSecret = React.useCallback(async () => {
    setBusy("secret");
    try {
      const { data, error } = await postCoreRazorpayWebhookSecret();
      if (!data) {
        toast.error(describeApiError(error));
        return false;
      }
      if (data.replaced) toast.warning(data.message);
      else toast.success(data.message);
      await refresh();
      return true;
    } catch {
      toast.error(OFFLINE);
      return false;
    } finally {
      setBusy(null);
    }
  }, [refresh]);

  const testEvent = React.useCallback(async () => {
    setBusy("test");
    const id = toast.loading("Sending a test event…");
    try {
      const { data, error } = await postCoreRazorpayTestEvent();
      if (!data) {
        toast.error(describeApiError(error), { id });
        return false;
      }
      if (!data.ok) {
        toast.warning(data.error ?? data.message ?? "The test event did not come back.", { id });
        return false;
      }
      toast.success(data.message ?? "Test event delivered and verified.", { id });
      await refresh();
      return true;
    } catch {
      toast.error(OFFLINE, { id });
      return false;
    } finally {
      setBusy(null);
    }
  }, [refresh]);

  return { state, loading, busy, save, verify, mintSecret, testEvent };
}
