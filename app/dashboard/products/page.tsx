"use client";

import * as React from "react";
import { CopyIcon, ExternalLinkIcon, PlusIcon } from "lucide-react";

import {
  BarMeter,
  Panel,
  ProductThumb,
  Row,
  RowButton,
  detailsFor,
  rupees,
} from "@/components/dashboard/parts";
import { CopyButton } from "@/components/dashboard/copy-button";
import { LoadMore } from "@/components/dashboard/load-more";
import { ProductDialog } from "@/components/dashboard/product-dialog";
import { ScanPanel } from "@/components/dashboard/scan-panel";
import { Button } from "@/components/ui/button";
import { useIngest, type IngestProgress, type IngestStatus } from "@/hooks/use-ingest";
import { REQUIRED_DETAILS } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";
import type { Product } from "@/src/client";

const COLUMNS =
  "@[42.5rem]:grid @[42.5rem]:grid-cols-[56px_100px_88px_minmax(150px,1fr)_220px] @[42.5rem]:items-center @[42.5rem]:gap-2.5";

export default function ProductsPage() {
  const { products, hasMore, progress, status, busy, merchant, start, cancel, loadMore, create, update, remove } =
    useIngest();
  const [editing, setEditing] = React.useState<string | null | undefined>(undefined);

  return (
    <div className="grid gap-panel lg:grid-cols-[minmax(0,1fr)_340px] xl:h-full xl:min-h-0 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="flex flex-col gap-panel xl:min-h-0">
        <div className="shrink-0 px-1.5 py-1">
          <h1 className="text-page-title">Make your store agent-readable</h1>
          <p className="mt-1 text-body text-muted-ink">
            Munim reads the JSON-LD your product pages already publish for Google Shopping —
            nothing to install, and no crawler let loose on your site.
          </p>
        </div>

        <Panel className="shrink-0">
          <ScanPanel
            domain={merchant.domain}
            progress={progress}
            status={status}
            onScan={start}
            onCancel={cancel}
          />
        </Panel>

        <Catalogue
          rows={products}
          status={status}
          progress={progress}
          hasMore={hasMore}
          busy={busy}
          onLoadMore={loadMore}
          onEdit={setEditing}
        />
      </div>

      <div className="flex flex-col gap-panel xl:min-h-0">
        <McpCard url={merchant.mcpUrl} />

        <Panel className="shrink-0">
          <h2 className="text-card-title">Add it to an assistant</h2>
          <div className="mt-3 grid gap-2">
            {[
              ["ChatGPT", "Settings → Connectors → Add custom connector. Paste the address."],
              ["Claude", "Same path, same address. No key is needed to browse the catalogue."],
              [null, "Then ask it “show me co-ord sets under ₹6,000” to confirm it reads."],
            ].map(([name, body], i) => (
              <Row key={i} className="flex gap-3 px-3.5 py-2.5">
                <span className="text-meta font-medium text-muted-ink">0{i + 1}</span>
                <p className="max-w-none text-meta">
                  {name ? <b className="font-medium">{name}</b> : null}
                  {name ? " — " : null}
                  {body}
                </p>
              </Row>
            ))}
          </div>
          <Button asChild className="mt-3.5 h-11 w-full">
            <a href="https://chatgpt.com/" target="_blank" rel="noreferrer noopener">
              Open ChatGPT
              <ExternalLinkIcon />
            </a>
          </Button>
        </Panel>

        <HowToReadBars />
      </div>

      {editing !== undefined ? (
        <ProductDialog
          key={editing ?? "new"}
          uuid={editing}
          onClose={() => setEditing(undefined)}
          onCreate={create}
          onUpdate={update}
          onDelete={remove}
        />
      ) : null}
    </div>
  );
}

