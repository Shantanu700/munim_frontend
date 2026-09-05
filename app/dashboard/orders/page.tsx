"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRightIcon, ArrowUpRightIcon, SearchIcon } from "lucide-react";

import { ExportButton } from "@/components/dashboard/export-button";
import { LoadMore } from "@/components/dashboard/load-more";
import {
  moment,
  OrderStatusPill,
  Panel,
  Row,
  RowButton,
  rupees,
  StatTile,
} from "@/components/dashboard/parts";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useOrders, type OrderStatus } from "@/hooks/use-orders";
import { cn } from "@/lib/utils";
import type { AverageOrderValue, OrderDetail, OrderRow } from "@/src/client";

/**
 * The table reflows on its own panel's width, not the viewport's — a container query, for
 * the same reason the catalogue uses one: the panel spans the page at xl but sits inside the
 * sidebar's remainder at lg, and a viewport breakpoint is wrong at one of the two. 42.5rem is
 * the width the five columns need; under it each order stacks into a card rather than
 * scrolling sideways and putting the amount off-screen.
 *
 * One DOM serves both. Rows are `flex-wrap` when narrow and become the grid above the
 * threshold, with `@[42.5rem]:order-*` restoring the column order. DOM order is the card
 * order (order, product, amount, status, agent), so the narrow form reads correctly
 * unstyled — the status is what a merchant scans for, so it comes before the agent there.
 */
const COLUMNS =
  "@[42.5rem]:grid @[42.5rem]:grid-cols-[150px_minmax(150px,1fr)_100px_96px_136px] @[42.5rem]:items-center @[42.5rem]:gap-2.5";

/** "2026-08" as a merchant says it. Fixed to UTC, so the label cannot slip a month. */
function monthName(month: string) {
  const at = new Date(`${month}-01T00:00:00Z`);
  return Number.isNaN(at.getTime())
    ? month
    : at.toLocaleString("en-IN", { month: "long", timeZone: "UTC" });
}

/**
 * The average tile's second line. `direction` is blank when there is no prior month to
 * compare against — a store in its first month of orders — and "flat" is a comparison worth
 * nothing to read, so both fall back to what the average was taken over.
 */
function averageNote(average: AverageOrderValue, currency: string) {
  const moved = average.direction === "up" || average.direction === "down";
  if (!moved || !average.prior_month) {
    return `Across ${average.count} ${average.count === 1 ? "order" : "orders"}`;
  }
  const word = average.direction === "up" ? "Up" : "Down";
  return `${word} from ${rupees(average.prior_amount_paise, currency)} in ${monthName(average.prior_month)}`;
}

/** Order numbers are not guaranteed to be set; the uuid is, and its head is enough to read. */
const label = (order: OrderRow) => order.order_number || order.uuid.slice(0, 8);

/**
 * Every order an agent placed.
 *
 * Live, and a client component because the pills, the search, the selected row and the paging
 * are all one interaction. `hooks/use-orders.ts` owns every request and every toast; nothing
 * below fetches, and there is no inline error copy — a failure is a toast over an empty state.
 */
