"use client";

import { createContext, useContext, useState, useEffect } from "react";
import type { Session } from "@/lib/session";

interface AuthContextValue {
  token: string | null;
  session: Session | null;
  login: (token: string, session?: Session | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  token: null,
  session: null,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  // Function to fetch the current session using HttpOnly refresh token (cookie)
  const fetchSession = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) throw new Error("no session");
      const data = await res.json();
      // Expected shape: { accessToken, session }
      setToken(data.accessToken);
      setSession(data.session);
    } catch (e) {
      // Preserve token on fetch error; only clear session
      setSession(null);
    }
  };

  // Recover session on mount
  useEffect(() => {
    fetchSession();
  }, []);

  // After a successful login, refresh the session
  const login = (newToken: string, newSession?: Session | null) => {
    setToken(newToken);
    setSession(newSession ?? null);
    // Trigger a session refresh to get user data
    fetchSession();
  };

  // Note: login function now defined above with session refresh

  const logout = async () => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    await fetch(`${baseUrl}/api/v1/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    setToken(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ token, session, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
