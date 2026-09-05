import { BuyerOrdersScreen } from "@/components/buyer/orders-screen";

/** The buyer's own orders, across every store. See `app/buyer/page.tsx` for why a page under
    a client layout is still a server component. */
export default function BuyerOrdersPage() {
  return <BuyerOrdersScreen />;
}
