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
/* §1 rule 2: the ring only seconds the sentence under the field, which is what actually says
   what is wrong. `--deny` is deep navy here, not red — §8 prohibits red outright. */
const FIELD_INVALID = "ring-2 ring-deny/35 focus-within:ring-deny/35";
const INPUT =
  "min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-muted-ink";
const LABEL = "px-1 text-eyebrow uppercase text-muted-ink";

/**
 * One group of fields, separated from the last by §4's card divider (1px `--rule`, 22px
 * either side). Seven controls in one undifferentiated stack gave a spending authority the
 * shape of a contact form; three named groups say what each answer is for.
 *
 * The heading is sentence case on purpose: every field label below it is already an
 * uppercase tracked eyebrow, and two levels of capitals in one card is noise, not hierarchy.
 */
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

/** One call site each for the two other config widgets on the policy screen; this is the
    third. Rupees, not paise — `MandateWrite`'s caps are rupee strings on the wire.

    `error` takes over the hint slot rather than adding a row beneath it, so a value going
    invalid never shifts the fields under it. */
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

/**
 * What every dropdown endpoint is reduced to: the string the wire carries, and the string a
 * human reads. Neither uuid reaches the wire — `domain` and `subject` do.
 *
 * `short` is the closed state's label where the open one needs more. A store's menu row has
 * to print the domain, because two shops can share a business name and the domain is the
 * thing actually being authorised; once one is chosen there is nothing left to tell apart, so
 * the trigger says only the name. Falls back to `label` for the pickers that need no split.
 */
type Option = { value: string; label: string; short?: string };

/** A store carries its uuid past the picker: `MandateWrite` wants `domain`, but the category
    roster is addressed by `merchant_uuid`, so the row that answers one has to answer both. */
type StoreOption = Option & { uuid?: string };