export default function OrdersPage() {
  const {
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
    filtered,
    order,
    select,
    detail,
    loadMore,
    exportRows,
  } = useOrders();

  /**
   * `tabs` comes from the server and carries `source`: only `"orders"` keys are valid
   * `?status=` values. The rest are the approvals surface's — step-ups waiting on a human,
   * which are not rows in this list — so a pill for one would filter to nothing. "All" is
   * prepended rather than looked for, since `orders_total` is the number it wants.
   */
  const pills: { key: OrderStatus | null; label: string; count: number }[] = counts
    ? [
        { key: null, label: "All", count: counts.orders_total },
        ...counts.tabs
          .filter((tab) => tab.source === "orders" && tab.key !== "all")
          .map((tab) => ({ key: tab.key as OrderStatus, label: tab.label, count: tab.count })),
      ]
    : [];

  // The detail response and the selected row can disagree for one render, which is what this
  // guard replaces — clearing `detail` in the hook's effect would be a lint error.
  const full = detail?.uuid === order?.uuid ? detail : null;

  return (
    <div className="grid gap-panel xl:h-full xl:grid-rows-[auto_auto_auto_minmax(0,1fr)]">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 px-1.5 py-1">
        <div>
          <h1 className="text-page-title">Orders</h1>
          <p className="mt-1 text-body text-muted-ink">
            Every order an agent placed, with the buyer and the decision behind it.
          </p>
        </div>
        <div className="flex flex-wrap gap-panel">
          <Button asChild className="h-11 px-5">
            <Link href="/dashboard/ledger">Open ledger</Link>
          </Button>
          {/* The endpoint honours the filters, so unlike the mock this exports the whole
              filtered set rather than the pages already scrolled past. */}
          <ExportButton data={exportRows} filename={`munim-orders-${status ?? "all"}.json`}>
            Export {total === null ? "these orders" : `these ${total}`} (JSON)
          </ExportButton>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 px-1.5">
        <div className="flex flex-wrap items-center gap-2">
          {pills.map((pill) => (
            <button
              key={pill.label}
              type="button"
              aria-pressed={status === pill.key}
              onClick={() => setStatus(pill.key)}
              className={cn(
                "h-9 cursor-pointer rounded-full px-5 text-dense font-medium transition-colors",
                status === pill.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-panel text-foreground hover:bg-panel-2"
              )}
            >
              {pill.label} {pill.count}
            </button>
          ))}
          {/* Searches the same fields the counts above are recounted over: order number,
              product, buyer, Razorpay ids and reason codes. */}
          <div className="flex h-9 min-w-0 items-center gap-2 rounded-full bg-panel px-4">
            <SearchIcon className="size-3.5 shrink-0 text-muted-ink" />
            <input
              type="search"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search orders"
              aria-label="Search orders by number, product, buyer or reason code"
              className="min-w-0 flex-1 bg-transparent text-dense outline-none placeholder:text-muted-ink"
            />
          </div>
        </div>
        <span className="text-meta text-muted-ink">
          {total === null ? `Showing ${rows.length}` : `Showing ${rows.length} of ${total}`} · the
          list loads more as you scroll
        </span>
      </div>

      <div className="grid gap-panel sm:grid-cols-2 xl:grid-cols-3">
        {/* The one dark tile the screen is allowed (§1 rule 5), and this is what it is
            reserved for: money that actually arrived. The three are store-wide and ignore
            the filters above — a KPI is a fact about the store, not about the open tab. */}
        <StatTile
          tone="dark"
          label="Paid this month"
          value={tiles ? rupees(tiles.paid_this_month.amount_paise, tiles.currency) : "—"}
          note={tiles ? `${tiles.paid_this_month.count} orders settled` : "Loading"}
        />
        {/* Not orders awaiting a card: this counts step-ups waiting on a human, which is a
            different table. Saying "orders" here would be a number the list cannot show. */}
        <StatTile
          label="Awaiting approval"
          value={tiles ? rupees(tiles.awaiting_approval.amount_paise, tiles.currency) : "—"}
          note={
            tiles
              ? `${tiles.awaiting_approval.count} step-ups waiting on you`
              : "Loading"
          }
        />
        <StatTile
          label="Average order"
          value={tiles ? rupees(tiles.average_order_value.amount_paise, tiles.currency) : "—"}
          note={tiles ? averageNote(tiles.average_order_value, tiles.currency) : "Loading"}
        />
      </div>

      <Panel className="flex flex-col xl:min-h-0">
        {/* Below xl the page scrolls as a whole, so without a cap a long list pushes the
            tiles above two screens up. The cap gives the list its own scroller here too,
            the way the pinned xl layout already does — where flex-1 supplies the height
            instead and the cap has to get out of the way. Either way there is always a
            real scroller, which is what the sentinel below needs. */}
        <div className="@container max-h-120 overflow-auto xl:max-h-none xl:min-h-0 xl:flex-1">
          <div className="grid gap-panel @[42.5rem]:min-w-170">
            {/* px-4 matches RowButton's own padding, so the labels sit over the cells
                they name. */}
            <div
              className={cn(
                "sticky top-0 z-10 hidden bg-panel px-4 pb-2.5 text-table-head uppercase text-muted-ink",
                COLUMNS
              )}
            >
              <div>order</div>
              <div>product</div>
              <div className="text-right">amount</div>
              <div>agent</div>
              <div>status</div>
            </div>

            {rows.map((row) => (
              <RowButton
                key={row.uuid}
                aria-pressed={order?.uuid === row.uuid}
                onClick={() => select(row.uuid)}
                className={cn(
                  "flex flex-wrap items-center gap-x-2.5 gap-y-2 transition-colors",
                  COLUMNS,
                  order?.uuid === row.uuid ? "bg-track" : "hover:bg-track/60"
                )}
              >
                <span className="shrink-0">
                  <span className="block text-dense font-medium">{label(row)}</span>
                  {/* The wire carries ISO-8601; the reader's timezone is only known here. */}
                  <span className="mt-0.5 block text-meta text-muted-ink">
                    {moment(row.authorized_at)}
                  </span>
                </span>
                <span className="min-w-0 flex-1 @[42.5rem]:flex-none">
                  <span className="block truncate text-dense">{row.title}</span>
                  <span className="mt-0.5 block text-meta text-muted-ink">{row.sku}</span>
                </span>
                <span className="font-medium tabular-nums @[42.5rem]:text-right">
                  {rupees(row.amount_paise, row.currency)}
                </span>
                {/* Before the agent when stacked — the status is what a merchant is
                    scanning the list for. `order-*` puts it back last in the table. */}
                <span className="@[42.5rem]:order-5">
                  <OrderStatusPill status={row.status} />
                </span>
                <span className="truncate text-meta text-muted-ink @[42.5rem]:order-4">
                  {row.agent_label || "not stated"}
                </span>
              </RowButton>
            ))}

            {/* Nothing at all while loading: a spinner on first paint only flashes. The two
                empty sentences are different because the states are. */}
            {loading || rows.length ? null : (
              <p className="max-w-none py-8 text-center text-body text-muted-ink">
                {filtered
                  ? "No orders match that filter."
                  : "No agent has bought anything yet. The first order lands here on its own."}
              </p>
            )}

            {/* Inside the scroller, so it sits at the foot of the list rather than
                pinned under a card nobody has scrolled to the end of. */}
            {hasMore ? <LoadMore busy={busy} onLoadMore={loadMore} /> : null}
          </div>
        </div>
      </Panel>

      {/* `select(null)` is what closes it, so the open order and the drawer cannot disagree.
          `open` is derived from the row rather than the raw selection: an order the filter
          now excludes closes the drawer instead of leaving an empty one standing. */}
      <Drawer
        direction="right"
        open={order !== undefined}
        onOpenChange={(open) => !open && select(null)}
      >
        <DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-xl">
          {order ? <OrderDrawer order={order} full={full} /> : null}
        </DrawerContent>
      </Drawer>
    </div>
  );
}

