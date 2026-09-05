import type { KindEnum, OnBreachEnum, StateEnum } from "@/src/client";

export const REQUIRED_DETAILS = ["name", "price", "currency", "sku", "image", "stock"] as const;

const BASELINE = 170;
const FULL_HEIGHT = 150;
const STEP = 45;

export function bars(values: number[]) {
  const max = Math.max(...values, 1);
  return values.map((v, i) => {
    const h = Math.round((v / max) * FULL_HEIGHT);
    return { x: 8 + i * STEP, y: BASELINE - h, h, current: i === values.length - 1 };
  });
}

export function linePoints(values: number[]) {
  const max = Math.max(...values, 1);
  return values
    .map((v, i) => `${17 + i * STEP},${BASELINE - Math.round((v / max) * FULL_HEIGHT)}`)
    .join(" ");
}

export const DONUT_CIRCUMFERENCE = Math.round(2 * Math.PI * 48);

export const ENFORCEMENTS = [
  { key: "refuse", label: "Refuse", state: "enforcing", on_breach: "refuse" },
  { key: "ask_buyer", label: "Ask the buyer", state: "enforcing", on_breach: "ask_buyer" },
  { key: "ask_merchant", label: "Ask you", state: "enforcing", on_breach: "ask_merchant" },
  { key: "off", label: "Off", state: "off", on_breach: undefined },
] as const satisfies readonly {
  key: string;
  label: string;
  state: StateEnum;
  on_breach?: OnBreachEnum;
}[];

export type Enforcement = (typeof ENFORCEMENTS)[number]["key"];

export function enforcementOf(rule: { state?: StateEnum; on_breach?: OnBreachEnum }): Enforcement {
  return rule.state !== "enforcing" ? "off" : (rule.on_breach ?? "refuse");
}

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

export function ruleSentence(
  rule: { kind: KindEnum; reason_code: string; state?: StateEnum; on_breach?: OnBreachEnum },
  valueText: string
) {
  const enforcement = enforcementOf(rule);

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
