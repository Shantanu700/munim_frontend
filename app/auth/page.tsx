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

/**
 * The three Google Identity Services calls this page makes. @types/google.one-tap exists
 * but is not worth a dependency for one object.
 */
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

/** UserRoleEnum from the API schema: 1 Admin, 2 Merchant, 3 Buyer. */
const USER_ROLE: Record<Role, 2 | 3> = { merchant: 2, buyer: 3 };

/** Copy is lifted verbatim from the design's renderVals() so the two stay comparable. */
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
    namePlaceholder: "Shop Rabistha",
    emailPlaceholder: "you@shoprabistha.com",
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
    namePlaceholder: "Rabistha Sen",
    emailPlaceholder: "you@email.com",
    registerSub: "One account works across every assistant you connect it to.",
    registerNote:
      "You will confirm one assistant connection before your first order.",
    loginNote:
      "Signing in returns you to your linked assistants and your full order history.",
    switchPromptRegister: "Already have a Munim account?",
  },
} satisfies Record<Role, unknown>;

/** Every fetch here fails the same way, so the copy for it lives in one place. */
const OFFLINE = "Could not reach the server. Check your connection and try again.";

/**
 * Where a signed-in user lands. `user_role` comes back on every login-shaped response
 * (`postCoreLogin`, `postCoreRegister`→login, `postCoreGoogle`, `getCoreLogin`), so this
 * reads the server's own answer rather than the form's `role` radio — Google sign-in has
 * no radio to read from, and only the server knows what a returning account actually is.
 */
function destinationFor(role?: UserRoleEnum) {
  return role === USER_ROLE.buyer ? "/buyer" : "/dashboard";
}

const EYEBROW = "text-eyebrow uppercase text-muted-ink";
const FIELD = "mt-2 h-auto rounded-md bg-panel-2 px-4 py-3.5 text-body md:text-body";
/** Two field rows in both modes, so the panel height never depends on the mode. */
const FIELD_ROW = "grid gap-[14px] sm:grid-cols-2";

