"use client";

import { useEffect, useState } from "react";
import { Button, IconButton } from "@/components/finance/ui/button";
import { SelectField, TextAreaField, TextField } from "@/components/finance/ui/form-field";
import { Icon, type IconName } from "@/components/finance/ui/icon";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/finance/ui/panel";
import { Can } from "@/components/finance/ui/permission-gate";
import { InlineNotice } from "@/components/finance/ui/states";
import { Badge, Chip } from "@/components/finance/ui/badge";
import { Modal } from "@/components/finance/ui/modal";
import { ConfirmDialog } from "@/components/finance/ui/dialogs";
import { TableSkeleton } from "@/components/finance/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { committee, mosqueFacts, mosqueProfile } from "@/data/mosque-profile";
import type { MosqueProfile } from "@/lib/mosque/types";
import { 
  fetchMosque, 
  updateMosque, 
  fetchFacilities, 
  createFacility, 
  updateFacility, 
  deleteFacility, 
  type Facility,
  type UpdateMosqueInput,
  type CreateFacilityInput
} from "@/services/mosqueService";

const divisions = ["Dhaka", "Chattogram", "Rajshahi", "Khulna", "Barishal", "Sylhet", "Rangpur", "Mymensingh"];

export function MosqueProfileView() {
  const { notify } = useToast();
  const [profile, setProfile] = useState<MosqueProfile>(mosqueProfile);
  const [draft, setDraft] = useState<MosqueProfile>(mosqueProfile);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Facilities State
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [facilityModalOpen, setFacilityModalOpen] = useState(false);
  const [facilityTarget, setFacilityTarget] = useState<Facility | null>(null);
  const [facilityName, setFacilityName] = useState("");
  const [facilityDesc, setFacilityDesc] = useState("");
  const [facilityCapacity, setFacilityCapacity] = useState<string>("");
  const [facilityAvailable, setFacilityAvailable] = useState(true);
  const [savingFacility, setSavingFacility] = useState(false);
  const [deletingFacilityId, setDeletingFacilityId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [m, f] = await Promise.all([
        fetchMosque().catch(() => null),
        fetchFacilities().catch(() => []),
      ]);

      if (m) {
        const synced: MosqueProfile = {
          ...mosqueProfile,
          name: m.name || mosqueProfile.name,
          tagline: m.description || mosqueProfile.tagline,
          phone: m.phone || mosqueProfile.phone,
          email: m.email || mosqueProfile.email,
          website: m.website || mosqueProfile.website,
          addressLine: m.addressLine || mosqueProfile.addressLine,
          city: m.city || mosqueProfile.city,
          district: m.district || mosqueProfile.district,
          country: m.country || mosqueProfile.country,
          postalCode: m.postalCode || mosqueProfile.postalCode,
          established: m.establishedYear ? String(m.establishedYear) : mosqueProfile.established,
        };
        setProfile(synced);
        setDraft(synced);
      }
      if (f) {
        setFacilities(f);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const startEditing = () => {
    setDraft(profile);
    setEditing(true);
  };

  const cancel = () => {
    setDraft(profile);
    setEditing(false);
  };

  const save = async () => {
    try {
      setSaving(true);
      const input: UpdateMosqueInput = {
        name: draft.name,
        description: draft.tagline,
        phone: draft.phone,
        email: draft.email,
        website: draft.website,
        addressLine: draft.addressLine,
        city: draft.city,
        district: draft.district,
        country: draft.country,
        postalCode: draft.postalCode,
        establishedYear: draft.established ? parseInt(draft.established, 10) : undefined,
      };
      await updateMosque(input);
      setProfile(draft);
      setEditing(false);
      notify({
        message: "Profile updated successfully.",
        description: "Saved updates to the mosque record in database.",
        tone: "success",
      });
    } catch (err: any) {
      notify({
        message: "Failed to update profile",
        description: err.message || "Database update failed.",
        tone: "danger",
      });
    } finally {
      setSaving(false);
    }
  };

  const set = <Key extends keyof MosqueProfile>(key: Key, value: MosqueProfile[Key]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const setSocial = (key: keyof MosqueProfile["social"], value: string) =>
    setDraft((current) => ({ ...current, social: { ...current.social, [key]: value } }));

  const openFacilityModal = (fac?: Facility) => {
    if (fac) {
      setFacilityTarget(fac);
      setFacilityName(fac.name);
      setFacilityDesc(fac.description || "");
      setFacilityCapacity(fac.capacity ? String(fac.capacity) : "");
      setFacilityAvailable(fac.isAvailable);
    } else {
      setFacilityTarget(null);
      setFacilityName("");
      setFacilityDesc("");
      setFacilityCapacity("");
      setFacilityAvailable(true);
    }
    setFacilityModalOpen(true);
  };

  const handleSaveFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityName.trim()) {
      notify({ message: "Facility name is required", tone: "warning" });
      return;
    }

    try {
      setSavingFacility(true);
      const input: CreateFacilityInput = {
        name: facilityName.trim(),
        description: facilityDesc.trim() || null,
        capacity: facilityCapacity ? parseInt(facilityCapacity, 10) : null,
        isAvailable: facilityAvailable,
      };

      if (facilityTarget) {
        const updated = await updateFacility(facilityTarget.id, input);
        setFacilities((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
        notify({ message: "Facility Updated", description: `${updated.name} updated.`, tone: "success" });
      } else {
        const created = await createFacility(input);
        setFacilities((prev) => [created, ...prev]);
        notify({ message: "Facility Created", description: `${created.name} added to mosque.`, tone: "success" });
      }
      setFacilityModalOpen(false);
    } catch (err: any) {
      notify({
        message: "Could not save facility",
        description: err.message || "Failed to save facility",
        tone: "danger",
      });
    } finally {
      setSavingFacility(false);
    }
  };

  const handleDeleteFacility = async () => {
    if (!deletingFacilityId) return;
    try {
      await deleteFacility(deletingFacilityId);
      setFacilities((prev) => prev.filter((f) => f.id !== deletingFacilityId));
      notify({ message: "Facility Deleted", description: "Facility record removed.", tone: "info" });
    } catch (err: any) {
      notify({
        message: "Could not delete facility",
        description: err.message || "Failed to delete facility",
        tone: "danger",
      });
    } finally {
      setDeletingFacilityId(null);
    }
  };

  const shown = editing ? draft : profile;
  const nameMissing = draft.name.trim().length === 0;

  if (loading) return <TableSkeleton />;

  return (
    <div className="space-y-4">
      {/* Identity */}
      <Panel>
        <PanelBody className="sm:py-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <span
              aria-hidden="true"
              className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-[#e3ce9d] bg-[#073a2d] text-[#e0be79]"
            >
              <Icon name="mosque" size={38} />
            </span>

            <div className="min-w-0 flex-1">
              <h2 className="text-[20px] font-semibold uppercase leading-tight tracking-[.04em] text-[#17211d] sm:text-[23px]">
                {shown.name}
              </h2>
              <p className="mt-1.5 max-w-2xl text-[13.5px] leading-6 text-[#69726d]">{shown.tagline}</p>

              <dl className="mt-4 grid gap-x-6 gap-y-2.5 sm:grid-cols-2 xl:grid-cols-4">
                <ContactLine icon="map-pin" label="Location" value={`${shown.city}, ${shown.country}`} />
                <ContactLine icon="phone" label="Phone" value={shown.phone} />
                <ContactLine icon="mail" label="Email" value={shown.email} />
                <ContactLine icon="globe" label="Website" value={shown.website} />
              </dl>

              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                <Chip>Established {shown.established}</Chip>
                <Chip>{shown.shortName}</Chip>
                <Chip>{shown.division} Division</Chip>
              </div>
            </div>

            <Can permission="mosque.manage">
              {editing ? null : (
                <Button icon="pencil" onClick={startEditing} className="sm:shrink-0">
                  Edit Profile
                </Button>
              )}
            </Can>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-2.5 border-t border-[#eceae0] pt-5 xl:grid-cols-4">
            {mosqueFacts.map((fact) => (
              <div key={fact.label} className="rounded-lg border border-[#e7e6dc] bg-[#faf9f4] px-3.5 py-3">
                <dt className="text-[10.5px] font-bold uppercase tracking-[.08em] text-[#8b938d]">{fact.label}</dt>
                <dd className="mt-1 text-[19px] font-semibold leading-none tabular-nums text-[#17211d]">
                  {fact.value}
                </dd>
                <p className="mt-1 text-[11.5px] leading-4 text-[#8b938d]">{fact.hint}</p>
              </div>
            ))}
          </dl>
        </PanelBody>
      </Panel>

      {editing ? (
        <InlineNotice tone="gold" icon="pencil">
          You are editing the mosque profile. Changes will be saved directly to the database when you choose <strong>Save Changes</strong>.
        </InlineNotice>
      ) : null}

      {/* Basic information */}
      <Panel>
        <PanelHeader title="Basic Information" description="How the mosque is named and reached." icon="mosque" />
        <PanelBody>
          {editing ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Mosque name"
                required
                value={draft.name}
                onChange={(event) => set("name", event.target.value)}
                error={nameMissing ? "The mosque needs a name." : undefined}
              />
              <TextField
                label="Short name"
                required
                value={draft.shortName}
                onChange={(event) => set("shortName", event.target.value)}
                hint="Used in the sidebar and on receipts."
              />
              <TextField
                label="Established"
                required
                inputMode="numeric"
                value={draft.established}
                onChange={(event) => set("established", event.target.value)}
              />
              <TextField
                label="Phone"
                type="tel"
                required
                value={draft.phone}
                onChange={(event) => set("phone", event.target.value)}
              />
              <TextField
                label="Email"
                type="email"
                required
                value={draft.email}
                onChange={(event) => set("email", event.target.value)}
              />
              <TextField
                label="Website"
                value={draft.website}
                onChange={(event) => set("website", event.target.value)}
              />
              <TextAreaField
                label="Tagline"
                rows={2}
                value={draft.tagline}
                onChange={(event) => set("tagline", event.target.value)}
                containerClassName="sm:col-span-2"
                hint="One line, shown under the mosque name on the public site."
              />
            </div>
          ) : (
            <ReadGrid
              rows={[
                ["Mosque name", profile.name],
                ["Short name", profile.shortName],
                ["Established", profile.established],
                ["Phone", profile.phone],
                ["Email", profile.email],
                ["Website", profile.website],
              ]}
            />
          )}
        </PanelBody>
      </Panel>

      {/* Location */}
      <Panel>
        <PanelHeader title="Location" description="Where the mosque is, as the community would give it." icon="map-pin" />
        <PanelBody>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div>
              {editing ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectField
                    label="Country"
                    required
                    value={draft.country}
                    options={["Bangladesh", "India", "Pakistan", "United Kingdom", "United States"]}
                    onChange={(event) => set("country", event.target.value)}
                  />
                  <SelectField
                    label="Division"
                    required
                    value={draft.division}
                    options={divisions}
                    onChange={(event) => set("division", event.target.value)}
                  />
                  <TextField
                    label="District"
                    required
                    value={draft.district}
                    onChange={(event) => set("district", event.target.value)}
                  />
                  <TextField
                    label="City"
                    required
                    value={draft.city}
                    onChange={(event) => set("city", event.target.value)}
                  />
                  <TextField
                    label="Postal code"
                    inputMode="numeric"
                    value={draft.postalCode}
                    onChange={(event) => set("postalCode", event.target.value)}
                  />
                  <TextField
                    label="Address"
                    required
                    value={draft.addressLine}
                    onChange={(event) => set("addressLine", event.target.value)}
                    containerClassName="sm:col-span-2"
                  />
                </div>
              ) : (
                <ReadGrid
                  rows={[
                    ["Country", profile.country],
                    ["Division", profile.division],
                    ["District", profile.district],
                    ["City", profile.city],
                    ["Postal code", profile.postalCode],
                    ["Address", profile.addressLine],
                  ]}
                />
              )}
            </div>

            <MapPlaceholder
              addressLine={shown.addressLine}
              city={shown.city}
              postalCode={shown.postalCode}
              country={shown.country}
            />
          </div>
        </PanelBody>
      </Panel>

      {/* Facilities Management */}
      <Panel>
        <PanelHeader
          title="Facilities"
          description="Halls, rooms, and spaces registered for this mosque."
          icon="mosque"
          actions={
            <Can permission="facility.create">
              <Button size="sm" icon="plus" onClick={() => openFacilityModal()}>
                Add Facility
              </Button>
            </Can>
          }
        />
        <PanelBody>
          {facilities.length === 0 ? (
            <p className="py-4 text-center text-[13px] text-[#69726d]">No facilities added yet.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {facilities.map((fac) => (
                <div
                  key={fac.id}
                  className="rounded-lg border border-[#e7e6dc] bg-[#faf9f4] p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-[14px] font-semibold text-[#17211d]">{fac.name}</h4>
                      <Badge tone={fac.isAvailable ? "success" : "neutral"}>
                        {fac.isAvailable ? "Available" : "Closed"}
                      </Badge>
                    </div>
                    {fac.capacity && (
                      <p className="text-[11.5px] text-[#8b938d] mt-0.5">Capacity: {fac.capacity} people</p>
                    )}
                    {fac.description && (
                      <p className="mt-2 text-[12.5px] text-[#69726d]">{fac.description}</p>
                    )}
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-[#eceae0] flex items-center justify-end gap-1">
                    <Can permission="facility.update">
                      <IconButton
                        icon="pencil"
                        label="Edit Facility"
                        onClick={() => openFacilityModal(fac)}
                      />
                    </Can>
                    <Can permission="facility.delete">
                      <IconButton
                        icon="trash"
                        label="Delete Facility"
                        tone="danger"
                        onClick={() => setDeletingFacilityId(fac.id)}
                      />
                    </Can>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PanelBody>
      </Panel>

      {/* About */}
      <Panel>
        <PanelHeader
          title={`About ${profile.shortName}`}
          description="Shown on the public website's about page and in the mosque directory."
          icon="file-text"
        />
        <PanelBody>
          {editing ? (
            <TextAreaField
              label="About the mosque"
              rows={12}
              value={draft.about}
              onChange={(event) => set("about", event.target.value)}
              hint="Blank lines start a new paragraph."
            />
          ) : (
            <div className="max-w-3xl space-y-3.5">
              {profile.about.split("\n\n").map((paragraph, index) => (
                <p key={index} className="text-[13.5px] leading-7 text-[#4d564f]">
                  {paragraph}
                </p>
              ))}
            </div>
          )}
        </PanelBody>
      </Panel>

      {/* Contact + social */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel>
          <PanelHeader title="Contact Information" description="The numbers the office actually answers." icon="phone" />
          <PanelBody>
            {editing ? (
              <div className="grid gap-4">
                <TextField
                  label="Office phone"
                  type="tel"
                  required
                  value={draft.officePhone}
                  onChange={(event) => set("officePhone", event.target.value)}
                />
                <TextField
                  label="Email"
                  type="email"
                  required
                  value={draft.email}
                  onChange={(event) => set("email", event.target.value)}
                />
                <TextField
                  label="Emergency contact"
                  type="tel"
                  required
                  value={draft.emergencyContact}
                  onChange={(event) => set("emergencyContact", event.target.value)}
                  hint="Reached out of hours — the caretaker's mobile."
                />
              </div>
            ) : (
              <ReadGrid
                columns={1}
                rows={[
                  ["Office phone", profile.officePhone],
                  ["Email", profile.email],
                  ["Emergency contact", profile.emergencyContact],
                ]}
              />
            )}
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="Social Links" description="Where the mosque posts announcements and khutbahs." icon="globe" />
          <PanelBody>
            {editing ? (
              <div className="grid gap-4">
                <TextField
                  label="Facebook"
                  value={draft.social.facebook}
                  onChange={(event) => setSocial("facebook", event.target.value)}
                  placeholder="facebook.com/yourmosque"
                />
                <TextField
                  label="YouTube"
                  value={draft.social.youtube}
                  onChange={(event) => setSocial("youtube", event.target.value)}
                  placeholder="youtube.com/@yourmosque"
                />
                <TextField
                  label="Instagram"
                  value={draft.social.instagram}
                  onChange={(event) => setSocial("instagram", event.target.value)}
                  placeholder="instagram.com/yourmosque"
                />
              </div>
            ) : (
              <ul className="space-y-2.5">
                {(
                  [
                    ["facebook", "Facebook", profile.social.facebook],
                    ["youtube", "YouTube", profile.social.youtube],
                    ["instagram", "Instagram", profile.social.instagram],
                  ] as Array<[IconName, string, string]>
                ).map(([icon, label, value]) => (
                  <li
                    key={label}
                    className="flex items-center gap-3 rounded-lg border border-[#e7e6dc] bg-[#faf9f4] px-3.5 py-2.5"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-[#dcdacd] bg-white text-[#4d564f]">
                      <Icon name={icon} size={15} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-[.08em] text-[#8b938d]">{label}</p>
                      <p className="truncate text-[13px] text-[#17211d]">{value || "Not set"}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </PanelBody>
        </Panel>
      </div>

      {/* Committee */}
      <Panel>
        <PanelHeader
          title="Committee"
          description="Display only. A committee post grants no permission on its own — access comes from the person's role."
          icon="users"
        />
        <PanelBody>
          <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {committee.map((member) => (
              <li
                key={member.name}
                className="rounded-lg border border-[#e7e6dc] bg-[#faf9f4] px-3.5 py-3"
              >
                <p className="text-[13.5px] font-semibold text-[#17211d]">{member.name}</p>
                <p className="mt-0.5 text-[12.5px] text-[#69726d]">{member.position}</p>
                <p className="mt-1 text-[11.5px] text-[#8b938d]">In post since {member.since}</p>
              </li>
            ))}
          </ul>
        </PanelBody>
      </Panel>

      {editing ? (
        <Panel>
          <PanelFooter className="justify-end">
            <Button variant="secondary" onClick={cancel} disabled={saving}>
              Cancel
            </Button>
            <Button icon="check" disabled={nameMissing || saving} onClick={save}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </PanelFooter>
        </Panel>
      ) : null}

      {/* Facility Create / Edit Modal */}
      <Modal
        open={facilityModalOpen}
        onClose={() => !savingFacility && setFacilityModalOpen(false)}
        title={facilityTarget ? `Edit ${facilityTarget.name}` : "Add Mosque Facility"}
        description="Configure room, hall, wudu area or parking space"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" onClick={() => setFacilityModalOpen(false)} disabled={savingFacility}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="facility-form"
              variant="primary"
              disabled={savingFacility}
              className="font-bold min-h-[40px] px-4"
            >
              {savingFacility ? "Saving..." : facilityTarget ? "Update Facility" : "Create Facility"}
            </Button>
          </div>
        }
      >
        <form id="facility-form" onSubmit={handleSaveFacility} noValidate className="space-y-4">
          <TextField
            label="Facility Name"
            required
            placeholder="e.g. Main Prayer Hall, Sisters Prayer Area, Maktab Room 1"
            value={facilityName}
            onChange={(e) => setFacilityName(e.target.value)}
          />

          <TextField
            label="Capacity (people)"
            type="number"
            placeholder="e.g. 500"
            value={facilityCapacity}
            onChange={(e) => setFacilityCapacity(e.target.value)}
          />

          <TextAreaField
            label="Description"
            rows={3}
            placeholder="Details, accessibility, sound system, air conditioning..."
            value={facilityDesc}
            onChange={(e) => setFacilityDesc(e.target.value)}
          />

          <label className="flex items-center gap-2.5 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={facilityAvailable}
              onChange={(e) => setFacilityAvailable(e.target.checked)}
              className="h-4 w-4 rounded border-[#dcdacd] text-[#0d4d3b] focus:ring-[#0d4d3b]"
            />
            <span className="text-[13px] font-semibold text-[#17211d]">Facility is currently available for use</span>
          </label>
        </form>
      </Modal>

      {/* Delete Facility Confirmation */}
      <ConfirmDialog
        open={Boolean(deletingFacilityId)}
        onClose={() => setDeletingFacilityId(null)}
        onConfirm={handleDeleteFacility}
        title="Delete Facility?"
        description="This will permanently delete the facility record from the database."
        confirmLabel="Delete Facility"
        tone="danger"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Pieces
 * -------------------------------------------------------------------------- */

function ContactLine({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span aria-hidden="true" className="mt-0.5 shrink-0 text-[#c79a45]">
        <Icon name={icon} size={14} />
      </span>
      <div className="min-w-0">
        <dt className="text-[10.5px] font-bold uppercase tracking-[.08em] text-[#8b938d]">{label}</dt>
        <dd className="truncate text-[13px] font-medium text-[#17211d]">{value}</dd>
      </div>
    </div>
  );
}

/** Read-mode field list. A real `<dl>`, so each label stays attached to its value. */
function ReadGrid({ rows, columns = 2 }: { rows: Array<[string, string]>; columns?: 1 | 2 }) {
  return (
    <dl className={`grid gap-x-6 gap-y-4 ${columns === 2 ? "sm:grid-cols-2" : ""}`}>
      {rows.map(([label, value]) => (
        <div key={label} className="min-w-0 border-b border-[#f0efe6] pb-3 last:border-0 sm:last:border-0">
          <dt className="text-[11px] font-bold uppercase tracking-[.08em] text-[#8b938d]">{label}</dt>
          <dd className="mt-1 text-[14px] font-medium leading-6 text-[#17211d]">{value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Stand-in for a map.
 */
function MapPlaceholder({
  addressLine,
  city,
  postalCode,
  country,
}: {
  addressLine: string;
  city: string;
  postalCode: string;
  country: string;
}) {
  return (
    <figure className="m-0 overflow-hidden rounded-lg border border-[#e2e1d6] bg-white">
      <div className="relative h-36 bg-[#eef2ec]">
        <svg
          aria-hidden="true"
          viewBox="0 0 300 144"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full text-[#c2d8cb]"
          fill="none"
          stroke="currentColor"
          strokeWidth={1}
        >
          <path d="M0 36h300M0 76h300M0 112h300M56 0v144M132 0v144M208 0v144M262 0v144" />
          <path d="M0 96 74 76l58 22 76-38 92 20" stroke="#9dbfae" strokeWidth={2.5} />
        </svg>
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full text-[#0d4d3b]">
          <Icon name="map-pin" size={30} />
        </span>
        <span className="absolute bottom-2 right-2 rounded border border-[#dcdacd] bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[.08em] text-[#69726d]">
          Map not connected
        </span>
      </div>
      <figcaption className="border-t border-[#e7e6dc] px-3.5 py-3">
        <p className="text-[10.5px] font-bold uppercase tracking-[.08em] text-[#8b938d]">Address</p>
        <address className="mt-1 text-[13px] not-italic leading-6 text-[#17211d]">
          {addressLine}
          <br />
          {city} {postalCode}
          <br />
          {country}
        </address>
      </figcaption>
    </figure>
  );
}
