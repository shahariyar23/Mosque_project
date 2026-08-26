"use client";
import type { SigninPayload } from "@/components/signin/signin-validation";
import type { SignupPayload } from "@/components/signup/signup-validation";

/**
 * Frontend auth service.
 *
 * The Express API is not connected yet, so these calls resolve against a short
 * simulated delay. When the backend lands, replace each body with a real
 * request — the call signatures and the thrown error shapes stay the same, so no
 * component needs to change.
 *
 * Example:
 *   const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, {
 *     method: "POST",
 *     headers: { "Content-Type": "application/json" },
 *     body: JSON.stringify(payload),
 *   });
 *   if (!response.ok) throw new Error("REGISTRATION_FAILED");
 *   return response.json();
 */

export type RegisteredUser = {
  id: string;
  fullName: string;
  email: string;
};

export type SignedInUser = {
  id: string;
  /** Whichever identifier the visitor signed in with. */
  identifier: string;
};

const SIMULATED_LATENCY_MS = 1200;

export const registerUser = async (payload: SignupPayload): Promise<RegisteredUser> => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  const url = `${baseUrl}/api/v1/auth/register`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include",
  });
  if (!response.ok) {
    const errMsg = await response.text();
    throw new Error(errMsg || "REGISTRATION_FAILED");
  }
  const data = await response.json();
  return {
    id: data.id,
    fullName: data.fullName,
    email: data.email,
  };
};

export const loginUser = async (payload: SigninPayload): Promise<{ token: string; user: SignedInUser }> => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  const url = `${baseUrl}/api/v1/auth/login`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include",
  });
  if (!response.ok) {
    const errMsg = await response.text();
    throw new Error(errMsg || "LOGIN_FAILED");
  }
  const data = await response.json();
  return {
    token: data.accessToken,
    user: {
      id: data.user?.id ?? "",
      identifier: payload.email ?? payload.phone ?? "",
    },
  };
};
