import type { AdminUser } from "@/lib/mosque/types";


/** Retrieve auth token from AuthContext (passed as argument) */
function getAuthHeader(token: string | null): HeadersInit {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchUsers(token: string | null): Promise<AdminUser[]> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  const url = `${baseUrl}/api/v1/users`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(token),
    },
    credentials: "include",
  });
  if (!response.ok) {
    if (response.status === 401) {
      // trigger global logout flow if exists; fallback to console
      console.warn("Unauthorized – token may be invalid or expired.");
    }
    throw new Error(`Failed to fetch users: ${response.status}`);
  }
  const data = await response.json();
  // Assuming backend returns { rows: User[], meta: ... }
  return data.rows ?? [];
}
