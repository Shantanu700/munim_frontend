"use client";

import { ChevronDown, XIcon } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { CopyButton } from "@/components/dashboard/copy-button";
import { PanelHeader, mask, moment } from "@/components/dashboard/parts";
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
  DropdownMenuCheckboxItem,
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
  getCoreMerchantsCategories,
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
  "flex h-11 items-center gap-2 rounded-full bg-panel-2 px-4 text-body transition-shadow focus-within:ring-3 focus-within:ring-ring/30";
const FIELD_INVALID = "ring-2 ring-deny/35 focus-within:ring-deny/35";
const INPUT =
  "min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-muted-ink";
const LABEL = "px-1 text-eyebrow uppercase text-muted-ink";

function Group({
  title,
  first,
  children,
}: {
  title: string;
  first?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "grid gap-3.5",
        first ? "mt-6" : "mt-5.5 border-t border-rule pt-5.5"
      )}
    >
      <h3 className="px-1 text-body font-medium">{title}</h3>
      {children}
    </section>
  );
}

function RupeeField({
  label,
  hint,
  value,
  error,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  error?: string;
  onChange: (digits: string) => void;
}) {
  return (
    <label className="grid gap-1.5">
      <span className={LABEL}>{label}</span>
      <span className={cn(FIELD, error && FIELD_INVALID)}>
        <span className="shrink-0 text-muted-ink">₹</span>
        <input
          inputMode="numeric"
          value={value ? Number(value).toLocaleString("en-IN") : ""}
          placeholder="0"
          onChange={(event) => onChange(event.target.value.replace(/\D/g, ""))}
          aria-label={label}
          aria-invalid={error ? true : undefined}
          className={cn(INPUT, "font-medium tabular-nums")}
        />
      </span>
      <span className={cn("px-1 text-meta", error ? "font-medium text-deny" : "text-muted-ink")}>
        {error ?? hint}
      </span>
    </label>
  );
}

type Option = { value: string; label: string; short?: string };

