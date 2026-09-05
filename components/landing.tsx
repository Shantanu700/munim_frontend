"use client";

import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Tone = "allow" | "step" | "deny";

const TONE: Record<Tone, string> = {
  allow: "bg-allow-tint text-allow",
  step: "bg-step-tint text-step",
  deny: "bg-deny-tint text-deny",
};

const TONE_VAR: Record<Tone, string> = {
  allow: "var(--allow)",
  step: "var(--step)",
  deny: "var(--deny)",
};

const SCENARIOS: {
  item: string;
  agent: string;
  amount: string;
  entry: string;
  hash: string;
  checks: { rule: string; detail: string; ok: boolean }[];
  verdict: string;
  tone: Tone;
  note: string;
}[] = [
  {
    item: "Rabistha Crane Garden Handcrafted Co-Ord Set",
    agent: "claude",
    amount: "₹5,500",
    entry: "146",
    hash: "7c1e9d0f",
    checks: [
      { rule: "Mandate signature", detail: "valid · 47h left", ok: true },
      { rule: "Per-purchase cap", detail: "₹5,500 of ₹6,000", ok: true },
      { rule: "Stock at request", detail: "3 in stock", ok: true },
    ],
    verdict: "● ALLOW · WITHIN_MANDATE",
    tone: "allow",
    note: "payment link created on the store",
  },
  {
    item: "Handcrafted Suit Set · qty 1",
    agent: "gpt agent",
    amount: "₹8,500",
    entry: "147",
    hash: "4a72be31",
    checks: [
      { rule: "Mandate signature", detail: "valid · 47h left", ok: true },
      { rule: "Per-purchase cap", detail: "₹2,500 over", ok: false },
      { rule: "Hard ceiling", detail: "under ₹60,000", ok: true },
    ],
    verdict: "◐ STEP_UP · BUDGET_EXCEEDED",
    tone: "step",
    note: "one approve-or-decline sent to the buyer",
  },
  {
    item: "Bulk order · 14 co-ord sets",
    agent: "shopping agent",
    amount: "₹94,000",
    entry: "148",
    hash: "9f4c1ab7",
    checks: [
      { rule: "Mandate signature", detail: "valid · 47h left", ok: true },
      { rule: "Hard ceiling", detail: "₹34,000 over", ok: false },
      { rule: "Quantity per order", detail: "14 of max 6", ok: false },
    ],
    verdict: "✕ DENY · CEILING_EXCEEDED",
    tone: "deny",
    note: "refused before checkout · no link sent",
  },
];

const MECHANICS = [
  {
    eyebrow: "authority",
    title: "Signed mandates",
    body: "The buyer signs their limits. Munim reads them from the signature, never from an editable record.",
  },
  {
    eyebrow: "policy",
    title: "Seven rules",
    body: "Order size, quantity, first orders, stock, price movement, address risk and agent identity.",
  },
  {
    eyebrow: "answers",
    title: "Reason codes",
    body: "Every refusal names the rule that fired, so the agent knows what to change and retries correctly.",
  },
  {
    eyebrow: "evidence",
    title: "Append-only ledger",
    body: "Entries are hash-chained. A refusal you made fairly can be proved months later.",
  },
];

const PROBLEMS = [
  {
    n: "01",
    title: "No authority to check",
    body: "An agent claims it is buying for someone. Nothing in the order proves the buyer ever agreed to the amount.",
  },
  {
    n: "02",
    title: "Refunds land on you",
    body: "When an assistant overspends, the buyer disputes it. You carry the chargeback and the argument.",
  },
  {
    n: "03",
    title: "Blocking costs sales",
    body: "Turning agents away is the safe answer today. It also turns away buyers who no longer shop by hand.",
  },
];

