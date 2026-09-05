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

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const router = useRouter();
  const [user, setUser] = React.useState<Login | null>(null);
  const [agentsOn, setAgentsOn] = React.useState(true);

  const toggleAgents = React.useCallback(async () => {
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
        if (data.user_role === 3) return void router.replace("/buyer");
        setUser(data);
      })
      .catch(() => active && bounce());

    getPolicyOverview()
      .then(({ data }) => {
        if (active && data) setAgentsOn(data.agent_traffic_enabled);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [bounce, router]);

  if (!user) return null;

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <AppSidebar user={user} agentsOn={agentsOn} onToggleAgents={toggleAgents} />
      <SidebarInset className="min-w-0 bg-background">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-panel p-panel md:pl-0">
          <Topbar user={user} merchant={user.merchant} agentsOn={agentsOn} onToggleAgents={toggleAgents} />
          <div className="flex min-h-0 flex-1 flex-col gap-panel overflow-y-auto">
            <SessionContext value={user}>{children}</SessionContext>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