type StoreOption = Option & { uuid?: string };

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
  options: Option[] | null;
  onChange: (value: string) => void;
}) {
  const list = options ?? [];
  const current = list.find((option) => option.value === value);
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
              {current ? current.short ?? current.label : placeholder}
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-ink" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="max-h-72 overflow-y-auto">
          <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
            {list.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          {list.length === 0 && (
            <DropdownMenuItem disabled>{options === null ? "Loading…" : empty}</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function CategoryPicker({
  options,
  selected,
  storePicked,
  onToggle,
}: {
  options: Option[] | null;
  selected: string[];
  storePicked: boolean;
  onToggle: (value: string) => void;
}) {
  const list = options ?? [];
  const label = (value: string) => list.find((option) => option.value === value)?.label ?? value;

  return (
    <div className="grid gap-1.5">
      <span className={LABEL}>Categories</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={!storePicked}
            aria-label="Categories"
            className={cn(
              FIELD,
              "w-full cursor-pointer justify-between text-left disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            <span className={cn("truncate", selected.length === 0 && "text-muted-ink")}>
              {!storePicked
                ? "Choose a store first"
                : selected.length === 0
                  ? "Any category"
                  : `${selected.length} selected`}
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-ink" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="max-h-72 min-w-(--radix-dropdown-menu-trigger-width) overflow-y-auto">
          {list.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={selected.includes(option.value)}
              onSelect={(event) => event.preventDefault()}
              onCheckedChange={() => onToggle(option.value)}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
          {list.length === 0 && (
            <DropdownMenuItem disabled>
              {!storePicked
                ? "Choose a store first."
                : options === null
                  ? "Loading…"
                  : "This store publishes no categories yet."}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-1 pt-0.5">
          {selected.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onToggle(value)}
              aria-label={`Remove ${label(value)}`}
              className="group/chip flex cursor-pointer items-center gap-1.5 rounded-full bg-panel-2 py-1 pr-2 pl-3 text-meta font-medium transition-colors hover:bg-faint"
            >
              {label(value)}
              <XIcon className="size-3 text-muted-ink transition-colors group-hover/chip:text-foreground" />
            </button>
          ))}
        </div>
      )}

      <span className="px-1 text-meta text-muted-ink">
        {storePicked
          ? "Pick none to let the assistant buy from any category this store sells."
          : "Choose a store first — these come from its own catalogue."}
      </span>
    </div>
  );
}

function SummaryRow({ term, value }: { term: string; value: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-meta text-navy-200">{term}</dt>
      <dd
        className={cn(
          "min-w-0 text-right text-body tabular-nums",
          value ? "font-medium text-navy-050" : "text-navy-200"
        )}
      >
        {value ?? "Not set"}
      </dd>
    </div>
  );
}

const money = (digits: string) => `₹${Number(digits).toLocaleString("en-IN")}`;

const LOADED_AT = Date.now();

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
  const [stores, setStores] = React.useState<StoreOption[] | null>(null);
  const [agents, setAgents] = React.useState<Option[] | null>(null);
  const [catalogue, setCatalogue] = React.useState<Option[] | null>(null);

  React.useEffect(() => {
    const offline = (what: string, set: (options: Option[]) => void) => () => {
      set([]);
      toast.error(`Could not load the list of ${what}. Reload to try again.`);
    };
    getCoreMerchantsDropdown()
      .then(({ data, error }) => {
        if (!data) {
          setStores([]);
          return toast.error(describeApiError(error));
        }
        setStores(
          data
            .filter((store) => store.domain)
            .map((store) => ({
              value: store.domain!,
              label: store.business_name ? `${store.business_name} — ${store.domain}` : store.domain!,
              short: store.business_name || store.domain!,
              uuid: store.uuid,
            }))
        );
      })
      .catch(offline("stores", setStores));
    getCoreDropdown({ path: { parent_slug: "ai-agents" } })
      .then(({ data, error }) => {
        if (!data) {
          setAgents([]);
          return toast.error(describeApiError(error));
        }
        setAgents(data.map((agent) => ({ value: agent.key, label: agent.label })));
      })
      .catch(offline("agents", setAgents));
  }, []);

  const storeUuid = stores?.find((store) => store.value === domain)?.uuid;
  React.useEffect(() => {
    if (!storeUuid) return;
    let live = true;
    getCoreMerchantsCategories({ path: { merchant_uuid: storeUuid } })
      .then(({ data, error }) => {
        if (!live) return;
        setCatalogue(
          (data ?? []).map((category) => ({
            value: category.key || category.name,
            label: category.name,
          }))
        );
        if (!data) toast.error(describeApiError(error));
      })
      .catch(() => {
        if (!live) return;
        setCatalogue([]);
        toast.error("Could not load this store's categories. Leave them blank to allow any.");
      });
    return () => {
      live = false;
    };
  }, [storeUuid]);

  const per = Number(perTxnCap);
  const total = Number(totalCap);
  const ceiling = Number(stepUpCeiling);
  const totalError =
    per && total && total < per ? "Must be at least the per-purchase limit." : undefined;
  const floor = total || per;
  const ceilingError =
    floor && ceiling && ceiling < floor
      ? total
        ? "Must be at least the total budget."
        : "Must be at least the per-purchase limit."
      : undefined;

  const [countFrom, setCountFrom] = React.useState(LOADED_AT);
  const lapses = React.useMemo(
    () => moment(new Date(countFrom + ttlHours * 3_600_000).toISOString()),
    [countFrom, ttlHours]
  );

  const agentLabel = agents?.find((agent) => agent.value === subject)?.label ?? subject;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!domain || !subject || !perTxnCap || !totalCap || !stepUpCeiling) {
      toast.error("Fill in the store, the agent and all three limits.");
      return;
    }
    if (totalError || ceilingError) {
      toast.error(
        "Each limit has to be at least the one before it: per purchase, then total budget, then hard ceiling."
      );
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
    setCatalogue(null);
  }

  return (
    <>
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

        <Group title="Who may spend, and where" first>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Picker
              label="Store"
              value={domain}
              placeholder="Choose a store"
              empty="No stores on Munim yet."
              options={stores}
              onChange={(value) => {
                setDomain(value);
                setCategories([]);
                setCatalogue(null);
              }}
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
        </Group>

        <Group title="How much">
          <div className="grid gap-3.5 sm:grid-cols-3">
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
              error={totalError}
              onChange={setTotalCap}
            />
            <RupeeField
              label="Hard ceiling"
              hint="even you can't approve past it"
              value={stepUpCeiling}
              error={ceilingError}
              onChange={setStepUpCeiling}
            />
          </div>
        </Group>

        <Group title="How long, and on what">
          <div className="grid gap-1.5">
            <span className={LABEL}>Expires in</span>
            <div className="flex flex-wrap gap-1 rounded-full bg-panel-2 p-1">
              {EXPIRES.map((option) => {
                const on = ttlHours === option.hours;
                return (
                  <button
                    key={option.hours}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setTtlHours(option.hours);
                      setCountFrom(Date.now());
                    }}
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
            <span className="px-1 text-meta text-muted-ink">Lapses about {lapses}.</span>
          </div>

          <CategoryPicker
            options={catalogue}
            selected={categories}
            storePicked={Boolean(domain)}
            onToggle={(value) =>
              setCategories((current) =>
                current.includes(value)
                  ? current.filter((each) => each !== value)
                  : [...current, value]
              )
            }
          />
        </Group>

        <Button type="submit" disabled={busy} className="mt-6 h-11 w-full">
          {busy ? "Creating…" : "Create mandate"}
        </Button>
      </form>

      <aside className="rounded-xl bg-navy-900 p-6 text-navy-050 shadow-card">
        <PanelHeader title="What you're authorising" />
        <p className="mt-1.5 max-w-none text-body text-navy-200">
          {domain && subject ? (
            <>
              <span className="font-medium text-navy-050">{agentLabel}</span> may buy on{" "}
              <span className="font-medium text-navy-050">{domain}</span> without asking you
              again, inside these limits.
            </>
          ) : (
            "Choose a store and an agent. Everything you set on the left is restated here before you sign it."
          )}
        </p>

        <dl className="mt-6 grid gap-2.5">
          <SummaryRow term="Per purchase" value={perTxnCap ? money(perTxnCap) : null} />
          <SummaryRow term="Total budget" value={totalCap ? money(totalCap) : null} />
          <SummaryRow term="Hard ceiling" value={stepUpCeiling ? money(stepUpCeiling) : null} />
          <SummaryRow term="Lapses" value={`about ${lapses}`} />
          <SummaryRow
            term="Categories"
            value={
              categories.length
                ? categories
                    .map((key) => catalogue?.find((c) => c.value === key)?.label ?? key)
                    .join(", ")
                : "Any category"
            }
          />
        </dl>

        <p className="mt-6 max-w-none border-t border-navy-200/20 pt-4 text-meta text-navy-200">
          Revocable at any time. The signature is the authority — Munim cannot raise these
          limits from its side.
        </p>
      </aside>
    </>
  );
}
