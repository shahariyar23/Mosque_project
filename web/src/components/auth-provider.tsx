"use client";

import { createContext, useContext } from "react";
import type { Session } from "@/lib/session";

interface AuthContextValue {
  session: Session | null;
}

const AuthContext = createContext<AuthContextValue>({ session: null });

export function AuthProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  return (
    <AuthContext.Provider value={{ session }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
