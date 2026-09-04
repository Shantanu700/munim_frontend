"use client";

import * as React from "react";

import { getDashboard, getDashboardProductsRows, type Dashboard, type Product } from "@/src/client";

/**
 * Everything Overview renders besides the orders tile/panel (that's `useOrdersPreview`,
 * `hooks/use-orders.ts` — it's already typed and there is no reason to duplicate it via
 * `Dashboard.orders`, which the schema leaves untyped).
 *
 * `getDashboard()` is one call for payments, revenue, catalogue reads, products and policy —
 * built server-side so no two cards can land on opposite sides of midnight. The row list
 * behind "products waiting on you" isn't in that aggregate, so it's a second call, safe in
 * the same `Promise.all` as `useOrdersPreview` for the same reason: both resolve `{data,
 * error}` rather than rejecting on an HTTP error.
 */
export function useDashboard() {
  const [dashboard, setDashboard] = React.useState<Dashboard | null>(null);
  const [productRows, setProductRows] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    Promise.all([getDashboard(), getDashboardProductsRows()])
      .then(([summary, rows]) => {
        if (!active) return;
        setLoading(false);
        if (summary.data) setDashboard(summary.data);
        if (rows.data) setProductRows(rows.data.results);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { dashboard, productRows, loading };
}
