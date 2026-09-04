"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

/**
 * Sonner's own `theme` is pinned to "light" so it keeps its neutral shell and the colours
 * come from our vars below — `--popover`/`--border` already flip with the `.dark` class.
 * That is also why the registry's `useTheme()` is gone: nothing in this app sets a theme,
 * and "system" would darken the toast on a light page.
 *
 * `richColors` is a deliberate exception to DESIGN.md's no-red/green rule, asked for so a
 * failure reads as one at a glance: error red, warning amber, success green, info blue.
 * It only paints the *typed* toasts — a plain `toast()` still gets the vars below.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      richColors
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
