"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { toast } from "sonner";

import {
  getCoreLogin,
  postCoreGoogle,
  postCoreLogin,
  postCoreRegister,
  type UserRoleEnum,
} from "@/src/client";
import { basicAuth, describeApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }): void;
          renderButton(
            parent: HTMLElement,
            options: {
              theme?: "outline" | "filled_blue" | "filled_black";
              shape?: "rectangular" | "pill";
              size?: "small" | "medium" | "large";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              width?: number;
            }
          ): void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

type Role = "merchant" | "buyer";
type Mode = "login" | "register";

const USER_ROLE: Record<Role, 2 | 3> = { merchant: 2, buyer: 3 };

const COPY = {
  merchant: {
    word: "Merchant",
    eyebrow: "for merchants",
    title: "Your catalogue, readable and buyable by AI assistants",
    body: "Munim reads the structured data your product pages already publish, fills the gaps, and gives you one endpoint agents can transact against.",
    stats: [
      { value: "1,284", label: "stores live" },
      { value: "96%", label: "ready to sell" },
      { value: "4 min", label: "to first sale" },
    ],
    toggleHint: "Sell to AI agents",
    nameLabel: "Store name",
    namePlaceholder: "Your store name",
    emailPlaceholder: "you@yourstore.com",
    registerSub:
      "Two steps after this: make your store agent-readable, then connect your Razorpay payout account.",
    registerNote:
      "You will need your store URL and your Razorpay account to finish setup.",
    loginNote:
      "Signing in returns you to your catalogue, your agent endpoint and your payout status.",
    switchPromptRegister: "Already selling on Munim?",
  },
  buyer: {
    word: "Buyer",
    eyebrow: "for buyers",
    title: "Buy from real Indian stores through the assistant you already use",
    body: "Every order carries a verified merchant, a real price, and a payment trail you can check line by line.",
    stats: [
      { value: "312", label: "agents connected" },
      { value: "₹0", label: "platform fee" },
      { value: "100%", label: "orders traceable" },
    ],
    toggleHint: "Buy through an agent",
    nameLabel: "Full name",
    namePlaceholder: "Your full name",
    emailPlaceholder: "you@email.com",
    registerSub: "One account works across every assistant you connect it to.",
    registerNote:
      "You will confirm one assistant connection before your first order.",
    loginNote:
      "Signing in returns you to your linked assistants and your full order history.",
    switchPromptRegister: "Already have a Munim account?",
  },
} satisfies Record<Role, unknown>;

const OFFLINE = "Could not reach the server. Check your connection and try again.";

function destinationFor(role?: UserRoleEnum) {
  return role === USER_ROLE.buyer ? "/buyer" : "/dashboard";
}

const EYEBROW = "text-eyebrow uppercase text-muted-ink";
const FIELD = "mt-2 h-auto rounded-md bg-panel-2 px-4 py-3.5 text-body md:text-body";
const FIELD_ROW = "grid gap-[14px] sm:grid-cols-2";

function FieldShell({
  label,
  htmlFor,
  aside,
  children,
}: {
  label: string;
  htmlFor: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex min-h-[1lh] items-baseline justify-between gap-2.5 text-meta">
        <label htmlFor={htmlFor} className={EYEBROW}>
          {label}
        </label>
        {aside}
      </div>
      {children}
    </div>
  );
}

