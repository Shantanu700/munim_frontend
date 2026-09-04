"use client";

import * as React from "react";
import { toast } from "sonner";

import { describeApiError } from "@/lib/api";
import {
  getOrder,
  getOrders,
  getOrdersCounts,
  getOrdersExport,
  getOrdersTiles,
  type GetOrdersData,
  type OrderCounts,
  type OrderDetail,
  type OrderExport,
  type OrderRow,
  type OrderTiles,
} from "@/src/client";

const OFFLINE = "Could not reach the server. Check your connection and try again.";

/** A screenful and a bit. The endpoint's default is 20 and its ceiling 100. */
const PAGE_SIZE = 20;

/** What Overview previews. The orders screen is one click away and pages properly. */
const PREVIEW_SIZE = 6;

/** How long after the last keystroke the search actually goes out. */
const DEBOUNCE_MS = 300;

/**
 * What `?status=` accepts — the four stored statuses plus `all` and `needs_attention`, which
 * is `failed` + `expired`. Taken off the generated query type rather than restated, so a
 * status the backend learns next is a regenerate rather than an edit here.
 *
 * `awaiting` is deliberately **not** in it. The tab bar offers one, and it counts step-ups
 * waiting on a human — a different table from orders waiting on a card. See `tabs[].source`.
 */
export type OrderStatus = NonNullable<NonNullable<GetOrdersData["query"]>["status"]>;

/**
 * The whole orders screen: the cursor-paged table, the tab counts, the three KPI tiles, and
 * the order under inspection.
 *
 * Three filters reach three endpoints differently, and the asymmetry is the endpoints' own:
 * the list honours status and `q`, `counts` honours `q` but *is* the status breakdown so it
 * ignores status, and `tiles` ignores both — a KPI is a fact about the store, not about
 * whichever tab happens to be open.
 */
