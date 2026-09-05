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

const HISTORY_SIZE = 6;

export function usePolicy() {
  const [overview, setOverview] = React.useState<Overview | null>(null);
  const [detail, setDetail] = React.useState<PolicyDetail | null>(null);
  const [history, setHistory] = React.useState<HistoryEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [selected, setSelected] = React.useState<string | null>(null);

  const uuid = selected ?? overview?.active_policy ?? overview?.policies[0]?.uuid ?? null;

  const refresh = React.useCallback(
    () =>
      Promise.all([getPolicyOverview(), getPolicyHistory({ query: { page_size: HISTORY_SIZE } })])
        .then(([head, log]) => {
          if (!head.data) {
            if (head.error) toast.error(describeApiError(head.error));
            return;
          }
          setOverview(head.data);
          if (log.data) setHistory(log.data.results);
        })
        .catch(() => toast.error(OFFLINE)),
    []
  );

  React.useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  React.useEffect(() => {
    if (!uuid) return;
    let active = true;
    getPolicy({ path: { policy_uuid: uuid } })
      .then(({ data, error }) => {
        if (!active) return;
        if (!data) {
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

  const create = React.useCallback(
    async (name: string) => {
      setBusy(true);
      try {
        const { data, error } = await postPolicyPolicies({ body: { name } });
        if (!data) {
          toast.error(describeApiError(error));
          return false;
        }
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
        const { data, error } = await deletePolicyPolicies({ path: { policy_uuid: policyUuid } });
        if (!data) {
          toast.error(describeApiError(error));
          return false;
        }
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
    uuid,
    select: setSelected,
    saveRules,
    create,
    setActive,
    remove,
  };
}

export type { Rule };
