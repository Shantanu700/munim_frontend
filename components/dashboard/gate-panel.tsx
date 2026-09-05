"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";

import { ArrowRightIcon } from "lucide-react";

import { callerOf, moment, Panel, Row, rupees, VerdictPill } from "@/components/dashboard/parts";
import { describeApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { getAuditEntries, type LedgerEntry } from "@/src/client";

const GATE_COLUMNS = "grid-cols-[124px_1fr_118px_300px_92px]";

const PREVIEW = 5;

const TALLIES = [
  { decision: "ALLOW", label: "allow", className: "bg-allow-tint text-allow" },
  { decision: "STEP_UP", label: "step up", className: "bg-step-tint text-step" },
  { decision: "DENY", label: "deny", className: "bg-deny-tint text-deny" },
] as const;

export function GatePanel() {
  const [rows, setRows] = React.useState<LedgerEntry[]>([]);
  const [tallies, setTallies] = React.useState<Record<string, number>>({});

  React.useEffect(() => {
    Promise.all([
      getAuditEntries({ query: { page_size: PREVIEW } }),
      ...TALLIES.map((t) => getAuditEntries({ query: { page_size: 1, decision: t.decision } })),
    ])
      .then(([newest, ...counts]) => {
        if (!newest.data) {
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

      <div className="mt-4.5 overflow-x-auto">
        <div className="grid min-w-220 gap-2.5">
          {rows.map((row) => (
            <Row key={row.seq} className={cn("grid items-center gap-2.5 px-4.5", GATE_COLUMNS)}>
              <VerdictPill verdict={row.decision} />
              <div>
                <div className="text-body">{row.action.replace(/_/g, " ")}</div>
                <div className="mt-0.5 text-meta text-muted-ink">
                  {[callerOf(row), moment(row.at)].filter(Boolean).join(" · ")}
                </div>
              </div>
              <div className="text-right font-medium tabular-nums">
                {row.amount_paise === null ? "—" : rupees(row.amount_paise)}
              </div>
              <div>
                <div className="text-meta font-medium tracking-[0.03em]">{row.reason_code}</div>
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
