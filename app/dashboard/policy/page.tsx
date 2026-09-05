"use client";

import * as React from "react";

import { Panel, RED_SOLID, RED_TINT, Row, rupees } from "@/components/dashboard/parts";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { usePolicy } from "@/hooks/use-policy";
import { ENFORCEMENTS, enforcementOf, ruleSentence, type Enforcement } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";
import type { KindEnum, Rule, RuleWrite } from "@/src/client";

export default function PolicyPage() {
  const { overview, detail, history, loading, busy, uuid, select, saveRules, create, setActive, remove } =
    usePolicy();
  const [naming, setNaming] = React.useState(false);

  if (loading) return null;

  if (!overview) {
    return (
      <>
        <PageHeading />
        <Panel>
          <h2 className="text-card-title">No merchant account on this login</h2>
          <p className="mt-1.5 text-body text-muted-ink">
            Store policy belongs to a merchant. This account does not have one, so there are no
            rules to show.
          </p>
        </Panel>
      </>
    );
  }

  const { policies, tiles, active_policy: activePolicy, currency } = overview;
  const active = policies.find((p) => p.uuid === activePolicy) ?? null;
  const selected = policies.find((p) => p.uuid === uuid) ?? null;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 px-1.5 py-1">
        <PageHeading />
        <dl className="flex flex-wrap gap-x-8 gap-y-3">
          {[
            ["in force", active?.name ?? "None"],
            ["rules on", `${tiles.rules_enforcing} of ${tiles.rules_defined}`],
            ["refused, 30 days", tiles.refused_30d],
            ["sent for approval", tiles.step_ups_30d],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-eyebrow uppercase text-muted-ink">{label}</dt>
              <dd className="mt-1 text-section">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div>
            <h2 className="text-card-title">Choose the policy in force</h2>
            <p className="mt-1 text-meta text-muted-ink">
              {active
                ? `${active.name} is in force · ${policies.length} saved`
                : `No policy is in force, so no store rules apply · ${policies.length} saved`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-panel">
            {selected && selected.uuid !== activePolicy ? (
              <Button
                className="h-10 px-4.5"
                disabled={busy}
                onClick={() => selected.uuid && setActive(selected.uuid, true)}
              >
                Put in force
              </Button>
            ) : null}
            {activePolicy ? (
              <Button
                variant="outline"
                className="h-10 px-4.5"
                disabled={busy}
                onClick={() => setActive(activePolicy, false)}
              >
                Run no policy
              </Button>
            ) : null}
            <Popover open={naming} onOpenChange={setNaming}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-10 px-4.5" disabled={busy}>
                  New policy
                </Button>
              </PopoverTrigger>
              <NewPolicyForm
                busy={busy}
                onCreate={async (name) => {
                  if (await create(name)) setNaming(false);
                }}
              />
            </Popover>
          </div>
        </div>

        {policies.length === 0 ? (
          <p className="mt-4 max-w-none text-body text-muted-ink">
            You have no policies yet. Create one to set the ceilings, categories and agents your
            store will accept — until then, no store rules apply to agent purchases.
          </p>
        ) : (
          <div className="mt-4 flex snap-x snap-mandatory gap-panel overflow-x-auto pb-1">
            {policies.map((p) => {
              const current = p.uuid === uuid;
              return (
                <button
                  key={p.uuid}
                  type="button"
                  aria-pressed={current}
                  onClick={() => select(p.uuid ?? null)}
                  className={cn(
                    "flex w-60 shrink-0 min-w-60 snap-start cursor-pointer flex-col gap-2.5 rounded-lg p-4.5 text-left transition-colors",
                    current ? "bg-navy-900 text-navy-050" : "bg-panel-2 hover:bg-track/60"
                  )}
                >
                  <span className="flex min-w-0 items-start gap-3">
                    <span
                      aria-hidden
                      className={cn(
                        "mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-full border-[1.5px]",
                        current ? "border-navy-200" : "border-rule"
                      )}
                    >
                      {current ? <span className="size-2 rounded-full bg-navy-200" /> : null}
                    </span>
                    <span className="text-card-title">{p.name}</span>
                  </span>

                  <span
                    className={cn(
                      "mt-auto text-meta tabular-nums",
                      current ? "text-navy-200" : "text-muted-ink"
                    )}
                  >
                    {p.rule_counts.enforcing ?? 0} of {p.rule_counts.all ?? 0} enforcing
                    {p.uuid === activePolicy ? " · in force" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </Panel>

      {uuid && detail ? (
        <PolicyEditor
          key={detail.uuid}
          detail={detail}
          currency={currency}
          isActive={detail.uuid === activePolicy}
          busy={busy}
          history={history}
          lastChange={tiles.last_change_summary}
          onSave={saveRules}
          onDelete={remove}
        />
      ) : null}
    </>
  );
}

function PageHeading() {
  return (
    <div>
      <h1 className="text-page-title">Policy</h1>
      <p className="mt-1 text-body text-muted-ink">
        One policy governs your store at a time. Every rule inside it, and how hard it bites, is
        yours to set.
      </p>
    </div>
  );
}

function NewPolicyForm({
  busy,
  onCreate,
}: {
  busy: boolean;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = React.useState("");
  return (
    <PopoverContent className="shadow-card ring-0">
      <PopoverHeader>
        <PopoverTitle className="text-card-title">New policy</PopoverTitle>
        <PopoverDescription className="max-w-none text-meta text-muted-ink">
          It starts with every rule off, and it is not in force until you say so.
        </PopoverDescription>
      </PopoverHeader>
      <form
        className="flex flex-col gap-2.5"
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim()) onCreate(name.trim());
        }}
      >
        <input
          autoFocus
          value={name}
          maxLength={100}
          onChange={(event) => setName(event.target.value)}
          aria-label="Policy name"
          placeholder="Festival season"
          className="h-11 w-full min-w-0 rounded-full bg-panel-2 px-5 text-body outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
        />
        <Button type="submit" className="h-10 self-end px-4.5" disabled={busy || !name.trim()}>
          Create
        </Button>
      </form>
    </PopoverContent>
  );
}

function PolicyEditor({
  detail,
  currency,
  isActive,
  busy,
  history,
  lastChange,
  onSave,
  onDelete,
}: {
  detail: NonNullable<ReturnType<typeof usePolicy>["detail"]>;
  currency: string;
  isActive: boolean;
  busy: boolean;
  history: ReturnType<typeof usePolicy>["history"];
  lastChange: string;
  onSave: ReturnType<typeof usePolicy>["saveRules"];
  onDelete: ReturnType<typeof usePolicy>["remove"];
}) {
  const [pending, setPending] = React.useState<Partial<Record<KindEnum, RuleWrite>>>({});
  const [confirming, setConfirming] = React.useState(false);
  const edits = Object.keys(pending).length;

  const rules = detail.rules.map((rule) => ({ ...rule, ...pending[rule.kind] }) as Rule);
  const count = (...of: Enforcement[]) => rules.filter((r) => of.includes(enforcementOf(r))).length;

  function patch(server: Rule, next: RuleWrite) {
    setPending((current) => {
      const merged: RuleWrite = { ...current[server.kind], ...next };
      if (merged.on_breach === undefined) delete merged.on_breach;
      if (merged.state !== undefined && enforcementOf(merged) === enforcementOf(server)) {
        delete merged.state;
        delete merged.on_breach;
      }
      if (merged.config !== undefined && JSON.stringify(merged.config) === JSON.stringify(server.config)) {
        delete merged.config;
      }
      const rest = { ...current };
      if (Object.keys(merged).length) rest[server.kind] = merged;
      else delete rest[server.kind];
      return rest;
    });
  }

  async function save() {
    if (!detail.uuid) return;
    const landed = await onSave(detail.uuid, Object.entries(pending) as [KindEnum, RuleWrite][]);
    setPending((current) => {
      const rest = { ...current };
      for (const kind of landed) delete rest[kind];
      return rest;
    });
  }

  return (
    <div className="grid gap-panel lg:grid-cols-[minmax(0,1fr)_340px] xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1fr)_420px]">
      <Panel className="flex flex-col xl:min-h-0">
        <div className="flex shrink-0 flex-wrap items-start justify-between gap-x-6 gap-y-1">
          <div>
            <h2 className="text-card-title">Rules in {detail.name}</h2>
            <p className="mt-1 text-meta text-muted-ink">
              {rules.length} rules ship with every policy. Set the value, then say what happens on
              a breach.
            </p>
          </div>
          <span className="text-meta text-muted-ink">
            {isActive
              ? "This is the policy the gate is using"
              : "Not the policy in force — no live traffic sees these"}
          </span>
        </div>

        <div className="mt-4 grid max-h-160 gap-panel overflow-y-auto pr-1 xl:max-h-none xl:min-h-0 xl:flex-1">
          {detail.rules.map((server, i) => (
            <RuleCard
              key={server.kind}
              index={i}
              rule={rules[i]}
              currency={currency}
              onEnforcement={(key) => {
                const option = ENFORCEMENTS.find((o) => o.key === key);
                if (option) patch(server, { state: option.state, on_breach: option.on_breach });
              }}
              onConfig={(name, value) =>
                patch(server, {
                  config: { ...(rules[i].config as Record<string, unknown>), [name]: value },
                })
              }
            />
          ))}
        </div>
      </Panel>

      <Panel className="flex flex-col xl:min-h-0">
        <span className="shrink-0 text-eyebrow uppercase text-muted-ink">editing</span>

        <h2 className="mt-3.5 shrink-0 text-panel">{detail.name}</h2>
        <p className="mt-1.5 max-w-none shrink-0 text-body text-muted-ink">
          {isActive
            ? "This policy is in force. Saved changes reach live agent traffic immediately."
            : "This policy is not in force. Save what you like — nothing here is applied until you put it in force."}
        </p>

        <div className="mt-4 grid shrink-0 gap-panel">
          {[
            ["Refusing", count("refuse")],
            ["Asking the buyer", count("ask_buyer")],
            ["Asking you", count("ask_merchant")],
            ["Off", count("off")],
          ].map(([label, n]) => (
            <Row key={label} className="flex items-center justify-between gap-3">
              <span className="text-dense">{label}</span>
              <span className="text-dense font-medium tabular-nums">
                {n} {n === 1 ? "rule" : "rules"}
              </span>
            </Row>
          ))}
        </div>

        <p className="mt-3.5 shrink-0 text-meta text-muted-ink">
          {edits ? `${edits} unsaved ${edits === 1 ? "edit" : "edits"}.` : "No unsaved edits."}
        </p>

        <div className="mt-2.5 flex shrink-0 flex-wrap gap-2.5">
          <Button className="h-11 px-4" disabled={!edits || busy} onClick={save}>
            Save policy
          </Button>
          <Button
            variant="outline"
            className="h-11 px-4"
            disabled={!edits || busy}
            onClick={() => setPending({})}
          >
            Discard edits
          </Button>
          <Popover open={confirming} onOpenChange={setConfirming}>
            <PopoverTrigger asChild>
              <Button
                variant="destructive"
                className={cn("h-11 px-4", RED_TINT)}
                disabled={isActive || busy}
              >
                Delete policy
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="shadow-card ring-0">
              <PopoverHeader>
                <PopoverTitle className="text-card-title">Delete {detail.name}?</PopoverTitle>
                <PopoverDescription className="max-w-none text-meta text-muted-ink">
                  Its rules go with it and it cannot be brought back. A ledger entry records
                  the deletion.
                </PopoverDescription>
              </PopoverHeader>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setConfirming(false)}>
                  Keep it
                </Button>
                <Button
                  className={RED_SOLID}
                  disabled={busy}
                  onClick={() => detail.uuid && onDelete(detail.uuid)}
                >
                  Delete
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <p className="mt-2.5 shrink-0 text-meta text-muted-ink">
          {isActive
            ? "A policy in force cannot be deleted. Put another one in force first."
            : "Deleting a policy leaves a ledger entry behind it."}
        </p>

        <div className="mt-3.5 flex flex-col xl:min-h-0 xl:flex-1">
          <span className="shrink-0 text-eyebrow uppercase text-muted-ink">recent changes</span>
          {history.length ? (
            <ul className="mt-2 grid max-h-60 gap-1.5 overflow-y-auto xl:max-h-none xl:min-h-0 xl:flex-1">
              {history.map((entry) => (
                <li key={entry.seq} className="flex items-baseline justify-between gap-3 text-meta">
                  <span className="min-w-0 text-muted-ink">
                    {summarise(entry.reason_code, entry.detail)}
                    {entry.actor_name ? ` · ${entry.actor_name}` : ""}
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-ink">
                    {new Date(entry.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-meta text-muted-ink">
              {lastChange || "No policy changes on your ledger yet."}
            </p>
          )}
        </div>

      </Panel>
    </div>
  );
}

type ConfigField = {
  name: string;
  type: string;
  required: boolean;
  allow_null: boolean;
  item_type?: string;
  choices?: string[] | null;
  min_value?: number;
  max_value?: number;
};

const UNITS: Record<
  string,
  { toDisplay: (stored: number) => number; toStore: (shown: number) => number; money?: boolean; suffix?: string }
> = {
  amount_paise: { toDisplay: (v) => Math.round(v / 100), toStore: (n) => Math.round(n * 100), money: true },
  tolerance_bps: { toDisplay: (v) => Math.round(v / 100), toStore: (n) => Math.round(n * 100), suffix: "%" },
  min_confidence: { toDisplay: (v) => Math.round(v * 100), toStore: (n) => n / 100, suffix: "%" },
};

const IDENTITY = { toDisplay: (v: number) => v, toStore: (n: number) => n };

const humanise = (name: string) => name.replace(/_(paise|bps)$/, "").replace(/_/g, " ");

function configText(rule: Rule, currency: string): string {
  const config = (rule.config ?? {}) as Record<string, unknown>;
  const field = (rule.config_fields as unknown as ConfigField[])[0];
  if (!field) return "";
  const value = config[field.name];

  if (field.type === "list") {
    const items = Array.isArray(value) ? value.map(String).filter(Boolean) : [];
    return items.length ? items.map(humanise).join(", ") : "";
  }

  if (typeof value !== "number" || Number.isNaN(value)) return "";
  const unit = UNITS[field.name];
  if (unit?.money) return rupees(value, currency);
  const shown = (unit ?? IDENTITY).toDisplay(value);
  return `${shown.toLocaleString("en-IN")}${unit?.suffix ?? ""}`;
}

function RuleCard({
  index,
  rule,
  currency,
  onEnforcement,
  onConfig,
}: {
  index: number;
  rule: Rule;
  currency: string;
  onEnforcement: (key: Enforcement) => void;
  onConfig: (name: string, value: unknown) => void;
}) {
  const fields = rule.config_fields as unknown as ConfigField[];
  const config = (rule.config ?? {}) as Record<string, unknown>;
  const enforcement = enforcementOf(rule);

  return (
    <Row className="p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-card-title">
          <span className="mr-3 text-meta tabular-nums text-muted-ink">
            {String(index + 1).padStart(2, "0")}
          </span>
          {rule.label}
        </h3>
        <span className="text-meta font-medium tracking-[0.03em] text-muted-ink">
          {rule.reason_code}
        </span>
      </div>

      <p className="mt-1.5 max-w-none text-body text-muted-ink">{rule.description}</p>

      <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-4">
        {fields.map((field) => (
          <ConfigInput
            key={field.name}
            field={field}
            value={config[field.name]}
            currency={currency}
            ruleLabel={rule.label}
            onChange={(next) => onConfig(field.name, next)}
          />
        ))}

        <div className="grid gap-1.5">
          <span className="px-1 text-eyebrow uppercase text-muted-ink">enforcement</span>
          <div className="flex flex-wrap gap-1 rounded-full bg-panel p-1">
            {ENFORCEMENTS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                aria-pressed={enforcement === key}
                onClick={() => onEnforcement(key)}
                className={cn(
                  "h-9 cursor-pointer rounded-full px-4 text-dense font-medium transition-colors",
                  enforcement === key ? "bg-primary text-primary-foreground" : "hover:bg-panel-2"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-3.5 max-w-none text-meta text-muted-ink">
        {ruleSentence(rule, configText(rule, currency))}
      </p>

      {rule.config_valid === false ? (
        <p className="mt-1.5 max-w-none text-meta text-muted-ink">
          Not enforceable as saved — this rule is being skipped. Set its value again to repair it.
        </p>
      ) : rule.refused_30d ? (
        <p className="mt-1.5 text-meta text-muted-ink">
          Stopped {rule.refused_30d} {rule.refused_30d === 1 ? "purchase" : "purchases"} in 30 days
          {rule.held_back_paise_30d ? `, holding back ${rupees(rule.held_back_paise_30d, currency)}` : ""}.
        </p>
      ) : rule.first_enforced_at ? null : (
        <p className="mt-1.5 text-meta text-muted-ink">Never switched on.</p>
      )}
    </Row>
  );
}

function ConfigInput({
  field,
  value,
  currency,
  ruleLabel,
  onChange,
}: {
  field: ConfigField;
  value: unknown;
  currency: string;
  ruleLabel: string;
  onChange: (next: unknown) => void;
}) {
  const label = humanise(field.name);

  if (field.type === "list" && field.choices?.length) {
    const chosen = Array.isArray(value) ? value.map(String) : [];
    return (
      <div className="grid gap-1.5">
        <span className="px-1 text-eyebrow uppercase text-muted-ink">{label}</span>
        <div className="flex flex-wrap gap-1 rounded-full bg-panel p-1">
          {field.choices.map((choice) => {
            const on = chosen.includes(choice);
            return (
              <button
                key={choice}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  onChange(on ? chosen.filter((c) => c !== choice) : [...chosen, choice])
                }
                className={cn(
                  "h-9 cursor-pointer rounded-full px-4 text-dense font-medium transition-colors",
                  on ? "bg-primary text-primary-foreground" : "hover:bg-panel-2"
                )}
              >
                {humanise(choice)}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (field.type === "list") {
    const items = Array.isArray(value) ? value.map(String) : [];
    return (
      <label className="grid min-w-52 flex-1 gap-1.5">
        <span className="px-1 text-eyebrow uppercase text-muted-ink">{label}, comma separated</span>
        <span className="flex h-11 items-center gap-2 rounded-full bg-panel px-4 focus-within:ring-3 focus-within:ring-ring/30">
          <input
            value={items.join(", ")}
            placeholder="none"
            onChange={(event) =>
              onChange(
                event.target.value
                  .split(",")
                  .map((part) => part.trim())
                  .filter(Boolean)
              )
            }
            aria-label={`${ruleLabel} — ${label}`}
            className="min-w-0 flex-1 bg-transparent text-body outline-none"
          />
        </span>
      </label>
    );
  }

  const unit = UNITS[field.name] ?? IDENTITY;
  const affix = UNITS[field.name];
  const stored = typeof value === "number" && !Number.isNaN(value) ? value : null;

  return (
    <label className="grid min-w-52 flex-1 gap-1.5">
      <span className="px-1 text-eyebrow uppercase text-muted-ink">{label}</span>
      <span className="flex h-11 items-center gap-2 rounded-full bg-panel px-4 focus-within:ring-3 focus-within:ring-ring/30">
        {affix?.money ? (
          <span className="shrink-0 text-body text-muted-ink">
            {rupees(0, currency).replace(/[\d.,\s]/g, "")}
          </span>
        ) : null}
        <input
          inputMode="numeric"
          value={stored === null ? "" : unit.toDisplay(stored).toLocaleString("en-IN")}
          placeholder={field.allow_null ? "no limit" : "0"}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, "");
            if (!digits) return onChange(field.allow_null ? null : (field.min_value ?? 0));
            let next = unit.toStore(Number(digits));
            if (field.min_value !== undefined) next = Math.max(field.min_value, next);
            if (field.max_value !== undefined) next = Math.min(field.max_value, next);
            onChange(next);
          }}
          aria-label={`${ruleLabel} — ${label}`}
          className="min-w-0 flex-1 bg-transparent text-body font-medium tabular-nums outline-none"
        />
        {affix?.suffix ? (
          <span className="shrink-0 text-meta text-muted-ink">{affix.suffix}</span>
        ) : null}
      </span>
    </label>
  );
}

function summarise(reasonCode: string, detail: Record<string, unknown>): string {
  const name = typeof detail.name === "string" ? detail.name : "";
  const ruleLabel =
    typeof detail.rule_label === "string"
      ? detail.rule_label
      : typeof detail.rule_kind === "string"
        ? detail.rule_kind
        : "";
  return (
    {
      POLICY_CREATED: `Created ${name}`,
      POLICY_ACTIVATED: `Put ${name} in force`,
      POLICY_DEACTIVATED: `Stopped running ${name}`,
      POLICY_DELETED: `Deleted ${name}`,
      POLICY_RENAMED: `Renamed to ${detail.to ?? ""}`,
      POLICY_RULE_UPDATED: `Changed ${ruleLabel}`,
      AGENT_TRAFFIC_ENABLED: "Agent traffic switched on",
      AGENT_TRAFFIC_DISABLED: "Agent traffic switched off",
    }[reasonCode] ?? reasonCode
  );
}