export default function AuthPage() {
  const router = useRouter();
  const confirmRef = React.useRef<HTMLInputElement>(null);
  const googleRef = React.useRef<HTMLDivElement>(null);
  const [role, setRole] = React.useState<Role>("merchant");
  const [mode, setMode] = React.useState<Mode>("login");
  const [showPw, setShowPw] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [mismatch, setMismatch] = React.useState(false);

  const copy = COPY[role];
  const isRegister = mode === "register";
  const lowerWord = copy.word.toLowerCase();

  function reset<T>(setter: (value: T) => void) {
    return (value: T) => {
      toast.dismiss();
      setMismatch(false);
      setter(value);
    };
  }

  React.useEffect(() => {
    let active = true;
    getCoreLogin()
      .then(({ data }) => data && active && router.replace(destinationFor(data.user_role)))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [router]);

  function initGoogle() {
    if (!GOOGLE_CLIENT_ID || !googleRef.current || !window.google) return;
    const google = window.google;
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async ({ credential }) => {
        setPending(true);
        const id = toast.loading("Signing you in with Google…");
        try {
          const { data, error: apiError } = await postCoreGoogle({ body: { id_token: credential } });
          if (apiError) return toast.error(describeApiError(apiError), { id });
          toast.success("Signed in. Taking you to your dashboard…", { id });
          router.replace(destinationFor(data?.user_role));
        } catch {
          toast.error(OFFLINE, { id });
        } finally {
          setPending(false);
        }
      },
    });
    requestAnimationFrame(() => {
      const box = googleRef.current;
      if (!box) return;
      google.accounts.id.renderButton(box, {
        theme: "outline",
        shape: "pill",
        size: "large",
        text: "continue_with",
        width: Math.min(400, Math.max(200, box.offsetWidth)),
      });
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    if (isRegister && password !== String(form.get("confirmPassword") ?? "")) {
      toast.error("Those two passwords do not match. Retype them and try again.");
      setMismatch(true);
      confirmRef.current?.focus();
      return;
    }

    setMismatch(false);
    setPending(true);
    const id = toast.loading(isRegister ? "Creating your account…" : "Signing you in…");
    try {
      if (isRegister) {
        const { error: apiError } = await postCoreRegister({
          body: {
            username: email,
            name: String(form.get("name") ?? ""),
            email,
            password,
            user_role: USER_ROLE[role],
          },
        });
        if (apiError) return toast.error(describeApiError(apiError), { id });
        toast.loading("Account created. Signing you in…", { id });
      }

      const { data: session, error: loginError } = await postCoreLogin({
        headers: { Authorization: basicAuth(email, password) },
      });
      if (loginError) return toast.error(describeApiError(loginError), { id });
      toast.success(
        isRegister ? `Welcome to Munim, ${lowerWord}.` : "Welcome back.",
        { id, description: "Taking you to your dashboard…" }
      );
      router.replace(destinationFor(session?.user_role));
    } catch {
      toast.error(OFFLINE, { id });
    } finally {
      setPending(false);
    }
  }

  const passwordInput = (
    <div className="mt-2 flex items-center gap-2.5 rounded-md bg-panel-2 px-4 focus-within:ring-3 focus-within:ring-ring/30">
      <Input
        id="auth-password"
        name="password"
        type={showPw ? "text" : "password"}
        required
        minLength={isRegister ? 8 : undefined}
        aria-invalid={mismatch || undefined}
        autoComplete={isRegister ? "new-password" : "current-password"}
        placeholder={showPw ? "minimum 8 characters" : "••••••••"}
        className="h-auto flex-1 rounded-none bg-transparent px-0 py-3.5 text-body focus-visible:border-transparent focus-visible:ring-0 md:text-body"
      />
      <button
        type="button"
        aria-pressed={showPw}
        aria-label={showPw ? "Hide password" : "Show password"}
        onClick={() => setShowPw((value) => !value)}
        className="cursor-pointer text-meta font-medium text-muted-ink focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
      >
        {showPw ? "Hide" : "Show"}
      </button>
    </div>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground sm:p-8 lg:p-11">
      <div className="grid w-full max-w-[1240px] grid-cols-1 gap-panel rounded-xl bg-navy-900 p-panel text-navy-050 shadow-card sm:p-3 lg:grid-cols-2">
        <div className="flex flex-col p-6 sm:p-8 lg:p-11">
          <div className="flex items-center gap-[11px]">
            <span className="flex size-[34px] items-center justify-center rounded-md bg-navy-200 text-card-title text-navy-900">
              म
            </span>
            <span className="text-section font-semibold tracking-tight">munim</span>
          </div>

          <div className="mt-8 inline-flex items-center gap-2 self-start rounded-pill bg-navy-200/12 px-4 py-2 lg:mt-11">
            <span className="size-[7px] rounded-full bg-navy-200" />
            <span className="text-eyebrow uppercase text-navy-200">{copy.eyebrow}</span>
          </div>

          <h1 className="mt-[18px] max-w-[420px] text-headline text-pretty">{copy.title}</h1>
          <p className="mt-[14px] max-w-[420px] text-body text-navy-200 text-pretty">
            {copy.body}
          </p>

          <div className="mt-auto grid grid-cols-3 gap-panel pt-8 lg:pt-11">
            {copy.stats.map((stat) => (
              <div key={stat.label} className="rounded-lg bg-navy-200/12 p-3 sm:p-4">
                <div className="text-panel leading-none tabular-nums">{stat.value}</div>
                <div className="mt-2.5 text-eyebrow uppercase text-navy-200">{stat.label}</div>
              </div>
            ))}
          </div>

          <p className="mt-[22px] max-w-none text-meta text-navy-200">
            Payouts settle through Razorpay. Munim never holds your money.
          </p>
        </div>

        <div className="flex flex-col rounded-xl bg-panel p-6 text-foreground shadow-card sm:p-8 lg:p-11">
          <fieldset>
            <legend className={EYEBROW}>I am signing in as</legend>
            <div className="mt-2.5 grid grid-cols-2 gap-panel">
              {(Object.keys(COPY) as Role[]).map((key) => {
                const selected = role === key;
                return (
                  <label
                    key={key}
                    className={cn(
                      "cursor-pointer rounded-lg px-3.5 py-3.5 transition-colors sm:px-[18px] sm:py-4",
                      "focus-within:ring-3 focus-within:ring-ring/30",
                      selected ? "bg-tile text-tile-foreground" : "bg-panel-2 text-foreground"
                    )}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={key}
                      checked={selected}
                      onChange={() => reset(setRole)(key)}
                      className="sr-only"
                    />
                    <span className="flex items-center justify-between gap-2.5">
                      <span className="text-body font-medium">{COPY[key].word}</span>
                      <span
                        aria-hidden
                        className={cn(
                          "flex size-[18px] items-center justify-center rounded-full text-[11px]",
                          selected ? "bg-navy-200 text-tile" : "border-[1.5px] border-rule"
                        )}
                      >
                        {selected ? "✓" : ""}
                      </span>
                    </span>
                    <span className="mt-1.5 block text-meta leading-[1.5] opacity-72">
                      {COPY[key].toggleHint}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <h2 className="mt-[22px] text-section font-normal">
            {isRegister ? `Create your ${lowerWord} account` : "Welcome back"}
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="mt-6 grid gap-[14px]">
              {isRegister ? (
                <>
                  <div className={FIELD_ROW}>
                    <FieldShell label={copy.nameLabel} htmlFor="auth-name">
                      <Input
                        id="auth-name"
                        name="name"
                        type="text"
                        required
                        autoComplete={role === "merchant" ? "organization" : "name"}
                        placeholder={copy.namePlaceholder}
                        className={FIELD}
                      />
                    </FieldShell>
                    <FieldShell label="Email" htmlFor="auth-email">
                      <Input
                        id="auth-email"
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        placeholder={copy.emailPlaceholder}
                        className={FIELD}
                      />
                    </FieldShell>
                  </div>
                  <div className={FIELD_ROW}>
                    <FieldShell label="Password" htmlFor="auth-password">
                      {passwordInput}
                    </FieldShell>
                    <FieldShell label="Confirm password" htmlFor="auth-confirm">
                      <Input
                        ref={confirmRef}
                        id="auth-confirm"
                        name="confirmPassword"
                        type={showPw ? "text" : "password"}
                        required
                        minLength={8}
                        aria-invalid={mismatch || undefined}
                        autoComplete="new-password"
                        placeholder={showPw ? "retype it" : "••••••••"}
                        className={FIELD}
                      />
                    </FieldShell>
                  </div>
                </>
              ) : (
                <>
                  <FieldShell label="Email" htmlFor="auth-email">
                    <Input
                      id="auth-email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder={copy.emailPlaceholder}
                      className={FIELD}
                    />
                  </FieldShell>
                  <FieldShell
                    label="Password"
                    htmlFor="auth-password"
                  >
                    {passwordInput}
                  </FieldShell>
                </>
              )}
            </div>

            <Button
              type="submit"
              disabled={pending}
              className="mt-[22px] mx-auto flex h-11 w-full max-w-100 text-pretty"
            >
              {pending
                ? "Working…"
                : isRegister
                  ? `Create ${lowerWord} account`
                  : `Log in as ${copy.word}`}
            </Button>
          </form>

          {GOOGLE_CLIENT_ID && (
            <>
              <div className="mt-[22px] mx-auto flex w-full max-w-100 items-center gap-[14px]">
                <span className="h-px flex-1 bg-rule" />
                <span className="text-meta text-muted-ink">or</span>
                <span className="h-px flex-1 bg-rule" />
              </div>

              <Script
                src="https://accounts.google.com/gsi/client"
                strategy="afterInteractive"
                onReady={initGoogle}
              />
              <div
                ref={googleRef}
                className="mt-[14px] mx-auto flex min-h-11 w-full max-w-100 justify-center [&>div]:flex [&>div]:justify-center"
              />
            </>
          )}

          <p className="mt-[22px] max-w-none text-center text-dense text-muted-ink">
            {isRegister ? copy.switchPromptRegister : "New to Munim?"}{" "}
            <button
              type="button"
              onClick={() => reset(setMode)(isRegister ? "login" : "register")}
              className="cursor-pointer font-medium text-accent-ink hover:text-muted-ink focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
            >
              {isRegister ? "Log in" : `Create a ${lowerWord} account`}
            </button>
          </p>

          <div className="mt-[22px] flex flex-wrap items-center gap-x-[18px] gap-y-1.5 border-t border-rule pt-[22px]">
            <span className="text-meta text-muted-ink">Razorpay settlement</span>
            <span className="text-meta text-muted-ink">MCP endpoint</span>
            <span className="text-meta text-muted-ink">India-hosted data</span>
          </div>
        </div>
      </div>
    </div>
  );
}
