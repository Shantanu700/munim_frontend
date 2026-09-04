"use client";

import { CopyIcon } from "lucide-react";

import { CopyButton } from "@/components/dashboard/copy-button";
import { ExportChainButton } from "@/components/dashboard/export-chain";
import { LoadMore } from "@/components/dashboard/load-more";
import { callerOf, moment, Panel, Row, rupees, VerdictPill } from "@/components/dashboard/parts";
import { useSession } from "@/components/dashboard/session";
import { Button } from "@/components/ui/button";
import { useAudit, type Decision } from "@/hooks/use-audit";
import { API_BASE } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { LedgerEntry } from "@/src/client";

/** Shared by the header row and the entry rows so the columns line up. */
const COLUMNS = "grid-cols-[52px_120px_minmax(0,1fr)_100px_240px]";

const FILTERS: { label: string; decision: Decision | null }[] = [
  { label: "Everything", decision: null },
  { label: "Allow", decision: "ALLOW" },
  { label: "Step-up", decision: "STEP_UP" },
  { label: "Deny", decision: "DENY" },
];

/** A 64-hex digest, short enough for a table cell. The copy button still yields all of it. */
const short = (hash: string) => `${hash.slice(0, 12)}…`;

/**
 * What happened, in one line: the action, who asked, and for whom.
 *
 * Every segment can legitimately be blank — `agent` and `buyer_label` are `""` rather than
 * `null`, since the view coerces with `detail.get(…) or ""` — so this filters on falsiness
 * and drops the separators with them. Most of a real chain is merchant actions with neither.
 */
function eventLine(row: LedgerEntry) {
  return [row.action.replace(/_/g, " "), callerOf(row), row.buyer_label]
    .filter(Boolean)
    .join(" · ");
}

/** An amount the entry did not record is not zero: an early denial never reached a price. */
const amountOf = (paise: number | null) => (paise === null ? "—" : rupees(paise));

/**
 * One value out of the raw `detail` blob. Every key is optional and the set differs per
 * action — entries are permanent, so rows written before a key existed still render — which
 * is why this formats by key *shape* rather than from a label map. A map would need a
 * frontend release for every key the engine learns to write.
 */
