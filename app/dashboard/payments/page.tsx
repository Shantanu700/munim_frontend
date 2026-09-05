"use client";

import Link from "next/link";
import { ArrowRightIcon, ArrowUpRightIcon, SearchIcon } from "lucide-react";

import { LoadMore } from "@/components/dashboard/load-more";
import {
  moment,
  Panel,
  PaymentStatusPill,
  Row,
  RowButton,
  rupees,
} from "@/components/dashboard/parts";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { usePayments, type PaymentStatus } from "@/hooks/use-payments";
import { cn } from "@/lib/utils";
import type { PaymentDetail, PaymentRow } from "@/src/client";

/**
 * The table reflows on its own panel's width, not the viewport's — a container query, the
 * orders table's exact reason: the panel spans the page at xl but sits inside the sidebar's
 * remainder at lg, and a viewport breakpoint is wrong at one of the two. Under 42.5rem each
 * attempt stacks into a card rather than scrolling sideways and putting the amount off-screen.
 *
 * DOM order is the card order (order, product, amount, status, requested), so the narrow form
 * reads correctly unstyled; `@[42.5rem]:order-*` puts requested back before status in the table.
 */
const COLUMNS =
  "@[42.5rem]:grid @[42.5rem]:grid-cols-[150px_minmax(150px,1fr)_100px_120px_136px] @[42.5rem]:items-center @[42.5rem]:gap-2.5";

/**
 * The four statuses, with "All" prepended. Hard-coded rather than fetched because there is no
 * counts endpoint for payments — so unlike the orders pills these carry no numbers, and "every
 * status" is `?status=` being absent rather than a word the API accepts.
 */
const PILLS: { key: PaymentStatus | null; label: string }[] = [
  { key: null, label: "All" },
  { key: "pending", label: "Unpaid" },
  { key: "paid", label: "Paid" },
  { key: "failed", label: "Failed" },
  { key: "expired", label: "Expired" },
];

/** Order numbers are not guaranteed to be set; the uuid is, and its head is enough to read. */
const label = (row: PaymentRow) => row.order_number || row.order_uuid.slice(0, 8);

/**
 * Every payment attempt made against an order, across orders.
 *
 * The list an order's "why did this take three tries" question is answered from: one row per
 * link Munim minted, with the amount *that link* asked for — which may differ from the order's,
 * since a retry re-runs the gate against the live page and the price it finds there may have
 * moved. `hooks/use-payments.ts` owns every request and every toast; nothing below fetches.
 */
