import { ApiKeysScreen } from "@/components/buyer/api-keys-screen";

/** The buyer's own platform keys. See `app/buyer/page.tsx` for why a page under a client
    layout is still a server component. */
export default function BuyerApiKeysPage() {
  return <ApiKeysScreen />;
}