function detailValue(key: string, value: unknown) {
  if (value === null || value === undefined) return "—";
  if (key.endsWith("_paise") && typeof value === "number") return rupees(value);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * The audit ledger.
 *
 * Live: `GET /audit/entries` paginated on `seq` descending, one entry opened through
 * `GET /audit/entries/{seq}` for its chain position, and the public `GET /audit/verify`
 * re-hashing the whole chain.
 *
 * A client component because the whole screen is one interaction: the filter pills and the
 * selected row both drive what the inspector on the right shows. The page above it stays a
 * server component so it can await `?seq=` — see `app/dashboard/ledger/page.tsx`.
 *
 * `seq` is the entry to open, which is how an order links to the decision that allowed it.
 */
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
  // The response carries its own `seq`, so a detail still in flight — or one left over from
  // the previously selected row — is simply not shown against the wrong entry.
  const position = detail?.seq === inspecting ? detail : null;
  /**
   * What the rail describes. A linked entry can sit below every page loaded, in which case
   * there is no row for it — and `LedgerEntryDetail` is a superset of `LedgerEntry`, so the
   * fetched detail draws the whole rail on its own rather than paging down to find it.
   */
  const shown = entry ?? position;
  const denied = rows.filter((row) => row.decision === "DENY").length;

  return (
    <div className="grid gap-panel xl:h-full xl:grid-cols-[1fr_420px] xl:grid-rows-[auto_auto_minmax(0,1fr)]">
      {/* Both actions live in the navy card beside this, which is also where the result of a
          verification reports — a second pair up here only duplicated them. */}
      <div className="px-1.5 py-1 xl:col-start-1 xl:row-start-1">
        <h1 className="text-page-title">Audit ledger</h1>
        <p className="mt-1 text-body text-muted-ink">
          Every decision the gate made, in an order nobody can rewrite.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 px-1.5 xl:col-start-1 xl:row-start-2">
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

      {/* `xl:contents` rather than a nested grid: the two panels have to be items of the
          outer grid so the rail can start at row 1, level with the page title, while the
          table stays under the filters. Below xl this is still the plain stack it was. */}
      <div className="grid gap-panel xl:contents">
        <Panel className="flex flex-col xl:col-start-1 xl:row-start-3 xl:min-h-0">
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

              {/* Inside the scroller, so it sits at the foot of the list rather than pinned
                  under a card nobody has scrolled to the end of. */}
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

        {/* The rail itself no longer scrolls: the navy card keeps its natural height and the
            inspector below it takes exactly what is left, scrolling its own detail list. */}
        <div className="flex flex-col gap-panel xl:col-start-2 xl:row-span-3 xl:row-start-1 xl:min-h-0">
          <div className="shrink-0 rounded-xl bg-navy-900 p-6 text-navy-050 shadow-card">
            <h2 className="text-panel">Anyone can check this</h2>
            <div className="mt-2 text-meta break-all">GET {verifyUrl}</div>
            {/* Nothing until the check on mount resolves — a pill claiming a verification
                that has not happened is worse than no pill. */}
            {chain ? (
              <div className="mt-4 inline-flex rounded-full bg-navy-200/16 px-3.5 py-2 text-meta font-medium">
                {chain.result.ok
                  ? `ok: true · ${chain.result.verified} verified`
                  : `broken at entry ${chain.result.broken_at_seq} · ${chain.result.verified} verified before it`}{" "}
                · checked {moment(chain.at.toISOString())}
              </div>
            ) : null}
            {/* Colours are carried on the buttons themselves: this card is navy in both
                themes, so neither the default nor the outline variant's surface tokens fit. */}
            <div className="mt-3.5 flex flex-wrap gap-2.5">
              <Button
                className="h-11 flex-1 bg-navy-200 text-navy-900 hover:bg-navy-200/85"
                disabled={verifying}
                onClick={verify}
              >
                Verify chain now
              </Button>
              <ExportChainButton className="h-11 flex-1 border-navy-200/30 bg-transparent text-navy-050 hover:bg-navy-200/16 hover:text-navy-050 dark:hover:bg-navy-200/16" />
            </div>
            <p className="mt-3.5 max-w-none text-meta text-navy-200">
              A break returns the sequence number where it happened and how many entries verified
              before it.
            </p>
          </div>
          {shown ? (
            <Panel className="flex grow flex-col xl:min-h-0">
              <div className="flex items-center justify-between gap-3">
                <VerdictPill verdict={shown.decision} />
                <span className="text-eyebrow uppercase text-muted-ink">entry {shown.seq}</span>
              </div>
              {/* Only when the entry is not one of the rows on the left — a link from an
                  order lands on an entry that may be a thousand decisions back. */}
              {entry ? null : (
                <p className="mt-2.5 max-w-none text-meta text-muted-ink">
                  Opened from a link. This entry is older than the ones listed beside it.
                </p>
              )}
              <h2 className="mt-4 text-accent-ink break-all">{shown.reason_code}</h2>
              {/* Blank for most codes, and that is the backend's design, not a gap: only the
                  gate's verdicts have a sentence, and `describe()` returns "" for anything
                  else so that a code a later release retires still renders. An empty <p>
                  would leave its margin behind, so it is not rendered at all. */}
              {shown.reason_description ? (
                <p className="mt-2 max-w-none text-body text-muted-ink">
                  {shown.reason_description}
                </p>
              ) : null}

              <div className="mt-4 grid gap-panel">
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

              {/* What was hashed. The keys differ per action and every one is optional, so
                  they are printed as the engine wrote them rather than relabelled. */}
              {position && Object.keys(position.detail).length ? (
                <>
                  <div className="mt-4 text-eyebrow uppercase text-muted-ink">recorded detail</div>
                  {/* The one part of the rail that scrolls. The blob is unbounded — a
                      checkout can record a dozen keys — and everything above it is fixed,
                      so the panel keeps the height the rail gives it. */}
                  <div className="mt-2.5 grid gap-panel xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
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
            </Panel>
          ) : null}

          
        </div>
      </div>
    </div>
  );
}

/**
 * Whichever of the three zero-row states is true. An early-return chain rather than sibling
 * ternaries, and `loading` renders nothing at all — a spinner on first paint only flashes.
 *
 * "Nothing at all" and "nothing matching" are different sentences on purpose: a merchant
 * whose gate has decided nothing yet should not be told about a filter they never set.
 */
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
