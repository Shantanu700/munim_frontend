"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
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

/** The one item carrying a live count. Matched by route so `NAV` stays a plain list. */
const ORDERS = "/dashboard/orders"

/**
 * DESIGN.md §7 says no icon sets. This rail is the sanctioned exception (§7's amendment):
 * icons are a navigation affordance here, and every one of them still sits beside its
 * label, so nothing is carried by the glyph alone.
 *
 * `#` marks a destination that has no route yet — Settings and Help.
 */
const NAV = [
  {
    label: "Menu",
    items: [
      { title: "Overview", url: "/dashboard", icon: LayoutDashboardIcon },
      { title: "Orders", url: ORDERS, icon: ShoppingBagIcon },
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

  /**
   * How many orders need the merchant to do something — the same `needs_attention` count the
   * orders screen's pill shows, so the rail cannot contradict the screen it links to.
   *
   * Fetched here rather than threaded down from the layout: this is the only consumer, and
   * one number does not need a prop through two components. Silent on failure — the endpoint
   * 404s for a buyer, and a rail badge is not worth a toast over whatever screen is open.
   */
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
    // `floating` is the design's shape: a rounded --panel inset from the page, not a
    // flush full-height rail. p-panel overrides the variant's 8px so the inset — and the
    // gap to the content beside it — is the mandated 6px.
    <Sidebar variant="floating" collapsible="icon" className="p-panel" {...props}>
      <SidebarHeader>
        {/* Aligns the glyph with the icon column below it. SidebarHeader already applies
            p-2, and a menu button adds px-3 on top of its group's p-2 — so matching the
            expanded icons needs 4px more here, and matching the collapsed ones needs 0. */}
        <div className="flex items-center gap-2.5 px-1 py-1 group-data-[collapsible=icon]:px-0">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-navy-700 font-medium text-navy-050">
            म
          </span>
          <span className="text-section group-data-[collapsible=icon]:hidden">munim</span>
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
                      {/* The active row is a filled navy pill in the design, where shadcn's
                          default `isActive` paints only the faint accent surface. */}
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
                      {/* Only when there is something to act on: a badge reading 0 sends a
                          merchant looking for work that is not there. */}
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
