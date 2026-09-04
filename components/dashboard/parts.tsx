import * as React from "react";
import { ArrowUpRightIcon, ImageOffIcon } from "lucide-react";

import { REQUIRED_DETAILS } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";
import type { Product } from "@/src/client";

/**
 * The DESIGN.md §6 primitives this screen repeats. They live in one file because each is
 * a handful of lines; there is no `components/ui/card.tsx` and shadcn's would carry its
 * own padding and radius opinions straight into §3 and §4.
 */

/**
 * Actual red, by explicit request — the second sanctioned exception to DESIGN.md §1 rule 2
 * after sonner's `richColors`. `variant="destructive"` cannot do this: `--destructive` is
 * aliased to `--deny`, which is deep navy, so `variant="destructive"` alone reads as just
 * another navy button — the tint below repaints every colour it sets, in both themes.
 * Tailwind's own palette rather than a new token, since nothing else here is red.
 */
export const RED_TINT =
  "bg-red-600/10 text-red-600 hover:bg-red-600/20 focus-visible:border-red-600/40 focus-visible:ring-red-600/20 dark:bg-red-500/15 dark:text-red-400 dark:hover:bg-red-500/25 dark:focus-visible:ring-red-500/40";
export const RED_SOLID = "bg-red-600 text-white hover:bg-red-700";

/** §6 card: `--panel`, 32px radius, the one shadow. Top-level panels only (§5). */
export function Panel({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-xl bg-panel p-6 shadow-card", className)} {...props} />;
}

/** §6 row: `--panel-2`, 18px radius, 13px/16px padding. Nested, so never shadowed. */
const ROW = "rounded-md bg-panel-2 px-4 py-3.5";

export function Row({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn(ROW, className)} {...props} />;
}

/**
 * The same §6 row when the row *is* the control — a catalogue row that opens its editor.
 * A real `<button>`, so focus, Enter/Space and the a11y tree come free where a clickable
 * `div` would need all three hand-rolled. It may therefore hold no other interactive
 * element: nothing inside it can be a link.
 */
export function RowButton({ className, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(ROW, "w-full text-left focus-visible:ring-3 focus-visible:ring-ring/30", className)}
      {...props}
    />
  );
}

/** A card header at 17px/500 with optional right-aligned meta on the same baseline. */
export function PanelHeader({ title, meta }: { title: string; meta?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 className="text-card-title">{title}</h2>
      {meta ? <div className="text-meta text-muted-ink">{meta}</div> : null}
    </div>
  );
}

/**
 * One of the four metrics across the top. `tone="dark"` is the single dark panel the
 * screen is allowed (§1 rule 5) and is reserved for payments received.
 */
export function StatTile({
  label,
  value,
  suffix,
  note,
  tone = "light",
}: {
  label: string;
  value: React.ReactNode;
  suffix?: string;
  note: string;
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  return (
    <div
      className={cn(
        "rounded-xl p-6 shadow-card",
        dark ? "bg-tile text-tile-foreground" : "bg-panel"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-card-title">{label}</span>
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full border-[1.5px]",
            dark ? "border-navy-200/45" : "border-rule text-muted-ink"
          )}
        >
          <ArrowUpRightIcon className="size-3.5" />
        </span>
      </div>
      <div className="mt-4 text-display tabular-nums">
        {value}
        {suffix ? <span className="text-section text-muted-ink"> {suffix}</span> : null}
      </div>
      <div className={cn("mt-2.5 text-meta", dark ? "text-navy-200" : "text-muted-ink")}>{note}</div>
    </div>
  );
}

/**
 * §1 rule 2: a verdict is cool navy / warm sand / deep navy, never traffic-light, and the
 * colour never travels without the word.
 */
const VERDICTS: Record<string, { glyph: string; className: string }> = {
  ALLOW: { glyph: "●", className: "bg-allow-tint text-allow" },
  STEP_UP: { glyph: "◐", className: "bg-step-tint text-step" },
  DENY: { glyph: "✕", className: "bg-deny-tint text-deny" },
};

/** Anything that is not a verdict — `CONFIG`, and whatever the registry adds next. */
const NOT_A_VERDICT = { glyph: "◇", className: "bg-faint text-muted-ink" };

/**
 * `verdict` is a bare `string`, not the `Verdict` union, because the ledger's `decision`
 * column is: policy edits and Razorpay writes append to the same chain with
 * `decision="CONFIG"`. A total `Record<Verdict, …>` destructured `undefined` on the first
 * such row, which crashed the table. The fallback carries no verdict colour at all, so §1
 * rule 2 holds — the word is still the thing doing the telling.
 */
export function VerdictPill({ verdict }: { verdict: string }) {
  const { glyph, className } = VERDICTS[verdict] ?? NOT_A_VERDICT;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-eyebrow tracking-[0.04em]",
        className
      )}
    >
      <span aria-hidden>{glyph}</span>
      {verdict}
    </span>
  );
}

