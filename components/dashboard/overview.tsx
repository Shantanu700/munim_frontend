"use client";

import Link from "next/link";
import { ArrowRightIcon, PlusIcon } from "lucide-react";

import { EmptyRail, EmptyState } from "@/components/dashboard/empty-state";
import { ExportChainButton } from "@/components/dashboard/export-chain";
import { GatePanel } from "@/components/dashboard/gate-panel";
import {
  BarMeter,
  detailsFor,
  OrderStatusPill,
  Panel,
  PanelHeader,
  Row,
  rupees,
  StatTile,
} from "@/components/dashboard/parts";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/hooks/use-dashboard";
import { useOrdersPreview } from "@/hooks/use-orders";
import { bars, DONUT_CIRCUMFERENCE, linePoints, REQUIRED_DETAILS } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";

const ORDER_COLUMNS = "grid-cols-[1fr_92px_132px_84px]";

const BAR_COLORS = ["bg-bar-1", "bg-bar-2", "bg-bar-3"];

function breakdown(byStatus: Record<string, number>) {
  return (
    [
      [byStatus.paid, "paid"],
      [byStatus.pending, "awaiting"],
      [(byStatus.failed ?? 0) + (byStatus.expired ?? 0), "need attention"],
    ] as const
  )
    .filter(([count]) => count)
    .map(([count, label]) => `${count} ${label}`)
    .join(" · ");
}

