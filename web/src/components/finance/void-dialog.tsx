"use client";

import { useState } from "react";
import { Button } from "@/components/finance/ui/button";
import { Modal } from "@/components/finance/ui/modal";
import { SummaryRow, TextAreaField } from "@/components/finance/ui/form-field";
import { InlineNotice } from "@/components/finance/ui/states";
import { formatAmount } from "@/lib/finance/format";
import { VOID_REASON_MIN_LENGTH } from "@/lib/finance/types";

/**
 * Voiding is how this system corrects money, because nothing financial is ever edited or deleted
 * (spec 0005). The original record stays exactly as it was recorded and a fresh one is entered
 * beside it, so the ledger still adds up and an auditor can see what happened and why.
 *
 * The reason is therefore not a nicety. It is the only explanation anyone reading the books next year
 * will have, which is why it is required, has a minimum length, and cannot be skipped from the UI.
 * The API will require it again — this dialog is here so a treasurer is not surprised by that.
 */

type Props = {
  open: boolean;
  onClose: () => void;
  onVoid: (reason: string) => void;
  /** What is being voided, e.g. "Donation DON-2026-00218". */
  recordLabel: string;
  amount: number;
  details?: ReadonlyArray<{ label: string; value: string }>;
};

export function VoidDialog({ open, onClose, onVoid, recordLabel, amount, details = [] }: Props) {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);

  // Reset during render rather than in an effect. Opening the dialog a second time must start from a
  // blank reason — a reason typed for one correction must never be carried into the next one.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setReason("");
      setTouched(false);
    }
  }

  const trimmed = reason.trim();
  const tooShort = trimmed.length < VOID_REASON_MIN_LENGTH;
  const error = touched && tooShort ? `Give at least ${VOID_REASON_MIN_LENGTH} characters so the correction can be understood later.` : undefined;

  const submit = () => {
    setTouched(true);
    if (tooShort) return;
    onVoid(trimmed);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Void this record"
      description="The record is kept and marked void. Enter a corrected one afterwards if money did change hands."
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Keep it
          </Button>
          <Button variant="danger" icon="close" onClick={submit}>
            Void record
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <dl className="rounded-md border border-[#e2e1d6] bg-[#faf9f4] px-3.5 py-2.5">
          <SummaryRow label="Record" value={recordLabel} />
          {details.map((detail) => (
            <SummaryRow key={detail.label} label={detail.label} value={detail.value} />
          ))}
          <SummaryRow label="Amount" value={formatAmount(amount)} emphasis />
        </dl>

        <TextAreaField
          label="Reason for voiding"
          required
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          onBlur={() => setTouched(true)}
          error={error}
          hint="Written into the audit trail against your name. It cannot be changed afterwards."
          placeholder="Recorded twice by mistake during the Friday count."
        />

        <InlineNotice icon="shield">
          Nothing is deleted. The original stays in the register marked void, with your name and the reason beside it.
        </InlineNotice>
      </div>
    </Modal>
  );
}
