"use client";

import { Button } from "@/components/ui/button";
import type { IngestProgress, IngestStatus } from "@/hooks/use-ingest";
import type { IngestRequest } from "@/src/client";

/**
 * The scan control from S1a, wired to `POST /ingest/`.
 *
 * The design animates a staged reveal — probe robots.txt, then the sitemap, then rows
 * appearing one by one. That reveal is now real: the bar below tracks the job's own
 * `processed`/`total`, and the rows in the table beside it arrive on the same SSE stream
 * that moves it. Nothing here advances on a timer.
 */
export function ScanPanel({
  domain,
  progress,
  status,
  onScan,
}: {
  domain: string;
  progress: IngestProgress | null;
  status: IngestStatus;
  onScan: (body: IngestRequest) => void;
}) {
  const scanning = status === "running";

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onScan({
      source: String(form.get("source") ?? ""),
      match: String(form.get("match") ?? ""),
      // 0 is the API's "no cap", and an empty field means the merchant asked for no cap.
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
            placeholder="https://shoprabistha.com"
            className="h-11 min-w-0 rounded-full bg-panel-2 px-5 text-body outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
          />
        </label>

        {/* Both optional, and narrow so the URL keeps the visual weight — they are
            refinements to a scan, not a second decision to make before the first one. */}
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
      </form>

      {progress ? <Progress progress={progress} scanning={scanning} /> : null}
    </div>
  );
}

/**
 * Live counters, moved by the job's own `progress` events — one per page read, plus one
 * the moment discovery lands `total`.
 *
 * `total` is 0 for the short window before that, so the bar shows a stub rather than a
 * fake 0%. The stub and the floor below it are the same 2% so the bar only ever grows:
 * a wider stub would animate *backwards* on the first real reading, which reads as a
 * glitch rather than as progress.
 */
function Progress({ progress, scanning }: { progress: IngestProgress; scanning: boolean }) {
  const { processed, total, created, updated, skipped } = progress;
  const pct = total > 0 ? Math.round((processed / total) * 100) : 0;
  const width = total > 0 ? `${Math.max(pct, 2)}%` : scanning ? "2%" : "0%";

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-meta font-medium">
          {total > 0 ? `${processed} of ${total} pages read` : "Discovering pages…"}
        </span>
        <span className="text-meta text-muted-ink tabular-nums">
          {created} new · {updated} updated · {skipped} skipped
        </span>
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-track"
        role="progressbar"
        aria-valuenow={total > 0 ? pct : undefined}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Scan progress"
      >
        <div
          className="h-full rounded-full bg-bar-1 transition-[width] duration-500 ease-out"
          style={{ width }}
        />
      </div>
    </div>
  );
}
