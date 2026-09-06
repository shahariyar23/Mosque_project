"use client";

import type { ReactNode } from "react";
import { useRequireAuth } from "@/components/auth/route-guards";

/**
 * Gate that protects account routes.
 *
 * Checks if the user is authenticated. If not authenticated, redirects to /signin with next parameter.
 * While checking auth (during initial load), returns null so the branded NoorLoader smoothly handles
 * the entrance without content flicker.
 */
export function AccountGate({ children }: { children: ReactNode }) {
  const gate = useRequireAuth();

  if (gate.state !== "granted") return null;

  return <>{children}</>;
}
