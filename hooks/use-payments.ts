"use client";

import * as React from "react";
import { toast } from "sonner";

import { describeApiError } from "@/lib/api";
import {
  getPayment,
  getPayments,
  type GetPaymentsData,
  type PaymentDetail,
  type PaymentRow,
} from "@/src/client";

const OFFLINE = "Could not reach the server. Check your connection and try again.";

/** A screenful and a bit. The endpoint's default is 20 and its ceiling 100. */
const PAGE_SIZE = 20;

/** How long after the last keystroke the search actually goes out. */
const DEBOUNCE_MS = 300;

/**
 * What `?status=` accepts. Taken off the generated query type rather than restated, so a
 * status the backend learns next is a regenerate rather than an edit here.
 *
 * There is no `all` and no `needs_attention` — unlike the orders list, "every status" here is
 * the parameter being *absent*, which is why the pill for it carries `null` rather than a word.
 */
export type PaymentStatus = NonNullable<NonNullable<GetPaymentsData["query"]>["status"]>;

/**
 * The payments screen: the cursor-paged table of attempts, and the attempt under inspection.
 *
 * `GET /payments/` is the whole API — there is no counts, tiles or export endpoint for
 * payments the way there is for orders, so the pills carry no numbers (a count this screen
 * cannot source would be a count it invented) and the header has nothing to export.
 *
 * `live` is a filter of its own rather than a fifth status pill, because the type's own
 * docstring insists the two are different questions: a link stays `pending` until the reaper
 * closes it, so a lapsed one reads pending and `live=false` for as long as an hour.
 */
export function usePayments() {
  const [rows, setRows] = React.useState<PaymentRow[]>([]);
  const [total, setTotal] = React.useState<number | null>(null);
  const [hasMore, setHasMore] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [status, setStatus] = React.useState<PaymentStatus | null>(null);
  const [live, setLive] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<PaymentDetail | null>(null);

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
    (from: string | null, tab: PaymentStatus | null, payable: boolean, text: string) => {
      const mine = ++generation.current;
      return getPayments({
        query: {
          page_size: PAGE_SIZE,
          ...(from ? { cursor: from } : {}),
          ...(tab ? { status: tab } : {}),
          // Only ever sent as `true`. `live=false` is its own filter — everything that is not
          // payable — and a tri-state toggle is more UI than one question is worth.
          ...(payable ? { live: true } : {}),
          ...(text ? { q: text } : {}),
        },
      })
        .then(({ data, error }) => {
          if (mine !== generation.current) return;
          setLoading(false);
          if (!data) {
            // A buyer, or a merchant row that was never created: the view answers with its own
            // sentence, which says why better than this could. The table falls through to its
            // empty state, which is the truth.
            toast.error(describeApiError(error));
            return;
          }
          // Advanced only on success, so a page that failed is retried rather than skipped.
          cursor.current = data.next_cursor;
          setHasMore(data.has_more);
          // `total` comes back only on the request that arrived without a cursor; `null` on a
          // later page means *unchanged*, so writing it through would blank the count line the
          // moment a merchant scrolled.
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
    },
    []
  );

  // The search the server sees, a beat behind the input. A `setTimeout` callback is an async
  // boundary the same way `.then` is, so the setState below is not one the lint rule counts.
  React.useEffect(() => {
    const timer = setTimeout(() => setQuery(q.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [q]);

  // Mount, and again on every filter or search change — all three are part of the request, not
  // a pass over the rows already loaded. The old rows stay up for the round trip rather than
  // flashing an empty table.
  React.useEffect(() => {
    cursor.current = null;
    load(null, status, live, query);
  }, [status, live, query, load]);

  const loadMore = React.useCallback(async () => {
    if (!cursor.current) return;
    setBusy(true);
    await load(cursor.current, status, live, query);
    setBusy(false);
  }, [load, status, live, query]);

  // The open row. Derived, never stored, and with no fallback: nothing selected means the
  // drawer is shut, so picking a row for the merchant would open it on page load. An attempt
  // the current filter excludes stops being found, which closes the drawer rather than silently
  // swapping in a different one under the same heading.
  const payment = rows.find((row) => row.uuid === selected);

  /**
   * The rest of the attempt. `PaymentDetail` is a strict superset of the list row and adds
   * exactly one thing worth a request: `decision_seq`, the gate decision behind *this* retry.
   * So the drawer is fully readable the moment it opens and only the ledger link waits.
   *
   * No clearing branch (a synchronous setState in an effect body is a lint *error* here) and
   * none needed: the response carries its own `uuid`, so the page renders the link only while
   * it matches the row above it.
   */
  React.useEffect(() => {
    const uuid = payment?.uuid;
    if (!uuid) return;
    let active = true;
    getPayment({ path: { payment_uuid: uuid } })
      .then(({ data }) => {
        if (active && data) setDetail(data);
      })
      // Silent: every other field in the drawer arrived with the list. A failure here costs the
      // decision link alone, and a toast would fire on every row click while the API is down.
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [payment?.uuid]);

  return {
    rows,
    total,
    hasMore,
    loading,
    busy,
    status,
    setStatus,
    live,
    setLive,
    q,
    setQ,
    /** True once the list is answering a question rather than showing everything. */
    filtered: status !== null || live || query !== "",
    payment,
    select: setSelected,
    detail,
    loadMore,
  };
}
