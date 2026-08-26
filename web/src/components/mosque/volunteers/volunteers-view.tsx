"use client";

import { useMemo, useState } from "react";
import { useDashboardSession } from "@/components/dashboard/session-provider";
import { Button, IconButton } from "@/components/finance/ui/button";
import { DataTable, Pagination, type Column } from "@/components/finance/ui/data-table";
import { ConfirmDialog } from "@/components/finance/ui/dialogs";
import { FinanceFilters, type SelectFilter } from "@/components/finance/ui/filters";
import { SelectField, TextAreaField, TextField } from "@/components/finance/ui/form-field";
import { Modal } from "@/components/finance/ui/modal";
import { Panel, PanelFooter, PanelHeader } from "@/components/finance/ui/panel";
import { Can } from "@/components/finance/ui/permission-gate";
import { TableSkeleton } from "@/components/finance/ui/skeleton";
import { FinanceEmptyState, FinanceErrorState, InlineNotice } from "@/components/finance/ui/states";
import { PersonCell } from "@/components/ui/avatar";
import { DetailDrawer, DetailField, DetailGrid, DetailSection } from "@/components/ui/detail-drawer";
import { StatGrid } from "@/components/ui/stat-card";
import { AvailabilityBadge, VolunteerStatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { useApiList, useApiResource } from "@/hooks/use-api";
import { formatCount, formatMonthYear } from "@/lib/mosque/format";
import { type StatMetric } from "@/lib/mosque/types";
import type { VolunteerStatus } from "@/services/enums";
import { fetchUsers } from "@/services/userService";
import {
  createVolunteer,
  deleteVolunteer,
  fetchVolunteers,
  updateVolunteer,
  updateVolunteerStatus,
  type CreateVolunteerInput,
  type UpdateVolunteerInput,
  type Volunteer,
} from "@/services/volunteersService";

const statusFilterOptions = [
  { value: "all", label: "Any status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "on_leave", label: "On Leave" },
];

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "on_leave", label: "On Leave" },
];

type EnrolFormState = {
  userId: string;
  skills: string;
  availability: string;
  status: VolunteerStatus;
  joinedAt: string;
  notes: string;
};

const emptyEnrolForm: EnrolFormState = {
  userId: "",
  skills: "",
  availability: "Weekends",
  status: "active",
  joinedAt: new Date().toISOString().slice(0, 10),
  notes: "",
};

