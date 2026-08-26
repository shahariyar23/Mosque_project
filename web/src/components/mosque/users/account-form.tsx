"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/finance/ui/button";
import { SelectField, TextField } from "@/components/finance/ui/form-field";
import { Modal } from "@/components/finance/ui/modal";
import { InlineNotice } from "@/components/finance/ui/states";
import { positionLabels, roleDescriptions, roleLabels, roles, type Position, type Role } from "@/lib/permissions";
import type { AdminUser } from "@/lib/mosque/types";

/**
 * The one form that creates an account, shared by the back-office directory and the member register.
 *
 * There is only one kind of person in this backend — a `User` row — so both pages create people the same
 * way, and both are subject to the same three facts about `POST /users`:
 *
 *  - `password` is required (8–128 characters). There is no invite flow and no email is sent, so whoever
 *    fills this in has to pass the password on themselves. The form says so rather than implying an email
 *    is on its way.
 *  - `role` and `positions` are *refused* by the create DTO — granting authority is a separate operation
 *    with a separate permission, so a create request cannot be used to mint an administrator. Both are
 *    collected here and applied by the caller as follow-up requests.
 *  - `forbidNonWhitelisted` is on, so a field the DTO does not declare is a 400 rather than an ignored
 *    extra. Nothing beyond these seven inputs can be sent, which is why there is no address, no emergency
 *    contact and no membership tier here: those columns do not exist.
 */
export type NewUserDraft = {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  city: string;
  role: Role;
  positions: Position[];
};

const positionList = Object.keys(positionLabels) as Position[];
export const roleOptions = roles.map((role) => ({ value: role, label: roleLabels[role] }));

/** `role: "member"` is the Prisma default, so leaving it alone means no follow-up request at all. */
export function emptyDraft(role: Role = "member"): NewUserDraft {
  return { fullName: "", email: "", password: "", phone: "", city: "", role, positions: [] };
}

export const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * The DTO's E.164 rule, mirrored so the form can say what is wrong before the request does — a 400 from
 * the server would name a regular expression.
 */
export function isValidPhone(value: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(value.replace(/[\s-]/g, ""));
}

/** First message for a field, when the API answered 400 with per-field detail. */
export function fieldMessage(fieldErrors: Record<string, string[]> | undefined, field: string): string | undefined {
  return fieldErrors?.[field]?.[0];
}

/**
 * The phone as a form value.
 *
 * `mapBackendUserToAdminUser` substitutes an em-dash for a missing phone so a table cell has something to
 * print. That value cannot be fed back into a form: submitting "—" fails E.164 validation, and diffing
 * against it reads an untouched blank field as a change.
 */
export function phoneValue(user: AdminUser): string {
  return user.phone === "—" ? "" : user.phone;
}

/** Same order every time, so two equal sets never look like a change. */
export function sameSet(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  const a = [...left].sort();
  const b = [...right].sort();
  return a.every((value, index) => value === b[index]);
}

export function PositionsPicker({ value, onChange }: { value: Position[]; onChange: (positions: Position[]) => void }) {
  const toggle = (position: Position) =>
    onChange(value.includes(position) ? value.filter((item) => item !== position) : [...value, position]);

  return (
    <div className="flex flex-wrap gap-2">
      {positionList.map((position) => {
        const active = value.includes(position);
        return (
          <button
            key={position}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(position)}
            className={`min-h-9 rounded-full border px-3 text-[12.5px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b] ${
              active
                ? "border-[#0d4d3b] bg-[#0d4d3b] text-white"
                : "border-[#cfd4cd] bg-white text-[#4d564f] hover:border-[#0d4d3b] hover:text-[#0d4d3b]"
            }`}
          >
            {positionLabels[position].en}
          </button>
        );
      })}
    </div>
  );
}

