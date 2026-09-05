"use client";

import * as React from "react";

import type { Login } from "@/src/client";

export const SessionContext = React.createContext<Login | null>(null);

export function useSession() {
  const user = React.useContext(SessionContext);
  if (!user) throw new Error("useSession is only available under /dashboard");
  return user;
}
