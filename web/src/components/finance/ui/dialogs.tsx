"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/finance/ui/button";
import { Icon, type IconName } from "@/components/finance/ui/icon";
import { Modal } from "@/components/finance/ui/modal";
import { TextAreaField } from "@/components/finance/ui/form-field";

type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  /** Spell out exactly what happens, including what cannot be undone. */
  description: string;
  details?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  icon?: IconName;
};

/** Every destructive finance action routes through here — nothing deletes on a single click. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  details,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  icon = "alert",
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border ${
            tone === "danger" ? "border-[#ebc8c4] bg-[#fbeceb] text-[#a13228]" : "border-[#c2d8cb] bg-[#eaf2ed] text-[#0d4d3b]"
          }`}
        >
          <Icon name={icon} size={19} />
        </span>
        <div className="min-w-0">
          <p className="text-sm leading-6 text-[#3d453f]">{description}</p>
          {details ? <div className="mt-4 rounded-md border border-[#e7e6dc] bg-[#faf9f4] px-3.5 py-3">{details}</div> : null}
        </div>
      </div>
    </Modal>
  );
}

type ApprovalDialogProps = {
  open: boolean;
  onClose: () => void;
  onDecision: (decision: "approved" | "rejected", note: string) => void;
  title: string;
  itemLabel: string;
  amountLabel: string;
  details?: ReactNode;
  mode?: "approve" | "reject" | "both";
};

/**
 * Approve / reject dialog shared by expenses and salary payments. A rejection always requires
 * a reason so the submitter knows what to correct.
 */
export function ApprovalDialog({
  open,
  onClose,
  onDecision,
  title,
  itemLabel,
  amountLabel,
  details,
  mode = "both",
}: ApprovalDialogProps) {
  const [note, setNote] = useState("");
  const [intent, setIntent] = useState<"approved" | "rejected" | null>(mode === "reject" ? "rejected" : null);
  const rejecting = intent === "rejected";
  const missingReason = rejecting && note.trim().length === 0;

  const close = () => {
    setNote("");
    setIntent(mode === "reject" ? "rejected" : null);
    onClose();
  };

  const submit = (decision: "approved" | "rejected") => {
    if (decision === "rejected" && note.trim().length === 0) {
      setIntent("rejected");
      return;
    }
    onDecision(decision, note.trim());
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={title}
      description="Approvals are recorded against your name and cannot be edited afterwards."
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          {mode !== "approve" ? (
            <Button variant="danger" icon="close" onClick={() => submit("rejected")}>
              Reject
            </Button>
          ) : null}
          {mode !== "reject" ? (
            <Button variant="primary" icon="check" onClick={() => submit("approved")}>
              Approve
            </Button>
          ) : null}
        </>
      }
    >
      <dl className="rounded-md border border-[#e7e6dc] bg-[#faf9f4] px-3.5 py-3">
        <div className="flex items-start justify-between gap-4">
          <dt className="text-[13px] text-[#69726d]">Item</dt>
          <dd className="text-right text-[13px] font-medium text-[#17211d]">{itemLabel}</dd>
        </div>
        <div className="mt-2 flex items-start justify-between gap-4 border-t border-[#e7e6dc] pt-2">
          <dt className="text-[13px] text-[#69726d]">Amount</dt>
          <dd className="text-right text-base font-semibold tabular-nums text-[#17211d]">{amountLabel}</dd>
        </div>
      </dl>

      {details ? <div className="mt-4">{details}</div> : null}

      <TextAreaField
        containerClassName="mt-4"
        label={rejecting ? "Reason for rejection" : "Note"}
        required={rejecting}
        rows={3}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder={rejecting ? "Explain what needs to change before this can be approved." : "Optional note for the record."}
        error={missingReason ? "A reason is required so the submitter knows what to correct." : undefined}
      />
    </Modal>
  );
}