export function VolunteersView() {
  const { can } = useDashboardSession();
  const { notify } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<Volunteer | null>(null);

  // Enrol modal states
  const [enrolOpen, setEnrolOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enrolForm, setEnrolForm] = useState<EnrolFormState>(emptyEnrolForm);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | undefined>(undefined);

  // Edit modal states
  const [editTarget, setEditTarget] = useState<Volunteer | null>(null);
  const [editForm, setEditForm] = useState<UpdateVolunteerInput>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [editFieldErrors, setEditFieldErrors] = useState<Record<string, string[]> | undefined>(undefined);

  // Delete/remove confirm state
  const [deleteTarget, setDeleteTarget] = useState<Volunteer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Users list for dropdown
  const { data: usersData } = useApiResource(() => fetchUsers({ limit: 100 }), []);
  const usersList = usersData?.rows || [];

  const userOptions = useMemo(
    () => [
      ...usersList.map((u) => ({
        value: u.id,
        label: `${u.fullName} (${u.email || u.phone || u.role})`,
      })),
    ],
    [usersList],
  );

  const query = useMemo(
    () => ({
      page,
      limit: 10,
      search: search.trim() || undefined,
      status: status !== "all" ? (status as VolunteerStatus) : undefined,
    }),
    [page, search, status],
  );

  const { rows, meta, loading, error, refetch } = useApiList(fetchVolunteers, query, {
    enabled: can("volunteer.view"),
  });

  const filters: SelectFilter[] = [
    {
      id: "status",
      label: "Status",
      value: status,
      onChange: (val) => {
        setStatus(val);
        setPage(1);
      },
      options: statusFilterOptions,
    },
  ];

  const activeFilterCount = status !== "all" ? 1 : 0;

  const resetFilters = () => {
    setStatus("all");
    setSearch("");
    setPage(1);
  };

  const metrics: StatMetric[] = [
    {
      id: "total",
      label: "Total Volunteers",
      value: formatCount(meta?.total ?? rows.length),
      hint: "Enrolled in the roster",
      icon: "hands-heart",
      tone: "neutral",
    },
  ];

  const openEditModal = (volunteer: Volunteer) => {
    setEditTarget(volunteer);
    setEditForm({
      availability: volunteer.availability || "",
      skills: volunteer.skills || "",
      status: volunteer.status,
      notes: volunteer.notes || "",
    });
    setEditFormError(null);
    setEditFieldErrors(undefined);
  };

  const columns: Column<Volunteer>[] = [
    {
      key: "volunteer",
      header: "Volunteer",
      cell: (volunteer) => (
        <button
          type="button"
          onClick={() => setSelected(volunteer)}
          className="text-left font-medium text-[#17211d] hover:text-[#0d4d3b] hover:underline"
        >
          <PersonCell name={volunteer.user.fullName} meta={volunteer.user.email || volunteer.id.slice(0, 8)} />
        </button>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      secondary: true,
      cell: (volunteer) => <span className="tabular-nums">{volunteer.user.phone || "—"}</span>,
    },
    {
      key: "availability",
      header: "Availability",
      cell: (volunteer) => (
        <div className="flex flex-col items-start gap-1">
          <AvailabilityBadge availability={volunteer.availability} />
          {volunteer.skills ? (
            <span className="inline-flex max-w-[240px] items-center gap-1 truncate text-[11px] text-[#6b736c]">
              <span className="font-medium text-[#4a524b]">Skills:</span>
              <span className="truncate">{volunteer.skills}</span>
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "joined",
      header: "Joined",
      cell: (volunteer) => <span className="tabular-nums">{formatMonthYear(volunteer.joinedAt)}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (volunteer) => <VolunteerStatusBadge status={volunteer.status as any} />,
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      align: "right",
      cell: (volunteer) => (
        <span className="flex items-center justify-end gap-1">
          <IconButton icon="eye" label={`View ${volunteer.user.fullName}`} onClick={() => setSelected(volunteer)} />
          <Can permission="volunteer.manage">
            <IconButton icon="pencil" label={`Edit ${volunteer.user.fullName}`} onClick={() => openEditModal(volunteer)} />
            <IconButton
              icon="trash"
              tone="danger"
              label={`Remove ${volunteer.user.fullName} from roster`}
              onClick={() => setDeleteTarget(volunteer)}
            />
          </Can>
        </span>
      ),
    },
  ];

  const enrolErrors = {
    userId: (submitted && !enrolForm.userId ? "Choose a user to enrol." : undefined) || fieldErrors?.userId?.[0],
    skills: fieldErrors?.skills?.[0],
    availability: fieldErrors?.availability?.[0],
    status: fieldErrors?.status?.[0],
    notes: fieldErrors?.notes?.[0],
  };

  const handleEnrolSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    setFormError(null);
    setFieldErrors(undefined);

    if (!enrolForm.userId) return;

    try {
      setIsSubmitting(true);
      const input: CreateVolunteerInput = {
        userId: enrolForm.userId,
        skills: enrolForm.skills.trim() || null,
        availability: enrolForm.availability.trim() || null,
        status: enrolForm.status,
        joinedAt: enrolForm.joinedAt ? new Date(enrolForm.joinedAt).toISOString() : undefined,
        notes: enrolForm.notes.trim() || null,
      };

      const created = await createVolunteer(input);
      notify({
        message: "Volunteer enrolled",
        description: `${created.user.fullName} has been enrolled in the roster.`,
        tone: "success",
      });

      setEnrolOpen(false);
      setSubmitted(false);
      setEnrolForm(emptyEnrolForm);
      setFieldErrors(undefined);
      refetch();
    } catch (err: any) {
      const fErrors = err?.errors || err?.fieldErrors;
      if (fErrors && typeof fErrors === "object") {
        setFieldErrors(fErrors);
      }
      setFormError(err.message || "Failed to enrol volunteer.");
      notify({
        message: "Unable to enrol volunteer",
        description: err.message || "Some of the details provided are not valid.",
        tone: "danger",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editTarget) return;

    try {
      setIsUpdating(true);
      setEditFormError(null);
      setEditFieldErrors(undefined);

      const updated = await updateVolunteer(editTarget.id, {
        availability: editForm.availability?.trim() || null,
        skills: editForm.skills?.trim() || null,
        status: editForm.status,
        notes: editForm.notes?.trim() || null,
      });

      notify({
        message: "Volunteer updated",
        description: `${updated.user.fullName}'s entry has been updated.`,
        tone: "success",
      });

      setEditTarget(null);
      if (selected?.id === updated.id) {
        setSelected(updated);
      }
      refetch();
    } catch (err: any) {
      const fErrors = err?.errors || err?.fieldErrors;
      if (fErrors && typeof fErrors === "object") {
        setEditFieldErrors(fErrors);
      }
      setEditFormError(err.message || "Failed to update volunteer.");
      notify({
        message: "Update failed",
        description: err.message || "Some of the details provided are not valid.",
        tone: "danger",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveVolunteer = async () => {
    if (!deleteTarget) return;

    try {
      setIsDeleting(true);
      await deleteVolunteer(deleteTarget.id);
      notify({
        message: "Volunteer removed",
        description: `${deleteTarget.user.fullName} was removed from the roster.`,
        tone: "info",
      });
      setDeleteTarget(null);
      if (selected?.id === deleteTarget.id) setSelected(null);
      refetch();
    } catch (err: any) {
      notify({
        message: "Unable to remove volunteer",
        description: err.message || "Could not remove roster entry.",
        tone: "danger",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStatusChange = async (volunteerId: string, newStatus: VolunteerStatus) => {
    try {
      const updated = await updateVolunteerStatus(volunteerId, newStatus);
      notify({
        message: "Status updated",
        description: `${updated.user.fullName}'s status changed to ${newStatus}.`,
        tone: "success",
      });
      if (selected?.id === volunteerId) {
        setSelected(updated);
      }
      refetch();
    } catch (err: any) {
      notify({
        message: "Failed to update status",
        description: err.message || "Could not update roster status.",
        tone: "danger",
      });
    }
  };

  return (
    <div className="space-y-4">
      <StatGrid metrics={metrics} />

      <Panel>
        <PanelHeader
          title="Volunteer Roster"
          description="Who is enrolled, when they are free and their skills."
          icon="list"
          actions={
            <Can permission="volunteer.manage">
              <Button icon="plus" size="sm" onClick={() => setEnrolOpen(true)}>
                Enrol volunteer
              </Button>
            </Can>
          }
        />

        <FinanceFilters
          search={{
            value: search,
            onChange: (val) => {
              setSearch(val);
              setPage(1);
            },
            placeholder: "Search volunteers…",
            label: "Search volunteers by name, email or phone",
          }}
          filters={filters}
          activeCount={activeFilterCount}
          onReset={resetFilters}
        />

        {loading && !rows.length ? (
          <TableSkeleton rows={6} />
        ) : error ? (
          <FinanceErrorState
            title="Failed to load volunteers"
            description={typeof error === "string" ? error : "An unexpected error occurred."}
            onRetry={refetch}
          />
        ) : (
          <>
            <DataTable
              rows={rows}
              columns={columns}
              getRowKey={(volunteer) => volunteer.id}
              caption="Mosque volunteers with availability, join date and status"
              pageSize={10}
              mobileTitle={(volunteer) => volunteer.user.fullName}
              mobileSubtitle={(volunteer) => volunteer.skills || "—"}
              mobileTrailing={(volunteer) => <VolunteerStatusBadge status={volunteer.status as any} />}
              mobileHiddenKeys={["volunteer", "status"]}
              emptyState={
                <FinanceEmptyState
                  icon="hands-heart"
                  title="No volunteers registered yet."
                  description={
                    activeFilterCount > 0 || search
                      ? "Nothing matches the current search and filters. Try clearing them."
                      : "Nobody has been placed on the roster yet."
                  }
                  action={
                    activeFilterCount > 0 || search ? (
                      <Button variant="secondary" icon="close" onClick={resetFilters}>
                        Clear search and filters
                      </Button>
                    ) : undefined
                  }
                />
              }
            />
            {meta && meta.totalPages > 1 && (
              <PanelFooter>
                <Pagination page={meta.page} totalPages={meta.totalPages} onChange={setPage} />
              </PanelFooter>
            )}
          </>
        )}
      </Panel>

      {/* ---- Volunteer Detail Drawer ---- */}
      {selected ? (
        <VolunteerDetailDrawer
          volunteer={selected}
          onClose={() => setSelected(null)}
          onEdit={() => openEditModal(selected)}
          onStatusChange={handleStatusChange}
          onRemove={() => setDeleteTarget(selected)}
        />
      ) : null}

      {/* ---- Enrol Volunteer Modal ---- */}
      <Modal
        open={enrolOpen}
        onClose={() => setEnrolOpen(false)}
        title="Enrol a volunteer"
        description="Select an existing mosque member to add to the volunteer roster with their skills and availability."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEnrolOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" form="enrol-volunteer-form" icon="check" disabled={isSubmitting}>
              {isSubmitting ? "Enrolling…" : "Enrol volunteer"}
            </Button>
          </>
        }
      >
        <form id="enrol-volunteer-form" onSubmit={handleEnrolSubmit} noValidate className="space-y-4">
          {formError ? (
            <InlineNotice tone="danger" icon="alert">
              {formError}
            </InlineNotice>
          ) : null}

          <SelectField
            label="Member account"
            required
            placeholder="Choose a member from the directory"
            options={userOptions}
            value={enrolForm.userId}
            error={enrolErrors.userId}
            onChange={(event) => setEnrolForm({ ...enrolForm, userId: event.target.value })}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Availability"
              placeholder="e.g. Weekends after Asr, Jumuah"
              value={enrolForm.availability}
              error={enrolErrors.availability}
              onChange={(event) => setEnrolForm({ ...enrolForm, availability: event.target.value })}
            />
            <SelectField
              label="Initial status"
              required
              options={statusOptions}
              value={enrolForm.status}
              error={enrolErrors.status}
              onChange={(event) => setEnrolForm({ ...enrolForm, status: event.target.value as VolunteerStatus })}
            />
          </div>

          <TextField
            label="Skills & Expertise"
            placeholder="e.g. First aid, crowd management, sound system, cleaning"
            value={enrolForm.skills}
            error={enrolErrors.skills}
            onChange={(event) => setEnrolForm({ ...enrolForm, skills: event.target.value })}
          />

          <TextField
            label="Joined date"
            type="date"
            value={enrolForm.joinedAt}
            onChange={(event) => setEnrolForm({ ...enrolForm, joinedAt: event.target.value })}
          />

          <TextAreaField
            label="Coordinator notes (Internal)"
            placeholder="Internal coordination notes..."
            value={enrolForm.notes}
            error={enrolErrors.notes}
            onChange={(event) => setEnrolForm({ ...enrolForm, notes: event.target.value })}
          />

          <InlineNotice icon="shield">
            Enrolling adds a roster entry for this member without changing their account role or system access permissions.
          </InlineNotice>
        </form>
      </Modal>

      {/* ---- Edit Volunteer Modal ---- */}
      <Modal
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        title={editTarget ? `Edit volunteer: ${editTarget.user.fullName}` : "Edit volunteer"}
        description="Update availability, skills, status, or coordinator notes for this roster entry."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditTarget(null)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button type="submit" form="edit-volunteer-form" icon="check" disabled={isUpdating}>
              {isUpdating ? "Saving changes…" : "Save changes"}
            </Button>
          </>
        }
      >
        <form id="edit-volunteer-form" onSubmit={handleEditSubmit} noValidate className="space-y-4">
          {editFormError ? (
            <InlineNotice tone="danger" icon="alert">
              {editFormError}
            </InlineNotice>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Availability"
              placeholder="e.g. Weekends, Jumuah only, Weekdays after Asr"
              value={editForm.availability || ""}
              error={editFieldErrors?.availability?.[0]}
              onChange={(event) => setEditForm({ ...editForm, availability: event.target.value })}
            />
            <SelectField
              label="Status"
              required
              options={statusOptions}
              value={editForm.status || "active"}
              error={editFieldErrors?.status?.[0]}
              onChange={(event) => setEditForm({ ...editForm, status: event.target.value as VolunteerStatus })}
            />
          </div>

          <TextField
            label="Skills & Expertise"
            placeholder="e.g. First aid, IT support, crowd control, sound system"
            value={editForm.skills || ""}
            error={editFieldErrors?.skills?.[0]}
            onChange={(event) => setEditForm({ ...editForm, skills: event.target.value })}
          />

          <TextAreaField
            label="Coordinator notes (Internal)"
            placeholder="Internal coordination notes..."
            value={editForm.notes || ""}
            error={editFieldErrors?.notes?.[0]}
            onChange={(event) => setEditForm({ ...editForm, notes: event.target.value })}
          />

          <InlineNotice icon="info">
            Changing volunteer information updates this roster entry without modifying the user's login account or member profile.
          </InlineNotice>
        </form>
      </Modal>

      {/* ---- Remove Confirmation Dialog ---- */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Remove volunteer from roster"
        description={`Are you sure you want to remove ${deleteTarget?.user.fullName} from the volunteer roster? Their member account and system access will remain untouched.`}
        confirmLabel={isDeleting ? "Removing…" : "Remove volunteer"}
        tone="danger"
        onConfirm={handleRemoveVolunteer}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Detail Drawer
 * -------------------------------------------------------------------------- */

function VolunteerDetailDrawer({
  volunteer,
  onClose,
  onEdit,
  onStatusChange,
  onRemove,
}: {
  volunteer: Volunteer;
  onClose: () => void;
  onEdit: () => void;
  onStatusChange: (id: string, newStatus: VolunteerStatus) => void;
  onRemove: () => void;
}) {
  return (
    <DetailDrawer
      open
      onClose={onClose}
      eyebrow={volunteer.id.slice(0, 8)}
      title={volunteer.user.fullName}
      subtitle={volunteer.user.email}
      badge={<VolunteerStatusBadge status={volunteer.status as any} />}
      footer={
        <div className="flex w-full items-center justify-between">
          <Can permission="volunteer.manage">
            <Button size="sm" variant="danger" icon="trash" onClick={onRemove}>
              Remove from roster
            </Button>
          </Can>
          <div className="flex items-center gap-2">
            <Can permission="volunteer.manage">
              <Button size="sm" variant="secondary" icon="pencil" onClick={onEdit}>
                Edit details
              </Button>
            </Can>
            <Button size="sm" variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <DetailSection title="Roster Information">
          <DetailGrid>
            <DetailField label="Joined" value={formatMonthYear(volunteer.joinedAt)} />
            <DetailField label="Phone" value={volunteer.user.phone || "—"} />
            <DetailField label="Availability" value={volunteer.availability || "—"} full />
            <DetailField label="Skills" value={volunteer.skills || "—"} full />
            <DetailField label="Internal Notes" value={volunteer.notes || "—"} full />
          </DetailGrid>
        </DetailSection>

        <Can permission="volunteer.manage">
          <DetailSection title="Change Status">
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((opt) => (
                <Button
                  key={opt.value}
                  size="sm"
                  variant={volunteer.status === opt.value ? "primary" : "secondary"}
                  onClick={() => onStatusChange(volunteer.id, opt.value as VolunteerStatus)}
                >
                  Set as {opt.label}
                </Button>
              ))}
            </div>
          </DetailSection>
        </Can>
      </div>
    </DetailDrawer>
  );
}