const STEPS = [
  {
    title: "Connect your store",
    stage: "setup",
    body: "Point Munim at your catalogue and link the Razorpay account you already collect payments with. Nothing about your existing checkout changes.",
    facts: [
      { k: "catalogue", v: "read-only" },
      { k: "payments", v: "your Razorpay" },
      { k: "setup", v: "one sitting" },
    ],
  },
  {
    title: "Write one policy",
    stage: "configure",
    body: "Seven rules cover order size, quantity, stock, price movement, address risk and agent identity. Each one refuses, asks the buyer, or just records.",
    facts: [
      { k: "rules", v: "7" },
      { k: "enforcement levels", v: "4" },
      { k: "policies saved", v: "unlimited" },
    ],
  },
  {
    title: "Put it in force",
    stage: "live",
    body: "One policy enforces at a time. Every agent request is checked against it and the verdict is appended to your ledger, allowed or refused.",
    facts: [
      { k: "active policies", v: "1" },
      { k: "verdicts", v: "allow · step-up · deny" },
      { k: "ledger", v: "append-only" },
    ],
  },
];

const LEVEL_TONE: Record<string, Tone> = {
  Refuse: "deny",
  "Ask the buyer": "step",
  "Log only": "allow",
};

const RULES = [
  {
    name: "Order size",
    value: "₹40,000",
    level: "Refuse",
    code: "ORDER_TOO_LARGE",
    title: "Cap what one order can be worth.",
    body: "The largest basket you are willing to sell to an agent in a single transaction, regardless of what the buyer authorised.",
    breach: "the purchase is refused and the agent is told the cap.",
  },
  {
    name: "Quantity per order",
    value: "6 units",
    level: "Refuse",
    code: "QTY_TOO_HIGH",
    title: "Stop an agent clearing your shelf.",
    body: "A per-line quantity ceiling. Useful when one size selling out costs you more than the order is worth.",
    breach: "the purchase is refused and the agent is told the cap.",
  },
  {
    name: "New buyer first order",
    value: "₹8,000",
    level: "Ask the buyer",
    code: "NEW_BUYER_LIMIT",
    title: "Treat a first order more carefully.",
    body: "Applies only when the buyer has no completed order with you. Once they have one, the rule stops firing.",
    breach: "the buyer gets one approve-or-decline link.",
  },
  {
    name: "Stock at request",
    value: "must be in stock",
    level: "Refuse",
    code: "STOCK_UNAVAILABLE",
    title: "Never sell what you cannot ship.",
    body: "Stock is re-read at the moment of purchase, not from the agent’s cached view of your catalogue.",
    breach: "the purchase is refused and the agent is told the cap.",
  },
  {
    name: "Price movement",
    value: "5%",
    level: "Ask the buyer",
    code: "PRICE_MOVED",
    title: "Catch a price that changed mid-flow.",
    body: "If your price moved between the agent reading it and paying, the difference is checked against this tolerance.",
    breach: "the buyer gets one approve-or-decline link.",
  },
  {
    name: "Address risk",
    value: "flagged pincodes",
    level: "Log only",
    code: "ADDRESS_FLAGGED",
    title: "Watch delivery risk without blocking it.",
    body: "Pincodes with repeated returns or failed deliveries are recorded on the entry so you can decide later.",
    breach: "the purchase completes and the entry is recorded.",
  },
  {
    name: "Agent identity",
    value: "must be declared",
    level: "Refuse",
    code: "AGENT_UNDECLARED",
    title: "Know which assistant is buying.",
    body: "The agent must identify itself and present the buyer’s signed mandate. An anonymous agent has no authority.",
    breach: "the purchase is refused and the agent is told the cap.",
  },
];

const LEDGER_ROWS: { verdict: string; tone: Tone; amount: string; item: string; reason: string; hash: string }[] = [
  { verdict: "✕ DENY", tone: "deny", amount: "₹94,000", item: "Bulk order · 14 co-ord sets", reason: "CEILING_EXCEEDED", hash: "9f4c1a" },
  { verdict: "● ALLOW", tone: "allow", amount: "₹5,500", item: "Rabistha Crane Garden Co-Ord Set", reason: "WITHIN_MANDATE", hash: "7c1e9d" },
  { verdict: "◐ STEP_UP", tone: "step", amount: "₹8,500", item: "Handcrafted Suit Set · qty 1", reason: "BUDGET_EXCEEDED", hash: "4a72be" },
  { verdict: "✕ DENY", tone: "deny", amount: "₹2,400", item: "Dress · out of stock at request", reason: "STOCK_UNAVAILABLE", hash: "1b83f5" },
];

