"use client";

import { useState } from "react";
import { Chip, FundStatusBadge } from "@/components/finance/ui/badge";
import { Button } from "@/components/finance/ui/button";
import { SegmentedControl } from "@/components/finance/ui/filters";
import { AmountField, SelectField, SummaryRow, TextAreaField, TextField } from "@/components/finance/ui/form-field";
import { Icon } from "@/components/finance/ui/icon";
import { Modal } from "@/components/finance/ui/modal";
import { Money } from "@/components/finance/ui/money";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/finance/ui/panel";
import { Can } from "@/components/finance/ui/permission-gate";
import { ProgressBar } from "@/components/finance/ui/progress";
import { FinanceErrorState, InlineNotice } from "@/components/finance/ui/states";
import { MiniStat } from "@/components/finance/ui/summary-card";
import { TableSkeleton } from "@/components/finance/ui/skeleton";
import { Pagination } from "@/components/finance/ui/data-table";
import { useDashboardSession } from "@/components/dashboard/session-provider";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/finance/ui/dialogs";
import { useApiList } from "@/hooks/use-api";
import { 
  fetchDonationFunds, 
  createDonationFund, 
  archiveDonationFund, 
  deleteDonationFund, 
  type DonationFund, 
  type DonationFundQuery, 
  type CreateDonationFundInput 
} from "@/services/donationFundsService";
import { formatAmount, formatDate } from "@/lib/finance/format";
import type { FundStatus } from "@/lib/finance/types";

const scopeOptions = [
  { value: "active", label: "Active funds" },
  { value: "all", label: "Include closed" },
];