/**
 * Where an order got to. §1 rule 2 again — the chip's colour only repeats what its word
 * already says, which matters more here than on a verdict: `failed` and `expired` share a
 * tint, so the word is the only thing that distinguishes a declined card from an approval
 * nobody answered.
 */
const ORDER_STATUS: Record<string, { label: string; className: string }> = {
  paid: { label: "Paid", className: "bg-allow-tint text-allow" },
  pending: { label: "Awaiting approval", className: "bg-step-tint text-step" },
  failed: { label: "Payment failed", className: "bg-deny-tint text-deny" },
  expired: { label: "Expired", className: "bg-deny-tint text-deny" },
};

/**
 * `status` is a bare optional `string` rather than `Status04aEnum`, for the reason
 * `VerdictPill` above is: `OrderRow.status` is optional on the wire, and a total
 * `Record<Status04aEnum, …>` destructuring `undefined` is exactly the crash the ledger's
 * table hit on its first `CONFIG` row. The fallback carries no status colour, so §1 rule 2
 * holds either way — the word is what does the telling.
 */
export function OrderStatusPill({ status }: { status?: string }) {
  const { label, className } = (status ? ORDER_STATUS[status] : undefined) ?? {
    label: status || "Unknown",
    className: "bg-faint text-muted-ink",
  };
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-meta font-medium", className)}>{label}</span>
  );
}

/**
 * `in_stock === false` outranks a full six bars: the page published every detail an agent
 * needs *and* published that there is nothing to send. Calling that "Ready to sell" is the
 * one wrong thing a catalogue row can say. `null` (nothing published) is not the same claim
 * and falls through to the bar count, which already counts it missing.
 */
export function tierFor(present: number, inStock?: boolean | null) {
  if (inStock === false) return "Out of stock";
  return present === 6 ? "Ready to sell" : present === 5 ? "Needs a check" : "Incomplete";
}

/**
 * Who asked, in a ledger entry's own terms.
 *
 * `agent` is blank on most of the chain, and blank does not mean one thing: on a `checkout`
 * it is the engine's "the caller presented no valid mandate", but on a `policy_change` or a
 * `razorpay_*` row it means the merchant did it from this dashboard, where naming them an
 * unsigned caller would read as an intrusion. So only a checkout gets that phrase, and the
 * rest omit the segment. (The actor is in the entry's `detail` blob — `actor_email`,
 * `by_user` — and the inspector prints it there.)
 */
export function callerOf(entry: { action: string; agent: string }) {
  if (entry.agent) return entry.agent;
  return entry.action === "checkout" ? "unsigned caller" : "";
}

/**
 * An ISO timestamp as a merchant reads it: "3 Sep, 6:04 pm". Day and month rather than a
 * bare clock time, because a ledger scrolls back past midnight and "14:22" alone then names
 * two different afternoons.
 */
