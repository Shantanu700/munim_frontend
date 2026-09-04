/**
 * What's left of the merchant Overview screen's copy, now that `GET /dashboard/*` supplies
 * every figure. Only two kinds of thing survive here: `REQUIRED_DETAILS`, a constant mirroring
 * the backend's scored fields, and the store-policy copy below (`ENFORCEMENTS`/`BREACH`/
 * `ruleSentence`), which the wire has never carried and isn't mock data.
 */

import type { KindEnum, OnBreachEnum, StateEnum } from "@/src/client";

/**
 * The six details an agent needs before an item can sell. Mirrors the scored fields in
 * the backend's `twin/ingest.py`, and is what the §6 bar meter counts.
 */
export const REQUIRED_DETAILS = ["name", "price", "currency", "sku", "image", "stock"] as const;

/* Chart geometry. Both helpers are plotted against a `0 0 640 180` viewBox and are copied from the
 * design file's `renderVals()`, so the rendered chart matches the artboard exactly.
 * The baseline is y=170. Normalized against the series' own max rather than a fixed 100 —
 * `GET /dashboard/revenue` returns real paise amounts, not the mock's pre-scaled 0-100
 * index, so the tallest bar in whatever window is loaded is always the full 150px. */

const BASELINE = 170;
const FULL_HEIGHT = 150;
const STEP = 45;

export function bars(values: number[]) {
  const max = Math.max(...values, 1);
  return values.map((v, i) => {
    const h = Math.round((v / max) * FULL_HEIGHT);
    // The final bar is the current day, so it reads as ink against the faint history.
    return { x: 8 + i * STEP, y: BASELINE - h, h, current: i === values.length - 1 };
  });
}

export function linePoints(values: number[]) {
  const max = Math.max(...values, 1);
  // +9 on x centres the point over its 18px-wide bar.
  return values
    .map((v, i) => `${17 + i * STEP},${BASELINE - Math.round((v / max) * FULL_HEIGHT)}`)
    .join(" ");
}

/** Circumference of the r=48 donut, for the `stroke-dasharray` sweep. */
export const DONUT_CIRCUMFERENCE = Math.round(2 * Math.PI * 48);

/* Store policy (S2e). No longer a fixture: `/dashboard/policy` reads and writes the real policy API, and what
 * is left here is the copy the wire does not carry. `Rule` supplies `label`, `description`
 * and `reason_code`; it does not supply a sentence saying what a breach *does*, which is
 * the one line on that screen telling a merchant what they just changed. */

/** What the merchant picks, and the two wire fields it sets. In severity order. */
export const ENFORCEMENTS = [
  { key: "refuse", label: "Refuse", state: "enforcing", on_breach: "refuse" },
  { key: "ask_buyer", label: "Ask the buyer", state: "enforcing", on_breach: "ask_buyer" },
  { key: "ask_merchant", label: "Ask you", state: "enforcing", on_breach: "ask_merchant" },
  // `on_breach` stays undefined: turning a rule off must not also rewrite what it would have
  // done. The write is partial, so the merchant's choice survives for when they turn it back
  // on. Spelled out rather than omitted so the four options share one shape.
  { key: "off", label: "Off", state: "off", on_breach: undefined },
] as const satisfies readonly {
  key: string;
  label: string;
  state: StateEnum;
  on_breach?: OnBreachEnum;
}[];

export type Enforcement = (typeof ENFORCEMENTS)[number]["key"];

/**
 * Which pill is lit for a rule as the server holds it.
 *
 * `draft` and `off` both mean "does not run", so both light Off. They are not the same
 * thing to a merchant — draft has never been switched on — but that difference belongs in
 * the sentence below, not in a fifth pill that would write a state the screen cannot mean.
 */
export function enforcementOf(rule: { state?: StateEnum; on_breach?: OnBreachEnum }): Enforcement {
  return rule.state !== "enforcing" ? "off" : (rule.on_breach ?? "refuse");
}

/**
 * The breach each rule catches, as a sentence subject. `{value}` is the rule's own config
 * value, already formatted by the field that edits it — passed in rather than derived here,
 * so the sentence and the input can never disagree about ₹ or %.
 *
 * Keyed by `kind`, which is the identity the API addresses a rule by. `reason_code` is what
 * the sentence *ends* with, and the ledger prints the same string — a rule and the refusals
 * it caused have to name the same thing or the two screens cannot be read together.
 */
const BREACH: Record<KindEnum, string> = {
  per_order_ceiling: "A single order past {value}",
  daily_spend_cap: "Past {value} of agent purchases in one day",
  price_change_tolerance: "A price that rose by no more than {value} since the quote",
  complete_product_data: "An item that has not published {value}",
  blocked_categories: "An item in {value}",
  allowed_categories: "An item outside {value}",
  agent_allowlist: "An agent other than {value}",
  min_catalog_confidence: "A catalogue row we read with less confidence than {value}",
};

/**
 * What this rule does on a breach. Derived from the current value and enforcement rather
 * than stored, so an edit cannot leave stale copy behind it.
 *
 * `price_change_tolerance` is the odd one and says so: a price rise is already refused by
 * the engine's exact-match check, and all this rule can do is soften that into an approval
 * request. Setting it to Refuse therefore changes nothing — see `_price_drift_in_band`.
 */
export function ruleSentence(
  rule: { kind: KindEnum; reason_code: string; state?: StateEnum; on_breach?: OnBreachEnum },
  valueText: string
) {
  const enforcement = enforcementOf(rule);

  // Nothing set: a cap left blank, an empty category list, no agents named. The rule is
  // live in the sense that it runs, and stops nothing — which is not what "Refusing" beside
  // it implies, so it is worth one plain sentence rather than a subject with a hole in it.
  if (!valueText) {
    return enforcement === "off"
      ? "Nothing is set here, and the rule is off."
      : "Nothing is set here yet, so this rule stops nothing.";
  }

  const subject = BREACH[rule.kind].replace("{value}", valueText);

  if (rule.kind === "price_change_tolerance" && enforcement !== "ask_buyer" && enforcement !== "ask_merchant") {
    return `${subject} is refused with ${rule.reason_code}, as it would be with this rule off — the band only ever softens that refusal into a question.`;
  }
  if (enforcement === "off") {
    return `${subject} is not checked while this rule is off.`;
  }
  const clause = {
    refuse: "is refused with",
    ask_buyer: "is sent to the buyer to approve, and logged as",
    ask_merchant: "is sent to you to approve, and logged as",
  }[enforcement];
  return `${subject} ${clause} ${rule.reason_code}.`;
}
