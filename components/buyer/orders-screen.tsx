"use client";

import * as React from "react";
import { ArrowUpRightIcon, SearchIcon } from "lucide-react";

import { LoadMore } from "@/components/dashboard/load-more";
import {
  moment,
  OrderStatusPill,
  PanelHeader,
  Row,
  RowButton,
  rupees,
} from "@/components/dashboard/parts";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useBuyerOrders, type BuyerOrderStatus } from "@/hooks/use-buyer-orders";
import { cn } from "@/lib/utils";
import type { BuyerOrder, BuyerOrderDetail, BuyerPayment } from "@/src/client";

const COLUMNS =
  "@[42.5rem]:grid @[42.5rem]:grid-cols-[136px_minmax(120px,1fr)_minmax(140px,1.2fr)_100px_136px] @[42.5rem]:items-center @[42.5rem]:gap-2.5";

const PILLS: { key: BuyerOrderStatus | null; label: string }[] = [
  { key: null, label: "All" },
  { key: "paid", label: "Paid" },
  { key: "pending", label: "Awaiting payment" },
  { key: "failed", label: "Failed" },
  { key: "expired", label: "Expired" },
];

const label = (order: BuyerOrder) => order.order_number || order.uuid.slice(0, 8);

export function BuyerOrdersScreen() {
  const {
    rows,
    total,
    hasMore,
    loading,
    busy,
    status,
    setStatus,
    q,
    setQ,
    filtered,
    selected,
    select,
    detail,
    loadMore,
  } = useBuyerOrders();

  const order = rows.find((row) => row.uuid === selected);
  const full = detail?.uuid === selected ? detail : null;

  return (
    <div className="grid gap-panel">
      <div className="px-1.5 py-1">
        <h1 className="text-page-title">Orders</h1>
        <p className="mt-1.5 max-w-none text-body text-muted-ink">
          Everything you have bought through Munim, newest first, across every store. Open one to
          see each payment link it has had.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 px-1.5">
        <div className="flex flex-wrap items-center gap-2">
          {PILLS.map((pill) => (
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
              {pill.label}
            </button>
          ))}
          <div className="flex h-9 min-w-0 items-center gap-2 rounded-full bg-panel px-4">
            <SearchIcon className="size-3.5 shrink-0 text-muted-ink" />
            <input
              type="search"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search orders"
              aria-label="Search orders by number, product, store or reason code"
              className="min-w-0 flex-1 bg-transparent text-dense outline-none placeholder:text-muted-ink"
            />
          </div>
        </div>
        <span className="text-meta text-muted-ink">
          {total === null ? `Showing ${rows.length}` : `Showing ${rows.length} of ${total}`} · the
          list loads more as you scroll
        </span>
      </div>

      <div className="@container rounded-xl bg-panel p-6 shadow-card">
        <div className="grid gap-panel @[42.5rem]:min-w-170">
          <div
            className={cn(
              "hidden px-4 pb-2.5 text-table-head uppercase text-muted-ink",
              COLUMNS
            )}
          >
            <div>order</div>
            <div>store</div>
            <div>product</div>
            <div className="text-right">amount</div>
            <div>status</div>
          </div>

          {rows.map((row) => (
            <RowButton
              key={row.uuid}
              aria-pressed={selected === row.uuid}
              onClick={() => select(row.uuid)}
              className={cn(
                "flex flex-wrap items-center gap-x-2.5 gap-y-2 transition-colors",
                COLUMNS,
                selected === row.uuid ? "bg-track" : "hover:bg-track/60"
              )}
            >
              <span className="shrink-0">
                <span className="block text-dense font-medium">{label(row)}</span>
                <span className="mt-0.5 block text-meta text-muted-ink">
                  {moment(row.authorized_at)}
                </span>
              </span>
              <span className="min-w-0 truncate text-dense text-muted-ink">
                {row.merchant_domain}
              </span>
              <span className="min-w-0 flex-1 @[42.5rem]:flex-none">
                <span className="block truncate text-dense">{row.title}</span>
                <span className="mt-0.5 block text-meta text-muted-ink">{row.sku}</span>
              </span>
              <span className="font-medium tabular-nums @[42.5rem]:text-right">
                {rupees(row.amount_paise, row.currency)}
              </span>
              <span>
                <OrderStatusPill status={row.status} />
              </span>
            </RowButton>
          ))}

          {loading || rows.length ? null : (
            <p className="max-w-none py-8 text-center text-body text-muted-ink">
              {filtered
                ? "No orders match that filter."
                : "Nothing bought yet. Orders an agent places on your behalf land here on their own."}
            </p>
          )}

          {hasMore ? <LoadMore busy={busy} onLoadMore={loadMore} /> : null}
        </div>
      </div>

      <Drawer
        direction="right"
        open={selected !== null}
        onOpenChange={(open) => !open && select(null)}
      >
        <DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-xl">
          {order ? <OrderDrawer order={order} full={full} /> : null}
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function OrderDrawer({ order, full }: { order: BuyerOrder; full: BuyerOrderDetail | null }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DrawerHeader className="gap-0 p-6 pb-0">
        <div className="flex items-center justify-between gap-3 pr-10">
          <OrderStatusPill status={order.status} />
          <span className="text-eyebrow uppercase text-muted-ink">{label(order)}</span>
        </div>
        <DrawerTitle className="mt-4 text-card-title">{order.title}</DrawerTitle>
        <DrawerDescription className="mt-1 text-meta text-muted-ink">
          {order.sku ? `${order.sku} · ` : ""}
          {order.merchant_domain}
        </DrawerDescription>
      </DrawerHeader>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="grid gap-panel">
          {facts(order).map(([name, value]) => (
            <Row key={name} className="flex items-center justify-between gap-3 py-3">
              <span className="shrink-0 text-dense text-muted-ink">{name}</span>
              <span className="text-right text-dense font-medium">{value}</span>
            </Row>
          ))}
        </div>

        {order.failure_reason_description ? (
          <Row className="mt-4">
            <div className="text-meta font-medium tracking-[0.03em]">
              {order.failure_reason_code}
            </div>
            <p className="mt-0.5 max-w-none text-meta text-muted-ink">
              {order.failure_reason_description}
            </p>
          </Row>
        ) : null}

        <a
          href={order.product_url}
          target="_blank"
          rel="noreferrer"
          className="mt-4 flex items-center gap-1.5 text-meta font-medium text-accent-ink"
        >
          View it on {order.merchant_domain} <ArrowUpRightIcon className="size-3.5" />
        </a>

        <div className="mt-6">
          <PanelHeader
            title="Payment attempts"
            meta={full ? full.payments.length || undefined : undefined}
          />
          <div className="mt-3.5 grid gap-2.5">
            {full ? (
              full.payments.length ? (
                full.payments.map((payment) => (
                  <PaymentRow key={payment.attempt} payment={payment} />
                ))
              ) : (
                <p className="max-w-none text-meta text-muted-ink">
                  No payment link has been raised for this order yet.
                </p>
              )
            ) : (
              <p className="max-w-none text-meta text-muted-ink">Loading…</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentRow({ payment }: { payment: BuyerPayment }) {
  return (
    <Row>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <span className="flex items-center gap-2.5">
          <span className="text-dense font-medium">Attempt {payment.attempt}</span>
          <OrderStatusPill status={payment.status} />
        </span>
        <span className="text-dense font-medium tabular-nums">
          {rupees(payment.amount_paise, payment.currency)}
        </span>
      </div>

      <div className="mt-1 text-meta text-muted-ink">
        raised {moment(payment.requested_at)}
        {payment.paid_at
          ? ` · paid ${moment(payment.paid_at)}`
          : ` · expires ${moment(payment.expires_at)}`}
      </div>

      {payment.failure_reason_description ? (
        <p className="mt-1.5 max-w-none text-meta text-muted-ink">
          <span className="font-medium tracking-[0.03em]">{payment.failure_reason_code}</span>{" "}
          {payment.failure_reason_description}
        </p>
      ) : null}

      {payment.short_url && payment.status === "pending" ? (
        <a
          href={payment.short_url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 flex items-center gap-1.5 text-meta font-medium text-accent-ink"
        >
          Pay this link <ArrowUpRightIcon className="size-3.5" />
        </a>
      ) : null}
    </Row>
  );
}

function facts(order: BuyerOrder) {
  const rows: [string, string][] = [
    ["Amount", rupees(order.amount_paise, order.currency)],
    ["Store", order.merchant_domain],
    ["Placed", moment(order.authorized_at)],
  ];
  if (order.quantity)
    rows.push(["Quantity", `${order.quantity} × ${rupees(order.unit_price_paise, order.currency)}`]);
  if (order.paid_at) rows.push(["Paid", moment(order.paid_at)]);
  if (order.attempts) rows.push(["Attempts", String(order.attempts)]);
  if (order.last_failure_at) rows.push(["Last failure", moment(order.last_failure_at)]);
  return rows;
}
