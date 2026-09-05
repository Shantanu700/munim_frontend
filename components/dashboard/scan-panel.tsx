"use client";

import { Button } from "@/components/ui/button";
import type { IngestProgress, IngestStatus } from "@/hooks/use-ingest";
import type { IngestRequest } from "@/src/client";

export function ScanPanel({
  domain,
  progress,
  status,
  onScan,
  onCancel,
}: {
  domain: string;
  progress: IngestProgress | null;
  status: IngestStatus;
  onScan: (body: IngestRequest) => void;
  onCancel: () => void;
}) {
  const scanning = status === "running";

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onScan({
      source: String(form.get("source") ?? ""),
      match: String(form.get("match") ?? ""),
      limit: Number(form.get("limit") || 0),
    });
  }

  return (
    <div>
      <form className="flex flex-wrap items-end gap-2.5" onSubmit={submit}>
        <label className="flex min-w-60 flex-1 flex-col gap-1.5">
          <span className="px-1 text-eyebrow uppercase text-muted-ink">Storefront URL</span>
          <input
            name="source"
            type="url"
            required
            defaultValue={domain ? `https://${domain}` : ""}
            placeholder="https://yourstore.com"
            className="h-11 min-w-0 rounded-full bg-panel-2 px-5 text-body outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
          />
        </label>

        <label className="flex w-32 flex-col gap-1.5">
          <span className="px-1 text-eyebrow uppercase text-muted-ink">Match</span>
          <input
            name="match"
            placeholder="/products/"
            className="h-11 w-full min-w-0 rounded-full bg-panel-2 px-4 text-body outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
          />
        </label>

        <label className="flex w-24 flex-col gap-1.5">
          <span className="px-1 text-eyebrow uppercase text-muted-ink">Limit</span>
          <input
            name="limit"
            type="number"
            min={0}
            placeholder="all"
            className="h-11 w-full min-w-0 rounded-full bg-panel-2 px-4 text-body tabular-nums outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
          />
        </label>

        <Button type="submit" disabled={scanning} className="h-11 px-5">
          {scanning ? "Reading…" : "Make agent-readable"}
        </Button>

        {scanning ? (
          <Button type="button" variant="outline" onClick={onCancel} className="h-11 px-5">
            Stop
          </Button>
        ) : null}
      </form>

      {progress ? <Progress progress={progress} status={status} /> : null}
    </div>
  );
}

function Progress({ progress, status }: { progress: IngestProgress; status: IngestStatus }) {
  const { processed, total, created, updated, skipped } = progress;
  const scanning = status === "running";
  const pct = total > 0 ? Math.round((processed / total) * 100) : 0;
  const discovering = total === 0 && scanning;

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-meta font-medium">
          {scanning
            ? total > 0
              ? `${processed} of ${total} pages read`
              : "Discovering pages…"
            : `${status === "cancelled" ? "Stopped. " : ""}${processed} pages read`}
        </span>
        <span className="text-meta text-muted-ink tabular-nums">
          {created} new · {updated} updated · {skipped} skipped
        </span>
      </div>
      {scanning || status === "succeeded" ? (
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-track"
          role="progressbar"
          aria-valuenow={total > 0 ? pct : undefined}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Scan progress"
        >
          {discovering ? (
            <div className="h-full w-1/4 animate-sweep rounded-full bg-bar-1 motion-reduce:hidden" />
          ) : (
            <div
              className="h-full rounded-full bg-bar-1 transition-[width] duration-500 ease-out"
              style={{ width: total > 0 ? `${Math.max(pct, 2)}%` : "0%" }}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
