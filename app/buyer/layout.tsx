"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { getCoreLogin, type Login } from "@/src/client";
import { BuyerSidebar } from "@/components/buyer-sidebar";
import { SessionContext } from "@/components/dashboard/session";
import { Topbar } from "@/components/buyer/topbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

const BUYER = 3;

/**
 * The auth *and role* guard for everything under /buyer — same shape as
 * `app/dashboard/layout.tsx` and for the same reason: the `sessionid` cookie belongs to
 * the API origin, so only a client-side `GET /core/login/` can tell who is signed in.
 *
 * The role check is what stops a merchant from reaching a buyer URL by typing it (and,
 * symmetrically, `app/dashboard/layout.tsx` bounces a buyer the other way) — both guards
 * re-check on every mount, since neither can rely on the other having run.
 */
export default function BuyerLayout({ children }: LayoutProps<"/buyer">) {
  const router = useRouter();
  const [user, setUser] = React.useState<Login | null>(null);

  const bounce = React.useCallback(() => {
    toast.info("Sign in to open your dashboard.", { id: "buyer-auth" });
    router.replace("/auth");
  }, [router]);

  React.useEffect(() => {
    let active = true;
    getCoreLogin()
      .then(({ data }) => {
        if (!active) return;
        if (!data) return bounce();
        if (data.user_role !== BUYER) return void router.replace("/dashboard");
        setUser(data);
      })
      .catch(() => active && bounce());
    return () => {
      active = false;
    };
  }, [bounce, router]);

  if (!user) return null;

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <BuyerSidebar user={user} />
      <SidebarInset className="min-w-0 bg-background">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-panel p-panel md:pl-0">
          <Topbar user={user} />
          <div className="flex min-h-0 flex-1 flex-col gap-panel overflow-y-auto">
            <SessionContext value={user}>{children}</SessionContext>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
