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

const PAGE_SIZE = 20;

const DEBOUNCE_MS = 300;

export type PaymentStatus = NonNullable<NonNullable<GetPaymentsData["query"]>["status"]>;

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

  const cursor = React.useRef<string | null>(null);
  const generation = React.useRef(0);

  const load = React.useCallback(
    (from: string | null, tab: PaymentStatus | null, payable: boolean, text: string) => {
      const mine = ++generation.current;
      return getPayments({
        query: {
          page_size: PAGE_SIZE,
          ...(from ? { cursor: from } : {}),
          ...(tab ? { status: tab } : {}),
          ...(payable ? { live: true } : {}),
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
          cursor.current = data.next_cursor;
          setHasMore(data.has_more);
          if (data.total !== null) setTotal(data.total);
          setRows((current) => (from ? [...current, ...data.results] : data.results));
        })
        .catch(() => {
          if (mine !== generation.current) return;
          setLoading(false);
          toast.error(OFFLINE);
        });
    },
    []
  );

  React.useEffect(() => {
    const timer = setTimeout(() => setQuery(q.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [q]);

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

  const payment = rows.find((row) => row.uuid === selected);

  React.useEffect(() => {
    const uuid = payment?.uuid;
    if (!uuid) return;
    let active = true;
    getPayment({ path: { payment_uuid: uuid } })
      .then(({ data }) => {
        if (active && data) setDetail(data);
      })
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
    filtered: status !== null || live || query !== "",
    payment,
    select: setSelected,
    detail,
    loadMore,
  };
}
