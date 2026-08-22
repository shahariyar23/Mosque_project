"use client";

import { useState } from "react";
import { Button } from "@/components/finance/ui/button";
import { SelectField, TextAreaField, TextField } from "@/components/finance/ui/form-field";
import { Icon } from "@/components/finance/ui/icon";
import { Modal } from "@/components/finance/ui/modal";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/finance/ui/panel";
import { Can } from "@/components/finance/ui/permission-gate";
import { ProgressBar } from "@/components/finance/ui/progress";
import { InlineNotice } from "@/components/finance/ui/states";
import { CapacityMeter, MiniBarChart } from "@/components/ui/charts";
import { JumuahStatusBadge, KhutbahStatusBadge } from "@/components/ui/status-badge";
import { StatGrid } from "@/components/ui/stat-card";
import { useToast } from "@/components/ui/toast";
import { jumuahOverview, recentKhutbahs } from "@/data/jumuah";
import { mosqueSettings } from "@/data/settings";
import { capacityTone } from "@/lib/mosque/status";
import { toneBadgeClass } from "@/lib/finance/status";
import {
  formatClockTime,
  formatCount,
  formatLongDate,
  formatRelativeDay,
  pluralise,
} from "@/lib/mosque/format";
import type { JumuahSession, Khutbah, StatMetric } from "@/lib/mosque/types";

/**
 * Friday prayer: the two jama'ats, the khutbah and the attendance picture.
 *
 * The whole screen is front-end state. Editing a session or the khutbah changes this component and
 * raises a toast; nothing is posted. Both edit paths are behind `jumuah.manage`, which is also the
 * permission the sidebar row names — the page exists to change something, so there is no separate
 * read-only permission for it.
 */