export default function PaymentsPage() {
  const {
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
    filtered,
    payment,
    select,
    detail,
    loadMore,
  } = usePayments();

  // The detail response and the selected row can disagree for one render, which is what this
  // guard replaces — clearing `detail` in the hook's effect would be a lint error.
  const full = detail?.uuid === payment?.uuid ? detail : null;

  return (
    <div className="grid gap-panel xl:h-full xl:grid-rows-[auto_auto_minmax(0,1fr)]">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 px-1.5 py-1">
        <div>
          <h1 className="text-page-title">Payments</h1>
          <p className="mt-1 text-body text-muted-ink">
            Every payment link Munim minted, including the retries — an order can take more than
            one attempt to settle.
          </p>
        </div>
        <Button asChild className="h-11 px-5">
          <Link href="/dashboard/orders">Open orders</Link>
        </Button>
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

          {/* Not a sixth status: a link stays `pending` until the reaper closes it, so a lapsed
              one reads pending for as long as an hour. This is the only filter that answers
              what is actually still payable, which is why it sits apart from the pills. */}
          <button
            type="button"
            aria-pressed={live}
            onClick={() => setLive(!live)}
            className={cn(
              "h-9 cursor-pointer rounded-full border border-rule px-5 text-dense font-medium transition-colors",
              live ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-panel-2"
            )}
          >
            Still payable
          </button>

          {/* Searches order number, product title and sku, buyer, the Razorpay ids on *this*
              attempt, and failure reasons by code or by the sentence shown for them. */}
          <div className="flex h-9 min-w-0 items-center gap-2 rounded-full bg-panel px-4">
            <SearchIcon className="size-3.5 shrink-0 text-muted-ink" />
            <input
              type="search"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search payments"
              aria-label="Search payments by order, product, buyer, Razorpay id or failure reason"
              className="min-w-0 flex-1 bg-transparent text-dense outline-none placeholder:text-muted-ink"
            />
          </div>
        </div>
        <span className="text-meta text-muted-ink">
          {total === null ? `Showing ${rows.length}` : `Showing ${rows.length} of ${total}`} · the
          list loads more as you scroll
        </span>
      </div>

      <Panel className="flex flex-col xl:min-h-0">
        {/* Below xl the page scrolls as a whole, so without a cap a long list pushes the header
            above two screens up. The cap gives the list its own scroller here too, the way the
            pinned xl layout already does — where flex-1 supplies the height instead and the cap
            has to get out of the way. Either way there is always a real scroller, which is what
            the sentinel below needs. */}
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
              <div>requested</div>
              <div>status</div>
            </div>

            {rows.map((row) => (
              <RowButton
                key={row.uuid}
                aria-pressed={payment?.uuid === row.uuid}
                onClick={() => select(row.uuid)}
                className={cn(
                  "flex flex-wrap items-center gap-x-2.5 gap-y-2 transition-colors",
                  COLUMNS,
                  payment?.uuid === row.uuid ? "bg-track" : "hover:bg-track/60"
                )}
              >
                <span className="shrink-0">
                  <span className="block text-dense font-medium">{label(row)}</span>
                  {/* The number is the whole point of this list: it is what says an order took
                      three goes rather than one. */}
                  <span className="mt-0.5 block text-meta text-muted-ink">
                    Attempt {row.attempt}
                  </span>
                </span>
                <span className="min-w-0 flex-1 @[42.5rem]:flex-none">
                  <span className="block truncate text-dense">{row.order_title}</span>
                  <span className="mt-0.5 block truncate text-meta text-muted-ink">
                    {row.buyer_label || "not stated"}
                  </span>
                </span>
                {/* This link's amount, not the order's. A retry re-prices against the live
                    page, so the two are not interchangeable. */}
                <span className="font-medium tabular-nums @[42.5rem]:text-right">
                  {rupees(row.amount_paise, row.currency)}
                </span>
                {/* Before the timestamp when stacked — the status is what a merchant is
                    scanning the list for. `order-*` puts it back last in the table. */}
                <span className="@[42.5rem]:order-5">
                  <PaymentStatusPill status={row.status} />
                </span>
                <span className="truncate text-meta text-muted-ink @[42.5rem]:order-4">
                  {/* The wire carries ISO-8601; the reader's timezone is only known here. */}
                  {moment(row.requested_at)}
                </span>
              </RowButton>
            ))}

            {/* Nothing at all while loading: a spinner on first paint only flashes. The two
                empty sentences are different because the states are. */}
            {loading || rows.length ? null : (
              <p className="max-w-none py-8 text-center text-body text-muted-ink">
                {filtered
                  ? "No payment attempts match that filter."
                  : "No payment link has been minted yet. The first one lands here on its own."}
              </p>
            )}

            {/* Inside the scroller, so it sits at the foot of the list rather than pinned
                under a card nobody has scrolled to the end of. */}
            {hasMore ? <LoadMore busy={busy} onLoadMore={loadMore} /> : null}
          </div>
        </div>
      </Panel>

      {/* `select(null)` is what closes it, so the open attempt and the drawer cannot disagree.
          `open` is derived from the row rather than the raw selection: an attempt the filter now
          excludes closes the drawer instead of leaving an empty one standing. */}
      <Drawer
        direction="right"
        open={payment !== undefined}
        onOpenChange={(open) => !open && select(null)}
      >
        <DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-xl">
          {payment ? <PaymentDrawer payment={payment} full={full} /> : null}
        </DrawerContent>
      </Drawer>
    </div>
  );
}

/**
 * One attempt, in the drawer. `PaymentDetail` is a strict superset of the list row, so `full`
 * is needed for exactly one thing — `decision_seq`, the gate decision behind *this* retry — and
 * everything else is readable the moment the drawer opens.
 */
