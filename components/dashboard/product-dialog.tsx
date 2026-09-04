"use client";

import * as React from "react";
import { ExternalLinkIcon } from "lucide-react";
import { toast } from "sonner";

import { RED_SOLID, RED_TINT } from "@/components/dashboard/parts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { describeApiError } from "@/lib/api";
import {
  getIngestProduct,
  type PatchedProductWrite,
  type ProductDetail,
  type ProductWrite,
} from "@/src/client";

const OFFLINE = "Could not reach the server. Check your connection and try again.";

/** ScanPanel's field skin, so the two forms on this screen are visibly the same control. */
const INPUT =
  "h-11 w-full min-w-0 rounded-full bg-panel-2 px-5 text-body outline-none focus-visible:ring-3 focus-visible:ring-ring/30";

/**
 * Add or edit one product. One form for both: the fields are identical, and a merchant
 * typing a row by hand is doing the same job as one correcting a row the ingest read badly.
 *
 * Mount it keyed on the product (`key={uuid ?? "new"}`) and only while it is open — the
 * remount is what resets the form, the fetched detail and an armed delete, so nothing here
 * needs a synchronous state reset in an effect.
 *
 * Editing fetches `GET /ingest/products/{uuid}` first. The catalogue row cannot prefill this
 * form on its own: `url`, `is_visible_to_agents` and `in_stock`'s exact tri-state live only
 * on `ProductDetail`, and a form that silently posted defaults for the three fields it could
 * not see would quietly clear them.
 */
export function ProductDialog({
  uuid,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}: {
  /** `null` to add a product, a uuid to edit that one. */
  uuid: string | null;
  onClose: () => void;
  onCreate: (body: ProductWrite) => Promise<boolean>;
  onUpdate: (uuid: string, body: PatchedProductWrite) => Promise<boolean>;
  onDelete: (uuid: string) => Promise<boolean>;
}) {
  const [detail, setDetail] = React.useState<ProductDetail | null>(null);
  const [loading, setLoading] = React.useState(() => uuid !== null);
  const [saving, setSaving] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);

  React.useEffect(() => {
    if (uuid === null) return;
    let active = true;
    getIngestProduct({ path: { product_uuid: uuid } })
      .then(({ data, error }) => {
        if (!active) return;
        if (data) setDetail(data);
        else toast.error(describeApiError(error));
      })
      .catch(() => {
        if (active) toast.error(OFFLINE);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [uuid]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "").trim();
    const stock = String(form.get("in_stock") ?? "");

    const body: ProductWrite = {
      url: text("url"),
      title: text("title"),
      // Rupees in, paise stored. The round is load-bearing, not defensive tidying:
      // `4200.1 * 100` is 420010.00000000006, and the API column is an integer.
      price_paise: Math.round(Number(form.get("price") || 0) * 100),
      sku: text("sku"),
      currency: text("currency") || "INR",
      // Three-valued, and the blank option is a real answer: `null` means the listing
      // publishes no availability, which is not the same claim as "out of stock".
      in_stock: stock === "" ? null : stock === "true",
      image_url: text("image_url"),
      is_visible_to_agents: form.get("is_visible_to_agents") === "on",
    };

    setSaving(true);
    const saved = uuid === null ? await onCreate(body) : await onUpdate(uuid, body);
    if (saved) return onClose();
    setSaving(false);
  }

  async function remove() {
    if (uuid === null) return;
    setSaving(true);
    if (await onDelete(uuid)) return onClose();
    setSaving(false);
    setConfirming(false);
  }

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{uuid === null ? "Add a product" : "Edit product"}</DialogTitle>
          <DialogDescription>
            {detail?.url ? (
              // The row itself is a button, so this is where the storefront link lives —
              // a link inside that button would be invalid markup and unreachable anyway.
              <a href={detail.url} target="_blank" rel="noreferrer noopener">
                Open on your storefront <ExternalLinkIcon className="inline size-3.5" />
              </a>
            ) : (
              "Agents read these fields. Anything you leave blank stays an unfilled bar."
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="py-6 text-center text-body text-muted-ink">Loading…</p>
        ) : (
          <form id="product-form" onSubmit={submit} className="grid gap-3.5 sm:grid-cols-2">
            <Field label="Product URL" className="sm:col-span-2">
              <input
                name="url"
                type="url"
                required
                defaultValue={detail?.url ?? ""}
                placeholder="https://shoprabistha.com/products/…"
                className={INPUT}
              />
            </Field>

            <Field label="Title" className="sm:col-span-2">
              <input name="title" required defaultValue={detail?.title ?? ""} className={INPUT} />
            </Field>

            <Field label="Price (₹)">
              <input
                name="price"
                type="number"
                min={0}
                step="0.01"
                required
                defaultValue={detail ? String(detail.price_paise / 100) : ""}
                className={`${INPUT} tabular-nums`}
              />
            </Field>

            <Field label="SKU">
              <input name="sku" defaultValue={detail?.sku ?? ""} className={INPUT} />
            </Field>

            <Field label="Currency">
              <input name="currency" defaultValue={detail?.currency ?? "INR"} className={INPUT} />
            </Field>

            <Field label="Availability">
              {/* Native select: three options on one screen, and a shadcn Select would be a
                  new primitive for this one control. */}
              <select
                name="in_stock"
                defaultValue={detail?.in_stock === undefined || detail?.in_stock === null ? "" : String(detail.in_stock)}
                className={`${INPUT} px-4`}
              >
                <option value="">Not published</option>
                <option value="true">In stock</option>
                <option value="false">Out of stock</option>
              </select>
            </Field>

            <Field label="Image URL" className="sm:col-span-2">
              <input
                name="image_url"
                type="url"
                defaultValue={detail?.image_url ?? ""}
                className={INPUT}
              />
            </Field>

            <label className="flex items-center gap-2.5 px-1 sm:col-span-2">
              <input
                type="checkbox"
                name="is_visible_to_agents"
                defaultValue="on"
                defaultChecked={detail?.is_visible_to_agents ?? true}
                className="size-4 accent-navy-900"
              />
              <span className="text-body">
                Visible to agents
                <span className="text-muted-ink"> — uncheck to hide it without deleting it.</span>
              </span>
            </label>
          </form>
        )}

        <DialogFooter className="sm:justify-between">
          {uuid === null ? (
            <span />
          ) : (
            // A popover, not a second dialog: it asks in place, over the button that armed
            // it, and needs no overlay stacked on this one. Radix keeps it above the dialog
            // as a nested layer, so Escape closes the question and leaves the editor open.
            <Popover open={confirming} onOpenChange={setConfirming}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="destructive"
                  className={RED_TINT}
                  disabled={saving}
                >
                  Delete
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" side="top">
                <PopoverHeader>
                  <PopoverTitle>Delete this product?</PopoverTitle>
                  <PopoverDescription>
                    Agents stop seeing it at once. A rescan of your storefront brings it back —
                    a row you typed by hand does not come back.
                  </PopoverDescription>
                </PopoverHeader>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>
                    Keep it
                  </Button>
                  <Button type="button" className={RED_SOLID} onClick={remove} disabled={saving}>
                    {saving ? "Deleting…" : "Delete"}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="product-form" disabled={saving || loading}>
              {saving ? "Saving…" : uuid === null ? "Add product" : "Save changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`flex min-w-0 flex-col gap-1.5 ${className ?? ""}`}>
      <span className="px-1 text-eyebrow uppercase text-muted-ink">{label}</span>
      {children}
    </label>
  );
}