/**
 * Store and agent are the same control over different rows, so they are one component.
 *
 * A `div`, not a `label`: the trigger is a real button, and a button inside a `<label>`
 * fires that label's control on every click — the same reason the Razorpay screen's
 * `Field` associates with `htmlFor`. `aria-label` names it instead.
 *
 * `options` is `null` while the roster is still in flight, which is not the same claim as
 * an empty one: "No stores on Munim yet" printed during the fetch told a buyer the platform
 * was bare when it was only slow.
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

/**
 * The store's own categories, as many as the buyer wants, chosen from a checklist and shown
 * back as removable chips.
 *
 * It replaced a comma-separated text input, which asked a buyer to guess the exact spelling a
 * crawler had recorded — a typo there does not fail loudly, it silently narrows the mandate to
 * a category that matches nothing. This roster is the store's own, so there is nothing to
 * guess. It is also why the control is dead until a store is picked: categories belong to one
 * shop's catalogue, not to the platform.
 *
 * The chips are their own buttons rather than living inside the trigger — a button nested in a
 * button is invalid, and each chip has to be individually removable.
 */
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
            {/* Three states, and "no store yet" is not one of the other two: `options` is
                `null` both before a store is picked and while its roster is in flight, so
                reading it alone printed "Loading…" at a buyer who had nothing loading. */}
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
        {/* At least as wide as the field it drops from, so the checklist reads as part of it,
            but free to grow for a long category name rather than clipping it. */}
        <DropdownMenuContent className="max-h-72 min-w-(--radix-dropdown-menu-trigger-width) overflow-y-auto">
          {list.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={selected.includes(option.value)}
              /* Radix closes the menu on select; a checklist that shuts after one tick makes
                 choosing three categories three round trips through the trigger. */
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

/** One line of the read-back rail. `value` of `null` is a field the buyer has not answered
    yet, and says so in words rather than leaving the row blank. */
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

/** The clock the expiry preview counts from, read at module evaluation rather than in a
    render body — `Date.now()` during render is an impure call `react-hooks` rejects outright.
    Each click on an expiry pill re-reads it from the handler, where impure calls are fine, so
    the figure is exact at the moment a buyer actually chooses the window. */
const LOADED_AT = Date.now();

/**
 * The create side of the buyer's mandates screen — the reference screenshot's shape,
 * mapped onto `MandateWrite`. `create` is `useMandates().create`, which answers with the
 * created row (carrying the one-time `token`) or `null` on failure.
 *
 * Returns the form *and* the read-back rail as siblings; the screen owns the two-column grid
 * they sit in. `Dialog` is Radix's `Root`, which renders no DOM node of its own, so the grid
 * still sees exactly two children.
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
  const [stores, setStores] = React.useState<StoreOption[] | null>(null);
  const [agents, setAgents] = React.useState<Option[] | null>(null);
  const [catalogue, setCatalogue] = React.useState<Option[] | null>(null);

  /* Both rosters a buyer picks from — a typed domain or agent name was a guess, and a
     mandate signed for a store that is not on Munim can never be spent. Two requests, not
     `Promise.all`: either list is usable without the other. `.then`, not `await`, for
     `react-hooks/set-state-in-effect`. Loud on failure — without these there is nothing to
     submit. `subject` is the agent's `key` (the slug the gate matches, e.g. `chatgpt`), not
     its `label` — the label is display only. A failed roster lands as `[]`, not `null`, so
     the menu stops claiming it is still loading something that will never arrive. */
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
              /* Open: both, because two shops can share a business name and the domain is
                 what is actually being authorised. Closed: the name alone, since by then
                 there is nothing left to tell apart. */
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

  /* The chosen store's own categories. Addressed by `merchant_uuid`, which is why `stores`
     carries a uuid the wire never sees. The clearing setState belongs to the store picker's
     `onChange` below, not to this effect body — a synchronous setState in an effect is a lint
     *error* here — so all this does is fill in what that handler emptied. `.then`, same rule.
     A failure lands as `[]` and says so out loud: a silently empty checklist would read as
     "this store sells nothing", and blank still means any category, so nothing is blocked. */
  const storeUuid = stores?.find((store) => store.value === domain)?.uuid;
  React.useEffect(() => {
    if (!storeUuid) return;
    let live = true;
    getCoreMerchantsCategories({ path: { merchant_uuid: storeUuid } })
      .then(({ data, error }) => {
        if (!live) return;
        setCatalogue(
          /* `key` is the slug the gate matches, the same split the agent picker makes
             between `key` and `label`; it is optional on the wire, and a store whose crawl
             recorded only a name still has to be selectable. */
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

  /* The three caps are one ladder — per purchase ≤ total budget ≤ hard ceiling — and each rung
     is only compared once both it and the one under it carry a figure, since blank is not zero
     here. A buyer who inverts two of them has built a mandate that can never approve anything,
     and finding that out from a 400 after submitting is finding it out in the wrong place. */
  const per = Number(perTxnCap);
  const total = Number(totalCap);
  const ceiling = Number(stepUpCeiling);
  const totalError =
    per && total && total < per ? "Must be at least the per-purchase limit." : undefined;
  /* The ceiling answers to whichever cap below it actually carries a figure: the budget when
     there is one, the per-purchase limit while there is not. Without that fallback a ceiling
     under the per-purchase limit would pass unremarked for as long as the budget stayed blank,
     which is exactly the half-filled form this check exists to catch. */
  const floor = total || per;
  const ceilingError =
    floor && ceiling && ceiling < floor
      ? total
        ? "Must be at least the total budget."
        : "Must be at least the per-purchase limit."
      : undefined;

  /* The server stamps the real expiry when it signs, so this is the client's arithmetic on a
     clock that is a beat behind — "about" rather than a timestamp presented as exact. It is
     still the only place a buyer sees what "30d" actually means in their own timezone. */
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

        <Group title="Who may spend, and where" first>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Picker
              label="Store"
              value={domain}
              placeholder="Choose a store"
              empty="No stores on Munim yet."
              options={stores}
              /* Categories belong to the store, so changing the store invalidates both the
                 roster and anything already ticked from it. Cleared here, in an event
                 handler, rather than in the effect that refills it. */
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

        {/* "Create mandate" and not "Create authorisation": the rail, the page title and the
            list all call the thing a mandate, and a button is the wrong place to introduce a
            second noun for it. */}
        <Button type="submit" disabled={busy} className="mt-6 h-11 w-full">
          {busy ? "Creating…" : "Create mandate"}
        </Button>
      </form>

      {/* §1 rule 5's one dark panel, and it goes to the read-back rather than to the form:
          this is a spending authority, and the last thing before signing one should be a
          plain sentence naming what was signed. Derived entirely from the fields beside it —
          no state of its own, so it cannot drift out of step with them. */}
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
          {/* Names, not the slugs `categories` actually holds — the rail restates what the
              buyer chose, and they chose "Home & Kitchen", not `home-kitchen`. */}
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
