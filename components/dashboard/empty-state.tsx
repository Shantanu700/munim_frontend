import * as React from "react";

import { Panel } from "@/components/dashboard/parts";

/**
 * The S2b layout: one wide panel of copy beside a fixed 380px navy rail (DESIGN.md §7).
 * Both dashboard empties use it — the merchant who has not entered store details, and the
 * merchant whose gate is armed but has seen no agent yet.
 */
export function EmptyState({
  eyebrow,
  headline,
  body,
  actions,
  rail,
}: {
  eyebrow: string;
  headline: string;
  body: string;
  actions?: React.ReactNode;
  rail: React.ReactNode;
}) {
  return (
    <div className="grid gap-panel lg:grid-cols-[1fr_380px]">
      <Panel className="p-7">
        <div className="text-eyebrow uppercase text-muted-ink">{eyebrow}</div>
        <h2 className="mt-3 max-w-140 text-headline">{headline}</h2>
        <p className="mt-3 text-body text-muted-ink">{body}</p>
        {actions ? <div className="mt-6 flex flex-wrap gap-2.5">{actions}</div> : null}
      </Panel>
      <div className="rounded-xl bg-navy-900 p-6 text-navy-050 shadow-card">{rail}</div>
    </div>
  );
}

/** Eyebrow + body inside the navy rail. Transparency over dark panels only (§1 rule 6). */
export function EmptyRail({
  eyebrow,
  children,
  footnote,
}: {
  eyebrow: string;
  children: React.ReactNode;
  footnote: string;
}) {
  return (
    <>
      <div className="text-eyebrow uppercase text-navy-200">{eyebrow}</div>
      {children}
      <p className="mt-3.5 max-w-none text-meta text-navy-200">{footnote}</p>
    </>
  );
}