function McpCard({ url }: { url: string | null }) {
  return (
    <div className="shrink-0 rounded-xl bg-navy-900 p-6 text-navy-050 shadow-card">
      <div className="text-eyebrow uppercase text-navy-200">
        {url ? "your endpoint is live" : "your endpoint"}
      </div>
      <h2 className="mt-2 text-card-title">
        One address makes your catalogue buyable by AI assistants
      </h2>
      <div className="mt-3.5 flex items-center gap-3 rounded-lg bg-navy-200/12 p-3.5">
        {url ? (
          <>
            <div className="min-w-0 flex-1 text-body font-medium break-all">{url}</div>
            <CopyButton
              value={url}
              aria-label="Copy the endpoint to the clipboard"
              copiedLabel="Endpoint copied."
              className="h-9 shrink-0 px-4 bg-navy-200 text-navy-900 hover:bg-navy-200/85"
            >
              <CopyIcon />
            </CopyButton>
          </>
        ) : (
          <p className="max-w-none text-body text-navy-200">
            Your address appears here after your first scan.
          </p>
        )}
      </div>
      <p className="mt-3.5 max-w-none text-meta text-navy-200">
        Agents can browse now. Nothing can be bought until your payout account is connected.
      </p>
    </div>
  );
}

type CatalogueProps = {
  rows: Product[];
  status: IngestStatus;
  progress: IngestProgress | null;
  hasMore: boolean;
  busy: boolean;
  onLoadMore: () => void;
  onEdit: (uuid: string | null) => void;
};

function Catalogue({ rows, status, progress, ...rest }: CatalogueProps) {
  if (rows.length > 0) return <FoundTable rows={rows} scanning={status === "running"} {...rest} />;
  if (status === "loading") return null;
  if (status === "running") return <Reading />;
  return status === "idle" ? (
    <NeverScanned onAdd={() => rest.onEdit(null)} />
  ) : (
    <NothingFound progress={progress} />
  );
}

function FoundTable({
  rows,
  scanning,
  hasMore,
  busy,
  onLoadMore,
  onEdit,
}: Omit<CatalogueProps, "status" | "progress"> & { scanning: boolean }) {
  const [arrived] = React.useState(() => new Set(rows.map((row) => row.uuid)));

  const ready = rows.filter(
    (row) => detailsFor(row).present === REQUIRED_DETAILS.length && row.in_stock !== false
  ).length;

  return (
    <Panel className="flex flex-col xl:min-h-0 xl:flex-1">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h2 className="text-card-title">What we found</h2>
        <div className="flex items-center gap-3">
          <span className="text-meta text-muted-ink">
            {ready} of {rows.length} ready to sell{scanning ? " · still reading" : ""}
          </span>
          <Button variant="outline" className="h-9 px-4" onClick={() => onEdit(null)}>
            <PlusIcon />
            Add product
          </Button>
        </div>
      </div>

      <div className="@container mt-3 max-h-120 overflow-auto xl:max-h-none xl:min-h-0 xl:flex-1">
        <div className="grid gap-panel @[42.5rem]:min-w-170">
          <div
            className={cn(
              "sticky top-0 z-10 hidden bg-panel px-4 pb-2.5 text-table-head uppercase text-muted-ink",
              COLUMNS
            )}
          >
            <div>
              <span className="sr-only">image</span>
            </div>
            <div>sku</div>
            <div className="text-right">price</div>
            <div>product</div>
            <div>what we recovered</div>
          </div>
          {rows.map((p) => {
            const { present, missing } = detailsFor(p);
            return (
              <RowButton
                key={p.uuid}
                onClick={() => p.uuid && onEdit(p.uuid)}
                aria-label={`Edit ${p.title}`}
                className={cn(
                  "flex flex-wrap items-center gap-x-2.5 gap-y-2 hover:bg-faint",
                  !arrived.has(p.uuid) && "animate-row-in",
                  COLUMNS
                )}
              >
                <ProductThumb src={p.image_url || null} alt={p.title} />
                <span className="min-w-0 flex-1 text-dense @[42.5rem]:order-4 @[42.5rem]:flex-none">
                  {p.title}
                </span>
                <div className="text-meta text-muted-ink @[42.5rem]:order-2">{p.sku || "—"}</div>
                <div className="font-medium tabular-nums @[42.5rem]:order-3 @[42.5rem]:text-right">
                  {p.price_paise ? rupees(p.price_paise, p.currency) : "—"}
                </div>
                <div className="w-full @[42.5rem]:order-5 @[42.5rem]:w-auto">
                  <BarMeter
                    present={present}
                    inStock={p.in_stock}
                    detail={missing || `all ${REQUIRED_DETAILS.length} recovered`}
                  />
                </div>
              </RowButton>
            );
          })}

          {hasMore ? <LoadMore busy={busy} onLoadMore={onLoadMore} /> : null}
        </div>
      </div>
    </Panel>
  );
}

