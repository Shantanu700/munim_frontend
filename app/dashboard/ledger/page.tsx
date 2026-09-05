import { Ledger } from "@/components/dashboard/ledger";

export default async function LedgerPage({ searchParams }: PageProps<"/dashboard/ledger">) {
  const seq = Number((await searchParams).seq) || undefined;

  return <Ledger seq={seq} />;
}
