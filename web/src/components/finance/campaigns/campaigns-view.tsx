"use client";

import { useState } from "react";
import { Chip, Badge } from "@/components/finance/ui/badge";
import { Button } from "@/components/finance/ui/button";
import { FinanceFilters, SegmentedControl, type SelectFilter } from "@/components/finance/ui/filters";
import { AmountField, SelectField, SummaryRow, TextAreaField, TextField } from "@/components/finance/ui/form-field";
import { Icon } from "@/components/finance/ui/icon";
import { Modal } from "@/components/finance/ui/modal";
import { ConfirmDialog } from "@/components/finance/ui/dialogs";
import { Panel, PanelBody, PanelHeader } from "@/components/finance/ui/panel";
import { Can } from "@/components/finance/ui/permission-gate";
import { FinanceEmptyState, FinanceErrorState, InlineNotice } from "@/components/finance/ui/states";
import { MiniStat } from "@/components/finance/ui/summary-card";
import { TableSkeleton } from "@/components/finance/ui/skeleton";
import { Pagination } from "@/components/finance/ui/data-table";
import { useDashboardSession } from "@/components/dashboard/session-provider";
import { useToast } from "@/components/ui/toast";
import { useApiList, useApiResource } from "@/hooks/use-api";
import { 
  fetchCampaigns, 
  createCampaign, 
  archiveCampaign, 
  deleteCampaign, 
  type Campaign, 
  type CampaignQuery, 
  type CreateCampaignInput 
} from "@/services/campaignsService";
import { fetchDonationFunds } from "@/services/donationFundsService";
import { formatAmount, formatDate } from "@/lib/finance/format";
import { campaignStatusTone } from "@/lib/finance/status";
import type { CampaignStatus } from "@/services/enums";

const campaignStatusOptions = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "archived", label: "Archived" },
];

const campaignStatusLabels: Record<string, string> = {
  active: "Active",
  draft: "Draft",
  completed: "Completed",
  cancelled: "Cancelled",
  archived: "Archived",
};

function CampaignStatusBadge({ status }: { status: string }) {
  const tone = (campaignStatusTone as Record<string, any>)[status] ?? "neutral";
  const label = campaignStatusLabels[status] ?? status;
  return <Badge tone={tone}>{label}</Badge>;
}

