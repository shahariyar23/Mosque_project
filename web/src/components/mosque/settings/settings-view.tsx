"use client";

import { useState } from "react";
import { Button, IconButton } from "@/components/finance/ui/button";
import { SegmentedControl } from "@/components/finance/ui/filters";
import { SelectField, TextField } from "@/components/finance/ui/form-field";
import { Icon, type IconName } from "@/components/finance/ui/icon";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/finance/ui/panel";
import { Can } from "@/components/finance/ui/permission-gate";
import { InlineNotice } from "@/components/finance/ui/states";
import { Badge } from "@/components/finance/ui/badge";
import { ConfirmDialog } from "@/components/finance/ui/dialogs";
import { TabPanel, Tabs, useTabIds, type TabItem } from "@/components/ui/tabs";
import { Toggle, ToggleList } from "@/components/ui/toggle";
import { useToast } from "@/components/ui/toast";
import {
  calculationMethodOptions,
  currencyOptions,
  dateFormatOptions,
  juristicMethodOptions,
  languageOptions,
  mosqueSettings,
  reminderOptions,
  timezoneOptions,
  weekStartOptions,
} from "@/data/settings";
import { formatLongDate } from "@/lib/mosque/format";
import type {
  AppearanceSettings,
  GeneralSettings,
  NotificationSetting,
  PrayerSettings,
  SettingsSectionId,
  SidebarPreference,
  ThemePreference,
} from "@/lib/mosque/types";

/**
 * Mosque and dashboard settings.
 *
 * A navigation rail beside one open panel. The rail is a real ARIA tab list, which is what gives it
 * one tab stop and arrow-key movement instead of five stops before the content — on a settings page
 * with five sections that is the difference between usable and tedious by keyboard.
 *
 * Each section saves independently. Nothing here is posted: every save copies a draft into state and
 * raises a toast, and the panels say so where a reader might reasonably assume otherwise.
 */
const sections: ReadonlyArray<TabItem<SettingsSectionId>> = [
  { id: "general", label: "General", icon: "settings" },
  { id: "notifications", label: "Notifications", icon: "bell" },
  { id: "prayer", label: "Prayer", icon: "moon" },
  { id: "security", label: "Security", icon: "lock" },
  { id: "appearance", label: "Appearance", icon: "palette" },
];