function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function Overview() {
  const { rows, total, counts, loading: ordersLoading } = useOrdersPreview();
  const { dashboard, productRows, loading: dashboardLoading } = useDashboard();

  if (ordersLoading || dashboardLoading || !dashboard) return null;

  const { payments, revenue, catalog_reads: catalogReads, products, policy } = dashboard;

  const sweep = Math.round((products.sellable / (products.visible || 1)) * DONUT_CIRCUMFERENCE);
  const percent = Math.round((products.sellable / (products.visible || 1)) * 100);
  const requiredCount = policy.required_product_fields.count;

  const seriesValues = revenue.series.map((p) => p.amount_paise);
  const tickIdxs = Array.from(
    new Set([0, Math.round((revenue.series.length - 1) / 3), Math.round((2 * (revenue.series.length - 1)) / 3), revenue.series.length - 1])
  );

  const live = (total ?? 0) > 0;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-6 px-1.5 py-1">
        <div>
          <h1 className="text-page-title">Overview</h1>
          <p className="mt-1 text-body text-muted-ink">
            Agent orders, payouts and every gate decision from the last {revenue.window.days} days.
          </p>
        </div>
        <div className="flex gap-panel">
          <Button className="h-11 px-5">
            <PlusIcon /> Review products
          </Button>
          <ExportChainButton>Export ledger</ExportChainButton>
        </div>
      </div>

      <div className="grid gap-panel sm:grid-cols-2 xl:grid-cols-3">
        <StatTile
          tone="dark"
          label="Payments received"
          value={rupees(payments.all_time.amount_paise, payments.currency)}
          note={payments.settlement.label}
        />
        <StatTile
          label="Orders received"
          value={counts ? counts.orders_total : "0"}
          note={
            counts && live
              ? breakdown(counts.by_status) || `${counts.orders_total} in total`
              : "Nothing yet"
          }
        />
        <StatTile label="Catalogue reads" value={catalogReads.total} note="By agents, last 7 days" />
      </div>

      {!live ? (
        <EmptyState
          eyebrow="gate armed · waiting"
          headline="Your catalogue is readable. No agent has tried to buy yet."
          body="The first order usually lands within a few days of an assistant discovering your endpoint. Orders, revenue and every gate decision fill in here on their own."
          actions={
            <>
              <Button className="h-11 px-5">Place a test purchase</Button>
              <Button variant="outline" className="h-11 px-5">
                Review {products.waiting_on_one_detail} products
              </Button>
            </>
          }
          rail={
            <EmptyRail
              eyebrow="ledger · entry 1 of 1"
              footnote="The chain has one entry. Every decision from here commits to the one before it — refusals included."
            >
              <div className="mt-3.5 inline-flex rounded-full bg-navy-200/15 px-3 py-1.5 text-eyebrow tracking-normal">
                GENESIS
              </div>
              <div className="mt-3.5 text-meta leading-loose break-all">
                store_created
                <br />
                <span className="text-navy-200">prev 0000000000…0000</span>
                <br />
                <span className="text-navy-200">hash 0e9c41ab…7d22</span>
              </div>
            </EmptyRail>
          }
        />
      ) : (
        <>
          <div className="grid gap-panel xl:grid-cols-4">
            <Panel className="xl:col-span-2">
              <PanelHeader title="Revenue from agent purchases" meta={`last ${revenue.window.days} days`} />
              <svg
                viewBox="0 0 640 180"
                preserveAspectRatio="none"
                role="img"
                aria-label={`Daily revenue from agent purchases over the last ${revenue.window.days} days`}
                className="mt-4.5 block h-45 w-full overflow-visible"
              >
                {bars(seriesValues).map((b) => (
                  <rect
                    key={b.x}
                    x={b.x}
                    y={b.y}
                    width={18}
                    height={b.h}
                    rx={9}
                    className={b.current ? "fill-bar-1" : "fill-faint"}
                  />
                ))}
                <polyline
                  points={linePoints(seriesValues)}
                  fill="none"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="stroke-navy-500"
                />
              </svg>
              <div className="mt-2.5 flex justify-between text-meta text-muted-ink">
                {tickIdxs.map((i) => (
                  <span key={i}>{dayLabel(revenue.series[i].day)}</span>
                ))}
              </div>
            </Panel>

            <Panel className="flex flex-col">
              <PanelHeader title="Which AI placed them" />
              <div className="mt-4.5 grid max-h-45 gap-2.5 overflow-y-auto pr-1">
                {revenue.agents.map((a, i) => (
                  <div key={a.agent}>
                    <div className="flex justify-between text-dense">
                      <span>{a.agent}</span>
                      <span className="tabular-nums text-muted-ink">
                        {rupees(a.amount_paise, revenue.currency)} · {a.count}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2.5 rounded-full bg-track">
                      <div
                        className={cn("h-2.5 rounded-full", BAR_COLORS[i % BAR_COLORS.length])}
                        style={{ width: `${a.share_bps / 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-auto max-w-none pt-4 text-meta text-muted-ink">
                Average agent basket {rupees(revenue.average_basket_paise, revenue.currency)} —{" "}
                {revenue.comparison_note}
              </p>
            </Panel>

            <Panel className="flex flex-col items-start">
              <h2 className="text-card-title">Sellable products</h2>
              
              <p className="mt-2.5 text-meta text-muted-ink">
                {requiredCount > 0 ? `All ${requiredCount} required details recovered` : "No details currently required"}
                {products.waiting_on_one_detail > 0 && ` · ${products.waiting_on_one_detail} waiting on one detail each`}
              </p>
              <div className="relative mx-auto mt-3.5 size-37.5">
                <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden>
                  <circle cx="60" cy="60" r="48" fill="none" strokeWidth="16" className="stroke-track" />
                  <circle
                    cx="60"
                    cy="60"
                    r="48"
                    fill="none"
                    strokeWidth="16"
                    strokeLinecap="round"
                    strokeDasharray={`${sweep} ${DONUT_CIRCUMFERENCE}`}
                    className="stroke-navy-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-headline tabular-nums">{percent}%</div>
                  <div className="text-meta text-muted-ink">
                    {products.sellable} of {products.visible}
                  </div>
                </div>
              </div>
              <div className="mt-4 text-display  tabular-nums">
                {products.sellable}
                <span className="text-section text-muted-ink"> / {products.visible}</span>
              </div>
              <div className="mt-auto flex gap-3.5 pt-3.5 text-meta text-muted-ink">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-navy-500" />
                  sellable
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-faint" />
                  needs a check
                </span>
              </div>
            </Panel>
          </div>

          <GatePanel />

          <div className="grid gap-panel xl:grid-cols-2">
            <Panel>
              <PanelHeader
                title="Orders"
                meta={
                  <Link
                    href="/dashboard/orders"
                    className="flex items-center gap-1.5 font-medium text-accent-ink"
                  >
                    See all {total ?? counts?.orders_total ?? 0}{" "}
                    <ArrowRightIcon className="size-3.5" />
                  </Link>
                }
              />
              <div className={cn("grid gap-3 px-1 pt-3 pb-2 text-table-head uppercase text-muted-ink", ORDER_COLUMNS)}>
                <div>item</div>
                <div className="text-right">amount</div>
                <div>status</div>
                <div>agent</div>
              </div>
              <div className="grid gap-panel">
                {rows.map((o) => (
                  <Row key={o.uuid} className={cn("grid items-center gap-3 py-3", ORDER_COLUMNS)}>
                    <div className="truncate text-dense">{o.title}</div>
                    <div className="text-right text-dense font-medium tabular-nums">
                      {rupees(o.amount_paise, o.currency)}
                    </div>
                    <div>
                      <OrderStatusPill status={o.status} />
                    </div>
                    <div className="truncate text-meta text-muted-ink">
                      {o.agent_label || "not stated"}
                    </div>
                  </Row>
                ))}
              </div>
            </Panel>

            <div className="grid content-start gap-panel">
              <Panel>
                <PanelHeader
                  title="Products waiting on you"
                  meta={
                    <span className="rounded-full bg-step-tint px-2.5 py-1 font-medium text-step">
                      {products.waiting_on_one_detail}
                    </span>
                  }
                />
                <p className="mt-1 max-w-none text-meta text-muted-ink">
                  {REQUIRED_DETAILS.length} bars, one per detail an agent needs: {REQUIRED_DETAILS.join(", ")}.
                </p>
                <div className="mt-4 grid gap-panel">
                  {productRows.map((p) => {
                    const { present, missing } = detailsFor(p);
                    return (
                      <Row key={p.uuid} className="grid grid-cols-[1fr_auto] items-center gap-3.5 p-3">
                        <div>
                          <div className="text-dense">{p.title}</div>
                          <div className="mt-0.5 text-eyebrow tracking-normal text-muted-ink">
                            {[p.sku, missing].filter(Boolean).join(" · ")}
                          </div>
                        </div>
                        <BarMeter present={present} inStock={p.in_stock} />
                      </Row>
                    );
                  })}
                </div>
              </Panel>

              <Panel>
                <h2 className="text-card-title">Store policy</h2>
                <p className="mt-0.5 max-w-none text-meta text-muted-ink">
                  Applied to every agent, on top of each buyer&apos;s own mandate.
                </p>
                <div className="mt-4 grid gap-2.5">
                  <Row className="flex items-center justify-between gap-3">
                    <span className="text-dense">Per-transaction cap, any agent</span>
                    <span className="font-medium tabular-nums">
                      {!policy.per_order_ceiling.configured
                        ? "Not set"
                        : policy.per_order_ceiling.unlimited
                          ? "No limit"
                          : rupees(policy.per_order_ceiling.amount_paise ?? 0, policy.currency)}
                    </span>
                  </Row>
                  <Row className="flex items-center justify-between gap-3">
                    <span className="text-dense">Details required before an item sells</span>
                    <BarMeter
                      present={requiredCount}
                      label={
                        requiredCount === REQUIRED_DETAILS.length
                          ? `all ${requiredCount}`
                          : `${requiredCount} of ${REQUIRED_DETAILS.length}`
                      }
                    />
                  </Row>
                  <Row className="flex items-center justify-between gap-3">
                    <span className="text-dense">Categories agents may buy</span>
                    {policy.allowed_categories.unrestricted ? (
                      <span className="text-meta text-muted-ink">All categories</span>
                    ) : (
                      <span className="flex flex-wrap justify-end gap-1.5">
                        {policy.allowed_categories.categories.map((c) => (
                          <span
                            key={c}
                            className="rounded-full bg-navy-200 px-2.5 py-1 text-meta font-medium text-navy-900"
                          >
                            {c}
                          </span>
                        ))}
                      </span>
                    )}
                  </Row>
                </div>
              </Panel>
            </div>
          </div>
        </>
      )}
    </>
  );
}