export function useOrders() {
  const [rows, setRows] = React.useState<OrderRow[]>([]);
  const [total, setTotal] = React.useState<number | null>(null);
  const [hasMore, setHasMore] = React.useState(false);
  const [counts, setCounts] = React.useState<OrderCounts | null>(null);
  const [tiles, setTiles] = React.useState<OrderTiles | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [status, setStatus] = React.useState<OrderStatus | null>(null);
  const [q, setQ] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<OrderDetail | null>(null);

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
  const load = React.useCallback((from: string | null, tab: OrderStatus | null, text: string) => {
    const mine = ++generation.current;
    return getOrders({
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
          // A buyer, or a merchant row that was never created: the view 404s with its own
          // sentence, which says why better than this could. The table falls through to its
          // empty state, which is the truth.
          toast.error(describeApiError(error));
          return;
        }
        // Advanced only on success, so a page that failed is retried rather than skipped.
        cursor.current = data.next_cursor;
        setHasMore(data.has_more);
        // `total` comes back only on the request that arrived without a cursor; `null` on a
        // later page means *unchanged*, so writing it through would blank the count line
        // the moment a merchant scrolled.
        if (data.total !== null) setTotal(data.total);
        setRows((current) => (from ? [...current, ...data.results] : data.results));
      })
      .catch(() => {
        if (mine !== generation.current) return;
        // Cleared here too, or a first page that failed leaves the table saying "Loading…"
        // for ever, under a toast that has already gone.
        setLoading(false);
        toast.error(OFFLINE);
      });
  }, []);

  // The search the server sees, a beat behind the input. A `setTimeout` callback is an async
  // boundary the same way `.then` is, so the setState below is not one the lint rule counts.
  React.useEffect(() => {
    const timer = setTimeout(() => setQuery(q.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [q]);

  // Mount, and again on every filter or search change — both are part of the request, not a
  // pass over the rows already loaded: filtering only what is loaded would print "Paid 123"
  // beside twenty visible rows. The old rows stay up for the round trip rather than flashing
  // an empty table.
  React.useEffect(() => {
    cursor.current = null;
    load(null, status, query);
  }, [status, query, load]);

  // The tab numbers. Silent on failure: the list request beside it just toasted about the
  // same outage, and two toasts for one dead server is one too many.
  React.useEffect(() => {
    let active = true;
    getOrdersCounts({ query: query ? { q: query } : {} })
      .then(({ data }) => {
        if (active && data) setCounts(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [query]);

  // The three KPIs, once. They ignore every filter, so nothing here can invalidate them.
  React.useEffect(() => {
    let active = true;
    getOrdersTiles()
      .then(({ data }) => {
        if (active && data) setTiles(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const loadMore = React.useCallback(async () => {
    if (!cursor.current) return;
    setBusy(true);
    await load(cursor.current, status, query);
    setBusy(false);
  }, [load, status, query]);

  // The row under inspection. Derived, never stored: the selected order may be one the
  // current filter excludes, and then the first row still showing is what the rail describes.
  const order = rows.find((row) => row.uuid === selected) ?? rows[0];

  /**
   * The rest of the order. `product_url`, the failure sentence and the link to the decision
   * behind it are on the detail response only — a list row cannot fill the rail.
   *
   * No clearing branch (a synchronous setState in an effect body is a lint *error* here) and
   * none needed: the response carries its own `uuid`, so the page renders these fields only
   * while they match the row above them, and a detail left over from the previous selection
   * is unreachable rather than mislabelled.
   */
  React.useEffect(() => {
    const uuid = order?.uuid;
    if (!uuid) return;
    let active = true;
    getOrder({ path: { order_uuid: uuid } })
      .then(({ data }) => {
        if (active && data) setDetail(data);
      })
      // Silent: the rail's own fields arrived with the list. A failure here costs the extra
      // ones, and a toast about it would fire on every row click while the API is down.
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [order?.uuid]);

  /**
   * The current filter's rows, as JSON, fetched at click time.
   *
   * Unlike the ledger's export this one honours the filters and stops at the backend's row
   * ceiling — it is a report, not a proof. `truncated` therefore has to be said out loud: a
   * merchant who hits the cap otherwise has a short file and no way to know it.
   */
  const exportRows = React.useCallback(async (): Promise<OrderExport | undefined> => {
    try {
      const { data, error } = await getOrdersExport({
        query: { ...(status ? { status } : {}), ...(query ? { q: query } : {}) },
      });
      if (!data) {
        toast.error(describeApiError(error));
        return undefined;
      }
      if (data.truncated)
        toast.warning(
          `Stopped at ${data.count} orders — that is the export ceiling. Narrow the filter or the search to get the rest.`
        );
      return data;
    } catch {
      toast.error(OFFLINE);
      return undefined;
    }
  }, [status, query]);

  return {
    rows,
    total,
    hasMore,
    counts,
    tiles,
    loading,
    busy,
    status,
    setStatus,
    q,
    setQ,
    /** True once the list is answering a question rather than showing everything. */
    filtered: status !== null || query !== "",
    order,
    select: setSelected,
    detail,
    loadMore,
    exportRows,
  };
}

/**
 * Overview's Orders tile and its six-row preview, in one hook because they sit in two
 * different grids on the same screen — one call each beats two islands making the same two
 * requests. `total` also answers whether the store has *any* order, which is what the
 * day-one empty state has always meant.
 */
export function useOrdersPreview() {
  const [rows, setRows] = React.useState<OrderRow[]>([]);
  const [total, setTotal] = React.useState<number | null>(null);
  const [counts, setCounts] = React.useState<OrderCounts | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    // Safe as a `Promise.all` where the products screen's two mount requests are not: these
    // resolve with `{data, error}` rather than rejecting on an HTTP error, so a 404 on one
    // cannot discard the other. Only a network throw reaches the `catch`.
    Promise.all([getOrders({ query: { page_size: PREVIEW_SIZE } }), getOrdersCounts()])
      .then(([list, tabs]) => {
        if (!active) return;
        setLoading(false);
        if (!list.data) {
          // A buyer, or a merchant row that was never created. The panel renders its empty
          // line; the view's own sentence says why better than this could.
          toast.error(describeApiError(list.error));
          return;
        }
        setRows(list.data.results);
        setTotal(list.data.total);
        if (tabs.data) setCounts(tabs.data);
      })
      // Silent: the tiles and charts above this arrived, and a failing preview must not
      // announce itself over a screen whose real content loaded.
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { rows, total, counts, loading };
}