export function SettingsView() {
  const [active, setActive] = useState<SettingsSectionId>("general");
  const idBase = useTabIds();

  return (
    <div className="grid gap-4 lg:grid-cols-[236px_minmax(0,1fr)] lg:items-start">
      {/*
        The rail stays vertical at every width. Turning it into a horizontal scroller on phones would
        mean either squashing five labels into one row or reaching into the component's own item
        classes; five stacked rows above the panel is a small amount of scrolling and stays legible at
        320px, which is the better trade.
      */}
      <Panel className="p-2 lg:sticky lg:top-18.5">
        <Tabs
          items={sections}
          active={active}
          onChange={setActive}
          label="Settings sections"
          idBase={idBase}
          orientation="vertical"
        />
      </Panel>

      <div className="min-w-0">
        <TabPanel base={idBase} id="general" active={active === "general"}>
          <GeneralSection />
        </TabPanel>
        <TabPanel base={idBase} id="notifications" active={active === "notifications"}>
          <NotificationsSection />
        </TabPanel>
        <TabPanel base={idBase} id="prayer" active={active === "prayer"}>
          <PrayerSection />
        </TabPanel>
        <TabPanel base={idBase} id="security" active={active === "security"}>
          <SecuritySection />
        </TabPanel>
        <TabPanel base={idBase} id="appearance" active={active === "appearance"}>
          <AppearanceSection />
        </TabPanel>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * General
 * -------------------------------------------------------------------------- */

function GeneralSection() {
  const { notify } = useToast();
  const [saved, setSaved] = useState<GeneralSettings>(mosqueSettings.general);
  const [draft, setDraft] = useState<GeneralSettings>(mosqueSettings.general);

  const dirty = JSON.stringify(saved) !== JSON.stringify(draft);
  const set = <Key extends keyof GeneralSettings>(key: Key, value: GeneralSettings[Key]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  return (
    <Panel>
      <PanelHeader
        title="General"
        description="How the dashboard names the mosque and formats dates, money and language."
        icon="settings"
      />
      <PanelBody>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Mosque name"
            required
            value={draft.mosqueName}
            onChange={(event) => set("mosqueName", event.target.value)}
            containerClassName="sm:col-span-2"
          />
          <SelectField
            label="Timezone"
            required
            value={draft.timezone}
            options={[...timezoneOptions]}
            onChange={(event) => set("timezone", event.target.value)}
            hint="Prayer times, event times and audit stamps all use this."
          />
          <SelectField
            label="Language"
            required
            value={draft.language}
            options={languageOptions.map((option) => ({ ...option }))}
            onChange={(event) => set("language", event.target.value)}
          />
          <SelectField
            label="Currency"
            required
            value={draft.currency}
            options={currencyOptions.map((option) => ({ ...option }))}
            onChange={(event) => set("currency", event.target.value)}
          />
          <SelectField
            label="Date format"
            required
            value={draft.dateFormat}
            options={[...dateFormatOptions]}
            onChange={(event) => set("dateFormat", event.target.value)}
          />
          <SelectField
            label="Week starts on"
            required
            value={draft.weekStart}
            options={[...weekStartOptions]}
            onChange={(event) => set("weekStart", event.target.value)}
            hint="Saturday for Bangladesh — it sets the order of the weekly prayer table."
            containerClassName="sm:col-span-2"
          />
        </div>
      </PanelBody>
      <SaveFooter
        dirty={dirty}
        onCancel={() => setDraft(saved)}
        onSave={() => {
          setSaved(draft);
          notify({ message: "General settings saved.", description: "Held in this browser only." });
        }}
      />
    </Panel>
  );
}

/* -------------------------------------------------------------------------- *
 * Notifications
 * -------------------------------------------------------------------------- */

function NotificationsSection() {
  const { notify } = useToast();
  const [settings, setSettings] = useState<NotificationSetting[]>(mosqueSettings.notifications);

  const toggle = (key: NotificationSetting["key"], enabled: boolean) => {
    setSettings((current) => current.map((item) => (item.key === key ? { ...item, enabled } : item)));
    const changed = settings.find((item) => item.key === key);
    notify({
      tone: enabled ? "success" : "info",
      message: `${changed?.label ?? "Notification"} ${enabled ? "switched on" : "switched off"}.`,
    });
  };

  const onCount = settings.filter((item) => item.enabled).length;

  return (
    <Panel>
      <PanelHeader
        title="Notifications"
        description={`What the dashboard tells you about. ${onCount} of ${settings.length} are on.`}
        icon="bell"
      />
      <PanelBody>
        <ToggleList>
          {settings.map((item) => (
            <Toggle
              key={item.key}
              label={item.label}
              description={item.description}
              checked={item.enabled}
              onChange={(next) => toggle(item.key, next)}
            />
          ))}
        </ToggleList>
        <InlineNotice className="mt-5" icon="info">
          Switching a notification off stops the alert, not the record. Everything still appears in the activity feed
          and in the module it belongs to.
        </InlineNotice>
      </PanelBody>
      <PanelFooter>
        <p className="text-[12px] text-[#69726d]">Each switch saves as you change it.</p>
      </PanelFooter>
    </Panel>
  );
}

/* -------------------------------------------------------------------------- *
 * Prayer
 * -------------------------------------------------------------------------- */

function PrayerSection() {
  const { notify } = useToast();
  const [saved, setSaved] = useState<PrayerSettings>(mosqueSettings.prayer);
  const [draft, setDraft] = useState<PrayerSettings>(mosqueSettings.prayer);

  const dirty = JSON.stringify(saved) !== JSON.stringify(draft);
  const set = <Key extends keyof PrayerSettings>(key: Key, value: PrayerSettings[Key]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  return (
    <Panel>
      <PanelHeader
        title="Prayer"
        description="How prayer times are produced and announced. Changing any of this re-times every prayer."
        icon="moon"
      />
      <PanelBody>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Calculation method"
            required
            value={draft.calculationMethod}
            options={[...calculationMethodOptions]}
            onChange={(event) => set("calculationMethod", event.target.value)}
            containerClassName="sm:col-span-2"
            hint="The convention the published times follow. Karachi is standard across Bangladesh."
          />
          <SelectField
            label="Juristic method (Asr)"
            required
            value={draft.juristicMethod}
            options={[...juristicMethodOptions]}
            onChange={(event) => set("juristicMethod", event.target.value)}
            hint="Asr falls later under the Hanafi school. This is a fiqh decision, not a preference."
          />
          <SelectField
            label="Prayer reminder"
            value={String(draft.reminderMinutes)}
            options={reminderOptions.map((option) => ({ ...option }))}
            onChange={(event) => set("reminderMinutes", Number(event.target.value))}
          />
          <TextField
            label="Location"
            required
            value={draft.location}
            onChange={(event) => set("location", event.target.value)}
          />
          <SelectField
            label="Timezone"
            required
            value={draft.timezone}
            options={[...timezoneOptions]}
            onChange={(event) => set("timezone", event.target.value)}
          />
          <TextField
            label="Hijri date adjustment"
            type="number"
            min={-2}
            max={2}
            value={String(draft.hijriAdjustment)}
            onChange={(event) => set("hijriAdjustment", Number(event.target.value) || 0)}
            hint="Days to shift the Hijri date by, when local sighting differs from the calculation."
            containerClassName="sm:col-span-2"
          />
        </div>

        <fieldset className="mt-5 border-t border-[#eceae0] pt-5">
          <legend className="sr-only">Time display</legend>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[13.5px] font-semibold text-[#17211d]">Clock format</p>
              <p className="mt-0.5 text-[12.5px] text-[#69726d]">
                Applies to every prayer time in the dashboard and on the public site.
              </p>
            </div>
            <SegmentedControl
              label="Clock format"
              value={draft.timeFormat}
              options={[
                { value: "12h", label: "12-hour" },
                { value: "24h", label: "24-hour" },
              ]}
              onChange={(value) => set("timeFormat", value)}
            />
          </div>
        </fieldset>
      </PanelBody>
      <SaveFooter
        dirty={dirty}
        onCancel={() => setDraft(saved)}
        onSave={() => {
          setSaved(draft);
          notify({
            message: "Prayer settings saved.",
            description: "Held in this browser — published times are unchanged.",
          });
        }}
      />
    </Panel>
  );
}

/* -------------------------------------------------------------------------- *
 * Security
 * -------------------------------------------------------------------------- */

function SecuritySection() {
  const { notify } = useToast();
  const [twoFactor, setTwoFactor] = useState(mosqueSettings.security.twoFactorEnabled);
  const [sessions, setSessions] = useState(mosqueSettings.security.sessions);
  const [password, setPassword] = useState({ current: "", next: "", confirm: "" });
  const [revoking, setRevoking] = useState<string | null>(null);

  const tooShort = password.next.length > 0 && password.next.length < 10;
  const mismatch = password.confirm.length > 0 && password.confirm !== password.next;
  const canSubmit =
    password.current.length > 0 && password.next.length >= 10 && password.confirm === password.next;

  const changePassword = () => {
    setPassword({ current: "", next: "", confirm: "" });
    notify({
      message: "Password changed successfully.",
      description: "Front-end preview — no credential was sent anywhere.",
    });
  };

  const revoke = (id: string) => {
    const target = sessions.find((session) => session.id === id);
    setSessions((current) => current.filter((session) => session.id !== id));
    notify({ tone: "info", message: "Session signed out.", description: target?.device });
  };

  return (
    <div className="space-y-4">
      <Panel>
        <PanelHeader title="Change Password" description="At least ten characters. Longer beats complicated." icon="key" />
        <PanelBody>
          <div className="grid max-w-xl gap-4">
            <TextField
              label="Current password"
              type="password"
              required
              autoComplete="current-password"
              value={password.current}
              onChange={(event) => setPassword({ ...password, current: event.target.value })}
            />
            <TextField
              label="New password"
              type="password"
              required
              autoComplete="new-password"
              value={password.next}
              onChange={(event) => setPassword({ ...password, next: event.target.value })}
              error={tooShort ? "Use at least ten characters." : undefined}
              hint="A passphrase of three or four unrelated words is both stronger and easier to remember."
            />
            <TextField
              label="Confirm new password"
              type="password"
              required
              autoComplete="new-password"
              value={password.confirm}
              onChange={(event) => setPassword({ ...password, confirm: event.target.value })}
              error={mismatch ? "The two passwords do not match." : undefined}
            />
          </div>
        </PanelBody>
        <PanelFooter className="justify-between">
          <p className="text-[12px] text-[#69726d]">
            Last changed {formatLongDate(mosqueSettings.security.passwordUpdatedAt)}.
          </p>
          <Button icon="check" disabled={!canSubmit} onClick={changePassword}>
            Change Password
          </Button>
        </PanelFooter>
      </Panel>

      <Panel>
        <PanelHeader
          title="Two-Factor Authentication"
          description="A second step at sign-in. Strongly recommended for anyone who can approve money."
          icon="shield"
        />
        <PanelBody>
          <Toggle
            label="Require a second factor at sign-in"
            description="A six-digit code from your authenticator app, in addition to your password."
            checked={twoFactor}
            onChange={(next) => {
              setTwoFactor(next);
              notify({
                tone: next ? "success" : "warning",
                message: next ? "Two-factor authentication enabled." : "Two-factor authentication disabled.",
                description: next
                  ? undefined
                  : "Anyone with the password alone can now sign in. Consider turning this back on.",
              });
            }}
          />
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader
          title="Active Sessions"
          description="Where this account is currently signed in."
          icon="monitor"
        />
        <PanelBody>
          {sessions.length === 0 ? (
            <p className="py-4 text-center text-[13px] text-[#69726d]">No other sessions are signed in.</p>
          ) : (
            <ul className="divide-y divide-[#f0efe6]">
              {sessions.map((session) => (
                <li key={session.id} className="flex items-start gap-3 py-3.5 first:pt-0 last:pb-0">
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-md border border-[#dcdacd] bg-[#f2f1ea] text-[#4d564f]">
                    <Icon name="monitor" size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-[13.5px] font-semibold text-[#17211d]">
                      {session.device}
                      {session.current ? <Badge tone="success">This device</Badge> : null}
                    </p>
                    <p className="mt-0.5 text-[12.5px] text-[#69726d]">
                      {session.browser} · {session.location}
                    </p>
                    <p className="mt-0.5 text-[11.5px] text-[#8b938d]">{session.lastActive}</p>
                  </div>
                  {session.current ? null : (
                    <IconButton
                      icon="x-circle"
                      label={`Sign out ${session.device}`}
                      tone="danger"
                      onClick={() => setRevoking(session.id)}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader
          title="Login Activity"
          description="Recent sign-in attempts. A failed attempt from somewhere unexpected is worth a password change."
          icon="list"
        />
        <PanelBody className="px-0 sm:px-0">
          <div className="panel-scroll overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <caption className="sr-only">Recent sign-in attempts on this account</caption>
              <thead>
                <tr className="border-y border-[#e7e6dc] bg-[#faf9f4]">
                  {["When", "Device", "Location", "Result"].map((heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[.09em] text-[#69726d] sm:px-6"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0efe6]">
                {mosqueSettings.security.loginActivity.map((event) => (
                  <tr key={event.id}>
                    <td className="px-4 py-3 tabular-nums text-[#3d453f] sm:px-6">
                      {event.at.slice(0, 10)} <span className="text-[#8b938d]">{event.at.slice(11, 16)}</span>
                    </td>
                    <td className="px-4 py-3 text-[#3d453f] sm:px-6">{event.device}</td>
                    <td className="px-4 py-3 text-[#3d453f] sm:px-6">{event.location}</td>
                    <td className="px-4 py-3 sm:px-6">
                      <Badge tone={event.result === "Success" ? "success" : "danger"}>{event.result}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PanelBody>
      </Panel>

      <ConfirmDialog
        open={revoking !== null}
        onClose={() => setRevoking(null)}
        onConfirm={() => {
          if (revoking) revoke(revoking);
          setRevoking(null);
        }}
        title="Sign out this session?"
        description="That device will need to sign in again. Do this if you do not recognise it, or if it is a shared computer."
        confirmLabel="Sign out"
        tone="danger"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Appearance
 * -------------------------------------------------------------------------- */

const themeOptions: Array<{ value: ThemePreference; label: string; description: string; icon: IconName }> = [
  { value: "system", label: "System", description: "Follow the device setting", icon: "monitor" },
  { value: "light", label: "Light", description: "Warm ivory, as shown now", icon: "sun" },
  { value: "dark", label: "Dark", description: "Deep emerald surfaces", icon: "moon" },
];

const sidebarOptions: Array<{ value: SidebarPreference; label: string; description: string; icon: IconName }> = [
  { value: "expanded", label: "Expanded", description: "Icons with labels", icon: "list" },
  { value: "compact", label: "Compact", description: "Icons only, labels on hover", icon: "menu" },
];

function AppearanceSection() {
  const { notify } = useToast();
  const [saved, setSaved] = useState<AppearanceSettings>(mosqueSettings.appearance);
  const [draft, setDraft] = useState<AppearanceSettings>(mosqueSettings.appearance);

  const dirty = JSON.stringify(saved) !== JSON.stringify(draft);

  return (
    <Panel>
      <PanelHeader title="Appearance" description="How the dashboard looks on this device." icon="palette" />
      <PanelBody className="space-y-6">
        <ChoiceGroup
          legend="Theme"
          hint="Stored as a preference. The dark theme is not built yet, so choosing it changes nothing on screen today."
          options={themeOptions}
          value={draft.theme}
          onChange={(theme) => setDraft({ ...draft, theme })}
        />

        <ChoiceGroup
          legend="Sidebar"
          hint="Compact gives the content about sixty more pixels on a laptop."
          options={sidebarOptions}
          value={draft.sidebar}
          onChange={(sidebar) => setDraft({ ...draft, sidebar })}
        />

        <fieldset className="border-t border-[#eceae0] pt-5">
          <legend className="text-[13.5px] font-semibold text-[#17211d]">Density</legend>
          <p className="mt-1 text-[12.5px] text-[#69726d]">Row height in tables and lists.</p>
          <div className="mt-3">
            <SegmentedControl
              label="Density"
              value={draft.density}
              options={[
                { value: "comfortable", label: "Comfortable" },
                { value: "compact", label: "Compact" },
              ]}
              onChange={(density) => setDraft({ ...draft, density })}
            />
          </div>
        </fieldset>

        <InlineNotice tone="gold" icon="info">
          Appearance choices are stored per device, not per account — signing in elsewhere keeps that device&rsquo;s own
          preference.
        </InlineNotice>
      </PanelBody>
      <SaveFooter
        dirty={dirty}
        onCancel={() => setDraft(saved)}
        onSave={() => {
          setSaved(draft);
          notify({ message: "Appearance saved.", description: "Stored for this device." });
        }}
      />
    </Panel>
  );
}

/**
 * Radio group rendered as cards.
 *
 * Real `<input type="radio">` elements behind the cards, not buttons: a radio group is one tab stop
 * with arrow keys between the options and the browser announces "2 of 3" for free. The card is the
 * `<label>`, so the whole thing is the hit target.
 */
function ChoiceGroup<Value extends string>({
  legend,
  hint,
  options,
  value,
  onChange,
}: {
  legend: string;
  hint?: string;
  options: Array<{ value: Value; label: string; description: string; icon: IconName }>;
  value: Value;
  onChange: (value: Value) => void;
}) {
  return (
    <fieldset>
      <legend className="text-[13.5px] font-semibold text-[#17211d]">{legend}</legend>
      {hint ? <p className="mt-1 text-[12.5px] leading-5 text-[#69726d]">{hint}</p> : null}
      {/* Column count follows the option count, so a two-choice group does not leave a hole. */}
      <div className={`mt-3 grid gap-2.5 ${options.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <label
              key={option.value}
              className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3.5 py-3 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-[#0d4d3b] ${
                selected ? "border-[#0d4d3b] bg-[#eef2ec]" : "border-[#e2e1d6] bg-white hover:border-[#b9c2ba]"
              }`}
            >
              <input
                type="radio"
                name={legend}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md border ${
                  selected ? "border-[#c2d8cb] bg-white text-[#0d4d3b]" : "border-[#dcdacd] bg-[#f6f5ee] text-[#69726d]"
                }`}
              >
                <Icon name={option.icon} size={14} />
              </span>
              <span className="min-w-0">
                <span
                  className={`block text-[13px] font-semibold ${selected ? "text-[#0b4634]" : "text-[#17211d]"}`}
                >
                  {option.label}
                </span>
                <span className="block text-[11.5px] leading-4 text-[#69726d]">{option.description}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Save / cancel pair. Disabled until something actually changed, so the buttons mean something. */
function SaveFooter({
  dirty,
  onSave,
  onCancel,
}: {
  dirty: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <PanelFooter className="justify-between">
      <p className="text-[12px] text-[#69726d]" aria-live="polite">
        {dirty ? "Unsaved changes." : "Everything is saved."}
      </p>
      <Can permission="settings.manage" fallback={<p className="text-[12px] text-[#8b938d]">Read-only for your role.</p>}>
        <span className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" disabled={!dirty} onClick={onCancel}>
            Cancel
          </Button>
          <Button icon="check" disabled={!dirty} onClick={onSave}>
            Save Changes
          </Button>
        </span>
      </Can>
    </PanelFooter>
  );
}
