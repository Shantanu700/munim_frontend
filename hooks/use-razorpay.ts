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

/** Which action is in flight. One string rather than four booleans: it labels the button
 *  that is working and disables the other three without a second piece of state. */
export type RazorpayBusy = null | "save" | "verify" | "secret" | "test";

/**
 * The whole Razorpay screen: the payout account's state and every write against it.
 *
 * `GET /core/razorpay/` is one call by design — keys, webhook address, subscribed events and
 * the last event received all describe the same moment, and assembling them from separate
 * requests lets the status pill disagree with the boxes under it. It is also the only source
 * for `key_secret_set`, `key_mode`, `verified_at`, `account_name` and `webhook_received`:
 * `Login.merchant` carries `is_payment_ready` and `webhook_url` and nothing else, which is
 * why this screen fetches for itself instead of reading `SessionContext`.
 *
 * Two traps run through everything below.
 *
 * **A rejected key is a 201, not a 4xx.** `postCoreRazorpayVerify` and
 * `postCoreRazorpayTestEvent` both answer `{ ok: false, message }` on failure, so `data` is
 * truthy and `!data.ok` has to be its own branch. `describeApiError` must never be reached
 * for one of those: the body carries Razorpay's own sentence, which is better than anything
 * this could invent.
 *
 * **Only the PUT returns fresh state.** Verify and mint answer with their own shapes, so
 * `verified_at`, `is_payment_ready`, `account_name` and `webhook_received` move by refetch —
 * the same "one read that is always right" the policy and ingest hooks settled on.
 *
 * Nothing here is optimistic. `putPolicyKillSwitch` in the dashboard layout is the one
 * optimistic write in the app and its comment earns the exception; payment credentials are
 * the opposite case — a pill that claims a key landed when it did not costs real money.
 */
export function useRazorpay() {
  const [state, setState] = React.useState<RazorpayState | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState<RazorpayBusy>(null);

  /**
   * Re-read the payout account.
   *
   * A promise chain rather than async/await: the mount effect calls it, and
   * `react-hooks/set-state-in-effect` counts every setState it can reach synchronously
   * through a callback. An `await` in between does not clear that; a `.then` boundary does.
   */
  const refresh = React.useCallback(
    () =>
      getCoreRazorpay()
        .then(({ data, error }) => {
          if (!data) {
            // A buyer, or a merchant row that was never created. The screen renders its
            // "no merchant account" state, which is the truth; the backend's own message
            // says why better than this could.
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

  // The writes. Each is `async` because each is reachable only from a click, never from an
  // effect, and each answers whether it landed — the form clears the secret it just sent
  // only on a write that actually happened.

  /**
   * Store credentials. Immediate, and unverified: saving and checking are two buttons
   * because a merchant correcting one typo should not have to pass a round trip to Razorpay
   * before the value is on file.
   */
  const save = React.useCallback(async (body: RazorpayCredentialsWriteWritable) => {
    setBusy("save");
    try {
      const { data, error } = await putCoreRazorpay({ body });
      if (!data) {
        // A malformed `key_id` comes back field-keyed. `describeApiError` flattens it
        // verbatim, which matters here: the merchant needs to know it was the key id.
        toast.error(describeApiError(error));
        return false;
      }
      // The PUT answers with the whole state, so the screen shows what the server stored.
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

  /**
   * Ask Razorpay whether a pair authenticates. An empty body is meaningful and needs no
   * special case: it checks the pair already on file. A partial body overrides just that
   * field, so correcting a key id does not mean re-typing a secret Razorpay showed once.
   */
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
          // 201 with `ok: false` — the request was fine, the keys were not.
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

  /**
   * Mint a webhook secret. Munim generates this one rather than Razorpay, which is why the
   * screen can show it again tomorrow — and why minting over an existing one is a change
   * the merchant has to confirm: `replaced` means a webhook they already configured has
   * just stopped verifying.
   */
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

  /**
   * A self-signed round trip to the store's own webhook URL. It proves Munim's end verifies
   * a signature; only a real Razorpay event proves the merchant pasted the address right.
   */
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
        // The endpoint answered, our own webhook did not. `error` is the transport
        // complaint, `message` the readable one; either beats a generic failure.
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
