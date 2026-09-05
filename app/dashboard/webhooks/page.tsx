"use client";

import * as React from "react";
import { toast } from "sonner";

import { LoadMore } from "@/components/dashboard/load-more";
import { moment, Panel, Row } from "@/components/dashboard/parts";
import { cn } from "@/lib/utils";
import { describeApiError } from "@/lib/api";
import { getWebhooksHits, type WebhookHit } from "@/src/client";

const PAGE_SIZE = 20;

const COLUMNS = "grid-cols-[9.5rem_1fr_8rem_8rem_11rem]";

export default function WebhookHitsPage() {
  const [rows, setRows] = React.useState<WebhookHit[]>([]);
  const [count, setCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const page = React.useRef(1);

  const load = React.useCallback(
    (next: number) =>
      getWebhooksHits({ query: { page: next, page_size: PAGE_SIZE } })
        .then(({ data, error }) => {
          setLoading(false);
          if (!data) {
            toast.error(describeApiError(error));
            return;
          }
          page.current = next;
          setCount(data.count);
          setRows((current) => (next === 1 ? data.results : [...current, ...data.results]));
        })
        .catch(() => {
          setLoading(false);
          toast.error("Could not reach the server. Check your connection and try again.");
        }),
    []
  );

  React.useEffect(() => {
    load(1);
  }, [load]);

  const loadMore = React.useCallback(async () => {
    setBusy(true);
    await load(page.current + 1);
    setBusy(false);
  }, [load]);

  return (
    <div className="grid gap-panel">
      <div className="px-1.5 py-1">
        <h1 className="text-page-title">Webhook responses</h1>
        <p className="mt-1 text-body text-muted-ink">
          Every call Razorpay made to your webhook address, and what Munim did with it.
        </p>
      </div>

      <Panel className="flex flex-col">
        <div className="overflow-auto">
          <div className="grid min-w-195 gap-panel">
            <div
              className={cn(
                "sticky top-0 z-10 grid gap-2.5 bg-panel px-3.5 pb-3 text-table-head uppercase text-muted-ink",
                COLUMNS
              )}
            >
              <div>received</div>
              <div>event</div>
              <div>outcome</div>
              <div>signature</div>
              <div>razorpay event id</div>
            </div>

            {rows.map((hit, i) => (
              <Row
                key={hit.uuid ?? `${hit.received_at}-${i}`}
                className={cn("grid items-center gap-2.5", COLUMNS)}
              >
                <span className="text-meta text-muted-ink">{moment(hit.received_at)}</span>
                <span className="text-dense">{hit.event_type || "not stated"}</span>
                <span className="text-meta font-medium tracking-[0.03em]">{hit.outcome}</span>
                <span className="text-dense">
                  {hit.signature_valid === null || hit.signature_valid === undefined
                    ? "not checked"
                    : hit.signature_valid
                      ? "valid"
                      : "did not match"}
                </span>
                <span className="truncate text-meta text-muted-ink">
                  {hit.razorpay_event_id || "—"}
                </span>
                {hit.error_detail ? (
                  <span className="col-span-full text-meta text-muted-ink">
                    {hit.error_detail}
                  </span>
                ) : null}
              </Row>
            ))}

            {rows.length === 0 ? (
              <div className="px-3.5 py-10 text-center text-body text-muted-ink">
                {loading
                  ? "Loading…"
                  : "No webhook calls received yet. Send a test event from the Razorpay screen to check the address is reachable."}
              </div>
            ) : null}

            {rows.length < count ? <LoadMore busy={busy} onLoadMore={loadMore} /> : null}
          </div>
        </div>

        {rows.length ? (
          <div className="mt-4 shrink-0 px-3.5 text-meta text-muted-ink">
            {rows.length} of {count} calls loaded. A call whose signature did not match was
            rejected and changed nothing in your store.
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
