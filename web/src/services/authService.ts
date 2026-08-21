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

export async function registerUser(
  payload: SignupPayload,
): Promise<RegisteredUser> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));

  return {
    id: "pending-backend",
    fullName: payload.fullName,
    email: payload.email,
  };
}

export async function loginUser(payload: SigninPayload): Promise<SignedInUser> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));

  // Credentials cannot be checked without the API, so this resolves optimistically.
  // The real endpoint should throw on a 401 so the form shows its credentials error.
  return {
    id: "pending-backend",
    identifier: payload.email ?? payload.phone ?? "",
  };
}
