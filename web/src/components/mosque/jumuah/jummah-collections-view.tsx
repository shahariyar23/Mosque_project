"use client";

import { useMemo, useState } from "react";
import { useDashboardSession } from "@/components/dashboard/session-provider";
import { Badge, Chip } from "@/components/finance/ui/badge";
import { Button, IconButton } from "@/components/finance/ui/button";
import { DataTable, type Column } from "@/components/finance/ui/data-table";
import { ConfirmDialog } from "@/components/finance/ui/dialogs";
import { FinanceFilters, type SelectFilter } from "@/components/finance/ui/filters";
import {
  AmountField,
  SelectField,
  SummaryRow,
  TextAreaField,
  TextField,
} from "@/components/finance/ui/form-field";
import { Icon } from "@/components/finance/ui/icon";
import { Modal } from "@/components/finance/ui/modal";
import { Money } from "@/components/finance/ui/money";
import { Panel, PanelBody, PanelHeader } from "@/components/finance/ui/panel";
import { Can } from "@/components/finance/ui/permission-gate";
import { TableSkeleton } from "@/components/finance/ui/skeleton";
import { FinanceEmptyState, FinanceErrorState, InlineNotice } from "@/components/finance/ui/states";
import { MiniStat } from "@/components/finance/ui/summary-card";
import { useToast } from "@/components/ui/toast";
import { useApiList, useApiResource } from "@/hooks/use-api";
import { formatAmount, formatShortDate } from "@/lib/finance/format";
import { fetchDonationFunds } from "@/services/donationFundsService";
import { fetchJumuahSchedules } from "@/services/jumuahService";
import {
  createJummahCollection,
  fetchJummahCollections,
  updateJummahCollection,
  type CreateJummahCollectionInput,
  type JummahCollection,
  type JummahCollectionQuery,
  type JummahCollectionStatus,
  type UpdateJummahCollectionInput,
} from "@/services/jummahCollectionsService";
import { ServiceError } from "@/services/query";

/** Helper to check if a YYYY-MM-DD date is a Friday */
function isFridayDate(dateStr: string): boolean {
  if (!dateStr || dateStr.length !== 10) return false;
  const d = new Date(`${dateStr}T12:00:00Z`);
  return d.getUTCDay() === 5;
}

/** Helper to find the most recent or upcoming Friday date (YYYY-MM-DD) */
function getRecentOrUpcomingFriday(): string {
  const base = new Date();
  const day = base.getUTCDay(); // 0 is Sun, 5 is Fri
  const diff = day >= 5 ? day - 5 : day + 2;
  const target = new Date(base);
  target.setUTCDate(base.getUTCDate() - diff);
  return target.toISOString().slice(0, 10);
}

const statusFilterOptions = [
  { value: "all", label: "All statuses" },
  { value: "completed", label: "Completed" },
  { value: "voided", label: "Voided" },
];

const visibilityFilterOptions = [
  { value: "all", label: "All visibility" },
  { value: "public", label: "Public only" },
  { value: "private", label: "Private only" },
];