export function JumuahView() {
  const { notify } = useToast();
  const [sessions, setSessions] = useState<JumuahSession[]>(jumuahOverview.sessions);
  const [khutbah, setKhutbah] = useState<Khutbah>(jumuahOverview.khutbah);
  const [editingSession, setEditingSession] = useState<JumuahSession | null>(null);
  const [managingKhutbah, setManagingKhutbah] = useState(false);

  const timeFormat = mosqueSettings.prayer.timeFormat;
  const registered = sessions.reduce((total, session) => total + session.registrations, 0);
  const capacity = sessions.reduce((total, session) => total + session.capacity, 0);
  const expected = jumuahOverview.expectedAttendance;

  const metrics: StatMetric[] = [
    {
      id: "next",
      label: "Next Jumu'ah",
      value: formatLongDate(jumuahOverview.date),
      hint: `${jumuahOverview.hijriDate} · ${formatRelativeDay(jumuahOverview.date)}`,
      icon: "calendar",
      tone: "gold",
    },
    ...sessions.map<StatMetric>((session, index) => ({
      id: session.id,
      label: session.label,
      value: formatClockTime(session.prayerTime, timeFormat),
      hint: `Khutbah ${formatClockTime(session.khutbahTime, timeFormat)} · ${session.imam}`,
      icon: index === 0 ? "sun" : "sunset",
      tone: "neutral",
    })),
    {
      id: "attendance",
      label: "Expected Attendance",
      value: formatCount(expected),
      hint: `${formatCount(registered)} places reserved so far`,
      icon: "users",
      tone: "positive",
    },
  ];

  const saveSession = (next: JumuahSession) => {
    setSessions((current) => current.map((session) => (session.id === next.id ? next : session)));
    setEditingSession(null);
    notify({
      message: `${next.label} updated successfully.`,
      description: `Khutbah ${formatClockTime(next.khutbahTime, timeFormat)}, prayer ${formatClockTime(next.prayerTime, timeFormat)}.`,
    });
  };

  const saveKhutbah = (next: Khutbah) => {
    setKhutbah(next);
    setManagingKhutbah(false);
    notify({ message: "Khutbah saved successfully.", description: `“${next.title}” — ${next.speaker}.` });
  };

  return (
    <div className="space-y-4">
      <StatGrid metrics={metrics} />

      <div className="grid gap-4 xl:grid-cols-3">
        {/* Sessions */}
        <Panel className="xl:col-span-2">
          <PanelHeader
            title="Jumu'ah Schedule"
            description="Two jama'ats, so those who cannot leave work before two o'clock can still pray in congregation."
            icon="calendar"
          />
          <PanelBody>
            <ul className="grid gap-3 md:grid-cols-2">
              {sessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  timeFormat={timeFormat}
                  onEdit={() => setEditingSession(session)}
                />
              ))}
            </ul>
          </PanelBody>
          <PanelFooter>
            <p className="text-[12px] text-[#69726d]">
              {formatCount(registered)} of {formatCount(capacity)} hall places reserved across both jama&rsquo;ats.
            </p>
          </PanelFooter>
        </Panel>

        {/* Attendance */}
        <Panel>
          <PanelHeader title="Attendance" description="Reserved places against the expected turnout." icon="chart" />
          <PanelBody className="space-y-5">
            <CapacityMeter
              filled={registered}
              capacity={expected}
              filledLabel="Registered"
              capacityLabel="Expected"
              remainingLabel="Available"
              tone={expected > 0 && registered / expected >= 0.8 ? "#c79a45" : "#0d4d3b"}
            />
            <div className="border-t border-[#eceae0] pt-4">
              <h3 className="text-[11px] font-bold uppercase tracking-[.14em] text-[#8b938d]">Recent Fridays</h3>
              <div className="mt-3">
                <MiniBarChart
                  points={jumuahOverview.attendanceHistory.map((point) => ({
                    label: point.label,
                    value: point.attendance,
                  }))}
                  caption="Counted by the security team at both jama'ats."
                />
              </div>
            </div>
            <InlineNotice icon="info">
              Registration reserves a place in a named hall. Turnout is always higher — nobody is turned away from
              Jumu&rsquo;ah for not having registered.
            </InlineNotice>
          </PanelBody>
        </Panel>
      </div>

      {/* Khutbah */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <PanelHeader
            title="Upcoming Khutbah"
            description="The sermon scheduled for the coming Friday."
            icon="megaphone"
            actions={
              <Can permission="jumuah.manage">
                <Button size="sm" icon="pencil" onClick={() => setManagingKhutbah(true)}>
                  Manage Khutbah
                </Button>
              </Can>
            }
          />
          <PanelBody>
            <div className="rounded-lg border border-[#e7e6dc] bg-[#faf9f4] px-4 py-4 sm:px-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#c79a45]">{khutbah.topic}</p>
                  <h3 className="mt-1 text-[18px] font-semibold leading-snug text-[#17211d]">{khutbah.title}</h3>
                </div>
                <KhutbahStatusBadge status={khutbah.status} />
              </div>

              <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Speaker", value: khutbah.speaker, icon: "user" as const },
                  { label: "Date", value: formatLongDate(khutbah.date), icon: "calendar" as const },
                  { label: "Language", value: khutbah.language, icon: "globe" as const },
                ].map((item) => (
                  <div key={item.label}>
                    <dt className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[.08em] text-[#8b938d]">
                      <Icon name={item.icon} size={12} />
                      {item.label}
                    </dt>
                    <dd className="mt-0.5 text-[13.5px] font-medium text-[#17211d]">{item.value}</dd>
                  </div>
                ))}
              </dl>

              <p className="mt-4 border-t border-[#eceae0] pt-3.5 text-[13px] leading-6 text-[#4d564f]">
                {khutbah.summary}
              </p>
            </div>
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="Khutbah Archive" description="Recent and drafted sermons." icon="book" />
          <PanelBody>
            <ul className="divide-y divide-[#f0efe6]">
              {recentKhutbahs.map((entry) => (
                <li key={entry.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-medium text-[#17211d]">{entry.title}</p>
                    <p className="mt-0.5 truncate text-[12px] text-[#69726d]">
                      {entry.speaker} · {formatLongDate(entry.date)}
                    </p>
                  </div>
                  <KhutbahStatusBadge status={entry.status} />
                </li>
              ))}
            </ul>
          </PanelBody>
        </Panel>
      </div>

      {editingSession ? (
        <EditSessionModal
          session={editingSession}
          onClose={() => setEditingSession(null)}
          onSave={saveSession}
        />
      ) : null}

      <ManageKhutbahModal
        open={managingKhutbah}
        khutbah={khutbah}
        onClose={() => setManagingKhutbah(false)}
        onSave={saveKhutbah}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Session card
 * -------------------------------------------------------------------------- */

function SessionCard({
  session,
  timeFormat,
  onEdit,
}: {
  session: JumuahSession;
  timeFormat: "12h" | "24h";
  onEdit: () => void;
}) {
  const tone = capacityTone(session.registrations, session.capacity);
  const share = session.capacity > 0 ? Math.min(100, (session.registrations / session.capacity) * 100) : 0;

  return (
    <li className="flex flex-col rounded-lg border border-[#e2e1d6] bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-[#17211d]">{session.label}</h3>
          <p className="mt-0.5 truncate text-[12px] text-[#69726d]">{session.hall}</p>
        </div>
        <JumuahStatusBadge status={session.status} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-md border border-[#e7e6dc] bg-[#faf9f4] px-3 py-2.5">
          <dt className="text-[10.5px] font-bold uppercase tracking-[.08em] text-[#8b938d]">Khutbah</dt>
          <dd className="mt-0.5 text-[16px] font-semibold tabular-nums text-[#17211d]">
            {formatClockTime(session.khutbahTime, timeFormat)}
          </dd>
        </div>
        <div className="rounded-md border border-[#c2d8cb] bg-[#eaf2ed] px-3 py-2.5">
          <dt className="text-[10.5px] font-bold uppercase tracking-[.08em] text-[#5f7d70]">Prayer</dt>
          <dd className="mt-0.5 text-[16px] font-semibold tabular-nums text-[#0b4634]">
            {formatClockTime(session.prayerTime, timeFormat)}
          </dd>
        </div>
      </dl>

      <dl className="mt-4 space-y-2 text-[13px]">
        <div className="flex items-start justify-between gap-3">
          <dt className="text-[#69726d]">Imam</dt>
          <dd className="text-right font-medium text-[#17211d]">{session.imam}</dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-[#69726d]">Language</dt>
          <dd className="text-right font-medium text-[#17211d]">{session.language}</dd>
        </div>
      </dl>

      <div className="mt-4 border-t border-[#eceae0] pt-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[12.5px] text-[#69726d]">
            <span className="font-semibold tabular-nums text-[#17211d]">{formatCount(session.registrations)}</span> of{" "}
            {formatCount(session.capacity)} registered
          </p>
          <p className="text-[12px] font-semibold tabular-nums text-[#3d453f]">{Math.round(share)}%</p>
        </div>
        <ProgressBar
          className="mt-2"
          value={session.registrations}
          max={session.capacity}
          tone={tone}
          label={`${formatCount(session.registrations)} of ${formatCount(session.capacity)} places taken at the ${session.label}`}
        />
        <p className="mt-2 text-[11.5px] text-[#8b938d]">
          {pluralise(Math.max(0, session.capacity - session.registrations), "place")} still available
        </p>
      </div>

      <Can permission="jumuah.manage">
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" icon="pencil" onClick={onEdit}>
            Edit session
          </Button>
        </div>
      </Can>
    </li>
  );
}

/* -------------------------------------------------------------------------- *
 * Dialogs
 * -------------------------------------------------------------------------- */

function EditSessionModal({
  session,
  onClose,
  onSave,
}: {
  session: JumuahSession;
  onClose: () => void;
  onSave: (next: JumuahSession) => void;
}) {
  const [draft, setDraft] = useState(session);
  const prayerBeforeKhutbah = draft.prayerTime < draft.khutbahTime;
  const capacityInvalid = draft.capacity < draft.registrations;

  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit ${session.label}`}
      description="Times, imam and hall capacity for this jama'at."
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button icon="check" disabled={prayerBeforeKhutbah || capacityInvalid} onClick={() => onSave(draft)}>
            Save Changes
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Khutbah time"
          type="time"
          required
          value={draft.khutbahTime}
          onChange={(event) => setDraft({ ...draft, khutbahTime: event.target.value })}
        />
        <TextField
          label="Prayer time"
          type="time"
          required
          value={draft.prayerTime}
          onChange={(event) => setDraft({ ...draft, prayerTime: event.target.value })}
          error={prayerBeforeKhutbah ? "The prayer follows the khutbah, so it cannot be earlier." : undefined}
        />
        <TextField
          label="Imam"
          required
          value={draft.imam}
          onChange={(event) => setDraft({ ...draft, imam: event.target.value })}
          containerClassName="sm:col-span-2"
        />
        <TextField
          label="Hall"
          required
          value={draft.hall}
          onChange={(event) => setDraft({ ...draft, hall: event.target.value })}
          containerClassName="sm:col-span-2"
        />
        <TextField
          label="Capacity"
          type="number"
          min={0}
          required
          value={String(draft.capacity)}
          onChange={(event) => setDraft({ ...draft, capacity: Number(event.target.value) || 0 })}
          error={
            capacityInvalid
              ? `${formatCount(draft.registrations)} people have already registered, so capacity cannot be lower.`
              : undefined
          }
        />
        <SelectField
          label="Status"
          value={draft.status}
          options={["Open", "Nearly full", "Full", "Closed"]}
          onChange={(event) => setDraft({ ...draft, status: event.target.value as JumuahSession["status"] })}
        />
      </div>
      <InlineNotice className="mt-4" tone="gold">
        Front-end preview — this change is held in the browser only.
      </InlineNotice>
    </Modal>
  );
}

function ManageKhutbahModal({
  open,
  khutbah,
  onClose,
  onSave,
}: {
  open: boolean;
  khutbah: Khutbah;
  onClose: () => void;
  onSave: (next: Khutbah) => void;
}) {
  const [draft, setDraft] = useState(khutbah);
  const missingTitle = draft.title.trim().length === 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Manage khutbah"
      description="The sermon for the coming Friday. A draft is not shown to the community until it is scheduled."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button icon="check" disabled={missingTitle} onClick={() => onSave(draft)}>
            Save Changes
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Title"
          required
          value={draft.title}
          onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          error={missingTitle ? "A khutbah needs a title before it can be scheduled." : undefined}
          containerClassName="sm:col-span-2"
        />
        <TextField
          label="Speaker"
          required
          value={draft.speaker}
          onChange={(event) => setDraft({ ...draft, speaker: event.target.value })}
        />
        <TextField
          label="Date"
          type="date"
          required
          value={draft.date}
          onChange={(event) => setDraft({ ...draft, date: event.target.value })}
        />
        <TextField
          label="Topic"
          value={draft.topic}
          onChange={(event) => setDraft({ ...draft, topic: event.target.value })}
        />
        <SelectField
          label="Language"
          value={draft.language}
          options={["Bangla", "English", "Bangla and English", "Arabic"]}
          onChange={(event) => setDraft({ ...draft, language: event.target.value })}
        />
        <SelectField
          label="Status"
          value={draft.status}
          options={["Draft", "Scheduled", "Delivered"]}
          onChange={(event) => setDraft({ ...draft, status: event.target.value as Khutbah["status"] })}
          containerClassName="sm:col-span-2"
          hint="Scheduled khutbahs appear on the mosque website; drafts stay internal."
        />
        <TextAreaField
          label="Summary"
          rows={4}
          value={draft.summary}
          onChange={(event) => setDraft({ ...draft, summary: event.target.value })}
          containerClassName="sm:col-span-2"
        />
      </div>
      <div className={`mt-4 rounded-lg border px-3.5 py-3 text-[12.5px] leading-6 ${toneBadgeClass.gold}`}>
        Front-end preview — the khutbah is held in the browser and is not published anywhere.
      </div>
    </Modal>
  );
}
