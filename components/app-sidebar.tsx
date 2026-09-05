"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BanknoteIcon,
  CircleQuestionMarkIcon,
  CreditCardIcon,
  LayoutDashboardIcon,
  PackageIcon,
  ScrollTextIcon,
  Settings2Icon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  WebhookIcon,
} from "lucide-react"

import { KillSwitch } from "@/components/dashboard/kill-switch"
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
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { getOrdersCounts } from "@/src/client"

const ORDERS = "/dashboard/orders"

const NAV = [
  {
    label: "Menu",
    items: [
      { title: "Overview", url: "/dashboard", icon: LayoutDashboardIcon },
      { title: "Orders", url: ORDERS, icon: ShoppingBagIcon },
      { title: "Payments", url: "/dashboard/payments", icon: BanknoteIcon },
      { title: "Products", url: "/dashboard/products", icon: PackageIcon },
      { title: "Ledger", url: "/dashboard/ledger", icon: ScrollTextIcon },
      { title: "Policy", url: "/dashboard/policy", icon: ShieldCheckIcon },
    ],
  },
  {
    label: "General",
    items: [
      { title: "Webhook responses", url: "/dashboard/webhooks", icon: WebhookIcon },
      { title: "Razorpay settings", url: "/dashboard/razorpay", icon: CreditCardIcon },
      { title: "Settings", url: "#", icon: Settings2Icon },
      { title: "Help", url: "#", icon: CircleQuestionMarkIcon },
    ],
  },
]

export function AppSidebar({
  user,
  agentsOn,
  onToggleAgents,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: React.ComponentProps<typeof NavUser>["user"]
  agentsOn: boolean
  onToggleAgents: () => void
}) {
  const pathname = usePathname()
  const [attention, setAttention] = React.useState(0)

  React.useEffect(() => {
    let active = true
    getOrdersCounts()
      .then(({ data }) => {
        if (active && data) setAttention(data.by_status.needs_attention ?? 0)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  return (
    <Sidebar variant="floating" collapsible="icon" className="p-panel" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-1 py-1 group-data-[collapsible=icon]:px-0">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-navy-700 font-medium text-navy-050">
            म
          </span>
          <span className="text-section font-semibold tracking-tight group-data-[collapsible=icon]:hidden">munim</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {NAV.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-eyebrow uppercase text-muted-ink">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = item.icon
                  const isActive = item.url !== "#" && pathname === item.url
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.title}
                        className="rounded-md data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
                      >
                        <Link href={item.url}>
                          <Icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                      {item.url === ORDERS && attention ? (
                        <SidebarMenuBadge>{attention}</SidebarMenuBadge>
                      ) : null}
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <KillSwitch agentsOn={agentsOn} onToggle={onToggleAgents} />
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