/**
 * One order, in the drawer. `full` is `GET /orders/{uuid}` — `product_url`, the quantity and
 * both reason sentences are on no list row — and is null until it lands, so every field it
 * carries is optional here rather than blocking the drawer from opening.
 */
function OrderDrawer({ order, full }: { order: OrderRow; full: OrderDetail | null }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DrawerHeader className="gap-0 p-6 pb-0">
        {/* `pr-10` clears the drawer's own close button, which floats at `top-6 right-6`. */}
        <div className="flex items-center justify-between gap-3 pr-10">
          <OrderStatusPill status={order.status} />
          <span className="text-eyebrow uppercase text-muted-ink">{label(order)}</span>
        </div>
        <DrawerTitle className="mt-4 text-card-title">{order.title}</DrawerTitle>
        <DrawerDescription className="mt-1 text-meta text-muted-ink">{order.sku}</DrawerDescription>
      </DrawerHeader>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="grid gap-panel">
          {facts(order, full).map(([name, value]) => (
            <Row key={name} className="flex items-center justify-between gap-3 py-3">
              <span className="shrink-0 text-dense text-muted-ink">{name}</span>
              <span className="text-right text-dense font-medium">{value}</span>
            </Row>
          ))}
        </div>

        {/* The type's own docstring insists on this: `agent_label` is read from
            User-Agent and Origin at checkout, both trivially spoofable. It is
            attribution for a dashboard, never an authenticated identity. */}
        <p className="mt-2.5 max-w-none text-meta text-muted-ink">
          Agents name themselves. Munim records the claim; it cannot check it.
        </p>

        {/* Both sentences are blank in the ordinary case — an order exists only on an
            ALLOW — and an empty element would still take its margin. */}
        {full?.failure_reason_description ? (
          <Row className="mt-4">
            <div className="text-meta font-medium tracking-[0.03em]">
              {full.failure_reason_code}
            </div>
            <p className="mt-0.5 max-w-none text-meta text-muted-ink">
              {full.failure_reason_description}
            </p>
          </Row>
        ) : null}
        {full?.step_up_reason_description ? (
          <Row className="mt-2.5">
            <div className="text-meta font-medium tracking-[0.03em]">
              {full.step_up_reason_code}
            </div>
            <p className="mt-0.5 max-w-none text-meta text-muted-ink">
              A human was asked first. {full.step_up_reason_description}
            </p>
          </Row>
        ) : null}

        {/* A link, which the list row could not hold: `RowButton` is a real button and
            may contain no other interactive element. */}
        {full?.product_url ? (
          <a
            href={full.product_url}
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex items-center gap-1.5 text-meta font-medium text-accent-ink"
          >
            View it on your storefront <ArrowUpRightIcon className="size-3.5" />
          </a>
        ) : null}

        {/* Every order came from a gate decision, and that decision is the entry nobody
            can rewrite. `decision_seq` addresses it; `decision_url` is an API path, not
            a route on this dashboard. */}
        {order.decision_seq === null ? null : (
          <Button asChild variant="outline" className="mt-4 h-11 w-full">
            <Link href={`/dashboard/ledger?seq=${order.decision_seq}`}>
              See decision {order.decision_seq}
              <ArrowRightIcon />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * The drawer's label/value rows. Built rather than listed because most of them are optional:
 * an order that has not been paid has no `paid_at`, one placed outside Razorpay no
 * `reference_id`, and a row printed as "—" reads as a fact that is missing rather than one
 * that does not apply yet.
 */
function facts(order: OrderRow, full: { quantity?: number; unit_price_paise: number; reference_id?: string } | null) {
  const rows: [string, string][] = [
    ["Amount", rupees(order.amount_paise, order.currency)],
    ["Agent", order.agent_label || "not stated"],
    ["Buyer", order.buyer_label || "not stated"],
    ["Placed", moment(order.authorized_at)],
  ];
  if (order.paid_at) rows.push(["Paid", moment(order.paid_at)]);
  if (full && full.quantity)
    rows.push([
      "Quantity",
      `${full.quantity} × ${rupees(full.unit_price_paise, order.currency)}`,
    ]);
  if (full?.reference_id) rows.push(["Razorpay reference", full.reference_id]);
  return rows;
}
