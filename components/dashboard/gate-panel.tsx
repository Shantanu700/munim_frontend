"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";

import { ArrowRightIcon } from "lucide-react";

import { callerOf, moment, Panel, Row, rupees, VerdictPill } from "@/components/dashboard/parts";
import { describeApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { getAuditEntries, type LedgerEntry } from "@/src/client";

/** Shared column template so the gate rows line up with nothing above them by accident. */
const GATE_COLUMNS = "grid-cols-[124px_1fr_118px_300px_92px]";

/** A preview, not the table. The ledger screen is one click away and pages properly. */
const PREVIEW = 5;

const TALLIES = [
  { decision: "ALLOW", label: "allow", className: "bg-allow-tint text-allow" },
  { decision: "STEP_UP", label: "step up", className: "bg-step-tint text-step" },
  { decision: "DENY", label: "deny", className: "bg-deny-tint text-deny" },
] as const;

/**
 * Overview's gate section: the newest decisions and the running tally by verdict.
 *
 * A client island rather than part of `overview.tsx`, which stays a server component — the
 * `sessionid` cookie belongs to the API origin, so nothing rendered on the server can ask
 * the ledger anything.
 *
 * The counts are all-time and cannot be otherwise: `/audit/entries` takes no date filter, and
 * `GET /policy/overview/`'s tiles carry only `refused_30d` / `step_ups_30d` — no ALLOW count,
 * and the wrong window. So this panel does not claim a period, and the three tallies are
 * printed as three facts rather than as a breakdown of a total they cannot sum to: `CONFIG`
 * entries (policy edits, credential writes) are on the same chain.
 */
export function GatePanel() {
  const [rows, setRows] = React.useState<LedgerEntry[]>([]);
  const [tallies, setTallies] = React.useState<Record<string, number>>({});

  React.useEffect(() => {
    // ponytail: four reads for three counts, because no aggregate endpoint exists — a
    // `page_size: 1` response is fetched purely for its `count`. Collapse to one call if the
    // backend ever adds decision totals to a summary response. `Promise.all` is safe here
    // where the policy screen's rule writes are sequential: these are all reads, and it is
    // *writes* that queue on `LedgerEntry.append`'s row lock.
    Promise.all([
      getAuditEntries({ query: { page_size: PREVIEW } }),
      ...TALLIES.map((t) => getAuditEntries({ query: { page_size: 1, decision: t.decision } })),
    ])
      .then(([newest, ...counts]) => {
        if (!newest.data) {
          // A buyer, or a merchant row that was never created. The panel renders its empty
          // line; the view's own sentence says why better than this could.
          toast.error(describeApiError(newest.error));
          return;
        }
        setRows(newest.data.results);
        setTallies(
          Object.fromEntries(
            counts.map(({ data }, i) => [TALLIES[i].decision, data?.count ?? 0])
          )
        );
      })
      // Silent: the tiles and charts above this arrived, and a failing preview must not
      // announce itself over a screen whose real content loaded.
      .catch(() => {});
  }, []);

  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div>
          <h2 className="text-card-title">The gate</h2>
          <p className="mt-0.5 text-meta text-muted-ink">
            Every decision, refusals included, appended to a hash-chained ledger.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-panel">
          {TALLIES.map((t) => (
            <span
              key={t.decision}
              className={cn("rounded-full px-3.5 py-1.5 text-meta font-medium", t.className)}
            >
              {tallies[t.decision] ?? 0} {t.label}
            </span>
          ))}
          <Link
            href="/dashboard/ledger"
            className="ml-1.5 flex items-center gap-1.5 text-meta font-medium text-accent-ink"
          >
            Open ledger <ArrowRightIcon className="size-3.5" />
          </Link>
        </div>
      </div>

      {/* The reason column is fixed-width by design (§7 is desktop-first at 1440), so
          below that the list scrolls rather than crushing the panel around it. */}
      <div className="mt-4.5 overflow-x-auto">
        <div className="grid min-w-220 gap-2.5">
          {rows.map((row) => (
            <Row key={row.seq} className={cn("grid items-center gap-2.5 px-4.5", GATE_COLUMNS)}>
              <VerdictPill verdict={row.decision} />
              <div>
                <div className="text-body">{row.action.replace(/_/g, " ")}</div>
                <div className="mt-0.5 text-meta text-muted-ink">
                  {/* `callerOf` is blank for a merchant action, which is most of the chain,
                      so the separator goes with it rather than leading the line. */}
                  {[callerOf(row), moment(row.at)].filter(Boolean).join(" · ")}
                </div>
              </div>
              <div className="text-right font-medium tabular-nums">
                {row.amount_paise === null ? "—" : rupees(row.amount_paise)}
              </div>
              <div>
                <div className="text-meta font-medium tracking-[0.03em]">{row.reason_code}</div>
                {/* Only the gate's own verdicts carry a sentence; `describe()` answers "" for
                    every other code, and an empty div would still take its margin. */}
                {row.reason_description ? (
                  <div className="mt-0.5 max-w-none text-meta text-muted-ink">
                    {row.reason_description}
                  </div>
                ) : null}
              </div>
              <div className="text-right text-meta text-muted-ink">entry {row.seq}</div>
            </Row>
          ))}
          {rows.length ? null : (
            <p className="max-w-none py-4 text-meta text-muted-ink">
              No decisions on the ledger yet.
            </p>
          )}
        </div>
      </div>
    </Panel>
  );
}
