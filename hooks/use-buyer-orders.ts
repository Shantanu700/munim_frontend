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

const PAGE_SIZE = 20;

const DEBOUNCE_MS = 300;

export type BuyerOrderStatus = NonNullable<NonNullable<GetBuyerOrdersData["query"]>["status"]>;

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

  const cursor = React.useRef<string | null>(null);
  const generation = React.useRef(0);

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
    load(null, status, query);
  }, [status, query, load]);

  const loadMore = React.useCallback(async () => {
    if (!cursor.current) return;
    setBusy(true);
    await load(cursor.current, status, query);
    setBusy(false);
  }, [load, status, query]);

  React.useEffect(() => {
    if (!selected) return;
    let active = true;
    getBuyerOrder({ path: { order_uuid: selected } })
      .then(({ data }) => {
        if (active && data) setDetail(data);
      })
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
    filtered: status !== null || query !== "",
    selected,
    select: setSelected,
    detail,
    loadMore,
  };
}