export function JummahCollectionsView() {
  const { can } = useDashboardSession();
  const { notify } = useToast();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<JummahCollectionStatus | "all">("all");
  const [visibility, setVisibility] = useState<"all" | "public" | "private">("all");
  const [fundId, setFundId] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [selected, setSelected] = useState<JummahCollection | null>(null);
  const [recordOpen, setRecordOpen] = useState(false);
  const [voidTarget, setVoidTarget] = useState<JummahCollection | null>(null);
  const [editTarget, setEditTarget] = useState<JummahCollection | null>(null);

  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | undefined>(undefined);

  // Query filters
  const query: JummahCollectionQuery = {
    page,
    limit: 10,
    status: status !== "all" ? status : undefined,
    fundId: fundId !== "all" ? fundId : undefined,
    isPublic: visibility === "all" ? undefined : visibility === "public",
    from: fromDate || undefined,
    to: toDate || undefined,
  };

  const { rows, meta, loading, error, refetch } = useApiList(
    fetchJummahCollections,
    query,
    {
      enabled:
        can("jumuah_collection.view") ||
        can("prayer.view") ||
        can("donation.view") ||
        can("finance.view"),
    },
  );

  // Preload funds for dropdowns and integration statistics
  const { data: fundsData, refetch: refetchFunds } = useApiResource(
    () => fetchDonationFunds({ limit: 100 }),
    [],
  );
  const funds = fundsData?.rows || [];

  // Preload schedules for optional association
  const { data: schedules = [] } = useApiResource(() => fetchJumuahSchedules(), []);

  const refreshAll = () => {
    refetch();
    refetchFunds();
  };

  // Filter options
  const fundFilterOptions = useMemo(
    () => [
      { value: "all", label: "All funds" },
      ...funds.map((f) => ({ value: f.id, label: f.name })),
    ],
    [funds],
  );

  const selectFilters: SelectFilter[] = [
    {
      id: "fund",
      label: "Fund",
      value: fundId,
      options: fundFilterOptions,
      onChange: (v) => {
        setFundId(v);
        setPage(1);
      },
    },
    {
      id: "status",
      label: "Status",
      value: status,
      options: statusFilterOptions,
      onChange: (v) => {
        setStatus(v as any);
        setPage(1);
      },
    },
    {
      id: "visibility",
      label: "Visibility",
      value: visibility,
      options: visibilityFilterOptions,
      onChange: (v) => {
        setVisibility(v as any);
        setPage(1);
      },
    },
  ];

  const activeCount = [
    status !== "all",
    fundId !== "all",
    visibility !== "all",
    Boolean(fromDate),
    Boolean(toDate),
  ].filter(Boolean).length;

  const resetFilters = () => {
    setStatus("all");
    setFundId("all");
    setVisibility("all");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  // Metrics summary
  const summaryMetrics = useMemo(() => {
    let totalCompleted = 0;
    let latestCollection: JummahCollection | null = null;
    let publicCount = 0;

    for (const r of rows) {
      if (r.status === "completed") {
        totalCompleted += parseFloat(r.amount) || 0;
      }
      if (r.isPublic) {
        publicCount++;
      }
      if (!latestCollection || r.date > latestCollection.date) {
        latestCollection = r;
      }
    }

    return {
      totalCollectedOnPage: totalCompleted,
      totalCount: meta?.total || rows.length,
      latest: latestCollection,
      publicCount,
    };
  }, [rows, meta]);

  // Selected Fund Details
  const selectedFundInfo = useMemo(() => {
    if (!selected?.fund.id) return null;
    return funds.find((f) => f.id === selected.fund.id) || null;
  }, [selected, funds]);

  // Handler: Create Jummah Collection
  const handleCreateCollection = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const date = formData.get("date") as string;
    const chosenFundId = formData.get("fundId") as string;
    const amountStr = (formData.get("amount") as string)?.replace(/,/g, "").trim();
    const scheduleIdVal = formData.get("scheduleId") as string;
    const reference = (formData.get("reference") as string)?.trim() || null;
    const notes = (formData.get("notes") as string)?.trim() || null;
    const isPublic = formData.get("isPublic") === "true";

    if (!isFridayDate(date)) {
      setFormError(`${date} is not a Friday. Please select a valid Friday date.`);
      return;
    }

    if (!chosenFundId) {
      setFormError("Please select a target fund for this collection.");
      return;
    }

    if (!amountStr || parseFloat(amountStr) <= 0) {
      setFormError("Please enter a valid positive collection amount.");
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      setFieldErrors(undefined);

      const input: CreateJummahCollectionInput = {
        date,
        fundId: chosenFundId,
        amount: amountStr,
        scheduleId: scheduleIdVal ? scheduleIdVal : null,
        reference,
        notes,
        isPublic,
      };

      await createJummahCollection(input);
      notify({
        message: "Collection Recorded",
        description: `Successfully recorded ৳${formatAmount(parseFloat(amountStr))} for Friday ${date}.`,
        tone: "success",
      });

      setRecordOpen(false);
      refreshAll();
    } catch (err: any) {
      if (err instanceof ServiceError) {
        setFormError(err.message);
        setFieldErrors(err.fieldErrors);
      } else {
        setFormError(err?.message || "Failed to record collection");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: Edit / Update Collection
  const handleUpdateCollection = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editTarget) return;

    const formData = new FormData(e.currentTarget);
    const amountStr = (formData.get("amount") as string)?.replace(/,/g, "").trim();
    const reference = (formData.get("reference") as string)?.trim() || null;
    const notes = (formData.get("notes") as string)?.trim() || null;
    const isPublic = formData.get("isPublic") === "true";

    try {
      setIsSubmitting(true);
      setFormError(null);

      const input: UpdateJummahCollectionInput = {
        amount: amountStr || undefined,
        reference,
        notes,
        isPublic,
      };

      const updated = await updateJummahCollection(editTarget.id, input);
      notify({
        message: "Collection Updated",
        description: "Friday collection record was updated successfully.",
        tone: "success",
      });

      setEditTarget(null);
      if (selected?.id === editTarget.id) {
        setSelected(updated);
      }
      refreshAll();
    } catch (err: any) {
      setFormError(err?.message || "Failed to update collection");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: Void Collection
  const handleVoidCollection = async () => {
    if (!voidTarget) return;

    try {
      await updateJummahCollection(voidTarget.id, {
        status: "voided",
      });

      notify({
        message: "Collection Voided",
        description: `Collection of ৳${formatAmount(parseFloat(voidTarget.amount))} marked as voided. Linked financial transaction reversed.`,
        tone: "info",
      });

      setVoidTarget(null);
      if (selected?.id === voidTarget.id) {
        setSelected({ ...selected, status: "voided" });
      }
      refreshAll();
    } catch (err: any) {
      notify({
        message: "Void Failed",
        description: err?.message || "Failed to void collection",
        tone: "danger",
      });
    }
  };

  // Table Columns
  const columns: Column<JummahCollection>[] = [
    {
      key: "date",
      header: "Friday Date",
      cell: (row) => (
        <div>
          <span className="font-semibold text-[#17211d]">{formatShortDate(row.date)}</span>
          <span className="block text-[11px] text-[#69726d]">{row.date}</span>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Collection Amount",
      cell: (row) => (
        <span
          className={`font-semibold tabular-nums ${
            row.status === "voided" ? "line-through text-[#8b938d]" : "text-[#0d4d3b]"
          }`}
        >
          <Money value={parseFloat(row.amount) || 0} />
        </span>
      ),
    },
    {
      key: "fund",
      header: "Fund Target",
      cell: (row) => (
        <span className="inline-flex items-center gap-1 text-[13px] font-medium text-[#2d3732]">
          <Icon name="wallet" size={12} className="text-[#0d4d3b]" />
          {row.fund.name}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge tone={row.status === "completed" ? "success" : "danger"}>
          {row.status === "completed" ? "Completed" : "Voided"}
        </Badge>
      ),
    },
    {
      key: "visibility",
      header: "Public Website",
      cell: (row) => (
        <span className="inline-flex items-center gap-1.5 text-[12px]">
          {row.isPublic ? (
            <Chip className="border-[#c2d8cb] bg-[#eaf2ed] text-[#0b4634]">Public</Chip>
          ) : (
            <Chip className="border-[#deddd3] bg-[#f6f5ee] text-[#565f59]">Private</Chip>
          )}
        </span>
      ),
    },
    {
      key: "recordedBy",
      header: "Recorded By",
      cell: (row) => (
        <span className="text-[12px] text-[#4d5650]">{row.createdBy?.fullName || "Staff"}</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <IconButton
            icon="receipt"
            label="View collection details"
            onClick={() => setSelected(row)}
          />
          {row.status === "completed" ? (
            <Can anyOf={["jumuah_collection.manage", "donation.manage", "finance.manage"]}>
              <IconButton
                icon="settings"
                label="Edit collection"
                onClick={() => setEditTarget(row)}
              />
              <IconButton
                icon="close"
                label="Void collection"
                onClick={() => setVoidTarget(row)}
              />
            </Can>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Stat Summary Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat
          label="Total Records"
          value={String(summaryMetrics.totalCount)}
          hint="Historical Friday sessions"
          icon="calendar"
        />
        <MiniStat
          label="Page Collections Sum"
          value={`৳${formatAmount(summaryMetrics.totalCollectedOnPage)}`}
          hint="From active page rows"
          icon="wallet"
        />
        <MiniStat
          label="Latest Friday Collection"
          value={
            summaryMetrics.latest
              ? `৳${formatAmount(parseFloat(summaryMetrics.latest.amount) || 0)}`
              : "—"
          }
          hint={summaryMetrics.latest ? summaryMetrics.latest.date : "No records yet"}
          icon="gauge"
        />
        <MiniStat
          label="Publicly Published"
          value={String(summaryMetrics.publicCount)}
          hint="Visible on mosque transparency page"
          icon="users"
        />
      </div>

      {/* Main Panel */}
      <Panel>
        <PanelHeader
          title="Friday / Jumu'ah Collections"
          description="Record and audit congregational collections. Every completed record atomically updates the mosque fund balance ledger."
          icon="wallet"
          actions={
            <div className="flex items-center gap-2">
              <IconButton icon="rotate" label="Refresh data" onClick={refreshAll} />
              <Can
                anyOf={[
                  "jumuah_collection.record",
                  "donation.record",
                  "jumuah.manage",
                ]}
              >
                <Button variant="primary" icon="plus" onClick={() => setRecordOpen(true)}>
                  Record Friday Collection
                </Button>
              </Can>
            </div>
          }
        />

        {/* Filter Bar */}
        <div className="p-4 border-b border-[#e1e6df] bg-[#fbfbf9]">
          <FinanceFilters
            filters={selectFilters}
            activeCount={activeCount}
            onReset={resetFilters}
          />
        </div>

        {/* Content Body */}
        <PanelBody className="p-0">
          {loading ? (
            <TableSkeleton rows={6} />
          ) : error ? (
            <div className="p-8">
              <FinanceErrorState
                title="Failed to load Jummah collections"
                description={error}
                onRetry={refetch}
              />
            </div>
          ) : rows.length === 0 ? (
            <div className="p-12">
              <FinanceEmptyState
                title="No Jummah collections found"
                description={
                  activeCount > 0
                    ? "Try resetting your search filters to find matching collection records."
                    : "No Friday congregational collections have been recorded yet. Click 'Record Friday Collection' to get started."
                }
                icon="calendar"
                action={
                  <Can
                    anyOf={[
                      "jumuah_collection.record",
                      "donation.record",
                      "jumuah.manage",
                    ]}
                  >
                    <Button
                      variant="primary"
                      icon="plus"
                      onClick={() => setRecordOpen(true)}
                    >
                      Record Friday Collection
                    </Button>
                  </Can>
                }
              />
            </div>
          ) : (
            <DataTable
              columns={columns}
              rows={rows}
              getRowKey={(r) => r.id}
              caption="Historical Jummah collections list"
              serverPage={
                meta
                  ? {
                      page: meta.page,
                      pageSize: meta.limit,
                      totalPages: meta.totalPages,
                      total: meta.total,
                      onPageChange: setPage,
                    }
                  : undefined
              }
              emptyState={<p className="p-4 text-center text-sm text-[#69726d]">No records.</p>}
            />
          )}
        </PanelBody>
      </Panel>

      {/* Record Collection Modal */}
      <Modal
        open={recordOpen}
        title="Record Friday / Jumu'ah Collection"
        description="Enter collection figures counted for the Friday congregation. This will atomically record an income transaction in the fund ledger."
        onClose={() => {
          setRecordOpen(false);
          setFormError(null);
          setFieldErrors(undefined);
        }}
      >
        <form onSubmit={handleCreateCollection} className="space-y-4">
          {formError ? (
            <InlineNotice tone="danger">{formError}</InlineNotice>
          ) : null}

          <TextField
            label="Friday Date (YYYY-MM-DD)"
            name="date"
            type="date"
            required
            defaultValue={getRecentOrUpcomingFriday()}
            hint="Must be a Friday calendar date"
            error={fieldErrors?.date?.[0]}
          />

          <SelectField
            label="Target Donation Fund"
            name="fundId"
            required
            placeholder="Select fund to allocate collection to"
            options={funds.map((f) => ({
              value: f.id,
              label: f.name,
            }))}
            hint="The chosen fund will receive the collection into its verified balance"
            error={fieldErrors?.fundId?.[0]}
          />

          <AmountField
            label="Collection Amount"
            name="amount"
            required
            placeholder="0.00"
            hint="Total cash/money counted from collection boxes (BDT)"
            error={fieldErrors?.amount?.[0]}
          />

          {schedules.length > 0 ? (
            <SelectField
              label="Associated Jumu'ah Schedule (Optional)"
              name="scheduleId"
              placeholder="None / General Friday collection"
              options={schedules.map((s) => ({
                value: s.id,
                label: `${s.date || "Standing"} — Khutbah ${s.khutbahTime}, Prayer ${s.prayerTime}${
                  s.imam ? ` (${s.imam})` : ""
                }`,
              }))}
              hint="Optionally link to a specific Jama'at timetable entry"
            />
          ) : null}

          <TextField
            label="Box / Reference Code"
            name="reference"
            placeholder="e.g. BOX-01-MAIN-HALL"
            hint="Identifier of the collection box or count sheet reference"
            error={fieldErrors?.reference?.[0]}
          />

          <SelectField
            label="Public Website Visibility"
            name="isPublic"
            defaultValue="true"
            options={[
              { value: "true", label: "Public — Show in mosque transparency statistics" },
              { value: "false", label: "Private — Keep for internal accounting only" },
            ]}
            hint="Public collections appear on public transparency pages without donor/user info"
          />

          <TextAreaField
            label="Counter Remarks / Notes"
            name="notes"
            placeholder="e.g. Counted by Treasurer Ahmed and Brother Kabir"
            hint="Notes regarding the counting session"
            error={fieldErrors?.notes?.[0]}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e1e6df]">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setRecordOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              icon="check"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Recording..." : "Save Collection"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Collection Modal */}
      <Modal
        open={Boolean(editTarget)}
        title="Edit / Correct Jummah Collection"
        description={
          editTarget
            ? `Modify collection for Friday ${editTarget.date}. Modifying amount automatically updates the linked income ledger transaction.`
            : "Modify collection"
        }
        onClose={() => {
          setEditTarget(null);
          setFormError(null);
        }}
      >
        {editTarget ? (
          <form onSubmit={handleUpdateCollection} className="space-y-4">
            {formError ? (
              <InlineNotice tone="danger">{formError}</InlineNotice>
            ) : null}

            <AmountField
              label="Corrected Amount"
              name="amount"
              defaultValue={editTarget.amount}
              required
              hint="Corrected total amount"
            />

            <TextField
              label="Reference"
              name="reference"
              defaultValue={editTarget.reference || ""}
            />

            <SelectField
              label="Public Visibility"
              name="isPublic"
              defaultValue={editTarget.isPublic ? "true" : "false"}
              options={[
                { value: "true", label: "Public — Show on transparency page" },
                { value: "false", label: "Private — Internal accounting only" },
              ]}
            />

            <TextAreaField
              label="Correction Reason / Remarks"
              name="notes"
              defaultValue={editTarget.notes || ""}
              hint="Document why this collection was modified"
            />

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e1e6df]">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setEditTarget(null)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                icon="check"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Save Correction"}
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>

      {/* Detail Drawer Modal */}
      <Modal
        open={Boolean(selected)}
        title={selected ? `Jummah Collection — ${formatShortDate(selected.date)}` : "Collection Details"}
        description={selected ? `ID: ${selected.id}` : undefined}
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <div className="space-y-6 text-sm">
            <div className="rounded-lg border border-[#e1e6df] bg-[#fbfbf9] p-4 space-y-3">
              <SummaryRow
                label="Friday Date"
                value={`${formatShortDate(selected.date)} (${selected.date})`}
              />
              <SummaryRow
                label="Collection Amount"
                value={<Money value={parseFloat(selected.amount) || 0} />}
              />
              <SummaryRow
                label="Status"
                value={
                  <Badge tone={selected.status === "completed" ? "success" : "danger"}>
                    {selected.status === "completed" ? "Completed" : "Voided"}
                  </Badge>
                }
              />
              <SummaryRow
                label="Public Website Visibility"
                value={selected.isPublic ? "Publicly Visible" : "Internal / Private"}
              />
              <SummaryRow
                label="Target Fund"
                value={`${selected.fund.name} (${selected.fund.slug})`}
              />
              <SummaryRow
                label="Reference Code"
                value={selected.reference || "None"}
              />
              <SummaryRow
                label="Recorded By"
                value={`${selected.createdBy?.fullName || "Staff"} (${
                  selected.createdBy?.email || "—"
                })`}
              />
              <SummaryRow
                label="Recorded Timestamp"
                value={new Date(selected.createdAt).toLocaleString()}
              />
              {selected.notes ? (
                <SummaryRow label="Remarks / Count Notes" value={selected.notes} />
              ) : null}
            </div>

            {/* Linked Fund Progress Card */}
            {selectedFundInfo ? (
              <div className="rounded-lg border border-[#0d4d3b]/20 bg-[#0d4d3b]/5 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#0d4d3b] text-sm">
                    {selectedFundInfo.name} Status
                  </span>
                  <Badge tone="success">{selectedFundInfo.status}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-[#3d453f] pt-2 border-t border-[#0d4d3b]/10">
                  <div>
                    <span className="text-[#69726d] block">Fund Type</span>
                    <span className="font-bold text-sm">
                      {selectedFundInfo.isPublic ? "Public Fund" : "Internal Fund"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#69726d] block">Target Goal</span>
                    <span className="font-bold text-sm">
                      {selectedFundInfo.targetAmount
                        ? `৳${formatAmount(parseFloat(selectedFundInfo.targetAmount) || 0)}`
                        : "Open Target"}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-between pt-4 border-t border-[#e1e6df]">
              <div>
                {selected.status === "completed" ? (
                  <Can
                    anyOf={[
                      "jumuah_collection.void",
                      "donation.manage",
                      "finance.manage",
                    ]}
                  >
                    <Button
                      variant="danger"
                      icon="close"
                      onClick={() => {
                        setVoidTarget(selected);
                      }}
                    >
                      Void Collection
                    </Button>
                  </Can>
                ) : null}
              </div>
              <Button variant="secondary" onClick={() => setSelected(null)}>
                Close Details
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Void Confirmation Dialog */}
      {voidTarget ? (
        <ConfirmDialog
          open={true}
          title="Void Jummah Collection?"
          description={`Are you sure you want to void the collection of ৳${formatAmount(
            parseFloat(voidTarget.amount) || 0,
          )} recorded on ${voidTarget.date}? This will automatically reverse the corresponding income transaction in the ledger.`}
          confirmLabel="Confirm Void"
          tone="danger"
          onConfirm={handleVoidCollection}
          onClose={() => setVoidTarget(null)}
        />
      ) : null}
    </div>
  );
}