function FundCard({ fund, onOpen }: { fund: DonationFund; onOpen: () => void }) {
  return (
    <li className="flex flex-col rounded-lg border border-[#e2e1d6] bg-white p-5 shadow-[0_1px_2px_rgba(7,58,45,.04),0_10px_28px_-24px_rgba(7,58,45,.3)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14.5px] font-semibold text-[#17211d]">{fund.name}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Chip>{fund.slug}</Chip>
            {!fund.isPublic ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#e3ce9d] bg-[#f7f0df] px-2 py-0.5 text-[11px] font-semibold text-[#7d5f18]">
                <Icon name="lock" size={11} />
                Internal
              </span>
            ) : null}
          </div>
        </div>
        <FundStatusBadge status={fund.status as any} />
      </div>

      {fund.targetAmount ? (
        <div className="mt-4">
          <p className="text-[12px] font-medium text-[#3d453f]">Target: {formatAmount(parseFloat(fund.targetAmount))}</p>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-[12px] font-medium text-[#3d453f]">Open-ended fund</p>
        </div>
      )}

      {fund.description && (
        <p className="mt-3.5 text-[12.5px] leading-5 text-[#69726d]">{fund.description}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 pt-0.5 border-t border-[#eceae0]">
        <Button size="sm" variant="secondary" icon="eye" onClick={onOpen}>
          Details
        </Button>
        <span className="ml-auto text-[11.5px] text-[#9aa19c]">Updated {formatDate(fund.updatedAt)}</span>
      </div>
    </li>
  );
}

export function FundsView() {
  const { can } = useDashboardSession();
  const { notify } = useToast();
  const [scope, setScope] = useState("active");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<DonationFund | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DonationFund | null>(null);

  const query: DonationFundQuery = {
    page,
    limit: 12,
    status: scope === "active" ? "active" as any : undefined,
  };

  const { rows, meta, loading, error, refetch } = useApiList(fetchDonationFunds, query, { enabled: can("fund.view") });

  const [createOpen, setCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | undefined>(undefined);

  const handleArchive = async (fund: DonationFund) => {
    try {
      await archiveDonationFund(fund.id);
      setSelected(null);
      refetch();
      notify({
        message: "Fund archived",
        description: `"${fund.name}" has been archived.`,
        tone: "info",
      });
    } catch (err: any) {
      notify({
        message: "Failed to archive fund",
        description: err.message || "Could not archive fund",
        tone: "danger",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDonationFund(deleteTarget.id);
      const name = deleteTarget.name;
      setDeleteTarget(null);
      setSelected(null);
      refetch();
      notify({
        message: "Fund deleted",
        description: `"${name}" was permanently removed.`,
        tone: "success",
      });
    } catch (err: any) {
      notify({
        message: "Delete failed",
        description: err.message || "Could not delete fund",
        tone: "danger",
      });
    }
  };

  const handleCreateFund = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      setIsSubmitting(true);
      setCreateError(null);
      setFieldErrors(undefined);
      
      const input: CreateDonationFundInput = {
        name: formData.get("name") as string,
        description: formData.get("description") as string || null,
        targetAmount: formData.get("targetAmount") ? (formData.get("targetAmount") as string).replace(/,/g, '') : null,
        isPublic: formData.get("isPublic") === "true",
      };

      await createDonationFund(input);
      setCreateOpen(false);
      refetch();
      notify({
        message: "Fund created successfully",
        description: `"${input.name}" is now ready to receive donations.`,
        tone: "success",
      });
    } catch (err: any) {
      const fieldErr = err?.fieldErrors || err?.errors;
      let detailedMsg = err.message || "Failed to create fund";
      if (fieldErr && typeof fieldErr === "object") {
        setFieldErrors(fieldErr);
        const detailList = Object.values(fieldErr).flat().filter(Boolean).join(". ");
        if (detailList) detailedMsg = detailList;
      } else {
        setFieldErrors(undefined);
      }
      setCreateError(detailedMsg);
      notify({
        message: "Unable to create fund",
        description: detailedMsg,
        tone: "danger",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && !rows.length) return <TableSkeleton />;
  if (error) return <FinanceErrorState description={error} onRetry={refetch} />;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat label="Total Funds" value={meta?.total?.toString() ?? "0"} hint={`${rows.filter(r => r.status === 'active').length} active`} icon="vault" tone="positive" />
        <MiniStat label="Campaigns" value={rows.reduce((sum, f) => sum + f.campaignCount, 0).toString()} hint="Across all funds" icon="chart" />
      </div>

      <Panel>
        <PanelHeader
          title="Funds"
          description="What the mosque holds, and what each pot is promised to"
          icon="vault"
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <SegmentedControl label="Which funds" size="sm" value={scope} onChange={(s) => { setScope(s); setPage(1); }} options={scopeOptions} />
              <Can permission="fund.manage">
                <Button size="sm" icon="plus" onClick={() => setCreateOpen(true)}>
                  New Fund
                </Button>
              </Can>
            </div>
          }
        />
        <PanelBody>
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((fund) => (
              <FundCard
                key={fund.id}
                fund={fund}
                onOpen={() => setSelected(fund)}
              />
            ))}
          </ul>
        </PanelBody>
        {meta && meta.totalPages > 1 && (
          <div className="border-t border-[#e7e6dc] px-5 py-4">
            <Pagination page={meta.page} totalPages={meta.totalPages} onChange={setPage} />
          </div>
        )}
      </Panel>

      <Modal 
        open={Boolean(selected)} 
        onClose={() => setSelected(null)} 
        title={selected?.name || "Fund"}
        footer={
          selected && can("fund.manage") ? (
            <div className="flex flex-wrap items-center justify-between w-full gap-2">
              {selected.campaignCount === 0 ? (
                <Button 
                  variant="danger" 
                  size="sm" 
                  icon="trash" 
                  onClick={() => setDeleteTarget(selected)}
                >
                  Delete
                </Button>
              ) : (
                <span className="text-[12px] text-gray-500">Fund has {selected.campaignCount} campaigns</span>
              )}
              <div className="flex items-center gap-2 ml-auto">
                {selected.status === "active" && (
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    icon="inbox" 
                    onClick={() => handleArchive(selected)}
                  >
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
              <FundStatusBadge status={selected.status as any} />
              <Chip>{selected.slug}</Chip>
              {selected.isPublic ? <Chip>Public</Chip> : <Chip>Internal</Chip>}
            </div>
            
            <dl className="divide-y divide-[#f0efe6] rounded-md border border-[#e2e1d6] bg-[#faf9f4] px-3.5 py-1">
              <SummaryRow label="Slug" value={selected.slug} />
              <SummaryRow label="Campaigns" value={selected.campaignCount.toString()} />
              <SummaryRow label="Target" value={selected.targetAmount ? formatAmount(parseFloat(selected.targetAmount)) : "None"} />
              {selected.startDate ? <SummaryRow label="Start Date" value={formatDate(selected.startDate)} /> : null}
              {selected.endDate ? <SummaryRow label="End Date" value={formatDate(selected.endDate)} /> : null}
              <SummaryRow label="Created At" value={formatDate(selected.createdAt)} />
            </dl>
            
            {selected.description && (
              <p className="text-[13px] leading-6 text-[#4d564f]">{selected.description}</p>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete fund"
        description={`Are you sure you want to permanently delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete Fund"
        tone="danger"
        icon="trash"
      />

      <Modal 
        open={createOpen} 
        onClose={() => !isSubmitting && setCreateOpen(false)} 
        title="Create New Fund"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" form="create-fund-form" disabled={isSubmitting}>{isSubmitting ? "Creating..." : "Create Fund"}</Button>
          </>
        }
      >
        <form id="create-fund-form" onSubmit={handleCreateFund} className="space-y-4">
          {createError && (
            <InlineNotice icon="close" tone="danger">{createError}</InlineNotice>
          )}
          
          <TextField label="Fund Name" name="name" required error={fieldErrors?.name?.[0]} placeholder="e.g. Mosque Construction" />
          
          <AmountField label="Target Amount (Optional)" name="targetAmount" error={fieldErrors?.targetAmount?.[0]} />
          
          <SelectField 
            label="Visibility" 
            name="isPublic" 
            required 
            options={[
              { value: "true", label: "Public (Visible on website)" },
              { value: "false", label: "Internal Only" },
            ]} 
          />
          
          <TextAreaField label="Description" name="description" />
        </form>
      </Modal>
    </div>
  );
}