/**
 * Label row + control. The header carries `text-meta min-h-[1lh]` so its height comes
 * from the row's own line-height rather than from whatever is in `aside` — that is what
 * lets "Forgot password?" appear in login only without resizing the field.
 */
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

  /** Switching role or mode invalidates whatever the last attempt complained about. */
  function reset<T>(setter: (value: T) => void) {
    return (value: T) => {
      toast.dismiss();
      setMismatch(false);
      setter(value);
    };
  }

  // Already signed in? Skip the form. This is also what makes the /dashboard guard's
  // redirect here non-circular: it only sends people back when the session is really gone.
  React.useEffect(() => {
    let active = true;
    getCoreLogin()
      .then(({ data }) => data && active && router.replace(destinationFor(data.user_role)))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [router]);

  /** GIS hands back a JWT in `credential`; that is the `id_token` /core/google/ wants. */
  function initGoogle() {
    if (!GOOGLE_CLIENT_ID || !googleRef.current || !window.google) return;
    window.google.accounts.id.initialize({
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
    // 400 is GIS's maximum; it replaces the node's contents, so a second call is harmless.
    window.google.accounts.id.renderButton(googleRef.current, {
      theme: "outline",
      shape: "pill",
      size: "large",
      text: "continue_with",
      width: 400,
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
    // One toast id for the whole attempt: register → login is two requests but one story,
    // so the second stage updates the first toast instead of stacking a new one.
    const id = toast.loading(isRegister ? "Creating your account…" : "Signing you in…");
    try {
      if (isRegister) {
        // `username` is required by AbstractUser but unused for auth (USERNAME_FIELD is
        // email), so it carries the email to satisfy its uniqueness.
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

      // Register returns the account, not a session, so both modes log in here — otherwise
      // a freshly registered user would be bounced straight back by the /dashboard guard.
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
      {/* One toggle reveals both password fields — they have to be compared to be checked. */}
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
    <div className="flex min-h-screen items-center justify-center bg-background p-11 text-foreground">
      {/* dark hero panel — the one dark panel this screen is allowed (DESIGN.md §1 rule 5) — wraps the form card */}
      <div className="grid w-full max-w-[1240px] grid-cols-1 gap-panel rounded-xl bg-navy-900 p-3 text-navy-050 shadow-card lg:grid-cols-2">
        <div className="flex flex-col p-11">
          <div className="flex items-center gap-[11px]">
            <span className="flex size-[34px] items-center justify-center rounded-md bg-navy-200 text-card-title text-navy-900">
              म
            </span>
            <span className="text-section">munim</span>
          </div>

          <div className="mt-11 inline-flex items-center gap-2 self-start rounded-pill bg-navy-200/12 px-4 py-2">
            <span className="size-[7px] rounded-full bg-navy-200" />
            <span className="text-eyebrow uppercase text-navy-200">{copy.eyebrow}</span>
          </div>

          <h1 className="mt-[18px] max-w-[420px] text-headline text-pretty">{copy.title}</h1>
          <p className="mt-[14px] max-w-[420px] text-body text-navy-200 text-pretty">
            {copy.body}
          </p>

          <div className="mt-auto grid grid-cols-3 gap-panel pt-11">
            {copy.stats.map((stat) => (
              <div key={stat.label} className="rounded-lg bg-navy-200/12 p-[16px]">
                <div className="text-panel leading-none tabular-nums text-2xl">{stat.value}</div>
                <div className="mt-2.5 text-eyebrow uppercase text-navy-200">{stat.label}</div>
              </div>
            ))}
          </div>

          <p className="mt-[22px] max-w-none text-meta text-navy-200">
            Payouts settle through Razorpay. Munim never holds your money.
          </p>
        </div>

        <div className="flex flex-col rounded-xl bg-panel p-11 text-foreground shadow-card">
          {/* account type — native radios keep keyboard and screen-reader behaviour */}
          <fieldset>
            <legend className={EYEBROW}>I am signing in as</legend>
            <div className="mt-2.5 grid grid-cols-2 gap-panel">
              {(Object.keys(COPY) as Role[]).map((key) => {
                const selected = role === key;
                return (
                  <label
                    key={key}
                    className={cn(
                      "cursor-pointer rounded-lg px-[18px] py-4 transition-colors",
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

          {/* Mode is switched only by the text link at the foot of the panel. */}
          <h2 className="mt-[22px] text-section font-normal">
            {isRegister ? `Create your ${lowerWord} account` : "Welcome back"}
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="mt-6 grid gap-[14px]">
              {/* Register pairs its four fields into the same two rows login uses for two. */}
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

            <Button type="submit" disabled={pending} className="mt-[22px] h-11 w-full text-pretty">
              {pending
                ? "Working…"
                : isRegister
                  ? `Create ${lowerWord} account`
                  : `Log in as ${copy.word}`}
            </Button>
          </form>

          {/* No client id configured means no Google: an empty one makes GIS render
              nothing and log to the console, which reads as a broken button. */}
          {GOOGLE_CLIENT_ID && (
            <>
              <div className="mt-[22px] flex items-center gap-[14px]">
                <span className="h-px flex-1 bg-rule" />
                <span className="text-meta text-muted-ink">or</span>
                <span className="h-px flex-1 bg-rule" />
              </div>

              <Script
                src="https://accounts.google.com/gsi/client"
                strategy="afterInteractive"
                onReady={initGoogle}
              />
              <div ref={googleRef} className="mt-[14px] flex min-h-11 justify-center" />
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

          <div className="mt-[22px] flex items-center gap-[18px] border-t border-rule pt-[22px]">
            <span className="text-meta text-muted-ink">Razorpay settlement</span>
            <span className="text-meta text-muted-ink">MCP endpoint</span>
            <span className="text-meta text-muted-ink">India-hosted data</span>
          </div>
        </div>
      </div>
    </div>
  );
}
