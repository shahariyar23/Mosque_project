"use client";

import { useEffect, useState } from "react";
import { Chip, FundStatusBadge } from "@/components/finance/ui/badge";
import { Button } from "@/components/finance/ui/button";
import { SegmentedControl } from "@/components/finance/ui/filters";
import { AmountField, SelectField, SummaryRow, TextAreaField, TextField } from "@/components/finance/ui/form-field";
import { Icon } from "@/components/finance/ui/icon";
import { Modal } from "@/components/finance/ui/modal";
import { Panel, PanelBody, PanelHeader } from "@/components/finance/ui/panel";
import { Can } from "@/components/finance/ui/permission-gate";
import { FinanceErrorState, InlineNotice } from "@/components/finance/ui/states";
import { MiniStat } from "@/components/finance/ui/summary-card";
import { TableSkeleton } from "@/components/finance/ui/skeleton";
import { useDashboardSession } from "@/components/dashboard/session-provider";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/finance/ui/dialogs";
import { 
  fetchFundsWithBalances, 
  fetchFundsSummary,
  createDonationFund, 
  archiveDonationFund, 
  deleteDonationFund, 
  type FundWithBalance,
  type FundsSummary,
  type CreateDonationFundInput 
} from "@/services/donationFundsService";
import { createFundTransfer, type CreateFundTransferInput } from "@/services/fundTransfersService";
import { FundCharts } from "@/components/finance/funds/fund-charts";
import { formatAmount, formatDate } from "@/lib/finance/format";

const scopeOptions = [
  { value: "active", label: "Active funds" },
  { value: "all", label: "All funds" },
];