const PROOF = [
  {
    title: "Reason codes, not vibes",
    body: "A refusal names the rule that fired, so the buyer and their assistant know what to change.",
  },
  {
    title: "Hash-chained entries",
    body: "Each entry carries a hash of the one before it. Removing a row breaks the chain visibly.",
  },
  {
    title: "Shareable as-is",
    body: "Send the ledger to a buyer, a marketplace or a payment partner without exporting anything.",
  },
];

function verdictFor(n: number) {
  if (n <= 6000)
    return {
      tone: "allow" as Tone,
      badge: "● ALLOW",
      headline: "Bought without asking anyone.",
      body: "Inside the per-purchase cap, so the agent completes checkout on its own. The buyer sees it on their dashboard afterwards.",
    };
  if (n <= 60000)
    return {
      tone: "step" as Tone,
      badge: "◐ STEP_UP · BUDGET_EXCEEDED",
      headline: "Held for the buyer to approve.",
      body: "Over the cap but under the ceiling. The buyer gets one approve-or-decline link; price and stock are re-read before anything is charged.",
    };
  return {
    tone: "deny" as Tone,
    badge: "✕ DENY · CEILING_EXCEEDED",
    headline: "Refused. No approval link is sent.",
    body: "Above the hard ceiling the buyer signed. Not even the buyer can wave this one through — the limit lives in the signature.",
  };
}

const SHELL = "w-full";
const PANEL = `${SHELL} rounded-xl bg-panel shadow-card`;
const CTA_NAVY = "h-14 bg-navy-200 px-8 text-body font-medium text-navy-900 hover:bg-navy-050";
const CTA_NAVY_GHOST = "h-14 bg-navy-050/10 px-7 text-body font-medium text-navy-050 hover:bg-navy-050/20";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="text-eyebrow uppercase text-muted-ink">{children}</div>;
}

function Wordmark() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-navy-900 font-medium text-navy-050">
        म
      </span>
      <span className="text-section font-semibold tracking-tight">munim</span>
    </div>
  );
}

