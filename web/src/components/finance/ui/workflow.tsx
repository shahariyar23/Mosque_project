import { formatOptionalDate } from "@/lib/finance/format";
import { Icon } from "@/components/finance/ui/icon";

type Props = {
  steps: readonly string[];
  current: string;
  /** Terminal state that replaces the pipeline, e.g. Rejected or Cancelled. */
  terminal?: { label: string; reason?: string } | null;
  label: string;
};

/**
 * Draws the approval pipeline — Draft → Pending Approval → Approved → Paid — with the current
 * position marked. Completed steps carry a tick, so progress is not communicated by colour alone.
 */
export function WorkflowSteps({ steps, current, terminal = null, label }: Props) {
  if (terminal) {
    return (
      <div className="rounded-md border border-[#ebc8c4] bg-[#fbeceb] px-3.5 py-3">
        <p className="flex items-center gap-2 text-[13px] font-semibold text-[#94291f]">
          <Icon name="close" size={15} />
          {terminal.label}
        </p>
        {terminal.reason ? <p className="mt-1 text-[12px] leading-5 text-[#8a4239]">{terminal.reason}</p> : null}
      </div>
    );
  }

  const currentIndex = steps.indexOf(current);

  return (
    <ol aria-label={label} className="flex flex-col gap-0 sm:flex-row sm:items-start sm:gap-0">
      {steps.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        const upcoming = index > currentIndex;
        return (
          <li key={step} className="flex flex-1 gap-3 sm:flex-col sm:gap-0">
            <div className="flex flex-col items-center sm:w-full sm:flex-row">
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[11px] font-bold tabular-nums ${
                  done
                    ? "border-[#0d4d3b] bg-[#0d4d3b] text-white"
                    : active
                      ? "border-[#c79a45] bg-[#f7f0df] text-[#835811]"
                      : "border-[#dcdacd] bg-white text-[#9aa19c]"
                }`}
              >
                {done ? <Icon name="check" size={13} /> : index + 1}
              </span>
              {index < steps.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={`w-px flex-1 sm:h-px sm:w-full ${done ? "bg-[#0d4d3b]" : "bg-[#e2e1d6]"} min-h-6 sm:min-h-0`}
                />
              ) : null}
            </div>
            <div className="pb-4 sm:pb-0 sm:pt-2 sm:pr-3">
              <p className={`text-[12px] font-semibold ${active ? "text-[#17211d]" : upcoming ? "text-[#9aa19c]" : "text-[#4d564f]"}`}>
                {step}
              </p>
              {active ? <p className="mt-0.5 text-[11px] text-[#835811]">Current stage</p> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Who submitted, who approved and when — shown alongside anything that needs sign-off. */
export function ApprovalTrail({
  submittedBy,
  submittedAt,
  approvedBy,
  approvedAt,
  rejectionReason,
  className = "",
}: {
  submittedBy: string;
  submittedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  className?: string;
}) {
  return (
    <dl className={`grid gap-x-6 gap-y-3 sm:grid-cols-2 ${className}`}>
      <div>
        <dt className="text-[11px] font-bold uppercase tracking-[.08em] text-[#8b938d]">Submitted by</dt>
        <dd className="mt-1 text-[13px] font-medium text-[#17211d]">{submittedBy}</dd>
      </div>
      <div>
        <dt className="text-[11px] font-bold uppercase tracking-[.08em] text-[#8b938d]">Submitted date</dt>
        <dd className="mt-1 text-[13px] tabular-nums text-[#3d453f]">{formatOptionalDate(submittedAt)}</dd>
      </div>
      <div>
        <dt className="text-[11px] font-bold uppercase tracking-[.08em] text-[#8b938d]">Approved by</dt>
        <dd className="mt-1 text-[13px] font-medium text-[#17211d]">{approvedBy ?? "Awaiting approval"}</dd>
      </div>
      <div>
        <dt className="text-[11px] font-bold uppercase tracking-[.08em] text-[#8b938d]">Approved date</dt>
        <dd className="mt-1 text-[13px] tabular-nums text-[#3d453f]">{formatOptionalDate(approvedAt)}</dd>
      </div>
      {rejectionReason ? (
        <div className="sm:col-span-2">
          <dt className="text-[11px] font-bold uppercase tracking-[.08em] text-[#8b938d]">Reason for rejection</dt>
          <dd className="mt-1 text-[13px] leading-6 text-[#94291f]">{rejectionReason}</dd>
        </div>
      ) : null}
    </dl>
  );
}
