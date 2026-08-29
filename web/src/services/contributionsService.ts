/**
 * `/contributions` — recurring member financial pledges and scheduled payment tracking.
 *
 * Connects to the backend REST API endpoints built in Parts 1-7:
 * - Plans: GET/POST/PATCH /contributions/plans, PATCH /contributions/plans/:id/status
 * - Enrollments: GET/POST/PATCH /contributions/enrollments, PATCH /contributions/enrollments/:id/status
 * - Expected Payments & Dues: GET /contributions/due
 * - Summary: GET /contributions/summary
 * - Members: GET /contributions/members
 * - History: GET /contributions/history
 * - Payment Settlement: POST /contributions/:id/pay
 */

import { apiGet, apiList, apiPatch, apiPost, type ListResult, type QueryParams } from "./apiClient";
import type { PaymentMethod } from "./enums";

export type ContributionFrequency = "monthly" | "quarterly" | "yearly";
export type ContributionEnrollmentStatus = "active" | "paused" | "cancelled";
export type ContributionDueStatus = "pending" | "partial" | "paid" | "overdue" | "waived";

export type ContributionFundRef = {
  id: string;
  name: string;
  slug: string;
};

export type ContributionUserRef = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
};

export type ContributionPlanRef = {
  id: string;
  name: string;
  frequency: ContributionFrequency;
  fundId: string | null;
  fund?: ContributionFundRef | null;
};

/* ------------------------------------------------------------------ *
 * Contribution Plans
 * ------------------------------------------------------------------ */

