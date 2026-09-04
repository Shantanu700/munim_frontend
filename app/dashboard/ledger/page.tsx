import { Ledger } from "@/components/dashboard/ledger";

/**
 * The layout above is a client component, but a page arrives as its `children` and is still
 * rendered on the server — so `searchParams` can be awaited here and `useSearchParams` (and
 * the Suspense boundary it drags in) is not needed. Same reason `app/dashboard/page.tsx`
 * reads `?empty=1` this way.
 *
 * `?seq=` opens one entry: it is where the orders screen's "See decision N" points. `Number`
 * of anything unparseable is `NaN`, and `NaN || undefined` is `undefined` — so a hand-typed
 * `?seq=banana` falls through to the ordinary newest-first screen rather than erroring. Entry
 * 0 does not exist (the chain starts at 1), so `0` falling through the same way is right too.
 */
export default async function LedgerPage({ searchParams }: PageProps<"/dashboard/ledger">) {
  const seq = Number((await searchParams).seq) || undefined;

  return <Ledger seq={seq} />;
}
