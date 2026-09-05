import { EmptyRail, EmptyState } from "@/components/dashboard/empty-state";
import { Overview } from "@/components/dashboard/overview";
import { Button } from "@/components/ui/button";
import { REQUIRED_DETAILS } from "@/lib/dashboard-data";

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const empty = (await searchParams).empty === "1";

  return empty ? <StoreDetailsEmpty /> : <Overview />;
}

function StoreDetailsEmpty() {
  return (
    <EmptyState
      eyebrow="store not set up"
      headline="Tell us about your store before the gate can go live."
      body="Munim needs your storefront domain and a payout account before an agent can read your catalogue or pay for anything in it. It takes a few minutes and nothing goes live until you say so."
      actions={
        <>
          <Button className="h-11 px-5">Add store details</Button>
          <Button variant="outline" className="h-11 px-5">
            What agents need
          </Button>
        </>
      }
      rail={
        <EmptyRail
          eyebrow="what an agent reads"
          footnote="An item missing any one of these is skipped rather than mispriced — which is why the six show up as a meter on every product."
        >
          <ul className="mt-3.5 grid gap-2.5 text-body">
            {REQUIRED_DETAILS.map((detail) => (
              <li key={detail} className="flex items-center gap-2.5">
                <span className="h-4 w-2.5 rounded-[4px] bg-navy-200" />
                {detail}
              </li>
            ))}
          </ul>
        </EmptyRail>
      }
    />
  );
}
