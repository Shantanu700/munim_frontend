"use client";

import { ChevronDown } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { CopyButton } from "@/components/dashboard/copy-button";
import { PanelHeader, mask } from "@/components/dashboard/parts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { describeApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  getCoreDropdown,
  getCoreMerchantsDropdown,
  type MandateIssued,
  type MandateWrite,
} from "@/src/client";

const EXPIRES = [
  { label: "12h", hours: 12 },
  { label: "48h", hours: 48 },
  { label: "7d", hours: 168 },
  { label: "30d", hours: 720 },
] as const;

const FIELD =
  "flex h-11 items-center gap-2 rounded-full bg-panel-2 px-4 text-body focus-within:ring-3 focus-within:ring-ring/30";
const INPUT = "min-w-0 flex-1 bg-transparent text-body outline-none";
const LABEL = "px-1 text-eyebrow uppercase text-muted-ink";

/** One call site each for the two other config widgets on the policy screen; this is the
    third. Rupees, not paise — `MandateWrite`'s caps are rupee strings on the wire. */
function RupeeField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (digits: string) => void;
}) {
  return (
    <label className="grid gap-1.5">
      <span className={LABEL}>{label}</span>
      <span className={FIELD}>
        <span className="shrink-0 text-muted-ink">₹</span>
        <input
          inputMode="numeric"
          value={value ? Number(value).toLocaleString("en-IN") : ""}
          placeholder="0"
          onChange={(event) => onChange(event.target.value.replace(/\D/g, ""))}
          aria-label={label}
          className={cn(INPUT, "font-medium tabular-nums")}
        />
      </span>
      <span className="px-1 text-meta text-muted-ink">{hint}</span>
    </label>
  );
}

/** What both dropdown endpoints are reduced to: the string `MandateWrite` carries, and the
    string a human reads. Neither uuid reaches the wire — `domain` and `subject` do. */
type Option = { value: string; label: string };

/**
 * Store and agent are the same control over different rows, so they are one component.
 *
 * A `div`, not a `label`: the trigger is a real button, and a button inside a `<label>`
 * fires that label's control on every click — the same reason the Razorpay screen's
 * `Field` associates with `htmlFor`. `aria-label` names it instead.
 */
