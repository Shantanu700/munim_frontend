"use client";

import * as React from "react";

import type { Login } from "@/src/client";

/**
 * The `Login` object `app/dashboard/layout.tsx` already fetched, for the screens below it.
 *
 * The layout is the only thing that can ask who is signed in (the `sessionid` cookie belongs
 * to the API origin, so nothing on the server can), and it renders nothing until the answer
 * arrives — so a consumer under it is guaranteed a user, and `useSession` throws rather than
 * handing back a null the whole tree would have to re-check.
 *
 * A context and not a prop because `children` arrives already built. `merchant` is `null`
 * for a buyer, so read it defensively.
 */
export const SessionContext = React.createContext<Login | null>(null);

export function useSession() {
  const user = React.useContext(SessionContext);
  if (!user) throw new Error("useSession is only available under /dashboard");
  return user;
}
