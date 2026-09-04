import { CreateMandateScreen } from "@/components/buyer/create-mandate-screen";

/**
 * The layout above is a client component, but a page arrives as its `children` and is
 * still rendered on the server — same trick `app/dashboard/page.tsx` documents. Nothing
 * here needs `searchParams`, so it's a one-line pass-through.
 */
export default function BuyerPage() {
  return <CreateMandateScreen />;
}
