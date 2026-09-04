"use client";

import * as React from "react";
import { MoonIcon, SunIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Light/dark switch.
 *
 * There is no `next-themes` here on purpose — it was removed from `components/ui/sonner.tsx`
 * because its "system" fallback darkened toasts on a light page. Dark mode is a pure token
 * swap (`app/munim-theme.css` §3), so the whole mechanism is one class on <html>, and the
 * matching no-flash script that applies it before first paint lives in `app/layout.tsx`.
 *
 * The class on <html> is the single source of truth — that script may already have set it
 * before React ever runs — so this subscribes to the DOM rather than mirroring it into
 * state. `useSyncExternalStore` is also the one hook that hydrates a browser-only value
 * without either a mismatch or a setState-in-effect.
 */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

const isDark = () => document.documentElement.classList.contains("dark");

export function ThemeToggle() {
  // The server cannot know which class the inline script added, so it always assumes light
  // and React reconciles on hydration.
  const dark = React.useSyncExternalStore(subscribe, isDark, () => false);

  function toggle() {
    const next = !isDark();
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.theme = next ? "dark" : "light";
    } catch {
      // Private mode or blocked storage: the toggle still works, it just will not persist.
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-pressed={dark}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </Button>
  );
}
