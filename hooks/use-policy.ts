"use client";

import * as React from "react";
import { toast } from "sonner";

import {
  deletePolicyPolicies,
  getPolicy,
  getPolicyHistory,
  getPolicyOverview,
  postPolicyPolicies,
  postPolicyPoliciesActivate,
  postPolicyPoliciesDeactivate,
  putPolicyPoliciesRules,
  type HistoryEntry,
  type KindEnum,
  type Overview,
  type PolicyDetail,
  type Rule,
  type RuleWrite,
} from "@/src/client";
import { describeApiError } from "@/lib/api";

const OFFLINE = "Could not reach the server. Check your connection and try again.";

/** Enough to fill the changes panel without a second page; nothing here scrolls. */
const HISTORY_SIZE = 6;

/**
 * The whole policy screen: the overview, the open policy's rules, and every write.
 *
 * Two endpoints carry it. `GET /policy/overview/` is one call by design — the tiles, the
 * cards and the active-policy pointer all describe the same moment, and assembling them
 * from separate requests lets the screen render a total that disagrees with the rows
 * beneath it. `GET /policy/policies/{uuid}/` is the open policy, and it *seeds missing rule
 * rows on read*, so it always answers with every kind the backend knows. That is why
 * nothing here calls the rule catalogue or fetches a rule one at a time: each `Rule` already
 * carries its own `label`, `description` and `config_fields`.
 */
