import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

// Outfit is the only typeface in the design (DESIGN.md §2). Weights 200–600 are
// the usable range; the variable font covers them from one request.
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "Munim",
  description: "Munim",
};

// Applies the saved theme before first paint, so a dark-mode reload never flashes the
// light page. It has to be inline and blocking — a deferred module runs after the first
// frame. Dark mode is a token swap on `.dark` (app/munim-theme.css §3); nothing else in
// the app reads or branches on the theme.
const NO_FLASH_THEME = `try{var t=localStorage.theme;if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme:dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the script above mutates <html>'s class list before React
    // hydrates, so the server-rendered className is expected not to match.
    <html lang="en" className={cn("h-full antialiased", outfit.variable)} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        {/* One Toaster for the whole app — a second one anywhere duplicates every toast. */}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
