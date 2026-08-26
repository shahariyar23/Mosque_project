import type { AdminUser } from "@/lib/mosque/types";
import type { Permission, Position, Role } from "@/lib/permissions";

export type BackendUser = {
  id: string;
  mosqueId: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: Role;
  positions?: Position[];
  permissions?: Permission[];
  deniedPermissions?: Permission[];
  isActive?: boolean;
  status?: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  city?: string | null;
  avatarUrl?: string | null;
  newsletter?: boolean;
  emailVerifiedAt?: string | null;
  lastLoginAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
};

export type UsersApiResponse = {
  success: boolean;
  message?: string;
  data?: BackendUser[];
  rows?: BackendUser[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

/** Retrieve auth token from AuthContext (passed as argument) */
function getAuthHeader(token: string | null): HeadersInit {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function mapBackendUserToAdminUser(user: BackendUser): AdminUser {
  return {
    id: user.id,
    name: user.fullName?.trim() || user.email || "Unnamed User",
    email: user.email,
    phone: user.phone || "—",
    mosqueId: user.mosqueId,
    mosqueName: "Noor Community Mosque",
    role: user.role,
    positions: (user.positions as Position[]) ?? [],
    permissions: (user.permissions as Permission[]) ?? [],
    deniedPermissions: (user.deniedPermissions as Permission[]) ?? [],
    isActive: typeof user.isActive === "boolean" ? user.isActive : user.status === "active",
    joinedAt: user.createdAt ? user.createdAt.slice(0, 10) : "",
    lastActiveAt: user.lastLoginAt ? user.lastLoginAt.slice(0, 10) : "",
    fullName: user.fullName,
    status: user.status,
    dateOfBirth: user.dateOfBirth,
    gender: user.gender,
    city: user.city,
    avatarUrl: user.avatarUrl,
    newsletter: user.newsletter,
    emailVerifiedAt: user.emailVerifiedAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    deletedAt: user.deletedAt,
  };
}

export async function fetchUsers(
  token: string | null,
  options?: { deleted?: boolean },
): Promise<AdminUser[]> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
  const params = new URLSearchParams();
  if (options?.deleted) params.set("deleted", "true");
  const qs = params.toString();
  const url = `${baseUrl}/api/v1/users${qs ? `?${qs}` : ""}`;
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
      console.warn("Unauthorized – token may be invalid or expired.");
    }
    const errBody = await response.json().catch(() => null);
    throw new Error(errBody?.message ?? `Failed to fetch users: ${response.status}`);
  }

  const result = (await response.json()) as UsersApiResponse | BackendUser[];

  let list: BackendUser[] = [];
  if (Array.isArray(result)) {
    list = result;
  } else if (result && Array.isArray(result.data)) {
    list = result.data;
  } else if (result && Array.isArray(result.rows)) {
    list = result.rows;
  }

  return list.map(mapBackendUserToAdminUser);
}

