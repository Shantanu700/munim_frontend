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

/** A screenful and a bit. The endpoint's own ceiling is 50; its default is 10. */
const PAGE_SIZE = 20;

/** The three verdicts `?decision=` accepts. `null` is every entry, `CONFIG` rows included. */
export type Decision = "ALLOW" | "STEP_UP" | "DENY";

/**
 * What `LedgerEntry.verify` answers for one tenant, in its two shapes:
 * `{ok: true, verified, head}` or `{ok: false, broken_at_seq, error, verified}` — where
 * `verified` is then the number of entries that checked out *before* the break.
 *
 * Declared by hand because the wire type cannot carry it: `merchants` is a DRF `DictField`,
 * so `AuditVerifyResponse.merchants` regenerates as `Record<string, unknown>`.
 */
export type ChainVerify = {
  ok: boolean;
  verified: number;
  head?: string;
  broken_at_seq?: number;
  error?: string;
};

/**
 * Our tenant's chain out of a verify response — which arrives as either an HTTP 200 body or
 * an HTTP 409 one, since the view answers `409 CONFLICT` when any chain fails. Both statuses
 * carry the same payload, so both go through here.
 *
 * `null` means the response named no chain at all: `?merchant=` that matches nothing returns
 * `{ok: true, merchants: {}}`, because `all([])` is `True` in Python. Reporting that as
 * "verified" would be a proof of nothing.
 */
function chainOf(payload: unknown, domain: string): ChainVerify | null {
  const merchants = (payload as { merchants?: Record<string, unknown> } | null | undefined)
    ?.merchants;
  const mine = merchants && (merchants[domain] ?? Object.values(merchants)[0]);
  return mine && typeof mine === "object" ? (mine as ChainVerify) : null;
}

/**
 * The whole audit ledger screen: the paginated table, the entry under inspection, and the
 * chain proof.
 *
 * `domain` is the signed-in merchant's, for `?merchant=`. It comes from the caller rather
 * than from `useSession()` here because the screen prints it too, in the public GET line.
 */
export function useAudit(domain: string, seq?: number) {
  const [rows, setRows] = React.useState<LedgerEntry[]>([]);
  const [count, setCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [filter, setFilter] = React.useState<Decision | null>(null);
  // `seq` seeds this: the orders screen links here with the decision behind an order, and
  // that entry is the one to open. Only the initial value — a click sets it after that.
  const [selected, setSelected] = React.useState<number | null>(seq ?? null);
  const [detail, setDetail] = React.useState<LedgerEntryDetail | null>(null);
  const [chain, setChain] = React.useState<{ at: Date; result: ChainVerify } | null>(null);
  const [verifying, setVerifying] = React.useState(false);

  // The page we are on, and which request is the current one. Refs: no render reads either,
  // and a filter change while a page is in flight would otherwise append rows from a list
  // nobody is looking at any more.
  const page = React.useRef(1);
  const generation = React.useRef(0);

  /**
   * One page. A promise chain rather than async/await because an effect calls it, and
   * `react-hooks/set-state-in-effect` counts every setState it can reach synchronously
   * through a callback — an `await` in between does not clear that, a `.then` boundary does.
   */
  const load = React.useCallback((next: number, decision: Decision | null) => {
    const mine = ++generation.current;
    return getAuditEntries({
      query: { page: next, page_size: PAGE_SIZE, ...(decision ? { decision } : {}) },
    })
      .then(({ data, error }) => {
        if (mine !== generation.current) return;
        setLoading(false);
        if (!data) {
          // A buyer, or a merchant row that was never created: the view 404s with its own
          // sentence, which says why better than this could. The table falls through to
          // its empty state, which is the truth.
          toast.error(describeApiError(error));
          return;
        }
        // Advance only on success, so a page that failed is retried rather than skipped.
        page.current = next;
        setCount(data.count);
        setRows((current) => (next === 1 ? data.results : [...current, ...data.results]));
      })
      .catch(() => {
        if (mine !== generation.current) return;
        // Cleared here too, or a first page that failed leaves the table saying "Loading…"
        // for ever, under a toast that has already gone.
        setLoading(false);
        toast.error(OFFLINE);
      });
  }, []);

  // Mount, and again on every filter change — the filter is part of the request, not a pass
  // over the rows already loaded: filtering only what is loaded would print "Deny 91" beside
  // twenty visible rows. The old rows stay up for the round trip rather than flashing empty.
  React.useEffect(() => {
    load(1, filter);
  }, [filter, load]);

  const loadMore = React.useCallback(async () => {
    setBusy(true);
    await load(page.current + 1, filter);
    setBusy(false);
  }, [load, filter]);

  /**
   * The row under inspection. Derived, never stored: a row the current filter excludes falls
   * back to the first one still showing, which is the inspector's rule everywhere.
   *
   * The linked `seq` is the one exception, and `selected === seq` is what spots it. An
   * order's decision can sit thousands of entries down, well below the pages loaded here, so
   * falling back would answer "what allowed this order?" with an unrelated entry. It is
   * fetched instead — the detail response is a superset of a row, so the rail loses nothing.
   */
  const entry =
    rows.find((row) => row.seq === selected) ?? (selected === seq ? undefined : rows[0]);

  /** Which entry the rail is about, loaded row or not. */
  const inspecting = entry?.seq ?? selected ?? undefined;

  /**
   * `prev_hash` and the raw `detail` blob are on the detail response only — a list row
   * cannot fill the chain-position panel. Keyed on `inspecting` rather than on the loaded
   * row, so a deep link fetches its entry even when no page holds it: `LedgerEntryDetail`
   * is a superset of `LedgerEntry`, and the rail can draw the whole thing from this alone.
   *
   * No clearing branch (a synchronous setState in an effect body is a lint *error* here) and
   * none needed: the response carries its own `seq`, so the page renders the blob only while
   * it matches the row above it, and a detail left over from the previous selection is
   * unreachable rather than mislabelled.
   */
  React.useEffect(() => {
    if (inspecting === undefined) return;
    let active = true;
    getAuditEntry({ path: { seq: inspecting } })
      .then(({ data }) => {
        if (active && data) setDetail(data);
      })
      // Silent: the rail's own fields arrived with the list. A failure here costs the two
      // hashes, and a toast about it would fire on every row click while the API is down.
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [inspecting]);

  /**
   * Re-hash the chain. `id` is a `toast.loading` handle: pass one for a merchant-initiated
   * check, omit it for the silent one on mount — a screen load must not announce a result
   * nobody asked for, and the pill below the GET line is where a mount check reports.
   */
  const check = React.useCallback(
    (id?: string | number) =>
      getAuditVerify({ query: domain ? { merchant: domain } : {} })
        .then(({ data, error }) => {
          // A break is a 409, so it arrives in `error` — the opposite of the Razorpay
          // convention, where a rejection is a 201 with `ok: false`. Both statuses carry the
          // same body, and `describeApiError` must never see a break: walking that payload
          // would print the bare string "prev_hash mismatch" at a merchant.
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
