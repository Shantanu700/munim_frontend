"use client";

import { CopyIcon } from "lucide-react";

import { CopyButton } from "@/components/dashboard/copy-button";
import { ExportChainButton } from "@/components/dashboard/export-chain";
import { LoadMore } from "@/components/dashboard/load-more";
import { callerOf, moment, Panel, Row, rupees, VerdictPill } from "@/components/dashboard/parts";
import { useSession } from "@/components/dashboard/session";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useAudit, type Decision } from "@/hooks/use-audit";
import { API_BASE } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { LedgerEntry, LedgerEntryDetail } from "@/src/client";

const COLUMNS = "grid-cols-[52px_120px_minmax(0,1fr)_100px_240px]";

const BROKEN_TINT = "bg-red-600/10 text-red-600 dark:bg-red-500/15 dark:text-red-400";

const FILTERS: { label: string; decision: Decision | null }[] = [
  { label: "Everything", decision: null },
  { label: "Allow", decision: "ALLOW" },
  { label: "Step-up", decision: "STEP_UP" },
  { label: "Deny", decision: "DENY" },
];

const short = (hash: string) => `${hash.slice(0, 12)}…`;

function eventLine(row: LedgerEntry) {
  return [row.action.replace(/_/g, " "), callerOf(row), row.buyer_label]
    .filter(Boolean)
    .join(" · ");
}

const amountOf = (paise: number | null) => (paise === null ? "—" : rupees(paise));

