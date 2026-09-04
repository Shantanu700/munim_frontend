"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { KeyRoundIcon, ShieldCheckIcon, ShieldPlusIcon } from "lucide-react"

import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

/** Write, then read — the two halves of what used to be one Authorisations screen — then the
    buyer's own platform keys, which authorise their tools rather than an agent. */
const NAV = [
  { href: "/buyer", label: "Create mandate", icon: ShieldPlusIcon },
  { href: "/buyer/mandates", label: "Mandates", icon: ShieldCheckIcon },
  { href: "/buyer/api-keys", label: "API keys", icon: KeyRoundIcon },
] as const

/**
 * The buyer rail — no `getOrdersCounts`-style badge fetch and no `KillSwitch` (both
 * merchant/store concepts). Mirrors `components/app-sidebar.tsx`'s floating shape and
 * header glyph so the chrome reads as the same product either side of the role split.
 */
export function BuyerSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: React.ComponentProps<typeof NavUser>["user"]
}) {
  const pathname = usePathname()

  return (
    <Sidebar variant="floating" collapsible="icon" className="p-panel" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-1 py-1 group-data-[collapsible=icon]:px-0">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-navy-700 font-medium text-navy-050">
            म
          </span>
          <span className="text-section group-data-[collapsible=icon]:hidden">munim</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-eyebrow uppercase text-muted-ink">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.label}
                    className="rounded-md data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