export function CreateAccountModal({
  open,
  title,
  description,
  submitLabel = "Create Account",
  defaultRole = "member",
  note,
  canAssignRole,
  canAssignPositions,
  pending,
  error,
  fieldErrors,
  onClose,
  onSave,
}: {
  open: boolean;
  title: string;
  description: string;
  submitLabel?: string;
  defaultRole?: Role;
  /** Extra context above the notices — how this account will be used on the page that opened the form. */
  note?: ReactNode;
  canAssignRole: boolean;
  canAssignPositions: boolean;
  pending: boolean;
  error: string | undefined;
  fieldErrors: Record<string, string[]> | undefined;
  onClose: () => void;
  /** Resolves `true` when the account was created, which is when the form clears itself. */
  onSave: (draft: NewUserDraft) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<NewUserDraft>(() => emptyDraft(defaultRole));
  const [submitted, setSubmitted] = useState(false);

  const set = <Key extends keyof NewUserDraft>(key: Key, value: NewUserDraft[Key]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const phone = draft.phone.trim();
  const errors = {
    fullName: draft.fullName.trim().length < 2 ? "Enter the person's name — at least two characters." : undefined,
    email: !draft.email.trim()
      ? "Enter an email address."
      : !emailPattern.test(draft.email.trim())
        ? "Enter a valid email address."
        : undefined,
    password:
      draft.password.length < 8
        ? "Set a password of at least 8 characters."
        : draft.password.length > 128
          ? "Use at most 128 characters."
          : undefined,
    phone: phone && !isValidPhone(phone) ? "Use the international format, starting with + and the country code." : undefined,
  };
  const valid = Object.values(errors).every((message) => message === undefined);
  const show = (key: keyof typeof errors) => (submitted ? errors[key] : undefined) ?? fieldMessage(fieldErrors, key);

  const reset = () => {
    setDraft(emptyDraft(defaultRole));
    setSubmitted(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    setSubmitted(true);
    if (!valid || pending) return;
    if (await onSave(draft)) reset();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={pending}>
            Cancel
          </Button>
          <Button
            icon="user-plus"
            onClick={() => {
              void submit();
            }}
            disabled={pending}
          >
            {pending ? "Creating…" : submitLabel}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Full name"
          required
          value={draft.fullName}
          onChange={(event) => set("fullName", event.target.value)}
          error={show("fullName")}
          placeholder="Abdul Malik"
          autoComplete="off"
        />
        <TextField
          label="Email"
          required
          type="email"
          value={draft.email}
          onChange={(event) => set("email", event.target.value)}
          error={show("email")}
          placeholder="abdul.malik@noormosque.org"
          autoComplete="off"
        />
        <TextField
          label="Password"
          required
          type="password"
          value={draft.password}
          onChange={(event) => set("password", event.target.value)}
          error={show("password")}
          hint="8–128 characters. They should change it after signing in."
          autoComplete="new-password"
        />
        <TextField
          label="Phone"
          value={draft.phone}
          onChange={(event) => set("phone", event.target.value)}
          error={show("phone")}
          placeholder="+8801711223344"
          inputMode="tel"
          autoComplete="off"
        />
        <TextField
          label="City"
          value={draft.city}
          onChange={(event) => set("city", event.target.value)}
          placeholder="Dhaka"
          autoComplete="off"
        />
        {canAssignRole ? (
          <SelectField
            label="Role"
            value={draft.role}
            options={roleOptions}
            onChange={(event) => set("role", event.target.value as Role)}
            hint={roleDescriptions[draft.role]}
          />
        ) : null}
        {canAssignPositions ? (
          <fieldset className="sm:col-span-2">
            <legend className="text-[13px] font-semibold text-[#3d453f]">Committee posts</legend>
            <p className="mb-1.5 mt-0.5 text-[12px] text-[#69726d]">
              Optional. A post is a label and grants nothing on its own.
            </p>
            <PositionsPicker value={draft.positions} onChange={(positions) => set("positions", positions)} />
          </fieldset>
        ) : null}
      </div>

      {note ? (
        <InlineNotice className="mt-4" tone="neutral" icon="info">
          {note}
        </InlineNotice>
      ) : null}

      {error ? (
        <InlineNotice className="mt-3" tone="danger" icon="alert">
          {error}
        </InlineNotice>
      ) : submitted && !valid ? (
        <InlineNotice className="mt-3" tone="neutral" icon="alert">
          Some details still need attention — see the messages above.
        </InlineNotice>
      ) : canAssignRole || canAssignPositions ? (
        <InlineNotice className="mt-3" tone="neutral" icon="info">
          The account is created as a member first, then the role and posts are applied — creating a person and
          granting authority are separate operations on the server. If the second step is refused you will be told,
          and the account will still exist.
        </InlineNotice>
      ) : (
        <InlineNotice className="mt-3" tone="neutral" icon="info">
          New accounts start as a member. Changing a role needs the role.assign permission.
        </InlineNotice>
      )}
    </Modal>
  );
}
