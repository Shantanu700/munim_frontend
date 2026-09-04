"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { getCoreLogin, getPolicyOverview, putPolicyKillSwitch, type Login } from "@/src/client";
import { describeApiError } from "@/lib/api";
import { AppSidebar } from "@/components/app-sidebar";
import { SessionContext } from "@/components/dashboard/session";
import { Topbar } from "@/components/dashboard/topbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

/**
 * The auth guard for everything under /dashboard.
 *
 * This has to run in the browser: the `sessionid` cookie belongs to the API origin, so
 * middleware on the Next server cannot see it. GET /core/login/ is the only way to ask
 * whether the cookie we hold is still a session.
 */
export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const router = useRouter();
  const [user, setUser] = React.useState<Login | null>(null);
  // Shared by the topbar's agent-traffic switch and the sidebar's kill switch. Two copies
  // of one boolean would disagree, and the layout already renders both — so it lives here
  // rather than in a context.
  //
  // It is now real: `PUT /policy/kill-switch/` arms and disarms the gate store-wide, and
  // `GET /policy/overview/` is the only endpoint that reports its current position (the
  // login payload's `merchant` does not carry it). That read is why the overview is fetched
  // here as well as on the policy screen — a safety control that shows the wrong position
  // after a reload is worse than one that costs an extra request.
  const [agentsOn, setAgentsOn] = React.useState(true);

  const toggleAgents = React.useCallback(async () => {
    // Optimistic, and deliberately so: this is the one control a merchant may be reaching
    // for in a hurry, and a switch that waits on a round trip reads as broken. A failure
    // puts it back and says so, rather than leaving it showing a state the gate is not in.
    const next = !agentsOn;
    setAgentsOn(next);
    try {
      const { data, error } = await putPolicyKillSwitch({ body: { agent_traffic_enabled: next } });
      if (!data) {
        setAgentsOn(!next);
        toast.error(describeApiError(error));
        return;
      }
      setAgentsOn(data.agent_traffic_enabled);
      if (data.agent_traffic_enabled) {
        toast.success("Agent purchases resumed, under your store policy and each buyer's mandate.");
      } else {
        toast.warning("Agent purchases stopped. Every agent checkout now refuses with STORE_AGENTS_DISABLED.");
      }
    } catch {
      setAgentsOn(!next);
      toast.error("Could not reach the server, so agent traffic is unchanged.");
    }
  }, [agentsOn]);

  // The guard cannot tell an expired session from never having had one, so the copy has to
  // be true of both. A fixed id keeps StrictMode's double-invoke to one toast.
  const bounce = React.useCallback(() => {
    toast.info("Sign in to open your dashboard.", { id: "dashboard-auth" });
    router.replace("/auth");
  }, [router]);

  React.useEffect(() => {
    let active = true;
    getCoreLogin()
      .then(({ data }) => {
        if (!active) return;
        if (!data) return bounce();
        // Buyer = 3 (UserRoleEnum). This is the other half of app/buyer/layout.tsx's own
        // role check — that guard bounces a merchant here, this one bounces a buyer there,
        // and neither can rely on the other having already run.
        if (data.user_role === 3) return void router.replace("/buyer");
        setUser(data);
      })
      .catch(() => active && bounce());

    // Separate from the guard, not chained onto it: this 404s for a buyer and must not be
    // able to bounce a perfectly good session. It fails silently — the switch keeps its
    // default position, and the policy screen is where a merchant is told about a policy
    // API that cannot be reached.
    getPolicyOverview()
      .then(({ data }) => {
        if (active && data) setAgentsOn(data.agent_traffic_enabled);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [bounce, router]);

  // Render nothing until we know — showing the shell to a signed-out visitor, even for a
  // frame, leaks the layout and then yanks it away.
  if (!user) return null;

  return (
    // h-svh, not the provider's default min-h-svh: the shell is pinned to the viewport so
    // the topbar stays put and each screen owns its own scrolling. A long page (Overview)
    // scrolls the region below the topbar; a page that wants to fill the screen exactly
    // (Products) takes `xl:h-full` and scrolls its own list instead.
    <SidebarProvider className="h-svh overflow-hidden">
      <AppSidebar user={user} agentsOn={agentsOn} onToggleAgents={toggleAgents} />
      <SidebarInset className="min-w-0 bg-background">
        {/* The topbar lives here, not in the page, so every screen under /dashboard gets
            the same search, agent-traffic switch, theme toggle and account block. */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-panel p-panel md:pl-0">
          <Topbar user={user} merchant={user.merchant} agentsOn={agentsOn} onToggleAgents={toggleAgents} />
          {/* A div, not a <main> — SidebarInset already renders the page's <main>. */}
          <div className="flex min-h-0 flex-1 flex-col gap-panel overflow-y-auto">
            {/* Only reached after `user` resolved, so every screen below can rely on it.
                Nothing consumes it at the moment: the Razorpay screen used to read
                `merchant.webhook_url` and `merchant.is_payment_ready` from here, and now
                gets those and fourteen more fields from `GET /core/razorpay/`. Kept rather
                than deleted — a screen needing the signed-in user is one route away. */}
            <SessionContext value={user}>{children}</SessionContext>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
