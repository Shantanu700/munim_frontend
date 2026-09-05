"use client";

import * as React from "react";
import { toast } from "sonner";

import {
  getAuditEntries,
  getAuditEntry,
  getAuditVerify,
  type LedgerEntry,
  type LedgerEntryDetail,
} from "@/src/client";
import { describeApiError } from "@/lib/api";

const OFFLINE = "Could not reach the server. Check your connection and try again.";

const PAGE_SIZE = 20;

export type Decision = "ALLOW" | "STEP_UP" | "DENY";

export type ChainVerify = {
  ok: boolean;
  verified: number;
  head?: string;
  broken_at_seq?: number;
  error?: string;
};

function chainOf(payload: unknown, domain: string): ChainVerify | null {
  const merchants = (payload as { merchants?: Record<string, unknown> } | null | undefined)
    ?.merchants;
  const mine = merchants && (merchants[domain] ?? Object.values(merchants)[0]);
  return mine && typeof mine === "object" ? (mine as ChainVerify) : null;
}

export function useAudit(domain: string, seq?: number) {
  const [rows, setRows] = React.useState<LedgerEntry[]>([]);
  const [count, setCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [filter, setFilter] = React.useState<Decision | null>(null);
  const [selected, setSelected] = React.useState<number | null>(seq ?? null);
  const [detail, setDetail] = React.useState<LedgerEntryDetail | null>(null);
  const [chain, setChain] = React.useState<{ at: Date; result: ChainVerify } | null>(null);
  const [verifying, setVerifying] = React.useState(false);

  const page = React.useRef(1);
  const generation = React.useRef(0);

  const load = React.useCallback((next: number, decision: Decision | null) => {
    const mine = ++generation.current;
    return getAuditEntries({
      query: { page: next, page_size: PAGE_SIZE, ...(decision ? { decision } : {}) },
    })
      .then(({ data, error }) => {
        if (mine !== generation.current) return;
        setLoading(false);
        if (!data) {
          toast.error(describeApiError(error));
          return;
        }
        page.current = next;
        setCount(data.count);
        setRows((current) => (next === 1 ? data.results : [...current, ...data.results]));
      })
      .catch(() => {
        if (mine !== generation.current) return;
        setLoading(false);
        toast.error(OFFLINE);
      });
  }, []);

  React.useEffect(() => {
    load(1, filter);
  }, [filter, load]);

  const loadMore = React.useCallback(async () => {
    setBusy(true);
    await load(page.current + 1, filter);
    setBusy(false);
  }, [load, filter]);

  const entry = rows.find((row) => row.seq === selected);

  const inspecting = selected ?? undefined;

  React.useEffect(() => {
    if (inspecting === undefined) return;
    let active = true;
    getAuditEntry({ path: { seq: inspecting } })
      .then(({ data }) => {
        if (active && data) setDetail(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [inspecting]);

  const check = React.useCallback(
    (id?: string | number) =>
      getAuditVerify({ query: domain ? { merchant: domain } : {} })
        .then(({ data, error }) => {
          const result = chainOf(data ?? error, domain);
          if (!result) {
            if (id) toast.error(describeApiError(error), { id });
            return;
          }
          setChain({ at: new Date(), result });
          if (!id) return;
          if (result.ok)
            toast.success(`Chain verified. ${result.verified} entries, each hashing the one before.`, { id });
          else
            toast.warning(
              `The chain breaks at entry ${result.broken_at_seq}. ${result.verified} entries verified before it.`,
              { id }
            );
        })
        .catch(() => {
          if (id) toast.error(OFFLINE, { id });
        }),
    [domain]
  );

  React.useEffect(() => {
    check();
  }, [check]);

  const verify = React.useCallback(async () => {
    setVerifying(true);
    await check(toast.loading("Verifying the chain…"));
    setVerifying(false);
  }, [check]);

  return {
    rows,
    count,
    remaining: Math.max(0, count - rows.length),
    loading,
    busy,
    filter,
    setFilter,
    entry,
    inspecting,
    select: setSelected,
    detail,
    chain,
    verifying,
    verify,
    loadMore,
  };
}