function Reading() {
  return (
    <Panel className="flex items-center justify-center xl:min-h-0 xl:flex-1">
      <p className="max-w-100 text-center text-body text-muted-ink">
        Reading your sitemap. Products appear here as each page is parsed.
      </p>
    </Panel>
  );
}

function NeverScanned({ onAdd }: { onAdd: () => void }) {
  return (
    <Panel className="flex flex-col items-center justify-center gap-2 text-center xl:min-h-0 xl:flex-1">
      <h2 className="text-panel">Nothing scanned yet</h2>
      <p className="max-w-110 text-body text-muted-ink">
        Enter your storefront URL above. Munim reads your sitemap, parses the product markup
        your pages already publish, and lists what it finds here.
      </p>
      <Button variant="outline" className="mt-2 h-10.5 px-4.5" onClick={onAdd}>
        <PlusIcon />
        Add one by hand
      </Button>
    </Panel>
  );
}

function HowToReadBars() {
  return (
    <Panel className="flex flex-col xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
      <h2 className="text-card-title">How to read the bars</h2>
      <p className="mt-1.5 max-w-none text-meta text-muted-ink">
        Six bars, one per detail an agent needs before it can transact:{" "}
        <b className="font-medium text-foreground">{REQUIRED_DETAILS.join(", ")}</b>. All six
        filled means the item sells on its own. A gap means a person confirms that field first —
        the item stays visible to agents, it just can&apos;t be bought yet.
      </p>
      <div className="mt-3.5 grid gap-2.5 rounded-lg bg-panel-2 p-4 xl:mt-auto">
        {[6, 5, 4].map((n) => (
          <BarMeter key={n} present={n} />
        ))}
        <p className="max-w-none text-meta text-muted-ink">Your policy requires all six.</p>
      </div>
    </Panel>
  );
}

function NothingFound({ progress }: { progress: IngestProgress | null }) {
  return (
    <Panel className="xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
      {progress && progress.total > 0 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-allow-tint px-3.5 py-1.5 text-meta font-medium text-allow">
            ✓ sitemap.xml · {progress.total} urls
          </span>
          <span className="rounded-full bg-step-tint px-3.5 py-1.5 text-meta font-medium text-step">
            0 products parsed
          </span>
          <span className="rounded-full bg-step-tint px-3.5 py-1.5 text-meta font-medium text-step">
            {progress.skipped} skipped
          </span>
        </div>
      ) : null}
      <h2 className="max-w-150 text-panel">
        Your sitemap reads fine. Your product pages publish no structured markup.
      </h2>
      <p className="mt-2.5 text-body text-muted-ink">
        Munim only reads schema.org/Product JSON-LD — it never scrapes page HTML, because a
        general-purpose crawler is the failure mode this can&apos;t afford. Two ways forward, both
        leave your store exactly as it is.
      </p>
      <div className="mt-5 grid gap-3.5 md:grid-cols-2">
        <div className="rounded-lg bg-panel-2 p-5">
          <h3 className="text-card-title">Upload a product feed</h3>
          <p className="mt-1.5 max-w-none text-meta text-muted-ink">
            A Google or Meta feed, or any CSV export. A feed you authored scores higher than markup
            read off a page.
          </p>
          <Button className="mt-4 h-10.5 px-4.5">Choose file</Button>
        </div>
        <div className="rounded-lg bg-panel-2 p-5">
          <h3 className="text-card-title">Add one JSON-LD block</h3>
          <p className="mt-1.5 max-w-none text-meta text-muted-ink">
            A single script tag in your product template. We&apos;ll email the snippet to your
            developer.
          </p>
          <Button variant="outline" className="mt-4 h-10.5 px-4.5">
            Send instructions
          </Button>
        </div>
      </div>
    </Panel>
  );
}