export type ContributionPlan = {
  id: string;
  mosqueId: string;
  name: string;
  description: string | null;
  amount: string;
  currency: string;
  frequency: ContributionFrequency;
  fundId: string | null;
  fund: ContributionFundRef | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ContributionPlanQuery = {
  page?: number;
  limit?: number;
  status?: "active" | "inactive" | "all";
  frequency?: ContributionFrequency;
  fundId?: string;
  search?: string;
};

export type CreateContributionPlanInput = {
  name: string;
  description?: string | null;
  amount: string;
  currency?: string;
  frequency: ContributionFrequency;
  fundId?: string | null;
  isActive?: boolean;
};

export type UpdateContributionPlanInput = Partial<CreateContributionPlanInput>;

/* ------------------------------------------------------------------ *
 * Contribution Enrollments
 * ------------------------------------------------------------------ */

export type ContributionEnrollment = {
  id: string;
  mosqueId: string;
  userId: string;
  user: ContributionUserRef;
  planId: string;
  plan: ContributionPlanRef;
  amount: string;
  currency: string;
  frequency: ContributionFrequency;
  startDate: string;
  endDate: string | null;
  status: ContributionEnrollmentStatus;
  createdAt: string;
  updatedAt: string;
};

export type ContributionEnrollmentQuery = {
  page?: number;
  limit?: number;
  status?: ContributionEnrollmentStatus | "all";
  planId?: string;
  userId?: string;
  frequency?: ContributionFrequency;
  search?: string;
};

export type CreateContributionEnrollmentInput = {
  planId: string;
  userId?: string;
  amount?: string;
  frequency?: ContributionFrequency;
  startDate?: string;
  endDate?: string | null;
};

export type UpdateContributionEnrollmentInput = {
  amount?: string;
  frequency?: ContributionFrequency;
  startDate?: string;
  endDate?: string | null;
};

/* ------------------------------------------------------------------ *
 * Contribution Periods / Due
 * ------------------------------------------------------------------ */

export type ContributionPeriod = {
  id: string;
  mosqueId: string;
  enrollmentId: string;
  userId: string;
  user: ContributionUserRef;
  planId: string;
  plan: ContributionPlanRef;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  expectedAmount: string;
  paidAmount: string;
  currency: string;
  status: ContributionDueStatus;
  transactionId: string | null;
  transaction?: {
    id: string;
    paymentMethod: string;
    reference: string | null;
    status: string;
  } | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ContributionPeriodQuery = {
  page?: number;
  limit?: number;
  status?: string;
  enrollmentId?: string;
  planId?: string;
  userId?: string;
  from?: string;
  to?: string;
  search?: string;
};

/* ------------------------------------------------------------------ *
 * Summary
 * ------------------------------------------------------------------ */

export type ContributionSummary = {
  enrolledMembers: number;
  totalEnrolledMembers: number;
  expectedAmount: string;
  collectedAmount: string;
  outstandingAmount: string;
  overdueCount: number;
  paidMembers: number;
  unpaidMembers: number;
  currency: string;
};

export type ContributionSummaryQuery = {
  month?: number;
  year?: number;
  planId?: string;
  userId?: string;
  from?: string;
  to?: string;
};

/* ------------------------------------------------------------------ *
 * Members Directory
 * ------------------------------------------------------------------ */

export type MemberEnrolledPlan = {
  id: string;
  name: string;
  amount: string;
  frequency: string;
  status: string;
};

export type ContributionMemberItem = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  activePlans: MemberEnrolledPlan[];
  totalExpected: string;
  totalPaid: string;
  totalOutstanding: string;
  currentPeriodStatus: string;
  lastPaymentDate: string | null;
};

export type ContributionMemberQuery = {
  page?: number;
  limit?: number;
  month?: number;
  year?: number;
  planId?: string;
  status?: string;
  search?: string;
};

/* ------------------------------------------------------------------ *
 * Payment History
 * ------------------------------------------------------------------ */

export type ContributionHistoryItem = {
  id: string;
  periodId: string;
  transactionId: string | null;
  user: ContributionUserRef;
  plan: ContributionPlanRef;
  fund: ContributionFundRef | null;
  amount: string;
  currency: string;
  paymentMethod: string;
  reference: string | null;
  status: string;
  paidAt: string;
  periodStart: string;
  periodEnd: string;
};

export type ContributionHistoryQuery = {
  page?: number;
  limit?: number;
  month?: number;
  year?: number;
  planId?: string;
  userId?: string;
  status?: string;
  from?: string;
  to?: string;
  search?: string;
};

/* ------------------------------------------------------------------ *
 * Payment Recording
 * ------------------------------------------------------------------ */

export type PayContributionInput = {
  amount?: string;
  paymentMethod?: PaymentMethod;
  paymentDate?: string;
  reference?: string;
  fundId?: string;
  notes?: string;
};

export type PayContributionResult = {
  period: ContributionPeriod;
  transaction: {
    id: string;
    type: string;
    status: string;
    amount: string;
    currency: string;
    fundId: string | null;
    paymentMethod: string;
    description: string;
  };
};

/* ------------------------------------------------------------------ *
 * API Service Functions
 * ------------------------------------------------------------------ */

export function fetchContributionPlans(query: ContributionPlanQuery = {}): Promise<ListResult<ContributionPlan>> {
  return apiList<ContributionPlan>("/contributions/plans", query as QueryParams);
}

export function fetchContributionPlan(id: string): Promise<ContributionPlan> {
  return apiGet<ContributionPlan>(`/contributions/plans/${id}`);
}

export function createContributionPlan(input: CreateContributionPlanInput): Promise<ContributionPlan> {
  return apiPost<ContributionPlan>("/contributions/plans", input);
}

export function updateContributionPlan(id: string, input: UpdateContributionPlanInput): Promise<ContributionPlan> {
  return apiPatch<ContributionPlan>(`/contributions/plans/${id}`, input);
}

export function updateContributionPlanStatus(id: string, isActive: boolean): Promise<ContributionPlan> {
  return apiPatch<ContributionPlan>(`/contributions/plans/${id}/status`, { isActive });
}

export function fetchContributionEnrollments(query: ContributionEnrollmentQuery = {}): Promise<ListResult<ContributionEnrollment>> {
  return apiList<ContributionEnrollment>("/contributions/enrollments", query as QueryParams);
}

export function fetchContributionEnrollment(id: string): Promise<ContributionEnrollment> {
  return apiGet<ContributionEnrollment>(`/contributions/enrollments/${id}`);
}

export function createContributionEnrollment(input: CreateContributionEnrollmentInput): Promise<ContributionEnrollment> {
  return apiPost<ContributionEnrollment>("/contributions/enrollments", input);
}

export function updateContributionEnrollment(id: string, input: UpdateContributionEnrollmentInput): Promise<ContributionEnrollment> {
  return apiPatch<ContributionEnrollment>(`/contributions/enrollments/${id}`, input);
}

export function updateContributionEnrollmentStatus(
  id: string,
  status: ContributionEnrollmentStatus,
  reason?: string,
): Promise<ContributionEnrollment> {
  return apiPatch<ContributionEnrollment>(`/contributions/enrollments/${id}/status`, { status, reason });
}

export function fetchContributionDue(query: ContributionPeriodQuery = {}): Promise<ListResult<ContributionPeriod>> {
  return apiList<ContributionPeriod>("/contributions/due", query as QueryParams);
}

export function fetchContributionSummary(query: ContributionSummaryQuery = {}): Promise<ContributionSummary> {
  return apiGet<ContributionSummary>("/contributions/summary", query as QueryParams);
}

export function fetchContributionMembers(query: ContributionMemberQuery = {}): Promise<ListResult<ContributionMemberItem>> {
  return apiList<ContributionMemberItem>("/contributions/members", query as QueryParams);
}

export function fetchContributionHistory(query: ContributionHistoryQuery = {}): Promise<ListResult<ContributionHistoryItem>> {
  return apiList<ContributionHistoryItem>("/contributions/history", query as QueryParams);
}

export function recordContributionPayment(periodId: string, input: PayContributionInput): Promise<PayContributionResult> {
  return apiPost<PayContributionResult>(`/contributions/${periodId}/pay`, input);
}
