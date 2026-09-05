"use client";

import * as React from "react";

import { getDashboard, getDashboardProductsRows, type Dashboard, type Product } from "@/src/client";

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