function Reveal({ className, children }: { className?: string; children: React.ReactNode }) {
  const [shown, setShown] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.04 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-[opacity,transform] duration-500 ease-out-quart",
        shown ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Landing() {
  const [tick, setTick] = React.useState(0);
  const [amount, setAmount] = React.useState(8500);
  const [rule, setRule] = React.useState(1);
  const [step, setStep] = React.useState(0);
  const [scrolled, setScrolled] = React.useState(false);

  const bar = React.useRef<HTMLDivElement>(null);
  const rail = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 850);
    return () => clearInterval(t);
  }, []);

  React.useEffect(() => {
    let frame = 0;
    const measure = () => {
      const doc = document.documentElement;
      const y = window.scrollY;
      const span = Math.max(1, doc.scrollHeight - window.innerHeight);
      if (bar.current) bar.current.style.width = `${Math.min(100, (y / span) * 100)}%`;
      setScrolled(y > 60);

      const nodes = rail.current?.querySelectorAll("[data-step]");
      if (nodes?.length) {
        const line = window.innerHeight * 0.52;
        let active = 0;
        nodes.forEach((el, i) => {
          if (el.getBoundingClientRect().top <= line) active = i;
        });
        setStep(active);
      }
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    onScroll();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const CYCLE = 8;
  const live = SCENARIOS[Math.floor(tick / CYCLE) % SCENARIOS.length];
  const phase = tick % CYCLE;

  const r = RULES[rule];
  const ruleTone = LEVEL_TONE[r.level];
  const gate = verdictFor(amount);

  return (
    <div className="flex flex-col items-center gap-panel px-panel pt-panel">
      <div ref={bar} className="pointer-events-none fixed top-0 left-0 z-40 h-[3px] w-0 bg-tile" />

      <header
        className={cn(
          "sticky top-panel z-20 flex w-full items-center gap-6 rounded-pill bg-panel py-3 pr-3 pl-6 shadow-card transition-[max-width] duration-400 ease-out-quart",
          scrolled ? "max-w-[calc(100%-4rem)]" : "max-w-full",
        )}
      >
        <Wordmark />
        <nav className="ml-3 hidden gap-6 lg:flex">
          {[
            ["How it works", "#how"],
            ["The rules", "#rules"],
            ["The ledger", "#ledger"],
            ["For buyers", "#buyers"],
          ].map(([label, href]) => (
            <Link key={href} href={href} className="text-dense text-muted-ink transition-colors hover:text-foreground">
              {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <Button asChild className="h-10 bg-panel-2 px-5 text-dense text-foreground hover:bg-faint">
            <Link href="/auth">Sign in</Link>
          </Button>
          <Button asChild className="hidden h-10 px-5 text-dense sm:inline-flex">
            <Link href="/auth">Make your store AI ready now</Link>
          </Button>
        </div>
      </header>

      <section
        className={cn(
          SHELL,
          "grid items-center gap-11 rounded-xl bg-navy-900 p-8 text-navy-050 shadow-card lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:px-13 lg:py-15",
        )}
      >
        <div className="animate-row-in">
          <div className="inline-flex items-center gap-2.5 rounded-pill bg-navy-200/14 px-4 py-2 text-eyebrow uppercase text-navy-200">
            <span className="size-[7px] animate-heartbeat rounded-full bg-navy-200" />
            agent commerce, gated
          </div>
          <h1 className="mt-6 text-display font-extralight tracking-[-0.02em] text-pretty">
            Let AI agents buy from your store. Safely.
          </h1>
          <p className="mt-5 max-w-[470px] text-card-title font-light text-navy-200">
            Munim sits between the agent and your checkout. You write the rules once; every attempt is checked
            against them and every verdict is appended to a ledger you can show anyone.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            <Button asChild className={CTA_NAVY}>
              <Link href="/auth">Make your store AI ready now</Link>
            </Button>
            <Button asChild className={CTA_NAVY_GHOST}>
              <Link href="/auth">Sign in</Link>
            </Button>
          </div>
          <div className="mt-7 flex flex-wrap gap-1.5">
            {["Razorpay payouts", "Signed buyer mandates", "Hash-chained ledger"].map((t) => (
              <span key={t} className="rounded-pill bg-navy-050/8 px-3.5 py-2 text-meta text-navy-200">
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="flex animate-row-in flex-col gap-panel">
          <div className="rounded-lg bg-panel p-6 text-foreground">
            <div className="flex items-center justify-between gap-3">
              <Eyebrow>incoming agent request</Eyebrow>
              <span className="inline-flex items-center gap-2 text-meta text-muted-ink">
                <span className="size-1.5 animate-heartbeat rounded-full bg-allow" />
                live
              </span>
            </div>

            <div className="mt-4 rounded-md bg-panel-2 p-4">
              <div className="text-card-title font-normal">{live.item}</div>
              <div className="mt-2.5 flex justify-between gap-3">
                <span className="text-meta text-muted-ink">{live.agent} · shoprabistha.com</span>
                <span className="text-body font-medium tabular-nums">{live.amount}</span>
              </div>
            </div>

            <div className="mt-3.5 grid gap-panel">
              {live.checks.map((c, i) => (
                <div
                  key={c.rule}
                  className={cn(
                    "flex items-center gap-3 rounded-md bg-panel-2 px-4 py-3 transition-[opacity,transform] duration-350",
                    phase > i ? "translate-y-0 opacity-100" : "translate-y-1 opacity-20",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-[18px] shrink-0 items-center justify-center rounded-full text-[10px] font-medium",
                      c.ok ? TONE.allow : TONE.deny,
                    )}
                  >
                    {c.ok ? "✓" : "✕"}
                  </span>
                  <span className="text-meta">{c.rule}</span>
                  <span className="ml-auto text-meta tabular-nums text-muted-ink">{c.detail}</span>
                </div>
              ))}
            </div>

            <div
              className={cn(
                "mt-4 flex items-center justify-between gap-3 border-t border-rule pt-4 transition-opacity duration-350",
                phase >= 4 ? "opacity-100" : "opacity-15",
              )}
            >
              <span className={cn("rounded-pill px-3 py-1.5 text-eyebrow tracking-[0.04em]", TONE[live.tone])}>
                {live.verdict}
              </span>
              <span className="text-meta text-muted-ink">{live.note}</span>
            </div>
          </div>

          <div
            className={cn(
              "flex items-center gap-3 rounded-lg bg-navy-050/7 px-6 py-4.5 transition-opacity duration-400",
              phase >= 5 ? "opacity-100" : "opacity-25",
            )}
          >
            <span className="size-[7px] shrink-0 rounded-full bg-navy-200" />
            <span className="text-meta text-navy-200">
              appended to ledger · entry {live.entry} · {live.hash}
            </span>
          </div>
        </div>
      </section>

      <Reveal className={cn(PANEL, "grid gap-9 p-8 sm:grid-cols-2 lg:grid-cols-4 lg:px-11")}>
        {MECHANICS.map((m) => (
          <div
            key={m.title}
            className="flex flex-col gap-2.5 lg:border-l lg:border-rule lg:pl-9 lg:first:border-0 lg:first:pl-0"
          >
            <Eyebrow>{m.eyebrow}</Eyebrow>
            <div className="text-card-title">{m.title}</div>
            <p className="max-w-none text-meta text-muted-ink">{m.body}</p>
          </div>
        ))}
      </Reveal>

      <Reveal className={cn(PANEL, "grid items-start gap-8 p-8 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] lg:gap-14 lg:p-11")}>
        <div>
          <Eyebrow>the problem</Eyebrow>
          <h2 className="mt-4 text-headline text-pretty">
            Buyers are sending assistants to shop. Your checkout can’t tell them apart.
          </h2>
          <p className="mt-5 text-body text-muted-ink">
            An order from an agent looks like any other order until it goes wrong. Then the dispute arrives, and
            nothing in your records says what the buyer actually agreed to.
          </p>
        </div>
        <div className="flex flex-col">
          {PROBLEMS.map((p) => (
            <div
              key={p.n}
              className="grid grid-cols-[34px_minmax(0,1fr)] gap-4.5 border-t border-rule py-5.5 first:border-0 first:pt-0"
            >
              <span className="text-meta font-medium tabular-nums text-muted-ink">{p.n}</span>
              <div>
                <div className="text-card-title">{p.title}</div>
                <p className="mt-2 max-w-none text-dense text-muted-ink">{p.body}</p>
              </div>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal className={cn(PANEL, "p-8 lg:px-11 lg:py-10")}>
        <div id="how" className="flex flex-wrap items-end justify-between gap-6 scroll-mt-24">
          <div>
            <Eyebrow>how it works</Eyebrow>
            <h2 className="mt-4.5 text-page-title">Three steps, then it runs without you.</h2>
          </div>
          <div className="text-meta text-muted-ink">the timeline follows your scroll</div>
        </div>

        <div ref={rail} className="relative mt-8 pl-14">
          <div className="absolute top-2 bottom-2 left-[15px] w-0.5 bg-rule" />
          <div
            className="absolute top-2 left-[15px] w-0.5 bg-tile transition-[height] duration-500 ease-out-quart"
            style={{ height: `${((step + 1) / STEPS.length) * 100}%` }}
          />
          <div className="flex flex-col gap-panel">
            {STEPS.map((s, i) => (
              <div
                key={s.title}
                data-step=""
                className={cn("relative rounded-lg px-6 py-5.5 transition-colors", i === step && "bg-panel-2")}
              >
                <span
                  className={cn(
                    "absolute top-6 -left-14 flex size-8 items-center justify-center rounded-full text-meta font-medium transition-all",
                    i <= step ? "bg-tile text-tile-foreground" : "bg-panel-2 text-muted-ink",
                    i === step ? "ring-6 ring-allow-tint" : "ring-4 ring-panel",
                  )}
                >
                  {i + 1}
                </span>
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <span className="text-section">{s.title}</span>
                  <Eyebrow>{s.stage}</Eyebrow>
                </div>
                <p className="mt-3 max-w-[640px] text-body text-muted-ink">{s.body}</p>
                <div
                  className={cn(
                    "mt-4 flex flex-wrap gap-1.5 transition-opacity duration-350",
                    i === step ? "opacity-100" : "opacity-45",
                  )}
                >
                  {s.facts.map((f) => (
                    <span key={f.k} className="inline-flex items-baseline gap-2 rounded-pill bg-panel px-3.5 py-2">
                      <span className="text-meta text-muted-ink">{f.k}</span>
                      <span className="text-meta font-medium">{f.v}</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal className={cn(PANEL, "p-8 lg:px-11 lg:py-10")}>
        <div id="rules" className="flex flex-wrap items-end justify-between gap-6 scroll-mt-24">
          <div>
            <Eyebrow>the rules</Eyebrow>
            <h2 className="mt-4.5 text-page-title">Seven rules. You choose what each one does.</h2>
          </div>
          <p className="max-w-[400px] text-body text-muted-ink">
            Every rule can refuse the purchase, ask the buyer to approve it, or record it and let it through. One
            policy is in force at a time.
          </p>
        </div>

        <div className="mt-7 grid gap-panel lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          <div className="grid content-start gap-panel">
            {RULES.map((x, i) => (
              <button
                key={x.code}
                type="button"
                aria-pressed={i === rule}
                onClick={() => setRule(i)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-4 py-3.5 text-left transition-colors",
                  i === rule ? "bg-tile text-tile-foreground" : "bg-panel-2 text-foreground hover:bg-faint",
                )}
              >
                <span className="text-meta tabular-nums opacity-60">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-dense font-medium">{x.name}</span>
                <span className="ml-auto text-meta opacity-70">{x.level}</span>
              </button>
            ))}
          </div>

          <div className="rounded-lg bg-panel-2 p-6 lg:p-7.5">
            <span className={cn("rounded-pill px-3 py-1.5 text-eyebrow tracking-[0.04em]", TONE[ruleTone])}>
              {r.code}
            </span>
            <div className="mt-4.5 text-headline">{r.title}</div>
            <p className="mt-3.5 max-w-[520px] text-body text-muted-ink">{r.body}</p>
            <div className="mt-6 grid gap-panel sm:grid-cols-3">
              <div className="rounded-md bg-panel p-4">
                <div className="text-meta text-muted-ink">threshold</div>
                <div className="mt-2 text-card-title tabular-nums">{r.value}</div>
              </div>
              <div className="rounded-md bg-panel p-4">
                <div className="text-meta text-muted-ink">enforcement</div>
                <div className="mt-2 text-card-title">{r.level}</div>
              </div>
              <div className="rounded-md bg-panel p-4">
                <div className="text-meta text-muted-ink">reason code</div>
                <div className="mt-2 text-dense font-medium">{r.code}</div>
              </div>
            </div>
            <div className="mt-5 text-meta text-muted-ink">On breach: {r.breach}</div>
          </div>
        </div>
      </Reveal>

      <Reveal className={cn(PANEL, "grid items-center gap-11 p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:px-11 lg:py-10")}>
        <div>
          <Eyebrow>try the gate</Eyebrow>
          <h2 className="mt-4 text-headline text-pretty">Move the amount. Watch the verdict change.</h2>
          <p className="mt-3.5 max-w-[470px] text-body text-muted-ink">
            This buyer authorised ₹6,000 per purchase with a ₹60,000 hard ceiling. Munim reads those limits from
            the buyer’s signature, not from a database you or we could edit.
          </p>
          <div className="mt-6 flex items-baseline gap-3">
            <span className="text-display tabular-nums">₹{amount.toLocaleString("en-IN")}</span>
            <span className="text-meta text-muted-ink">basket total</span>
          </div>
          <input
            type="range"
            min={1000}
            max={90000}
            step={500}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            aria-label="Basket total"
            className="mt-5 h-6 w-full max-w-[470px] cursor-grab bg-transparent"
            style={{ accentColor: TONE_VAR[gate.tone] }}
          />
          <div className="flex max-w-[470px] justify-between">
            <span className="text-meta tabular-nums text-muted-ink">₹1,000</span>
            <span className="text-meta tabular-nums text-muted-ink">₹90,000</span>
          </div>
        </div>

        <div className="rounded-lg bg-panel-2 p-6">
          <span className={cn("rounded-pill px-3 py-1.5 text-eyebrow tracking-[0.04em]", TONE[gate.tone])}>
            {gate.badge}
          </span>
          <div className="mt-4 text-panel">{gate.headline}</div>
          <p className="mt-3 max-w-none text-dense text-muted-ink">{gate.body}</p>
          <dl className="mt-5 grid gap-panel text-meta">
            <div className="flex justify-between gap-3 border-b border-rule pb-3">
              <dt className="text-muted-ink">per-purchase cap</dt>
              <dd className="font-medium tabular-nums">₹6,000</dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-rule pb-3">
              <dt className="text-muted-ink">hard ceiling</dt>
              <dd className="font-medium tabular-nums">₹60,000</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-ink">written to ledger</dt>
              <dd className="font-medium">always</dd>
            </div>
          </dl>
        </div>
      </Reveal>

      <Reveal className={cn(SHELL, "grid items-stretch gap-panel lg:grid-cols-2")}>
        <div id="ledger" className="flex flex-col rounded-xl bg-panel p-8 shadow-card scroll-mt-24 lg:px-11 lg:py-10">
          <Eyebrow>the ledger</Eyebrow>
          <h2 className="mt-4.5 text-page-title text-pretty">
            Every verdict is recorded. Including the ones you’d rather forget.
          </h2>
          <p className="mt-5 max-w-[470px] text-body text-muted-ink">
            Allowed, held for approval, refused — each entry carries the reason code, the rule that fired and a
            hash of the entry before it. Entries are appended, never rewritten, so a merchant who refused fairly
            can prove it and one who didn’t cannot hide it.
          </p>
          <div className="mt-6 grid gap-panel">
            {PROOF.map((p) => (
              <div key={p.title} className="rounded-md bg-panel-2 px-4.5 py-4">
                <div className="text-body font-medium">{p.title}</div>
                <p className="mt-1.5 max-w-none text-meta text-muted-ink">{p.body}</p>
              </div>
            ))}
          </div>
          <Link href="/auth" className="mt-5.5 text-dense font-medium text-accent-ink hover:text-muted-ink">
            See a live store ledger →
          </Link>
        </div>

        <div className="rounded-xl bg-panel p-7 shadow-card">
          <div className="flex items-baseline justify-between">
            <span className="text-card-title">Public ledger</span>
            <span className="text-meta text-muted-ink">shoprabistha.com</span>
          </div>
          <div className="mt-4.5 grid gap-panel">
            {LEDGER_ROWS.map((row, i) => (
              <div
                key={row.hash}
                className="animate-row-in rounded-md bg-panel-2 px-4 py-3.5"
                style={{ animationDelay: `${100 + i * 120}ms` }}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className={cn("rounded-pill px-2.5 py-1.5 text-eyebrow tracking-[0.04em]", TONE[row.tone])}>
                    {row.verdict}
                  </span>
                  <span className="text-body font-medium tabular-nums">{row.amount}</span>
                </div>
                <div className="mt-2.5 text-dense">{row.item}</div>
                <div className="mt-1.5 flex justify-between gap-3">
                  <span className="text-meta text-muted-ink">{row.reason}</span>
                  <span className="text-meta tabular-nums text-muted-ink">{row.hash}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4.5 flex items-center gap-2.5 border-t border-rule pt-4.5">
            <span className="size-[7px] animate-heartbeat rounded-full bg-allow" />
            <span className="text-meta text-muted-ink">append-only · a refusal cannot be edited out later</span>
          </div>
        </div>
      </Reveal>

      <Reveal className={cn(PANEL, "grid items-center gap-11 p-8 lg:grid-cols-2 lg:px-11 lg:py-10")}>
        <div>
          <Eyebrow>the money</Eyebrow>
          <h2 className="mt-4.5 text-page-title text-pretty">Payments go to your Razorpay account. Not ours.</h2>
          <p className="mt-5 max-w-[470px] text-body text-muted-ink">
            Munim decides whether a purchase is allowed and then creates a payment link on your own account. We
            are not in the settlement path, we hold no float, and we never see a card number.
          </p>
        </div>
        <div className="rounded-lg bg-panel-2 p-6">
          <div className="flex flex-col gap-panel">
            <div className="flex items-center justify-between gap-3 rounded-md bg-panel px-4.5 py-4">
              <span className="text-dense">Agent requests a purchase</span>
              <span className="text-meta text-muted-ink">step 1</span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md bg-panel px-4.5 py-4">
              <span className="inline-flex items-center gap-2.5 text-dense font-medium">
                <span className="size-[7px] animate-heartbeat rounded-full bg-allow" />
                Munim checks the rules
              </span>
              <span className="text-meta text-muted-ink">verdict + ledger</span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md bg-panel px-4.5 py-4">
              <span className="text-dense">Razorpay collects the money</span>
              <span className="text-meta text-muted-ink">your account</span>
            </div>
          </div>
          <div className="mt-4.5 text-meta text-muted-ink">Munim exits at step 2. The rupees never touch us.</div>
        </div>
      </Reveal>

      <Reveal className={cn(PANEL, "grid items-center gap-11 p-8 lg:grid-cols-2 lg:px-11 lg:py-10")}>
        <div id="buyers" className="scroll-mt-24">
          <Eyebrow>for buyers</Eyebrow>
          <h2 className="mt-4 text-headline text-pretty">
            Authorise your assistant once. Take the authority back whenever you like.
          </h2>
          <p className="mt-4 max-w-[470px] text-body text-muted-ink">
            You set a per-purchase cap, a total budget and an expiry. Anything above the cap comes back to you as
            a single approve-or-decline; anything above your ceiling is refused without asking.
          </p>
          <Button asChild className="mt-6 h-13 bg-panel-2 px-7 text-body font-medium text-foreground hover:bg-faint">
            <Link href="/auth">Authorise my agent</Link>
          </Button>
        </div>
        <dl className="grid gap-panel">
          {[
            ["Per purchase", "₹6,000", false],
            ["Total budget", "₹30,000", false],
            ["Hard ceiling", "₹60,000", true],
            ["Expires in", "48 hours", false],
          ].map(([label, value, ceiling]) => (
            <div
              key={label as string}
              className={cn(
                "flex items-baseline justify-between gap-3 rounded-lg px-5.5 py-5",
                ceiling ? "bg-step-tint" : "bg-panel-2",
              )}
            >
              <dt className={cn("text-body", ceiling ? "font-medium text-step" : "text-muted-ink")}>{label}</dt>
              <dd className="text-section tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </Reveal>

      <Reveal
        className={cn(
          SHELL,
          "flex flex-col items-center rounded-xl bg-navy-900 px-8 py-16 text-navy-050 shadow-card lg:px-11",
        )}
      >
        <h2 className="max-w-[700px] text-center text-display font-extralight tracking-[-0.02em] text-pretty">
          Your rules, enforced on every agent that shops with you.
        </h2>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Button asChild className={CTA_NAVY}>
            <Link href="/auth">Make your store AI ready now</Link>
          </Button>
          <Button asChild className={CTA_NAVY_GHOST}>
            <Link href="/auth">Sign in</Link>
          </Button>
        </div>
        <div className="mt-5.5 text-meta text-navy-200">
          Connect your Razorpay account and publish a policy in one sitting.
        </div>
      </Reveal>

      <footer
        className={cn(
          SHELL,
          "grid grid-cols-2 gap-8 px-8 pt-8 pb-12 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] lg:px-11",
        )}
      >
        <div className="col-span-2 md:col-span-1">
          <Wordmark />
          <p className="mt-3 max-w-[280px] text-meta text-muted-ink">
            Agent commerce infrastructure for Indian stores.
          </p>
        </div>
        {[
          { label: "product", links: [["How it works", "#how"], ["The rules", "#rules"], ["The ledger", "#ledger"]] },
          { label: "buyers", links: [["Authorise an agent", "#buyers"], ["Revoke a mandate", "/auth"]] },
          { label: "account", links: [["Sign in", "/auth"], ["Make your store AI ready", "/auth"]] },
        ].map((group) => (
          <div key={group.label} className="flex flex-col gap-2.5">
            <Eyebrow>{group.label}</Eyebrow>
            {group.links.map(([label, href]) => (
              <Link key={label} href={href} className="text-meta text-muted-ink transition-colors hover:text-foreground">
                {label}
              </Link>
            ))}
          </div>
        ))}
      </footer>
    </div>
  );
}