export function moment(at: string) {
  return new Date(at).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Enough of a bearer credential to recognise it, never enough to use it — the value itself
 * only ever leaves through `CopyButton`, so a shoulder or a screenshot gets nothing. Shared by
 * the two things this app hands over exactly once: a mandate token and a platform API key.
 */
export function mask(token: string) {
  return token.length > 16 ? `${token.slice(0, 8)}…${token.slice(-4)}` : "•".repeat(token.length);
}

/** Paise to rupees. `Intl` handles the Indian digit grouping (₹1,20,000), so nothing else has to. */
export function rupees(paise: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

/**
 * Score one ingested product against `REQUIRED_DETAILS` — the six things an agent needs
 * before it can transact — and name the ones the page did not publish.
 *
 * `in_stock` is nullable on purpose: `null` means the page published no availability at
 * all, which is the missing detail, while `false` means it published "out of stock" —
 * a published fact, so the bar fills. Compare against null; do not write `Boolean()`.
 *
 * This needs `in_stock` on the *list* `Product`, not just `ProductDetail` — the catalogue
 * row and the SSE `product` event both score the sixth bar from it. Drop it from the list
 * serializer and every row silently loses a bar it had earned.
 */
export function detailsFor(product: Product) {
  const found = {
    name: Boolean(product.title),
    price: (product.price_paise ?? 0) > 0,
    currency: Boolean(product.currency),
    sku: Boolean(product.sku),
    image: Boolean(product.image_url),
    stock: product.in_stock !== null && product.in_stock !== undefined,
  };
  const absent = REQUIRED_DETAILS.filter((field) => !found[field]);
  return {
    present: REQUIRED_DETAILS.length - absent.length,
    missing: absent.length ? `${absent.join(", ")} not published` : "",
  };
}

/**
 * §6 status meter: one segment per detail an agent needs, at the literal 10×18 / 4px / 3px
 * the spec names, in `--bar-1` over `--track`, always beside its tier label.
 *
 * Pass `detail` to stack the tier over the reason (the catalogue table's layout); leave it
 * off for the inline form the dashboard uses.
 */
export function BarMeter({
  present,
  label,
  detail,
  inStock,
}: {
  present: number;
  label?: string;
  detail?: string;
  /** Pass the product's own tri-state so a published "out of stock" wins over the count. */
  inStock?: boolean | null;
}) {
  const tier = label ?? tierFor(present, inStock);
  return (
    <span className="flex items-center gap-3">
      <span
        className="flex gap-[3px]"
        role="img"
        aria-label={`${present} of ${REQUIRED_DETAILS.length} details published`}
      >
        {REQUIRED_DETAILS.map((field, i) => (
          <span key={field} className={cn("h-4.5 w-2.5 rounded-[4px]", i < present ? "bg-bar-1" : "bg-track")} />
        ))}
      </span>
      {detail === undefined ? (
        <span className="text-meta text-muted-ink">{tier}</span>
      ) : (
        <span className="min-w-0">
          <span className="block text-meta font-medium">{tier}</span>
          <span className="block text-meta text-muted-ink">{detail}</span>
        </span>
      )}
    </span>
  );
}

/**
 * The `image_url` the ingest recovered, or the gap where one should be.
 *
 * A plain <img>, deliberately, not next/image: these URLs come from whatever domain the
 * merchant's storefront lives on, so optimising them would mean a wildcard `remotePatterns`
 * — an open image proxy on our origin.
 *
 * The fallback icon is always in the box and the image sits on top of it, so a URL that
 * 404s reveals the same faint square as a product that published no URL at all. That is
 * not a nicety: stores routinely publish image refs that resolve nowhere (one test
 * storefront's JSON-LD emits `https:files/x.jpg` while the real asset is on a CDN), and a
 * broken-image glyph in every row reads as our bug rather than their markup. Hiding the
 * element beats swapping state — no re-render, and nothing to reset when `src` changes.
 */
export function ProductThumb({ src, alt }: { src: string | null; alt: string }) {
  return (
    <span
      className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-faint"
      {...(src ? {} : { role: "img", "aria-label": "No image recovered" })}
    >
      <ImageOffIcon className="size-4 text-muted-ink" aria-hidden />
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary merchant hosts; see above
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={(event) => {
            event.currentTarget.hidden = true;
          }}
          className="absolute inset-0 size-full object-cover"
        />
      ) : null}
    </span>
  );
}