function CampaignCard({ campaign, onOpen }: { campaign: Campaign; onOpen: () => void }) {
  return (
    <li className="flex flex-col justify-between rounded-lg border border-[#e2e1d6] bg-white p-5 shadow-[0_1px_2px_rgba(7,58,45,.04),0_10px_28px_-24px_rgba(7,58,45,.3)]">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[14.5px] font-semibold text-[#17211d]">{campaign.title}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {campaign.fund ? (
                <Chip>{campaign.fund.name}</Chip>
              ) : (
                <span className="text-[11.5px] text-[#8b938d]">Standalone Appeal</span>
              )}
              {!campaign.isPublic ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-[#e3ce9d] bg-[#f7f0df] px-2 py-0.5 text-[11px] font-semibold text-[#7d5f18]">
                  <Icon name="lock" size={11} />
                  Internal
                </span>
              ) : null}
            </div>
          </div>
          <CampaignStatusBadge status={campaign.status} />
        </div>

        <div className="mt-4">
          <p className="text-[12px] font-medium text-[#3d453f]">
            Target Goal: <span className="font-semibold text-[#17211d]">{formatAmount(parseFloat(campaign.targetAmount))}</span>
          </p>
          <p className="mt-1 text-[11.5px] text-[#8b938d]">
            {campaign.startDate} &rarr; {campaign.endDate}
          </p>
        </div>

        {campaign.description && (
          <p className="mt-3 text-[12.5px] leading-5 text-[#69726d] line-clamp-2">{campaign.description}</p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-[#eceae0]">
        <Button size="sm" variant="secondary" icon="eye" onClick={onOpen}>
          Details
        </Button>
        <span className="ml-auto text-[11.5px] text-[#9aa19c]">Updated {formatDate(campaign.updatedAt)}</span>
      </div>
    </li>
  );
}

export function CampaignsView() {
  const { can } = useDashboardSession();
  const { notify } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CampaignStatus | "all">("all");
  const [fundId, setFundId] = useState("all");

  const [selected, setSelected] = useState<Campaign | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | undefined>(undefined);

  const query: CampaignQuery = {
    page,
    limit: 12,
    search: search || undefined,
    status: status !== "all" ? status : undefined,
    fundId: fundId !== "all" ? fundId : undefined,
  };

  const { rows, meta, loading, error, refetch } = useApiList(fetchCampaigns, query, { enabled: can("campaign.view") });
  const { data: funds, refetch: refetchFunds } = useApiResource(() => fetchDonationFunds({ limit: 100 }), []);

  const reset = () => {
    setStatus("all");
    setFundId("all");
    setSearch("");
    setPage(1);
  };

  const fundFilterOptions = [
    { value: "all", label: "All funds" },
    ...(funds?.rows.map((f) => ({ value: f.id, label: f.name })) || []),
  ];

  const filters: SelectFilter[] = [
    { id: "status", label: "Status", value: status, options: campaignStatusOptions, onChange: (val) => { setStatus(val as any); setPage(1); } },
    { id: "fund", label: "Fund", value: fundId, options: fundFilterOptions, onChange: (val) => { setFundId(val); setPage(1); } },
  ];

  const activeCount = [status !== "all", fundId !== "all"].filter(Boolean).length;

  const handleCreateCampaign = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      setIsSubmitting(true);
      setCreateError(null);
      setFieldErrors(undefined);

      const input: CreateCampaignInput = {
        title: formData.get("title") as string,
        fundId: (formData.get("fundId") as string) || null,
        targetAmount: (formData.get("targetAmount") as string).replace(/,/g, ""),
        startDate: formData.get("startDate") as string,
        endDate: formData.get("endDate") as string,
        isPublic: formData.get("isPublic") === "true",
        status: (formData.get("status") as CampaignStatus) || "draft",
        description: (formData.get("description") as string) || null,
      };

      await createCampaign(input);
      setCreateOpen(false);
      refetch();
      notify({
        message: "Campaign created successfully",
        description: `"${input.title}" is now open for fundraising.`,
        tone: "success",
      });
    } catch (err: any) {
      const fieldErr = err?.fieldErrors || err?.errors;
      let detailedMsg = err.message || "Failed to create campaign";
      if (fieldErr && typeof fieldErr === "object") {
        setFieldErrors(fieldErr);
        const detailList = Object.values(fieldErr).flat().filter(Boolean).join(". ");
        if (detailList) detailedMsg = detailList;
      } else {
        setFieldErrors(undefined);
      }
      setCreateError(detailedMsg);
      notify({
        message: "Unable to create campaign",
        description: detailedMsg,
        tone: "danger",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async (campaign: Campaign) => {
    try {
      await archiveCampaign(campaign.id);
      setSelected(null);
      refetch();
      notify({
        message: "Campaign archived",
        description: `"${campaign.title}" has been archived.`,
        tone: "info",
      });
    } catch (err: any) {
      notify({
        message: "Failed to archive campaign",
        description: err.message || "Could not archive campaign",
        tone: "danger",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCampaign(deleteTarget.id);
      const title = deleteTarget.title;
      setDeleteTarget(null);
      setSelected(null);
      refetch();
      notify({
        message: "Campaign deleted",
        description: `"${title}" was removed.`,
        tone: "success",
      });
    } catch (err: any) {
      notify({
        message: "Delete failed",
        description: err.message || "Could not delete campaign (donations may already be attached)",
        tone: "danger",
      });
    }
  };

  if (loading && !rows.length) return <TableSkeleton />;
  if (error) return <FinanceErrorState description={error} onRetry={refetch} />;

  const activeCampaigns = rows.filter((c) => c.status === "active").length;
  const totalTarget = rows.reduce((sum, c) => sum + parseFloat(c.targetAmount || "0"), 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat 
          label="Total Campaigns" 
          value={meta?.total?.toString() ?? rows.length.toString()} 
          hint={`${activeCampaigns} active now`} 
          icon="megaphone" 
          tone="positive" 
        />
        <MiniStat 
          label="Target Pledged" 
          value={formatAmount(totalTarget)} 
          hint="Combined targets" 
          icon="chart" 
        />
        <MiniStat 
          label="Active Appeals" 
          value={activeCampaigns.toString()} 
          hint="Currently collecting" 
          icon="check-circle" 
          tone="positive" 
        />
      </div>

      <Panel>
        <PanelHeader
          title="Campaigns"
          description="Fundraising appeals collecting towards specific mosque projects and funds"
          icon="megaphone"
          actions={
            <Can permission="campaign.manage">
              <Button size="sm" icon="plus" onClick={() => { refetchFunds(); setCreateOpen(true); }}>
                New Campaign
              </Button>
            </Can>
          }
        />
        <FinanceFilters
          search={{ value: search, onChange: setSearch, placeholder: "Search campaigns…", label: "Search campaigns" }}
          filters={filters}
          activeCount={activeCount}
          onReset={reset}
        />

        {rows.length === 0 ? (
          <PanelBody>
            <FinanceEmptyState
              icon="megaphone"
              title="No campaigns found"
              description="No campaigns match your filters, or none have been created yet."
              action={
                <Can permission="campaign.manage">
                  <Button icon="plus" onClick={() => { refetchFunds(); setCreateOpen(true); }}>
                    Create First Campaign
                  </Button>
                </Can>
              }
            />
          </PanelBody>
        ) : (
          <PanelBody>
            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {rows.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} onOpen={() => setSelected(campaign)} />
              ))}
            </ul>
          </PanelBody>
        )}

        {meta && meta.totalPages > 1 && (
          <div className="border-t border-[#e7e6dc] px-5 py-4">
            <Pagination page={meta.page} totalPages={meta.totalPages} onChange={setPage} />
          </div>
        )}
      </Panel>

      {/* Details Modal */}
      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.title || "Campaign Details"}
        footer={
          selected && can("campaign.manage") ? (
            <div className="flex flex-wrap items-center justify-between w-full gap-2">
              <Button variant="danger" size="sm" icon="trash" onClick={() => setDeleteTarget(selected)}>
                Delete
              </Button>
              <div className="flex items-center gap-2 ml-auto">
                {selected.status === "active" && (
                  <Button variant="secondary" size="sm" icon="inbox" onClick={() => handleArchive(selected)}>
                    Archive
                  </Button>
                )}
                <Button variant="secondary" size="sm" onClick={() => setSelected(null)}>
                  Close
                </Button>
              </div>
            </div>
          ) : undefined
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <CampaignStatusBadge status={selected.status} />
              {selected.fund ? <Chip>{selected.fund.name}</Chip> : <Chip>Standalone</Chip>}
              <Chip>{selected.slug}</Chip>
              {selected.isPublic ? <Chip>Public</Chip> : <Chip>Internal Only</Chip>}
            </div>

            <dl className="divide-y divide-[#f0efe6] rounded-md border border-[#e2e1d6] bg-[#faf9f4] px-3.5 py-1">
              <SummaryRow label="Fund" value={selected.fund?.name ?? "None"} />
              <SummaryRow label="Target Goal" value={formatAmount(parseFloat(selected.targetAmount))} />
              <SummaryRow label="Start Date" value={selected.startDate} />
              <SummaryRow label="End Date" value={selected.endDate} />
              <SummaryRow label="Created At" value={formatDate(selected.createdAt)} />
            </dl>

            {selected.description && (
              <div>
                <p className="text-[12px] font-semibold text-[#3d453f]">Description</p>
                <p className="mt-1 text-[13px] leading-6 text-[#4d564f]">{selected.description}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create Campaign Modal */}
      <Modal
        open={createOpen}
        onClose={() => !isSubmitting && setCreateOpen(false)}
        title="Create New Campaign"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" form="create-campaign-form" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Campaign"}
            </Button>
          </>
        }
      >
        <form id="create-campaign-form" onSubmit={handleCreateCampaign} className="space-y-4">
          {createError && <InlineNotice icon="close" tone="danger">{createError}</InlineNotice>}

          <TextField 
            label="Campaign Title" 
            name="title" 
            required 
            error={fieldErrors?.title?.[0]} 
            placeholder="e.g. Build New Mosque Roof" 
          />

          <SelectField
            label="Associated Fund"
            name="fundId"
            required
            error={fieldErrors?.fundId?.[0]}
            placeholder={funds?.rows?.length ? "Select a fund..." : "No funds available"}
            options={funds?.rows.map((f) => ({ value: f.id, label: f.name })) || []}
          />

          <AmountField 
            label="Target Amount (BDT)" 
            name="targetAmount" 
            required 
            error={fieldErrors?.targetAmount?.[0]} 
          />

          <div className="grid grid-cols-2 gap-4">
            <TextField 
              label="Start Date" 
              name="startDate" 
              type="date" 
              required 
              error={fieldErrors?.startDate?.[0]} 
            />
            <TextField 
              label="End Date" 
              name="endDate" 
              type="date" 
              required 
              error={fieldErrors?.endDate?.[0]} 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label="Status"
              name="status"
              required
              options={[
                { value: "active", label: "Active (Accepting Donations)" },
                { value: "draft", label: "Draft" },
              ]}
            />

            <SelectField
              label="Visibility"
              name="isPublic"
              required
              options={[
                { value: "true", label: "Public (Visible on Website)" },
                { value: "false", label: "Internal Only" },
              ]}
            />
          </div>

          <TextAreaField label="Description" name="description" placeholder="Explain the project or appeal..." />
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Campaign"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? Note that campaigns with recorded donations cannot be deleted and must be archived instead.`}
        confirmLabel="Delete Campaign"
        tone="danger"
        icon="trash"
      />
    </div>
  );
}