function FundCard({ 
  fund, 
  onOpen, 
  onTransfer 
}: { 
  fund: FundWithBalance; 
  onOpen: () => void;
  onTransfer: () => void;
}) {
  const avail = parseFloat(fund.availableBalance || "0");
  const isZeroOrLow = avail <= 0;

  return (
    <li className="flex flex-col justify-between rounded-xl border border-[#e2e1d6] bg-white p-5 shadow-[0_1px_2px_rgba(7,58,45,.04),0_10px_28px_-24px_rgba(7,58,45,.2)] transition hover:border-[#c5c3b2]">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[16px] font-semibold text-[#17211d]">{fund.name}</h3>
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

        {/* Real-Time Live Available Balance */}
        <div className="mt-4 rounded-lg border border-[#e6e4d8] bg-[#faf9f3] p-3.5">
          <p className="text-[11.5px] font-medium uppercase tracking-wider text-[#68726b]">Available Balance</p>
          <p className={`mt-0.5 text-[22px] font-bold tracking-tight ${isZeroOrLow ? "text-[#a33c2a]" : "text-[#0d6e52]"}`}>
            {formatAmount(avail)}
          </p>
          
          <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-[#eceae0] pt-2 text-[11.5px] text-[#555e58]">
            <div>
              <span className="text-[#87908a]">Income:</span> <span className="font-semibold text-[#0d6e52]">+{formatAmount(parseFloat(fund.totalIncome || "0"))}</span>
            </div>
            <div>
              <span className="text-[#87908a]">Expenses:</span> <span className="font-semibold text-[#a33c2a]">-{formatAmount(parseFloat(fund.totalExpenses || "0"))}</span>
            </div>
            <div>
              <span className="text-[#87908a]">Transfers In:</span> <span className="font-semibold text-[#1f669e]">+{formatAmount(parseFloat(fund.incomingTransfers || "0"))}</span>
            </div>
            <div>
              <span className="text-[#87908a]">Transfers Out:</span> <span className="font-semibold text-[#9e5f1f]">-{formatAmount(parseFloat(fund.outgoingTransfers || "0"))}</span>
            </div>
          </div>
        </div>

        {fund.description && (
          <p className="mt-3 text-[12.5px] leading-5 text-[#69726d] line-clamp-2">{fund.description}</p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#eceae0] pt-3">
        <Button size="sm" variant="secondary" icon="eye" onClick={onOpen}>
          Details
        </Button>
        <Can permission="finance.manage">
          <Button size="sm" variant="secondary" icon="arrow-right" onClick={onTransfer}>
            Transfer
          </Button>
        </Can>
        <span className="ml-auto text-[11px] text-[#9aa19c]">Updated {formatDate(fund.updatedAt)}</span>
      </div>
    </li>
  );
}

export function FundsView() {
  const { can } = useDashboardSession();
  const { notify } = useToast();
  const [scope, setScope] = useState("active");
  const [funds, setFunds] = useState<FundWithBalance[]>([]);
  const [summary, setSummary] = useState<FundsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<FundWithBalance | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FundWithBalance | null>(null);

  // Transfer Modal State
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferFromId, setTransferFromId] = useState<string>("");
  const [transferToId, setTransferToId] = useState<string>("");
  const [transferAmount, setTransferAmount] = useState<string>("");
  const [transferDescription, setTransferDescription] = useState<string>("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  // Create Fund Modal State
  const [createOpen, setCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [fundsData, summaryData] = await Promise.all([
        fetchFundsWithBalances(),
        fetchFundsSummary(),
      ]);
      setFunds(fundsData);
      setSummary(summaryData);
    } catch (err: any) {
      setError(err.message || "Failed to load funds");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (can("fund.view")) {
      loadData();
    }
  }, [can]);

  const displayedFunds = funds.filter((f) => scope === "all" || f.status === "active");

  const handleArchive = async (fund: FundWithBalance) => {
    try {
      await archiveDonationFund(fund.id);
      setSelected(null);
      await loadData();
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
      await loadData();
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
      
      const input: CreateDonationFundInput = {
        name: formData.get("name") as string,
        description: formData.get("description") as string || null,
        targetAmount: formData.get("targetAmount") ? (formData.get("targetAmount") as string).replace(/,/g, '') : null,
        isPublic: formData.get("isPublic") === "true",
      };

      await createDonationFund(input);
      setCreateOpen(false);
      await loadData();
      notify({
        message: "Fund created successfully",
        description: `"${input.name}" is now active with zero opening balance.`,
        tone: "success",
      });
    } catch (err: any) {
      setCreateError(err.message || "Failed to create fund");
      notify({
        message: "Unable to create fund",
        description: err.message || "Failed to create fund",
        tone: "danger",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteTransfer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!transferFromId || !transferToId || !transferAmount) {
      setTransferError("Please fill out source fund, destination fund, and amount.");
      return;
    }

    if (transferFromId === transferToId) {
      setTransferError("Source and destination funds cannot be the same.");
      return;
    }

    try {
      setIsTransferring(true);
      setTransferError(null);

      const cleanAmount = transferAmount.replace(/,/g, "");
      const res = await createFundTransfer({
        fromFundId: transferFromId,
        toFundId: transferToId,
        amount: cleanAmount,
        description: transferDescription.trim() || undefined,
      });

      setTransferOpen(false);
      setTransferAmount("");
      setTransferDescription("");
      await loadData();

      notify({
        message: "Transfer completed successfully",
        description: `Transferred ${res.amount} ${res.currency} from ${res.fromFundName} to ${res.toFundName}. Ref: ${res.transferReference}`,
        tone: "success",
      });
    } catch (err: any) {
      const msg = err.message || "Transfer rejected.";
      setTransferError(msg);
      notify({
        message: "Transfer rejected",
        description: msg,
        tone: "danger",
      });
    } finally {
      setIsTransferring(false);
    }
  };

  if (loading && !funds.length) return <TableSkeleton />;
  if (error) return <FinanceErrorState description={error} onRetry={loadData} />;

  const totalAvail = summary ? parseFloat(summary.totalAvailableBalance) : funds.reduce((acc, f) => acc + parseFloat(f.availableBalance || "0"), 0);
  const totalInc = summary ? parseFloat(summary.totalIncome) : funds.reduce((acc, f) => acc + parseFloat(f.totalIncome || "0"), 0);
  const totalExp = summary ? parseFloat(summary.totalExpenses) : funds.reduce((acc, f) => acc + parseFloat(f.totalExpenses || "0"), 0);
  const totalTrf = summary ? parseFloat(summary.totalTransfers) : funds.reduce((acc, f) => acc + parseFloat(f.incomingTransfers || "0"), 0);

  return (
    <div className="space-y-5">
      {/* Live Financial Summary Across All Funds */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat 
          label="Total Available Funds" 
          value={formatAmount(totalAvail)} 
          hint={`${displayedFunds.length} funds active`} 
          icon="vault" 
          tone="positive" 
        />
        <MiniStat 
          label="Total Completed Income" 
          value={formatAmount(totalInc)} 
          hint="Donations & collections" 
          icon="trending-up" 
          tone="positive" 
        />
        <MiniStat 
          label="Total Completed Expenses" 
          value={formatAmount(totalExp)} 
          hint="Expenses & salaries" 
          icon="trending-down" 
        />
        <MiniStat 
          label="Total Fund Transfers" 
          value={formatAmount(totalTrf)} 
          hint="Inter-fund movements" 
          icon="chart" 
        />
      </div>

      {/* Visual Graphical Analytics */}
      <FundCharts funds={funds} />

      <Panel>
        <PanelHeader
          title="Mosque Funds"
          description="Verified real-time fund balances computed from the double-entry financial ledger"
          icon="vault"
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <SegmentedControl 
                label="Filter funds" 
                size="sm" 
                value={scope} 
                onChange={(s) => setScope(s)} 
                options={scopeOptions} 
              />
              <Can permission="finance.manage">
                <Button 
                  size="sm" 
                  variant="secondary" 
                  icon="arrow-right" 
                  onClick={() => {
                    setTransferFromId(displayedFunds[0]?.id || "");
                    setTransferToId(displayedFunds[1]?.id || "");
                    setTransferOpen(true);
                  }}
                >
                  Transfer Funds
                </Button>
              </Can>
              <Can permission="fund.manage">
                <Button size="sm" icon="plus" onClick={() => setCreateOpen(true)}>
                  New Fund
                </Button>
              </Can>
            </div>
          }
        />
        <PanelBody>
          {displayedFunds.length === 0 ? (
            <div className="py-12 text-center text-[13.5px] text-[#6a736d]">
              No funds found matching this view.
            </div>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {displayedFunds.map((fund) => (
                <FundCard
                  key={fund.id}
                  fund={fund}
                  onOpen={() => setSelected(fund)}
                  onTransfer={() => {
                    setTransferFromId(fund.id);
                    const other = displayedFunds.find((o) => o.id !== fund.id);
                    setTransferToId(other ? other.id : "");
                    setTransferOpen(true);
                  }}
                />
              ))}
            </ul>
          )}
        </PanelBody>
      </Panel>

      {/* Fund Details Modal */}
      <Modal 
        open={Boolean(selected)} 
        onClose={() => setSelected(null)} 
        title={selected?.name || "Fund Details"}
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

            <div className="rounded-lg border border-[#d5d2c2] bg-[#f7f6ed] p-4 text-center">
              <p className="text-[12px] font-medium uppercase tracking-wider text-[#69726d]">Calculated Available Balance</p>
              <p className="mt-1 text-[26px] font-bold text-[#0d6e52]">
                {formatAmount(parseFloat(selected.availableBalance || "0"))}
              </p>
            </div>
            
            <dl className="divide-y divide-[#f0efe6] rounded-md border border-[#e2e1d6] bg-[#faf9f4] px-3.5 py-1">
              <SummaryRow label="Opening Balance" value={formatAmount(parseFloat(selected.openingBalance || "0"))} />
              <SummaryRow label="Total Income" value={`+${formatAmount(parseFloat(selected.totalIncome || "0"))}`} />
              <SummaryRow label="Total Expenses" value={`-${formatAmount(parseFloat(selected.totalExpenses || "0"))}`} />
              <SummaryRow label="Incoming Transfers" value={`+${formatAmount(parseFloat(selected.incomingTransfers || "0"))}`} />
              <SummaryRow label="Outgoing Transfers" value={`-${formatAmount(parseFloat(selected.outgoingTransfers || "0"))}`} />
              <SummaryRow label="Campaigns" value={selected.campaignCount.toString()} />
              <SummaryRow label="Target" value={selected.targetAmount ? formatAmount(parseFloat(selected.targetAmount)) : "Open-ended"} />
              <SummaryRow label="Created At" value={formatDate(selected.createdAt)} />
            </dl>
            
            {selected.description && (
              <p className="text-[13px] leading-6 text-[#4d564f]">{selected.description}</p>
            )}
          </div>
        )}
      </Modal>

      {/* Fund Transfer Modal */}
      <Modal
        open={transferOpen}
        onClose={() => !isTransferring && setTransferOpen(false)}
        title="Transfer Funds Between Pots"
        footer={
          <>
            <Button variant="secondary" onClick={() => setTransferOpen(false)} disabled={isTransferring}>
              Cancel
            </Button>
            <Button type="submit" form="transfer-fund-form" disabled={isTransferring}>
              {isTransferring ? "Processing Transfer..." : "Complete Transfer"}
            </Button>
          </>
        }
      >
        <form id="transfer-fund-form" onSubmit={handleExecuteTransfer} className="space-y-4">
          {transferError && (
            <InlineNotice icon="close" tone="danger">{transferError}</InlineNotice>
          )}

          <div className="rounded-lg border border-[#e0ded0] bg-[#f9f8f2] p-3 text-[12.5px] leading-5 text-[#555d57]">
            Transfers reallocate money between funds without altering mosque revenue or expense reports.
          </div>

          <SelectField
            label="Source Fund (From)"
            value={transferFromId}
            onChange={(e) => setTransferFromId(e.target.value)}
            required
            options={displayedFunds.map((f) => ({
              value: f.id,
              label: `${f.name} (Available: ${formatAmount(parseFloat(f.availableBalance || "0"))})`,
            }))}
          />

          <SelectField
            label="Destination Fund (To)"
            value={transferToId}
            onChange={(e) => setTransferToId(e.target.value)}
            required
            options={displayedFunds
              .filter((f) => f.id !== transferFromId)
              .map((f) => ({
                value: f.id,
                label: `${f.name} (Available: ${formatAmount(parseFloat(f.availableBalance || "0"))})`,
              }))}
          />

          <AmountField
            label="Transfer Amount"
            value={transferAmount}
            onChange={(e) => setTransferAmount(e.target.value)}
            required
            placeholder="0.00"
          />

          <TextField
            label="Reason / Description (Optional)"
            value={transferDescription}
            onChange={(e) => setTransferDescription(e.target.value)}
            placeholder="e.g. Reallocate general reserve to construction project"
          />
        </form>
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

      {/* New Fund Modal */}
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
          
          <TextField label="Fund Name" name="name" required placeholder="e.g. Mosque Construction" />
          
          <AmountField label="Target Amount (Optional)" name="targetAmount" placeholder="0.00" />
          
          <SelectField 
            label="Visibility" 
            name="isPublic" 
            required 
            options={[
              { value: "true", label: "Public (Visible on website)" },
              { value: "false", label: "Internal Only" },
            ]} 
          />
          
          <TextAreaField label="Description" name="description" placeholder="What is this fund collected for?" />
        </form>
      </Modal>
    </div>
  );
}
