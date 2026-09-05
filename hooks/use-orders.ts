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

const PAGE_SIZE = 20;

const PREVIEW_SIZE = 6;

const DEBOUNCE_MS = 300;

export type OrderStatus = NonNullable<NonNullable<GetOrdersData["query"]>["status"]>;

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

  const cursor = React.useRef<string | null>(null);
  const generation = React.useRef(0);

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
  }, []);

  React.useEffect(() => {
    const timer = setTimeout(() => setQuery(q.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [q]);

  React.useEffect(() => {
    cursor.current = null;
    load(null, status, query);
  }, [status, query, load]);

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

  const order = rows.find((row) => row.uuid === selected);

  React.useEffect(() => {
    const uuid = order?.uuid;
    if (!uuid) return;
    let active = true;
    getOrder({ path: { order_uuid: uuid } })
      .then(({ data }) => {
        if (active && data) setDetail(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [order?.uuid]);

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
    filtered: status !== null || query !== "",
    order,
    select: setSelected,
    detail,
    loadMore,
    exportRows,
  };
}

export function useOrdersPreview() {
  const [rows, setRows] = React.useState<OrderRow[]>([]);
  const [total, setTotal] = React.useState<number | null>(null);
  const [counts, setCounts] = React.useState<OrderCounts | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    Promise.all([getOrders({ query: { page_size: PREVIEW_SIZE } }), getOrdersCounts()])
      .then(([list, tabs]) => {
        if (!active) return;
        setLoading(false);
        if (!list.data) {
          toast.error(describeApiError(list.error));
          return;
        }
        setRows(list.data.results);
        setTotal(list.data.total);
        if (tabs.data) setCounts(tabs.data);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { rows, total, counts, loading };
}
