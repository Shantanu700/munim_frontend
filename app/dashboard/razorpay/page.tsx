"use client";

import * as React from "react";
import {
  CircleCheckIcon,
  CircleQuestionMarkIcon,
  CopyIcon,
  ExternalLinkIcon,
  TriangleAlertIcon,
} from "lucide-react";

import { CopyButton } from "@/components/dashboard/copy-button";
import { moment, Panel, PanelHeader, Row } from "@/components/dashboard/parts";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useRazorpay } from "@/hooks/use-razorpay";
import { cn } from "@/lib/utils";
import type { RazorpayCredentialsWriteWritable } from "@/src/client";


/** ProductDialog's field skin, so every form in the dashboard is visibly the same control. */
const INPUT =
  "h-11 w-full min-w-0 rounded-full bg-panel-2 px-5 text-body outline-none focus-visible:ring-3 focus-visible:ring-ring/30";

/** A button on the one dark panel: navy-200 on navy-900, since `variant` knows nothing about it. */
const ON_NAVY = "bg-navy-200 text-navy-900 hover:bg-navy-200/85";

const RAZORPAY = {
  keys: "https://dashboard.razorpay.com/app/website-app-settings/api-keys",
  webhooks: "https://dashboard.razorpay.com/app/webhooks",
  signup: "https://razorpay.com/signup/",
};




type Credential = keyof RazorpayCredentialsWriteWritable;

/**
 * The credential fields the merchant actually typed. Blank is omitted rather than sent as
 * `""`: the write serializer is partial precisely so correcting a key id does not require
 * re-typing a secret Razorpay showed exactly once, and an empty verify body is a request to
 * re-check the pair already on file.
 */
function creds(form: HTMLFormElement, names: readonly Credential[]) {
  const data = new FormData(form);
  const body: RazorpayCredentialsWriteWritable = {};
  for (const name of names) {
    const value = String(data.get(name) ?? "").trim();
    if (value) body[name] = value;
  }
  return body;
}

/** Blank the secrets we just sent. The server holds them now; the boxes should not. */
function clear(form: HTMLFormElement, names: readonly Credential[]) {
  for (const name of names) {
    const field = form.elements.namedItem(name);
    if (field instanceof HTMLInputElement) field.value = "";
  }
}

