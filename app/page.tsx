import { redirect } from "next/navigation";

// There is no marketing page yet. /dashboard is the signed-in surface and bounces to /auth
// when there is no session, so this behaves correctly in both states.
export default function Home() {
  redirect("/dashboard");
}
