"use client";

import * as React from "react";
import { toast } from "sonner";

import { describeApiError } from "@/lib/api";
import {
  getBuyerOrder,
  getBuyerOrders,
  type BuyerOrder,
  type BuyerOrderDetail,
  type GetBuyerOrdersData,
} from "@/src/client";

const OFFLINE = "Could not reach the server. Check your connection and try again.";

/** A screenful and a bit. The endpoint's default is 20 and its ceiling 100. */
const PAGE_SIZE = 20;

/** How long after the last keystroke the search actually goes out. */
const DEBOUNCE_MS = 300;

/**
 * What `?status=` accepts here — the four stored statuses, and **nothing else**.
 *
 * The merchant endpoint also takes `all` and `needs_attention`; this one takes neither, so
 * "every status" is the parameter being *absent* rather than a value. That is why `status`
 * is `null` for All below and why `load()` spreads the key in conditionally: sending
 * `status: "all"` here filters to nothing. Read off the generated query type rather than
 * restated, so a status the backend learns next is a regenerate rather than an edit.
 */
export type BuyerOrderStatus = NonNullable<NonNullable<GetBuyerOrdersData["query"]>["status"]>;

/**
 * Every order this buyer placed, across every merchant, plus the one under inspection.
 *
 * `hooks/use-orders.ts` is the model — same cursor envelope, same four traps — but the buyer
 * API is a good deal smaller than the merchant's: there is no counts endpoint (so the filter
 * pills carry no numbers), no tiles endpoint and no export. Six `*Buyer*` functions exist in
 * total and two of them are these.
 */
export function useBuyerOrders() {
  const [rows, setRows] = React.useState<BuyerOrder[]>([]);
  const [total, setTotal] = React.useState<number | null>(null);
  const [hasMore, setHasMore] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [status, setStatus] = React.useState<BuyerOrderStatus | null>(null);
  const [q, setQ] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<BuyerOrderDetail | null>(null);

  // Where the next page starts, and which request is the current one. Refs: no render reads
  // either, and a filter change while a page is in flight would otherwise append rows from a
  // list nobody is looking at any more.
  const cursor = React.useRef<string | null>(null);
  const generation = React.useRef(0);

  /**
   * One page. A promise chain rather than async/await because an effect calls it, and
   * `react-hooks/set-state-in-effect` counts every setState it can reach synchronously
   * through a callback — an `await` in between does not clear that, a `.then` boundary does.
   */
  const load = React.useCallback(
    (from: string | null, tab: BuyerOrderStatus | null, text: string) => {
      const mine = ++generation.current;
      return getBuyerOrders({
        query: {
          page_size: PAGE_SIZE,
          ...(from ? { cursor: from } : {}),
          ...(tab ? { status: tab } : {}),
          ...(text ? { q: text } : {}),
        },
      })
        .then(({ data, error }) => {
          if (mine !== generation.current) return;
          setLoading(false);
          if (!data) {
            toast.error(describeApiError(error));
            return;
          }
          // Advanced only on success, so a page that failed is retried rather than skipped.
          cursor.current = data.next_cursor;
          setHasMore(data.has_more);
          // `total` comes back only on the request that arrived without a cursor; `null` on a
          // later page means *unchanged*, so writing it through would blank the count line
          // the moment a buyer scrolled.
          if (data.total !== null) setTotal(data.total);
          setRows((current) => (from ? [...current, ...data.results] : data.results));
        })
        .catch(() => {
          if (mine !== generation.current) return;
          // Cleared here too, or a first page that failed leaves the list saying "Loading…"
          // for ever, under a toast that has already gone.
          setLoading(false);
          toast.error(OFFLINE);
        });
    },
    []
  );

  // The search the server sees, a beat behind the input. A `setTimeout` callback is an async
  // boundary the same way `.then` is, so the setState below is not one the lint rule counts.
  React.useEffect(() => {
    const timer = setTimeout(() => setQuery(q.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [q]);

  // Mount, and again on every filter or search change — both are part of the request, not a
  // pass over the rows already loaded. The old rows stay up for the round trip rather than
  // flashing an empty list.
  React.useEffect(() => {
    cursor.current = null;
    load(null, status, query);
  }, [status, query, load]);

  const loadMore = React.useCallback(async () => {
    if (!cursor.current) return;
    setBusy(true);
    await load(cursor.current, status, query);
    setBusy(false);
  }, [load, status, query]);

  /**
   * The rest of the order — which is to say `payments`, the one field `BuyerOrderDetail` adds
   * to a list row that already carries everything else. It is the whole reason this second
   * call exists.
   *
   * No clearing branch (a synchronous setState in an effect body is a lint *error* here) and
   * none needed: the response carries its own `uuid`, so the screen renders these fields only
   * while they match the order above them, and a detail left over from the previous selection
   * is unreachable rather than mislabelled.
   */
  React.useEffect(() => {
    if (!selected) return;
    let active = true;
    getBuyerOrder({ path: { order_uuid: selected } })
      .then(({ data }) => {
        if (active && data) setDetail(data);
      })
      // Silent: every other field in the drawer arrived with the list, so a failure here costs
      // the payment history alone — and a toast would fire on every row click while the API
      // is down, over a drawer that is otherwise perfectly readable.
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [selected]);

  return {
    rows,
    total,
    hasMore,
    loading,
    busy,
    status,
    setStatus,
    q,
    setQ,
    /** True once the list is answering a question rather than showing everything. */
    filtered: status !== null || query !== "",
    /** The open order's uuid, or `null` — which is also what closes the drawer. */
    selected,
    select: setSelected,
    detail,
    loadMore,
  };
}
