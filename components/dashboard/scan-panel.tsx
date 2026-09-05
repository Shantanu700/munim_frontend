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
            placeholder="https://yourstore.com"
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

        {/* Only while a run is in flight — a Stop that is dead most of the time reads as a
            control that is broken. Products already read are kept, so this is not destructive
            and needs no confirm. */}
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

/**
 * Live counters, moved by the job's own `progress` events — one per page read, plus one
 * the moment discovery lands `total`.
 *
 * `total` is 0 for the window before that, and that window can be long — discovery walks
 * robots.txt and a sitemap before it can say how many pages there are. A bar parked at a
 * 2% stub for thirty seconds reads as a stall, so the unknown-length case gets the one
 * honest shape for it: an indeterminate sweep, which claims a size for nothing. The
 * determinate bar takes over the moment `total` lands, and its floor is 2% so it only
 * ever grows.
 *
 * A run that ends early — the merchant pressed Stop, or the socket dropped — keeps the
 * counters and loses the bar. A track parked at 30% is a claim that the remaining 70% is
 * still coming, which after a cancel is the one thing that will never happen; and "Discovering
 * pages…" over an empty track is the same lie in the case where `total` never landed at all.
 * The counters are still facts, so they stay.
 */
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
            // A quarter-width segment crossing the track: the only claim it makes is that
            // work is happening, which is the only claim there is anything to back up yet.
            // `motion-reduce:hidden` rather than a frozen segment — a still bar sitting at
            // 25% would be a number nobody measured. The line above still says "Discovering
            // pages…", so the state is reported either way.
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