function detailValue(key: string, value: unknown) {
  if (value === null || value === undefined) return "—";
  if (key.endsWith("_paise") && typeof value === "number") return rupees(value);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function Ledger({ seq }: { seq?: number }) {
  const domain = useSession().merchant?.domain ?? "";
  const {
    rows,
    remaining,
    loading,
    busy,
    filter,
    setFilter,
    entry,
    inspecting,
    select,
    detail,
    chain,
    verifying,
    verify,
    loadMore,
  } = useAudit(domain, seq);

  const verifyUrl = `${API_BASE}/audit/verify${domain ? `?merchant=${domain}` : ""}`;
  const position = detail?.seq === inspecting ? detail : null;
  const shown = entry ?? position;
  const denied = rows.filter((row) => row.decision === "DENY").length;

  return (
    <div className="grid gap-panel xl:h-full xl:grid-rows-[auto_auto_minmax(0,1fr)]">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 px-1.5 py-1">
        <div>
          <h1 className="text-page-title">Audit ledger</h1>
          <p className="mt-1 text-body text-muted-ink">
            Every decision the gate made, in an order nobody can rewrite.
          </p>
        </div>
        <div className="flex flex-wrap gap-panel">
          <Button className="h-11 px-5" disabled={verifying} onClick={verify}>
            Verify chain now
          </Button>
          <ExportChainButton className="h-11" />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 px-1.5">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.label}
              type="button"
              aria-pressed={filter === f.decision}
              onClick={() => setFilter(f.decision)}
              className={cn(
                "h-9 cursor-pointer rounded-full px-5 text-dense font-medium transition-colors",
                filter === f.decision
                  ? "bg-primary text-primary-foreground"
                  : "bg-panel text-foreground hover:bg-panel-2"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-3 gap-y-1.5">
          {chain ? (
            <span
              className={cn(
                "rounded-full px-3.5 py-1.5 text-meta font-medium",
                chain.result.ok ? "bg-allow-tint text-allow" : BROKEN_TINT
              )}
            >
              {chain.result.ok
                ? `ok: true · ${chain.result.verified} verified`
                : `broken at entry ${chain.result.broken_at_seq} · ${chain.result.verified} verified before it`}{" "}
              · checked {moment(chain.at.toISOString())}
            </span>
          ) : null}
          <span className="min-w-0 text-meta text-muted-ink break-all">
            Anyone can check this: GET {verifyUrl}
          </span>
        </div>
      </div>

      <Panel className="flex flex-col xl:min-h-0">
        <div className="overflow-auto xl:min-h-0 xl:flex-1">
          <div className="grid min-w-195 gap-panel">
            <div
              className={cn(
                "sticky top-0 z-10 grid gap-2.5 bg-panel px-3.5 pb-3 text-table-head uppercase text-muted-ink",
                COLUMNS
              )}
            >
              <div>seq</div>
              <div>decision</div>
              <div>action</div>
              <div className="text-right">amount</div>
              <div>reason code</div>
            </div>

            {rows.map((row) => (
              <button
                key={row.seq}
                type="button"
                aria-pressed={shown?.seq === row.seq}
                onClick={() => select(row.seq)}
                className={cn(
                  "grid cursor-pointer items-center gap-2.5 rounded-md px-3.5 py-3.5 text-left transition-colors",
                  COLUMNS,
                  shown?.seq === row.seq ? "bg-track" : "bg-panel-2 hover:bg-track/60"
                )}
              >
                <span className="text-meta tabular-nums text-muted-ink">{row.seq}</span>
                <span>
                  <VerdictPill verdict={row.decision} />
                </span>
                <span>
                  <span className="block text-dense">{eventLine(row)}</span>
                  <span className="mt-0.5 block text-meta text-muted-ink">
                    {moment(row.at)} · {short(row.chain_hash)}
                  </span>
                </span>
                <span className="text-right font-medium tabular-nums">
                  {amountOf(row.amount_paise)}
                </span>
                <span className="text-meta font-medium tracking-[0.03em]">{row.reason_code}</span>
              </button>
            ))}

            <Empty rows={rows.length} loading={loading} filtered={filter !== null} />

            {remaining > 0 ? <LoadMore busy={busy} onLoadMore={loadMore} /> : null}
          </div>
        </div>

        {rows.length ? (
          <div className="mt-4 shrink-0 px-3.5 text-meta text-muted-ink">
            Refusals are {denied} of the {rows.length} entries loaded. None of them can be
            deleted.
          </div>
        ) : null}
      </Panel>

      <Drawer
        direction="right"
        open={shown !== null}
        onOpenChange={(open) => !open && select(null)}
      >
        <DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-xl">
          {shown ? <EntryDrawer shown={shown} entry={entry} position={position} /> : null}
        </DrawerContent>
      </Drawer>

    </div>
  );
}

function EntryDrawer({
  shown,
  entry,
  position,
}: {
  shown: LedgerEntry;
  entry: LedgerEntry | undefined;
  position: LedgerEntryDetail | null;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DrawerHeader className="gap-0 p-6 pb-0">
        <div className="flex items-center justify-between gap-3 pr-10">
          <VerdictPill verdict={shown.decision} />
          <span className="text-eyebrow uppercase text-muted-ink">entry {shown.seq}</span>
        </div>
        {entry ? null : (
          <p className="mt-2.5 max-w-none text-meta text-muted-ink">
            Opened from a link. This entry is older than the ones in the list behind it.
          </p>
        )}
        <DrawerTitle className="mt-4 text-accent-ink break-all">{shown.reason_code}</DrawerTitle>
        {shown.reason_description ? (
          <DrawerDescription className="mt-2 text-body text-muted-ink">
            {shown.reason_description}
          </DrawerDescription>
        ) : null}
      </DrawerHeader>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="grid gap-panel">
          {[
            ["Amount", amountOf(shown.amount_paise)],
            ["Agent", callerOf(shown) || "—"],
            ["Buyer", shown.buyer_label || "—"],
            ["Recorded", moment(shown.at)],
          ].map(([label, value]) => (
            <Row key={label} className="flex items-center justify-between gap-3 py-3">
              <span className="text-dense text-muted-ink">{label}</span>
              <span className="text-dense font-medium tabular-nums">{value}</span>
            </Row>
          ))}
        </div>

        <div className="mt-4 text-eyebrow uppercase text-muted-ink">chain position</div>
        <div className="mt-2.5 grid gap-panel">
          {[
            ["this entry", shown.chain_hash],
            ["hashes the one before", position?.prev_hash],
          ].map(([label, hash]) => (
            <Row key={label} className="flex items-center gap-3 py-2.5 pr-2.5">
              <span className="shrink-0 text-meta text-muted-ink">{label}</span>
              <span className="ml-auto truncate text-dense font-medium">
                {hash ? short(hash) : "…"}
              </span>
              {hash ? (
                <CopyButton
                  value={hash}
                  copiedLabel="Hash copied."
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Copy the hash for ${label}`}
                  className="shrink-0"
                >
                  <CopyIcon />
                </CopyButton>
              ) : null}
            </Row>
          ))}
        </div>

        {position && Object.keys(position.detail).length ? (
          <>
            <div className="mt-4 text-eyebrow uppercase text-muted-ink">recorded detail</div>
            <div className="mt-2.5 grid gap-panel">
              {Object.entries(position.detail).map(([key, value]) => (
                <Row key={key} className="flex items-baseline justify-between gap-3 py-2.5">
                  <span className="shrink-0 text-meta text-muted-ink">{key}</span>
                  <span className="min-w-0 text-right text-meta font-medium break-all">
                    {detailValue(key, value)}
                  </span>
                </Row>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Empty({ rows, loading, filtered }: { rows: number; loading: boolean; filtered: boolean }) {
  if (rows > 0 || loading) return null;
  return (
    <p className="max-w-none py-8 text-center text-body text-muted-ink">
      {filtered
        ? "No entries with that decision."
        : "Nothing on your ledger yet. Every decision the gate makes lands here, refusals included."}
    </p>
  );
}
