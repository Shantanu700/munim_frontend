import * as React from "react";
import { ArrowUpRightIcon, ImageOffIcon } from "lucide-react";

import { REQUIRED_DETAILS } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";
import type { Product } from "@/src/client";

export const RED_TINT =
  "bg-red-600/10 text-red-600 hover:bg-red-600/20 focus-visible:border-red-600/40 focus-visible:ring-red-600/20 dark:bg-red-500/15 dark:text-red-400 dark:hover:bg-red-500/25 dark:focus-visible:ring-red-500/40";
export const RED_SOLID = "bg-red-600 text-white hover:bg-red-700";

export function Panel({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-xl bg-panel p-6 shadow-card", className)} {...props} />;
}

const ROW = "rounded-md bg-panel-2 px-4 py-3.5";

export function Row({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn(ROW, className)} {...props} />;
}

export function RowButton({ className, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        ROW,
        "w-full text-left transition-colors focus-visible:ring-3 focus-visible:ring-ring/30",
        className
      )}
      {...props}
    />
  );
}

export function PanelHeader({ title, meta }: { title: string; meta?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 className="text-card-title">{title}</h2>
      {meta ? <div className="text-meta text-muted-ink">{meta}</div> : null}
    </div>
  );
}

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

const VERDICTS: Record<string, { glyph: string; className: string }> = {
  ALLOW: { glyph: "●", className: "bg-allow-tint text-allow" },
  STEP_UP: { glyph: "◐", className: "bg-step-tint text-step" },
  DENY: { glyph: "✕", className: "bg-deny-tint text-deny" },
};

const NOT_A_VERDICT = { glyph: "◇", className: "bg-faint text-muted-ink" };

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

const ORDER_STATUS: Record<string, { label: string; className: string }> = {
  paid: { label: "Paid", className: "bg-allow-tint text-allow" },
  pending: { label: "Awaiting approval", className: "bg-step-tint text-step" },
  failed: { label: "Payment failed", className: "bg-deny-tint text-deny" },
  expired: { label: "Expired", className: "bg-deny-tint text-deny" },
};

export function OrderStatusPill({ status }: { status?: string }) {
  return <StatusPill map={ORDER_STATUS} status={status} />;
}

const PAYMENT_STATUS: Record<string, { label: string; className: string }> = {
  paid: { label: "Paid", className: "bg-allow-tint text-allow" },
  pending: { label: "Unpaid", className: "bg-step-tint text-step" },
  failed: { label: "Failed", className: "bg-deny-tint text-deny" },
  expired: { label: "Link expired", className: "bg-deny-tint text-deny" },
};

export function PaymentStatusPill({ status }: { status?: string }) {
  return <StatusPill map={PAYMENT_STATUS} status={status} />;
}

function StatusPill({
  map,
  status,
}: {
  map: Record<string, { label: string; className: string }>;
  status?: string;
}) {
  const { label, className } = (status ? map[status] : undefined) ?? {
    label: status || "Unknown",
    className: "bg-faint text-muted-ink",
  };
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-meta font-medium", className)}>{label}</span>
  );
}

export function tierFor(present: number, inStock?: boolean | null) {
  if (inStock === false) return "Out of stock";
  return present === 6 ? "Ready to sell" : present === 5 ? "Needs a check" : "Incomplete";
}

export function callerOf(entry: { action: string; agent: string }) {
  if (entry.agent) return entry.agent;
  return entry.action === "checkout" ? "unsigned caller" : "";
}

export function moment(at: string) {
  return new Date(at).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function mask(token: string) {
  return token.length > 16 ? `${token.slice(0, 8)}…${token.slice(-4)}` : "•".repeat(token.length);
}

export function rupees(paise: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

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

export function BarMeter({
  present,
  label,
  detail,
  inStock,
}: {
  present: number;
  label?: string;
  detail?: string;
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
