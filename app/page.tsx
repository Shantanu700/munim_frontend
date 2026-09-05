import type { Metadata } from "next";

import { Landing } from "@/components/landing";

export const metadata: Metadata = {
  title: "Munim — let AI agents buy from your store, safely",
  description:
    "Munim sits between the agent and your checkout. You write the rules once; every attempt is checked against them and every verdict is appended to a ledger you can show anyone.",
};

export default function Home() {
  return <Landing />;
}