function Picker({
  label,
  value,
  placeholder,
  empty,
  options,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  empty: string;
  options: Option[];
  onChange: (value: string) => void;
}) {
  const current = options.find((option) => option.value === value);
  return (
    <div className="grid gap-1.5">
      <span className={LABEL}>{label}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={label}
            className={cn(FIELD, "w-full cursor-pointer justify-between text-left")}
          >
            <span className={cn("truncate", !current && "text-muted-ink")}>
              {current?.label ?? placeholder}
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-ink" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
            {options.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          {options.length === 0 && <DropdownMenuItem disabled>{empty}</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/**
 * The create side of the buyer's mandates screen — the reference screenshot's shape,
 * mapped onto `MandateWrite`. `create` is `useMandates().create`, which answers with the
 * created row (carrying the one-time `token`) or `null` on failure.
 */
export function MandateForm({
  busy,
  create,
}: {
  busy: boolean;
  create: (body: MandateWrite) => Promise<MandateIssued | null>;
}) {
  const [domain, setDomain] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [perTxnCap, setPerTxnCap] = React.useState("");
  const [totalCap, setTotalCap] = React.useState("");
  const [stepUpCeiling, setStepUpCeiling] = React.useState("");
  const [ttlHours, setTtlHours] = React.useState<number>(48);
  const [categories, setCategories] = React.useState<string[]>([]);
  const [issued, setIssued] = React.useState<MandateIssued | null>(null);
  const [stores, setStores] = React.useState<Option[]>([]);
  const [agents, setAgents] = React.useState<Option[]>([]);

  /* Both rosters a buyer picks from — a typed domain or agent name was a guess, and a
     mandate signed for a store that is not on Munim can never be spent. Two requests, not
     `Promise.all`: either list is usable without the other. `.then`, not `await`, for
     `react-hooks/set-state-in-effect`. Loud on failure — without these there is nothing to
     submit. `subject` is the agent's `key` (the slug the gate matches, e.g. `chatgpt`), not
     its `label` — the label is display only. */
  React.useEffect(() => {
    const offline = (what: string) => () =>
      toast.error(`Could not load the list of ${what}. Reload to try again.`);
    getCoreMerchantsDropdown()
      .then(({ data, error }) => {
        if (!data) return toast.error(describeApiError(error));
        setStores(
          data
            .filter((store) => store.domain)
            .map((store) => ({
              value: store.domain!,
              label: store.business_name ? `${store.business_name} — ${store.domain}` : store.domain!,
            }))
        );
      })
      .catch(offline("stores"));
    getCoreDropdown({ path: { parent_slug: "ai-agents" } })
      .then(({ data, error }) => {
        if (!data) return toast.error(describeApiError(error));
        setAgents(data.map((agent) => ({ value: agent.key, label: agent.label })));
      })
      .catch(offline("agents"));
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!domain || !subject || !perTxnCap || !totalCap || !stepUpCeiling) {
      toast.error("Fill in the store, the agent and all three limits.");
      return;
    }
    const result = await create({
      domain,
      subject,
      per_txn_cap: perTxnCap,
      total_cap: totalCap,
      step_up_ceiling: stepUpCeiling,
      ttl_hours: ttlHours,
      allowed_categories: categories,
    });
    if (!result) return;
    setIssued(result);
    setDomain("");
    setSubject("");
    setPerTxnCap("");
    setTotalCap("");
    setStepUpCeiling("");
    setCategories([]);
  }

  return (
    <>
      {/* `MandateIssued.token` is a bearer credential returned exactly once — same
          copy-now-or-lose-it treatment CLAUDE.md flags for platform API keys. Dismissing
          the dialog is the only exit, so the copy sits where the eye already is. */}
      <Dialog open={issued !== null} onOpenChange={(open) => !open && setIssued(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Mandate created</DialogTitle>
            <DialogDescription>
              Hand this token to {issued?.subject}. Copy it now — Munim cannot show it to you
              again. If you lose it, revoke the mandate and create a new one.
            </DialogDescription>
          </DialogHeader>
          <code className="block truncate rounded-md bg-panel-2 px-4 py-3 text-dense tabular-nums">
            {issued ? mask(issued.token) : null}
          </code>
          <p className="max-w-none text-meta text-muted-ink">
            Only the ends are shown. Copy takes the whole token.
          </p>
          <DialogFooter>
            <CopyButton
              value={issued?.token ?? ""}
              copiedLabel="Token copied."
              className="h-10 w-full sm:w-auto"
            >
              Copy token
            </CopyButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <form onSubmit={handleSubmit} className="rounded-xl bg-panel p-6 shadow-card">
        <PanelHeader title="Authorise your AI to spend" />
        <p className="mt-1.5 max-w-none text-body text-muted-ink">
          Inside these limits your assistant buys without asking again.
        </p>

        <div className="mt-6 grid gap-[14px] sm:grid-cols-2">
          <Picker
            label="Store"
            value={domain}
            placeholder="Choose a store"
            empty="No stores on Munim yet."
            options={stores}
            onChange={setDomain}
          />
          <Picker
            label="Agent"
            value={subject}
            placeholder="Choose an agent"
            empty="No agents listed yet."
            options={agents}
            onChange={setSubject}
          />
        </div>

        <div className="mt-[14px] grid gap-[14px] sm:grid-cols-3">
          <RupeeField
            label="Per purchase"
            hint="no approval below this"
            value={perTxnCap}
            onChange={setPerTxnCap}
          />
          <RupeeField
            label="Total budget"
            hint="counted on payment"
            value={totalCap}
            onChange={setTotalCap}
          />
          <RupeeField
            label="Hard ceiling"
            hint="even you can't approve past it"
            value={stepUpCeiling}
            onChange={setStepUpCeiling}
          />
        </div>

        <div className="mt-[14px] grid gap-1.5">
          <span className={LABEL}>Expires in</span>
          <div className="flex flex-wrap gap-1 rounded-full bg-panel-2 p-1">
            {EXPIRES.map((option) => {
              const on = ttlHours === option.hours;
              return (
                <button
                  key={option.hours}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setTtlHours(option.hours)}
                  className={cn(
                    "h-9 flex-1 cursor-pointer rounded-full px-4 text-dense font-medium transition-colors",
                    on ? "bg-primary text-primary-foreground" : "hover:bg-panel"
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <label className="mt-[14px] grid gap-1.5">
          <span className={LABEL}>Categories, comma separated — blank means any</span>
          <span className={FIELD}>
            <input
              value={categories.join(", ")}
              onChange={(event) =>
                setCategories(
                  event.target.value
                    .split(",")
                    .map((part) => part.trim())
                    .filter(Boolean)
                )
              }
              placeholder="blank means any"
              aria-label="Categories"
              className={INPUT}
            />
          </span>
        </label>

        <Button type="submit" disabled={busy} className="mt-6 h-11 w-full">
          {busy ? "Working…" : "Create authorisation"}
        </Button>
        <p className="mt-2.5 max-w-none text-meta text-muted-ink">
          Revocable any time. The signature is the authority — Munim cannot raise these
          limits from its side.
        </p>
      </form>
    </>
  );
}