function PaymentDrawer({ payment, full }: { payment: PaymentRow; full: PaymentDetail | null }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DrawerHeader className="gap-0 p-6 pb-0">
        {/* `pr-10` clears the drawer's own close button, which floats at `top-6 right-6`. */}
        <div className="flex items-center justify-between gap-3 pr-10">
          <PaymentStatusPill status={payment.status} />
          <span className="text-eyebrow uppercase text-muted-ink">{label(payment)}</span>
        </div>
        <DrawerTitle className="mt-4 text-card-title">{payment.order_title}</DrawerTitle>
        <DrawerDescription className="mt-1 text-meta text-muted-ink">
          Attempt {payment.attempt} · {payment.buyer_label || "buyer not stated"}
        </DrawerDescription>
      </DrawerHeader>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="grid gap-panel">
          {facts(payment).map(([name, value]) => (
            <Row key={name} className="flex items-center justify-between gap-3 py-3">
              <span className="shrink-0 text-dense text-muted-ink">{name}</span>
              <span className="text-right text-dense font-medium">{value}</span>
            </Row>
          ))}
        </div>

        {/* Blank in the ordinary case — an attempt that has not failed has no reason — and an
            empty element would still take its margin. */}
        {payment.failure_reason_description ? (
          <Row className="mt-4">
            <div className="text-meta font-medium tracking-[0.03em]">
              {payment.failure_reason_code}
            </div>
            <p className="mt-0.5 max-w-none text-meta text-muted-ink">
              {payment.failure_reason_description}
            </p>
          </Row>
        ) : null}

        {/* Offered on `is_live` rather than on `status === "pending"`, which is the whole reason
            the field exists: a lapsed link reads pending for up to an hour after it stopped
            working, and a link that goes nowhere invites a click that wastes the buyer's time. */}
        {payment.is_live && payment.short_url ? (
          <a
            href={payment.short_url}
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex items-center gap-1.5 text-meta font-medium text-accent-ink"
          >
            Open the payment link <ArrowUpRightIcon className="size-3.5" />
          </a>
        ) : null}

        {/* The order's own decision is in the ledger too; this is the decision behind *this*
            retry, and the pair spans the whole story. `decision_url` is an API path, not a
            route on this dashboard, so the sequence number is what addresses it. */}
        {full && full.decision_seq !== null ? (
          <Button asChild variant="outline" className="mt-4 h-11 w-full">
            <Link href={`/dashboard/ledger?seq=${full.decision_seq}`}>
              See decision {full.decision_seq}
              <ArrowRightIcon />
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The drawer's label/value rows. Built rather than listed because most of them are optional: an
 * attempt still open has no `paid_at`, one that never failed no `last_failure_at`, and a row
 * printed as "—" reads as a fact that is missing rather than one that does not apply yet.
 */
function facts(payment: PaymentRow) {
  const rows: [string, string][] = [
    ["Amount requested", rupees(payment.amount_paise, payment.currency)],
  ];
  // Nullable, and a partial capture is exactly the case worth naming — so `!= null` rather
  // than a truthiness check, which would hide a genuine zero.
  if (payment.amount_paid_paise != null)
    rows.push(["Amount paid", rupees(payment.amount_paid_paise, payment.currency)]);
  rows.push(["Requested", moment(payment.requested_at)]);
  if (payment.paid_at) rows.push(["Paid", moment(payment.paid_at)]);
  // Only while the link is the thing a merchant is waiting on: an expiry in the past on a row
  // that already settled is noise.
  else if (payment.status === "pending")
    rows.push([payment.is_live ? "Expires" : "Lapsed", moment(payment.expires_at)]);
  if (payment.closed_at) rows.push(["Closed", moment(payment.closed_at)]);
  if (payment.failed_attempts) rows.push(["Card failures", String(payment.failed_attempts)]);
  if (payment.last_failure_at) rows.push(["Last failure", moment(payment.last_failure_at)]);
  if (payment.plink_id) rows.push(["Razorpay link", payment.plink_id]);
  if (payment.reference_id) rows.push(["Razorpay reference", payment.reference_id]);
  return rows;
}