export default function RazorpaySettingsPage() {
  const { state, loading, busy, save, verify, mintSecret, testEvent } = useRazorpay();

  if (loading) return null;

  if (!state) {
    return (
      <>
        <PageHeading />
        <Panel>
          <h2 className="text-card-title">No merchant account on this login</h2>
          <p className="mt-1.5 text-body text-muted-ink">
            A payout account belongs to a merchant. This account does not have one, so there is
            nothing to connect.
          </p>
        </Panel>
      </>
    );
  }

  const {
    key_id: keyId,
    key_secret_set: secretSet,
    key_mode: mode,
    is_payment_ready: ready,
    verified_at: verifiedAt,
    account_id: accountId,
    account_name: accountName,
    webhook_url: webhookUrl,
    webhook_secret: webhookSecret,
    webhook_events: events,
    webhook_received: received,
    last_event_type: lastType,
    last_event_at: lastAt,
    last_event_was_test: lastWasTest,
  } = state;

  // The word is always inside the pill (§1 rule 2). `is_payment_ready` is the server's own
  // answer and keeps the allow tint to itself; below it each branch names the *first* thing
  // still outstanding, so the pill always matches the next button to press. Ordered, not a
  // state machine — and no `bg-deny-tint`, because an unfinished setup is a step, not a
  // refusal.
  const status = ready
    ? "payout account connected"
    : !secretSet
      ? "keys not added yet"
      : !verifiedAt
        ? "keys not verified yet"
        : !webhookSecret
          ? "webhook secret not set"
          : "waiting for the first webhook";

  const facts = [mode ? `${mode} keys` : null, accountName ?? accountId].filter(Boolean);

  async function onSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (await save(creds(form, ["key_id", "key_secret", "webhook_secret"]))) {
      clear(form, ["key_secret", "webhook_secret"]);
    }
  }

  function onVerify(event: React.MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    if (form) void verify(creds(form, ["key_id", "key_secret"]));
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 px-1.5 py-1">
        <PageHeading />
        <div className="flex flex-wrap items-center gap-panel">
          
            <Button asChild className="h-11 px-5">
              <a href={RAZORPAY.webhooks} target="_blank" rel="noreferrer noopener">
                Open Razorpay webhooks
                <ExternalLinkIcon />
              </a>
            </Button>
          <div className="flex items-center gap-1.5">
            
            <Button asChild className="h-11 px-5">
            <a href={RAZORPAY.keys} target="_blank" rel="noreferrer noopener">
              Rotate Razorpay keys
              <ExternalLinkIcon />
            </a>
          </Button>
          <Hint className="bg-primary items-center justify-center text-primary-foreground hover:text-primary-foreground p-3" label="Open Razorpay webhooks" aria="Where does this money go?">
              Every rupee an agent pays settles into your own Razorpay account, on
              Razorpay&apos;s schedule. Munim never holds, routes or touches it.
            </Hint>  
          </div>
          
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1.5">
        <span
          className={cn(
            "rounded-full px-3.5 py-1.5 text-meta font-medium",
            ready ? "bg-allow-tint text-allow" : "bg-step-tint text-step"
          )}
        >
          {status}
        </span>
        <span className="text-meta text-muted-ink">
          {ready
            ? "Agents can buy. Payments settle to your linked account."
            : "Your catalogue stays live and agent-readable — agents can browse, they just can’t buy."}
        </span>
      </div>

      <div className="grid gap-panel lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex flex-col gap-panel">
          <Panel>
            <PanelHeader
              title="Connect your Razorpay account"
              meta={facts.length ? facts.join(" · ") : null}
            />

            <Row className="mt-3.5 flex flex-wrap gap-x-6 gap-y-2 p-5">
              <span className="text-eyebrow uppercase text-muted-ink">money flow</span>
              <p className="min-w-60 flex-1 max-w-none text-body">
                Munim creates the payment link on <b className="font-medium">your</b> keys and reads
                the result. The money never enters an account of ours — there isn&apos;t one.
              </p>
            </Row>

            <form onSubmit={onSave} className="mt-5 grid gap-5">
              <Field
                label="Key ID"
                htmlFor="key_id"
                hint="Find it in the Razorpay dashboard under Account & Settings → API Keys. It starts with rzp_test_ or rzp_live_."
              >
                <input
                  id="key_id"
                  name="key_id"
                  required
                  defaultValue={keyId ?? ""}
                  pattern="rzp_[A-Za-z0-9_]{6,}"
                  title="A Razorpay key id starts with rzp_test_ or rzp_live_."
                  placeholder="rzp_live_…"
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  className={INPUT}
                />
              </Field>

              <Field
                label="Key Secret"
                htmlFor="key_secret"
                hint={
                  secretSet
                    ? "One is already on file. Leave this blank to keep it — you only need it again if you rotate the key in Razorpay."
                    : "Razorpay shows this once, when you generate the key. It is stored encrypted and never displayed again, here or there."
                }
              >
                <input
                  id="key_secret"
                  name="key_secret"
                  type="password"
                  autoComplete="new-password"
                  placeholder={secretSet ? "•••••••• on file" : "shown once by Razorpay"}
                  className={INPUT}
                />
              </Field>

              <Field
                label="Webhook Secret"
                htmlFor="webhook_secret"
                hint="Optional, and only if you invented your own in Razorpay. Otherwise generate one under “Tell Razorpay where to report payments” and paste it into Razorpay instead."
              >
                <input
                  id="webhook_secret"
                  name="webhook_secret"
                  type="password"
                  autoComplete="off"
                  placeholder={webhookSecret ? "•••••••• on file" : "optional"}
                  className={INPUT}
                />
              </Field>

              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" className="h-11 px-5" disabled={busy !== null}>
                  {busy === "save" ? "Saving…" : "Save keys"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 px-5"
                  onClick={onVerify}
                  disabled={busy !== null}
                >
                  {busy === "verify" ? "Verifying…" : "Verify with Razorpay"}
                </Button>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2.5 text-meta font-medium"
                  style={
                    verifiedAt
                      ? { backgroundColor: "hsl(143, 85%, 96%)", color: "hsl(140, 100%, 27%)" }
                      : { backgroundColor: "hsl(49, 100%, 97%)", color: "hsl(31, 92%, 45%)" }
                  }
                >
                  {verifiedAt ? (
                    <CircleCheckIcon className="size-3.5" />
                  ) : (
                    <TriangleAlertIcon className="size-3.5" />
                  )}
                  {verifiedAt
                    ? `Verified at: ${moment(verifiedAt)}`
                    : "Not verified yet"}
                </span>
              </div>
            </form>

            <p className="mt-4 max-w-none text-meta text-muted-ink">
              Saving stores the pair; verifying asks Razorpay whether it authenticates and, on a
              Partner key, which account it belongs to. Nothing on this screen is marked connected
              until Razorpay says so.
            </p>
          </Panel>

          <Panel>
            <h2 className="text-card-title">No Razorpay account yet?</h2>
            <p className="mt-1.5 text-body text-muted-ink">
              You need one to be paid. Signing up takes a PAN, a bank account and about ten
              minutes. Nothing on this screen expires while activation is pending.
            </p>
            <Button asChild variant="outline" className="mt-4 h-11 px-5">
              <a href={RAZORPAY.signup} target="_blank" rel="noreferrer noopener">
                Open Razorpay sign-up
                <ExternalLinkIcon />
              </a>
            </Button>
          </Panel>
        </div>

        <div className="flex flex-col gap-panel">
          {/* §1 rule 5: one dark panel per screen, and it goes to the step that gets skipped. */}
          <div className="rounded-xl bg-navy-900 p-6 text-navy-050 shadow-card">
            <div className="text-eyebrow uppercase text-navy-200">the step people get wrong</div>
            <h2 className="mt-2 text-card-title">Tell Razorpay where to report payments</h2>
            <p className="mt-2 max-w-none text-meta text-navy-200">
              Skip this and orders get paid but never marked paid. Add both values below in
              Razorpay → Settings → Webhooks.
            </p>

            <div className="mt-3.5 rounded-lg bg-navy-200/12 p-3.5">
              <div className="text-eyebrow uppercase text-navy-200">1 · webhook url</div>
              {webhookUrl ? (
                <div className="mt-2 flex items-center gap-3">
                  <div className="min-w-0 flex-1 text-body font-medium break-all">{webhookUrl}</div>
                  <CopyButton
                    value={webhookUrl}
                    aria-label="Copy the webhook address to the clipboard"
                    copiedLabel="Webhook address copied."
                    className={cn("h-9 shrink-0 px-4", ON_NAVY)}
                  >
                    <CopyIcon />
                  </CopyButton>
                </div>
              ) : (
                <p className="mt-2 max-w-none text-body text-navy-200">
                  Your address appears here once your store has a domain — the first scan on{" "}
                  <b className="font-medium">Products</b> sets it.
                </p>
              )}
            </div>

            <div className="mt-2.5 rounded-lg bg-navy-200/12 p-3.5">
              <div className="text-eyebrow uppercase text-navy-200">2 · webhook secret</div>
              {webhookSecret ? (
                <>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="min-w-0 flex-1 text-body font-medium break-all">
                      {webhookSecret}
                    </div>
                    <CopyButton
                      value={webhookSecret}
                      aria-label="Copy the webhook secret to the clipboard"
                      copiedLabel="Webhook secret copied."
                      className={cn("h-9 shrink-0 px-4", ON_NAVY)}
                    >
                      <CopyIcon />
                    </CopyButton>
                  </div>
                  {/* Asked, not just done: minting over an existing secret means a webhook
                      the merchant already configured stops verifying, silently, at the next
                      payment. A Popover asks in place and Escape leaves the panel alone. */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        className="mt-2 h-9 px-3 text-navy-200 hover:bg-navy-200/12 hover:text-navy-050"
                        disabled={busy !== null}
                      >
                        {busy === "secret" ? "Generating…" : "Generate a new one"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" side="top">
                      <PopoverHeader>
                        <PopoverTitle>Replace this webhook secret?</PopoverTitle>
                        <PopoverDescription>
                          The one Razorpay is signing with stops verifying the moment this is
                          replaced. You have to paste the new value into Razorpay before the next
                          payment, or orders get paid and never marked paid.
                        </PopoverDescription>
                      </PopoverHeader>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          onClick={() => void mintSecret()}
                          disabled={busy !== null}
                        >
                          Replace it
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </>
              ) : (
                <>
                  <p className="mt-2 max-w-none text-body text-navy-200">
                    Generate one here and paste it into Razorpay, or type the one you chose there
                    into the Webhook Secret box on the left. Either way Munim needs it to verify
                    that an event really came from Razorpay.
                  </p>
                  {/* Gated on the address: the secret is only useful pasted in beside it,
                      and until the first scan sets a domain there is nowhere to paste. */}
                  <Button
                    type="button"
                    className={cn("mt-3 h-9 w-full px-4", ON_NAVY)}
                    onClick={() => void mintSecret()}
                    disabled={busy !== null || !webhookUrl}
                  >
                    {busy === "secret" ? "Generating…" : "Generate webhook secret"}
                  </Button>
                </>
              )}
            </div>
          </div>

          <Panel>
            <h2 className="text-card-title">Subscribe to these events</h2>
            {events.length ? (
              <div className="mt-3.5 flex flex-wrap gap-2">
                {events.map(({ event, required }) => (
                  <span
                    key={event}
                    className="rounded-full bg-panel-2 px-3.5 py-1.5 text-meta font-medium"
                  >
                    {event}
                    {required ? null : (
                      <span className="font-normal text-muted-ink"> · optional</span>
                    )}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-3.5 max-w-none text-meta text-muted-ink">
                The server has not published an event list for your account yet.
              </p>
            )}
            {/* `last_event_was_test` has to stay named. A merchant who has only ever
                received our own test event has not proven Razorpay is configured, and
                "last event: payment.captured" alone would tell them they had. */}
            <p className="mt-3.5 max-w-none text-meta text-muted-ink">
              {received && lastType
                ? `Last event: ${lastType}${lastAt ? ` · ${moment(lastAt)}` : ""}${
                    lastWasTest ? " · Munim’s own test event, not one from Razorpay" : ""
                  }`
                : webhookSecret
                  ? "Setup isn’t finished until one arrives and its signature verifies."
                  : "Generate the webhook secret first — there is nothing to sign an event with yet."}
            </p>
            {/* A self-signed round trip to your own webhook URL. It proves this end verifies a
                signature; only a real Razorpay event proves the address was pasted right.
                Gated on the secret, because without one there is nothing to sign with. */}
            <Button
              type="button"
              variant="outline"
              className="mt-3.5 h-11 w-full"
              onClick={() => void testEvent()}
              disabled={busy !== null || !webhookSecret || !webhookUrl}
            >
              {busy === "test" ? "Sending…" : "Send a test event"}
            </Button>
          </Panel>
        </div>
      </div>
    </>
  );
}

function PageHeading() {
  return (
    <div>
      <h1 className="text-page-title">Razorpay payout</h1>
    </div>
  );
}

/**
 * A field label with its explanation folded into a `?` beside it. Three sentences of
 * where-to-find-this under three inputs turned the form into more prose than form; none of
 * it is needed once you know it, and all of it is needed the first time.
 *
 * `htmlFor` rather than wrapping the input in the `<label>`: the `?` is a real button, and a
 * button inside a label activates the label's control on every click.
 */
function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-1.5 px-1">
        <label htmlFor={htmlFor} className="text-eyebrow uppercase text-muted-ink">
          {label}
        </label>
        <Hint label={label}>{hint}</Hint>
      </div>
      {children}
    </div>
  );
}

/**
 * The `?` itself. Radix's tooltip opens on hover *and* on keyboard focus, which is the whole
 * reason the trigger is a `<button>` and not a bare icon — an explanation only a mouse can
 * reach is an explanation half the merchants never see (§7's objection to icons carrying
 * meaning alone). It stays a tooltip rather than a click-popover because nothing inside it is
 * interactive; on touch, where hover does not exist, `aria-label` is what a screen reader
 * announces and the copy is short enough to survive being read aloud.
 */
function Hint({
  label,
  aria,
  className,
  children,
}: {
  label: string;
  aria?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        aria-label={aria ?? `What goes in ${label}?`}
        className={cn(
          "grid place-items-center rounded-full transition-colors focus-visible:ring-3 focus-visible:ring-ring/30",
          className,
        )}
      >
        <CircleQuestionMarkIcon className="size-4" />
      </TooltipTrigger>

      <TooltipContent
        side="top"
        align="end"
        sideOffset={6}
        className="max-w-56 rounded-lg px-3 py-2 text-xs leading-snug text-pretty"
      >
        {children}
      </TooltipContent>
    </Tooltip>
  );
}