export function usePolicy() {
  const [overview, setOverview] = React.useState<Overview | null>(null);
  const [detail, setDetail] = React.useState<PolicyDetail | null>(null);
  const [history, setHistory] = React.useState<HistoryEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  // `null` means "whatever the default is", not "nothing". Only a click sets it, so the
  // default below stays live: delete the open policy and the screen falls back on its own.
  const [selected, setSelected] = React.useState<string | null>(null);

  // Derived, never stored. The mock's `inForce ?? policies[0]` died as the source of truth
  // for which policy is in force — `active_policy` is legitimately null, and that means no
  // store rules apply at all — but it survives here, because something has to be open.
  const uuid = selected ?? overview?.active_policy ?? overview?.policies[0]?.uuid ?? null;

  /**
   * Re-read the overview and the change log. Every write calls this, because a rule edit
   * moves `rule_counts` on the card, `tiles.rules_enforcing` and `tiles.last_change_summary`
   * at once — four bespoke local splices against one refetch that is always right.
   *
   * A promise chain rather than async/await: the mount effect calls it, and
   * `react-hooks/set-state-in-effect` counts every setState it can reach synchronously
   * through a callback. An `await` in between does not clear that; a `.then` boundary does.
   */
  const refresh = React.useCallback(
    () =>
      Promise.all([getPolicyOverview(), getPolicyHistory({ query: { page_size: HISTORY_SIZE } })])
        .then(([head, log]) => {
          if (!head.data) {
            // 404 here means a buyer, or a merchant row that was never created. The screen
            // renders its "no merchant account" state, which is the truth; the message the
            // backend sent says so better than anything this could invent.
            if (head.error) toast.error(describeApiError(head.error));
            return;
          }
          setOverview(head.data);
          // The log is decoration beside the rules. A failure here must not blank a screen
          // whose real content arrived, so it is not reported.
          if (log.data) setHistory(log.data.results);
        })
        .catch(() => toast.error(OFFLINE)),
    []
  );

  React.useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  // The open policy. Separate from the overview because switching cards must not re-run the
  // 30-day aggregation behind the tiles.
  React.useEffect(() => {
    // No clearing branch here: a synchronous setState in an effect body is a lint *error* in
    // this repo. Nothing needs one — the caller renders the editor only when `uuid` is set,
    // so a detail left over from a deleted policy is never reachable.
    if (!uuid) return;
    let active = true;
    getPolicy({ path: { policy_uuid: uuid } })
      .then(({ data, error }) => {
        if (!active) return;
        if (!data) {
          // Gone since the overview was read — deleted in another tab. Drop the selection
          // and re-read, rather than leaving a card lit that addresses nothing.
          toast.error(describeApiError(error));
          setSelected(null);
          return void refresh();
        }
        setDetail(data);
      })
      .catch(() => active && toast.error(OFFLINE));
    return () => {
      active = false;
    };
  }, [uuid, refresh]);

  /**
   * Write the edited rules, one PUT per changed kind.
   *
   * Sequential, and not out of politeness: every write appends to the money chain, and
   * `LedgerEntry.append` takes a row lock on the merchant to advance the per-tenant
   * sequence. Eight parallel PUTs would queue on that one lock anyway.
   *
   * Answers with the kinds that actually landed rather than a boolean, because partial
   * failure is real here — the caller clears exactly those and leaves the rest pending.
   */
  const saveRules = React.useCallback(
    async (policyUuid: string, patches: [KindEnum, RuleWrite][]) => {
      setBusy(true);
      const id = toast.loading("Saving your rules…");
      const landed: KindEnum[] = [];
      try {
        for (const [kind, body] of patches) {
          const { data, error } = await putPolicyPoliciesRules({
            path: { policy_uuid: policyUuid, kind },
            body,
          });
          if (!data) {
            toast.error(describeApiError(error), { id });
            break;
          }
          landed.push(kind);
          // No optimism: the saved row replaces the edited one, so the card shows what the
          // server stored — including a config it normalised on the way in.
          setDetail((current) =>
            current === null
              ? current
              : { ...current, rules: current.rules.map((rule) => (rule.kind === kind ? data : rule)) }
          );
        }
        if (landed.length === patches.length) {
          toast.success(landed.length === 1 ? "Rule saved." : `${landed.length} rules saved.`, { id });
        }
      } catch {
        toast.error(OFFLINE, { id });
      } finally {
        setBusy(false);
      }
      if (landed.length) await refresh();
      return landed;
    },
    [refresh]
  );

  // The policy-level writes. Each answers whether it landed, so the caller only closes a
  // popover or clears a selection on a write that actually happened.

  const create = React.useCallback(
    async (name: string) => {
      setBusy(true);
      try {
        const { data, error } = await postPolicyPolicies({ body: { name } });
        if (!data) {
          toast.error(describeApiError(error));
          return false;
        }
        // Created with its rules already seeded, so the editor can open on it without a
        // second GET. Created inactive, too: declaring a policy and putting it in force are
        // two decisions, and the screen shows them as two buttons.
        setDetail(data);
        setSelected(data.uuid ?? null);
        toast.success(`${name} created. It is not in force yet.`);
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

  const setActive = React.useCallback(
    async (policyUuid: string, active: boolean) => {
      setBusy(true);
      try {
        const call = active ? postPolicyPoliciesActivate : postPolicyPoliciesDeactivate;
        const { data, error } = await call({ path: { policy_uuid: policyUuid } });
        if (!data) {
          toast.error(describeApiError(error));
          return false;
        }
        toast.success(
          active
            ? `${data.name} is now in force.`
            : `${data.name} is no longer in force. No store rules apply until you put one in force.`
        );
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

  const remove = React.useCallback(
    async (policyUuid: string) => {
      setBusy(true);
      try {
        // 200 with a `{msg}` body, not the 204 the products endpoints answer with.
        const { data, error } = await deletePolicyPolicies({ path: { policy_uuid: policyUuid } });
        if (!data) {
          toast.error(describeApiError(error));
          return false;
        }
        // Back to the derived default; the overview refetch decides what that is now.
        setSelected(null);
        toast.success("Policy deleted. The change is on your ledger.");
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

  return {
    overview,
    detail,
    history,
    loading,
    busy,
    /** The open policy's uuid, which is a derived default until the merchant clicks one. */
    uuid,
    select: setSelected,
    saveRules,
    create,
    setActive,
    remove,
  };
}

export type { Rule };
