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
import { useMosqueBranding } from "@/components/mosque-branding-provider";
import Link from "next/link";
import { committee, mosqueFacts, mosqueProfile } from "@/data/mosque-profile";
import type { MosqueProfile } from "@/lib/mosque/types";
import { apiUploadRaw } from "@/services/apiClient";
import { 
  fetchMosque, 
  updateMosque, 
  uploadMosqueLogo,
  fetchFacilities, 
  createFacility, 
  updateFacility, 
  deleteFacility, 
  fetchMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  fetchValues,
  createValue,
  updateValue,
  deleteValue,
  type Mosque,
  type Facility,
  type Milestone,
  type MosqueValue,
  type UpdateMosqueInput,
  type CreateFacilityInput,
  type CreateMilestoneInput,
  type CreateValueInput
} from "@/services/mosqueService";
import { fetchUsers, type User } from "@/services/userService";
import { RoleBadge } from "@/components/ui/status-badge";
import { positionLabels, type Position } from "@/lib/permissions";

const divisions = ["Dhaka", "Chattogram", "Rajshahi", "Khulna", "Barishal", "Sylhet", "Rangpur", "Mymensingh"];

export function MosqueProfileView() {
  const { notify } = useToast();
  const { branding, updateBranding } = useMosqueBranding();
  const [profile, setProfile] = useState<MosqueProfile>(mosqueProfile);
  const [draft, setDraft] = useState<MosqueProfile>(mosqueProfile);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [committeeUsers, setCommitteeUsers] = useState<User[]>([]);
  const [logoUrl, setLogoUrl] = useState<string | null>(branding.logoUrl || null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

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

  // Milestones State
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false);
  const [milestoneTarget, setMilestoneTarget] = useState<Milestone | null>(null);
  const [milestoneYear, setMilestoneYear] = useState("");
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneDesc, setMilestoneDesc] = useState("");
  const [milestoneSort, setMilestoneSort] = useState("0");
  const [milestonePublished, setMilestonePublished] = useState(true);
  const [savingMilestone, setSavingMilestone] = useState(false);
  const [deletingMilestoneId, setDeletingMilestoneId] = useState<string | null>(null);

  // Core Values State
  const [values, setValues] = useState<MosqueValue[]>([]);
  const [valueModalOpen, setValueModalOpen] = useState(false);
  const [valueTarget, setValueTarget] = useState<MosqueValue | null>(null);
  const [valueNum, setValueNum] = useState("");
  const [valueTitle, setValueTitle] = useState("");
  const [valueSubtitle, setValueSubtitle] = useState("");
  const [valueDesc, setValueDesc] = useState("");
  const [valueSort, setValueSort] = useState("0");
  const [valuePublished, setValuePublished] = useState(true);
  const [savingValue, setSavingValue] = useState(false);
  const [deletingValueId, setDeletingValueId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [m, f, c, ms, vs] = await Promise.all([
        fetchMosque().catch(() => null),
        fetchFacilities().catch(() => []),
        fetchUsers({ hasPositions: true, limit: 50 }).catch(() => ({ rows: [] as User[] })),
        fetchMilestones().catch(() => []),
        fetchValues().catch(() => []),
      ]);

      if (m) {
        setLogoUrl(m.logoUrl || null);
        updateBranding({
          name: m.name || mosqueProfile.name,
          description: m.description || mosqueProfile.tagline,
          logoUrl: m.logoUrl || null,
          phone: m.phone || mosqueProfile.phone,
          email: m.email || mosqueProfile.email,
          establishedYear: m.establishedYear || null,
        });
        const synced: MosqueProfile = {
          ...mosqueProfile,
          name: m.name || mosqueProfile.name,
          tagline: m.description || mosqueProfile.tagline,
          story: m.story || mosqueProfile.story,
          mission: m.mission || mosqueProfile.mission,
          vision: m.vision || mosqueProfile.vision,
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
      if (c?.rows) {
        setCommitteeUsers(c.rows);
      }
      if (ms) {
        setMilestones(ms);
      }
      if (vs) {
        setValues(vs);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (branding.logoUrl && !logoUrl) {
      setLogoUrl(branding.logoUrl);
    }
  }, [branding.logoUrl]);

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
        story: draft.story || null,
        mission: draft.mission || null,
        vision: draft.vision || null,
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
      updateBranding({
        name: draft.name,
        description: draft.tagline,
        phone: draft.phone,
        email: draft.email,
        establishedYear: draft.established ? parseInt(draft.established, 10) : null,
      });
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingLogo(true);
      let updated: Mosque;
      if (typeof uploadMosqueLogo === "function") {
        updated = await uploadMosqueLogo(file);
      } else {
        const formData = new FormData();
        formData.append("file", file);
        updated = await apiUploadRaw<Mosque>("/mosque/logo", formData);
      }
      setLogoUrl(updated.logoUrl);
      updateBranding({
        logoUrl: updated.logoUrl,
        name: updated.name || profile.name,
      });
      notify({
        tone: "success",
        message: "Mosque logo updated on Cloudinary!",
      });
    } catch (err: any) {
      notify({
        tone: "danger",
        message: "Failed to upload logo to Cloudinary.",
        description: err?.message || "An unexpected error occurred while uploading logo.",
      });
    } finally {
      setUploadingLogo(false);
    }
  };

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

  const openMilestoneModal = (ms?: Milestone) => {
    if (ms) {
      setMilestoneTarget(ms);
      setMilestoneYear(ms.year);
      setMilestoneTitle(ms.title);
      setMilestoneDesc(ms.description || "");
      setMilestoneSort(String(ms.sortOrder ?? 0));
      setMilestonePublished(ms.isPublished);
    } else {
      setMilestoneTarget(null);
      setMilestoneYear("");
      setMilestoneTitle("");
      setMilestoneDesc("");
      setMilestoneSort(String(milestones.length + 1));
      setMilestonePublished(true);
    }
    setMilestoneModalOpen(true);
  };

  const handleSaveMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestoneYear.trim() || !milestoneTitle.trim()) {
      notify({ message: "Year and Title are required", tone: "warning" });
      return;
    }

    try {
      setSavingMilestone(true);
      const input: CreateMilestoneInput = {
        year: milestoneYear.trim(),
        title: milestoneTitle.trim(),
        description: milestoneDesc.trim(),
        sortOrder: parseInt(milestoneSort, 10) || 0,
        isPublished: milestonePublished,
      };

      if (milestoneTarget) {
        const updated = await updateMilestone(milestoneTarget.id, input);
        setMilestones((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        notify({ message: "Milestone Updated", description: `${updated.year} - ${updated.title} updated.`, tone: "success" });
      } else {
        const created = await createMilestone(input);
        setMilestones((prev) => [...prev, created].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
        notify({ message: "Milestone Created", description: `${created.year} milestone added.`, tone: "success" });
      }
      setMilestoneModalOpen(false);
    } catch (err: any) {
      notify({
        message: "Could not save milestone",
        description: err.message || "Failed to save milestone",
        tone: "danger",
      });
    } finally {
      setSavingMilestone(false);
    }
  };

  const handleDeleteMilestone = async () => {
    if (!deletingMilestoneId) return;
    try {
      await deleteMilestone(deletingMilestoneId);
      setMilestones((prev) => prev.filter((m) => m.id !== deletingMilestoneId));
      notify({ message: "Milestone Deleted", description: "Milestone removed.", tone: "info" });
    } catch (err: any) {
      notify({
        message: "Could not delete milestone",
        description: err.message || "Failed to delete milestone",
        tone: "danger",
      });
    } finally {
      setDeletingMilestoneId(null);
    }
  };

  const openValueModal = (val?: MosqueValue) => {
    if (val) {
      setValueTarget(val);
      setValueNum(val.num);
      setValueTitle(val.title);
      setValueSubtitle(val.subtitle || "");
      setValueDesc(val.description || "");
      setValueSort(String(val.sortOrder ?? 0));
      setValuePublished(val.isPublished);
    } else {
      setValueTarget(null);
      const nextNum = String(values.length + 1).padStart(2, "0");
      setValueNum(nextNum);
      setValueTitle("");
      setValueSubtitle("");
      setValueDesc("");
      setValueSort(String(values.length + 1));
      setValuePublished(true);
    }
    setValueModalOpen(true);
  };

  const handleSaveValue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valueNum.trim() || !valueTitle.trim()) {
      notify({ message: "Number and Title are required", tone: "warning" });
      return;
    }

    try {
      setSavingValue(true);
      const input: CreateValueInput = {
        num: valueNum.trim(),
        title: valueTitle.trim(),
        subtitle: valueSubtitle.trim() || undefined,
        description: valueDesc.trim(),
        sortOrder: parseInt(valueSort, 10) || 0,
        isPublished: valuePublished,
      };

      if (valueTarget) {
        const updated = await updateValue(valueTarget.id, input);
        setValues((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
        notify({ message: "Value Pillar Updated", description: `${updated.title} updated.`, tone: "success" });
      } else {
        const created = await createValue(input);
        setValues((prev) => [...prev, created].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
        notify({ message: "Value Pillar Created", description: `${created.title} added.`, tone: "success" });
      }
      setValueModalOpen(false);
    } catch (err: any) {
      notify({
        message: "Could not save value pillar",
        description: err.message || "Failed to save value pillar",
        tone: "danger",
      });
    } finally {
      setSavingValue(false);
    }
  };

  const handleDeleteValue = async () => {
    if (!deletingValueId) return;
    try {
      await deleteValue(deletingValueId);
      setValues((prev) => prev.filter((v) => v.id !== deletingValueId));
      notify({ message: "Value Pillar Deleted", description: "Value pillar removed.", tone: "info" });
    } catch (err: any) {
      notify({
        message: "Could not delete value",
        description: err.message || "Failed to delete value",
        tone: "danger",
      });
    } finally {
      setDeletingValueId(null);
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
            <div className="flex flex-col items-center sm:items-start gap-2 shrink-0">
              <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-[#e3ce9d] bg-[#073a2d] shadow-sm">
                {logoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={logoUrl} alt={shown.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-[#e0be79]">
                    <Icon name="mosque" size={38} />
                  </div>
                )}
              </div>
              <Can permission="mosque.manage">
                <label className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11.5px] font-semibold rounded-lg bg-white border border-[#cfd4cd] hover:bg-[#f6f5ee] shadow-sm cursor-pointer text-[#17211d] transition-colors">
                  <Icon name="camera" size={13} className="text-[#0d4d3b]" />
                  {uploadingLogo ? "Uploading…" : "Change Logo"}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={uploadingLogo}
                    onChange={handleLogoUpload}
                  />
                </label>
              </Can>
            </div>

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

      {/* Mosque Logo & Branding */}
      <Panel>
        <PanelHeader
          title="Mosque Logo & Branding"
          description="Official emblem and crest for the public website header, about page, and member portals."
          icon="mosque"
        />
        <PanelBody>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 p-4 rounded-xl border border-[#e7e6dc] bg-[#faf9f4]">
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[#e3ce9d] bg-[#073a2d] shadow-sm">
                {logoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={logoUrl} alt="Mosque Logo" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-[#e0be79]">
                    <Icon name="mosque" size={30} />
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-[#17211d]">Official Mosque Logo</h4>
                  {logoUrl ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-semibold bg-[#eaf2ed] text-[#0b4634] border border-[#c2d8cb]">
                      Live on Cloudinary CDN
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-semibold bg-[#f7f0df] text-[#7d5f18] border border-[#e3ce9d]">
                      Default Icon
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#69726d] mt-0.5">
                  Recommended: 400×400px (1:1 square ratio). Formats: PNG, JPG, WebP, SVG (max 5MB).
                </p>
                {logoUrl && (
                  <p className="text-[11px] text-[#8b938d] mt-1 truncate max-w-md">
                    {logoUrl}
                  </p>
                )}
              </div>
            </div>

            <Can permission="mosque.manage">
              <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-[#0d4d3b] text-white hover:bg-[#0a3d2e] shadow-sm cursor-pointer transition-colors shrink-0">
                <Icon name="upload" size={14} />
                {uploadingLogo ? "Uploading to Cloudinary…" : logoUrl ? "Change Logo" : "Upload Logo"}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={uploadingLogo}
                  onChange={handleLogoUpload}
                />
              </label>
            </Can>
          </div>
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

      {/* Our Story, Mission & Vision */}
      <Panel>
        <PanelHeader
          title="Our Story, Mission & Vision"
          description="The founding narrative, core mission, and long-term vision displayed on the public About page."
          icon="file-text"
        />
        <PanelBody>
          {editing ? (
            <div className="space-y-4">
              <TextAreaField
                label="Founding Story & History"
                rows={6}
                value={draft.story || ""}
                onChange={(event) => set("story", event.target.value)}
                hint="Detailed story of the mosque's founding and legacy. Split paragraphs with double enters."
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextAreaField
                  label="Our Mission"
                  rows={4}
                  value={draft.mission || ""}
                  onChange={(event) => set("mission", event.target.value)}
                  hint="The core mission statement featured on the About page."
                />
                <TextAreaField
                  label="Our Vision"
                  rows={4}
                  value={draft.vision || ""}
                  onChange={(event) => set("vision", event.target.value)}
                  hint="The long-term vision statement featured on the About page."
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h4 className="text-[11.5px] font-bold uppercase tracking-[.08em] text-[#8b938d] mb-1.5">Founding Story</h4>
                {profile.story ? (
                  <div className="space-y-2 text-[13.5px] leading-relaxed text-[#4d564f]">
                    {profile.story.split("\n\n").map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>
                ) : (
                  <p className="text-[13px] italic text-[#8b938d]">No custom story configured. The default editorial narrative will be displayed.</p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t border-[#eceae0]">
                <div className="rounded-xl border border-[#e7e6dc] bg-[#faf9f4] p-4">
                  <h4 className="text-[11.5px] font-bold uppercase tracking-[.08em] text-[#0d4d3b] mb-1">Our Mission</h4>
                  <p className="text-[13px] text-[#4d564f] leading-relaxed">
                    {profile.mission || <span className="italic text-[#8b938d]">No custom mission statement set. Default will be used.</span>}
                  </p>
                </div>
                <div className="rounded-xl border border-[#e7e6dc] bg-[#faf9f4] p-4">
                  <h4 className="text-[11.5px] font-bold uppercase tracking-[.08em] text-[#c79a45] mb-1">Our Vision</h4>
                  <p className="text-[13px] text-[#4d564f] leading-relaxed">
                    {profile.vision || <span className="italic text-[#8b938d]">No custom vision statement set. Default will be used.</span>}
                  </p>
                </div>
              </div>
            </div>
          )}
        </PanelBody>
      </Panel>

      {/* History & Milestones */}
      <Panel>
        <PanelHeader
          title="History & Milestones"
          description="Chronological milestones featured on the interactive About page timeline."
          icon="calendar"
          actions={
            <Can permission="mosque.manage">
              <Button size="sm" icon="plus" onClick={() => openMilestoneModal()}>
                Add Milestone
              </Button>
            </Can>
          }
        />
        <PanelBody>
          {milestones.length === 0 ? (
            <p className="py-4 text-center text-[13px] text-[#69726d]">No milestones recorded yet. Default milestones will be displayed on the About page.</p>
          ) : (
            <div className="divide-y divide-[#eceae0] rounded-xl border border-[#e7e6dc] bg-[#faf9f4] overflow-hidden">
              {milestones.map((ms) => (
                <div key={ms.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/60 transition-colors">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <span className="shrink-0 px-2.5 py-1 rounded-md bg-[#0d4d3b]/10 text-[#0d4d3b] font-bold text-sm tracking-wide">
                      {ms.year}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-[14px] font-semibold text-[#17211d] truncate">{ms.title}</h4>
                        <Badge tone={ms.isPublished ? "success" : "neutral"}>
                          {ms.isPublished ? "Published" : "Draft"}
                        </Badge>
                      </div>
                      {ms.description && (
                        <p className="mt-1 text-[12.5px] text-[#69726d] line-clamp-2">{ms.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center self-end sm:self-center gap-1 shrink-0">
                    <Can permission="mosque.manage">
                      <IconButton
                        icon="pencil"
                        label="Edit Milestone"
                        onClick={() => openMilestoneModal(ms)}
                      />
                    </Can>
                    <Can permission="mosque.manage">
                      <IconButton
                        icon="trash"
                        label="Delete Milestone"
                        tone="danger"
                        onClick={() => setDeletingMilestoneId(ms.id)}
                      />
                    </Can>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PanelBody>
      </Panel>

      {/* Core Beliefs & Values */}
      <Panel>
        <PanelHeader
          title="Core Beliefs & Values"
          description="Foundational pillars and principles guiding the community, displayed on the About page."
          icon="shield"
          actions={
            <Can permission="mosque.manage">
              <Button size="sm" icon="plus" onClick={() => openValueModal()}>
                Add Value Pillar
              </Button>
            </Can>
          }
        />
        <PanelBody>
          {values.length === 0 ? (
            <p className="py-4 text-center text-[13px] text-[#69726d]">No value pillars added yet. Default 6 pillars will be displayed on the About page.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {values.map((val) => (
                <div
                  key={val.id}
                  className="rounded-xl border border-[#e7e6dc] bg-[#faf9f4] p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#c79a45]/15 text-[#916b1e]">
                        #{val.num}
                      </span>
                      <Badge tone={val.isPublished ? "success" : "neutral"}>
                        {val.isPublished ? "Published" : "Draft"}
                      </Badge>
                    </div>
                    <h4 className="mt-2 text-[14px] font-bold text-[#17211d]">{val.title}</h4>
                    {val.subtitle && (
                      <p className="text-[12px] font-medium text-[#8b938d]">{val.subtitle}</p>
                    )}
                    {val.description && (
                      <p className="mt-2 text-[12.5px] text-[#69726d] line-clamp-3 leading-relaxed">{val.description}</p>
                    )}
                  </div>

                  <div className="mt-4 pt-2.5 border-t border-[#eceae0] flex items-center justify-end gap-1">
                    <Can permission="mosque.manage">
                      <IconButton
                        icon="pencil"
                        label="Edit Value Pillar"
                        onClick={() => openValueModal(val)}
                      />
                    </Can>
                    <Can permission="mosque.manage">
                      <IconButton
                        icon="trash"
                        label="Delete Value Pillar"
                        tone="danger"
                        onClick={() => setDeletingValueId(val.id)}
                      />
                    </Can>
                  </div>
                </div>
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
          title="Committee & Leadership"
          description="Mosque committee members and leaders. Posts assigned here are displayed on the public About page."
          icon="users"
          actions={
            <Link href="/dashboard/committee">
              <Button variant="secondary" size="sm" icon="users">
                Manage Committee
              </Button>
            </Link>
          }
        />
        <PanelBody>
          {committeeUsers.length === 0 ? (
            <div className="p-8 text-center bg-[#faf9f4] rounded-xl border border-[#eae6db]">
              <p className="text-sm font-semibold text-[#17211d]">No Committee Members Assigned</p>
              <p className="text-xs text-[#69726d] mt-1">Assign leaders and committee posts to display them here and on the About page.</p>
              <div className="mt-4">
                <Link href="/dashboard/committee">
                  <Button variant="primary" size="sm" icon="plus">
                    Add Committee Member
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {committeeUsers.map((member) => (
                <li
                  key={member.id}
                  className="rounded-xl border border-[#e7e6dc] bg-[#faf9f4] p-3.5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-[13.5px] font-bold text-[#17211d]">{member.fullName}</p>
                      <RoleBadge role={member.role} />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {member.positions.map((pos) => (
                        <Badge key={pos} tone="gold">
                          {positionLabels[pos]?.en || pos}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {member.phone && (
                    <p className="mt-3 text-[11px] text-[#69726d] font-medium">{member.phone}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
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

      {/* Milestone Modal */}
      <Modal
        open={milestoneModalOpen}
        onClose={() => !savingMilestone && setMilestoneModalOpen(false)}
        title={milestoneTarget ? `Edit Milestone (${milestoneTarget.year})` : "Add Historical Milestone"}
        description="Key moment in the mosque's history for the timeline"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" onClick={() => setMilestoneModalOpen(false)} disabled={savingMilestone}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="milestone-form"
              variant="primary"
              disabled={savingMilestone}
              className="font-bold min-h-[40px] px-4"
            >
              {savingMilestone ? "Saving..." : milestoneTarget ? "Update Milestone" : "Create Milestone"}
            </Button>
          </div>
        }
      >
        <form id="milestone-form" onSubmit={handleSaveMilestone} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Year / Era"
              required
              placeholder="e.g. 1987, 1995, 2010"
              value={milestoneYear}
              onChange={(e) => setMilestoneYear(e.target.value)}
            />
            <TextField
              label="Sort Order"
              type="number"
              placeholder="e.g. 1"
              value={milestoneSort}
              onChange={(e) => setMilestoneSort(e.target.value)}
              hint="Controls chronological sequence"
            />
          </div>

          <TextField
            label="Milestone Title"
            required
            placeholder="e.g. Foundation & First Prayer"
            value={milestoneTitle}
            onChange={(e) => setMilestoneTitle(e.target.value)}
          />

          <TextAreaField
            label="Description"
            required
            rows={3}
            placeholder="What occurred at this stage in the mosque's development..."
            value={milestoneDesc}
            onChange={(e) => setMilestoneDesc(e.target.value)}
          />

          <label className="flex items-center gap-2.5 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={milestonePublished}
              onChange={(e) => setMilestonePublished(e.target.checked)}
              className="h-4 w-4 rounded border-[#dcdacd] text-[#0d4d3b] focus:ring-[#0d4d3b]"
            />
            <span className="text-[13px] font-semibold text-[#17211d]">Publish milestone on public About page</span>
          </label>
        </form>
      </Modal>

      {/* Delete Milestone Confirmation */}
      <ConfirmDialog
        open={Boolean(deletingMilestoneId)}
        onClose={() => setDeletingMilestoneId(null)}
        onConfirm={handleDeleteMilestone}
        title="Delete Milestone?"
        description="This will permanently delete the milestone from the timeline."
        confirmLabel="Delete Milestone"
        tone="danger"
      />

      {/* Value Modal */}
      <Modal
        open={valueModalOpen}
        onClose={() => !savingValue && setValueModalOpen(false)}
        title={valueTarget ? `Edit Value Pillar (${valueTarget.title})` : "Add Core Value Pillar"}
        description="Foundational principle or belief displayed on the About page"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" onClick={() => setValueModalOpen(false)} disabled={savingValue}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="value-form"
              variant="primary"
              disabled={savingValue}
              className="font-bold min-h-[40px] px-4"
            >
              {savingValue ? "Saving..." : valueTarget ? "Update Pillar" : "Create Pillar"}
            </Button>
          </div>
        }
      >
        <form id="value-form" onSubmit={handleSaveValue} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Pillar Number"
              required
              placeholder="e.g. 01, 02"
              value={valueNum}
              onChange={(e) => setValueNum(e.target.value)}
            />
            <TextField
              label="Sort Order"
              type="number"
              placeholder="e.g. 1"
              value={valueSort}
              onChange={(e) => setValueSort(e.target.value)}
            />
          </div>

          <TextField
            label="Title"
            required
            placeholder="e.g. Tawhid & Sincere Worship"
            value={valueTitle}
            onChange={(e) => setValueTitle(e.target.value)}
          />

          <TextField
            label="Subtitle"
            placeholder="e.g. Pure Monotheism at our Core"
            value={valueSubtitle}
            onChange={(e) => setValueSubtitle(e.target.value)}
          />

          <TextAreaField
            label="Description"
            required
            rows={3}
            placeholder="Explanation of how this value guides the mosque and community..."
            value={valueDesc}
            onChange={(e) => setValueDesc(e.target.value)}
          />

          <label className="flex items-center gap-2.5 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={valuePublished}
              onChange={(e) => setValuePublished(e.target.checked)}
              className="h-4 w-4 rounded border-[#dcdacd] text-[#0d4d3b] focus:ring-[#0d4d3b]"
            />
            <span className="text-[13px] font-semibold text-[#17211d]">Publish value pillar on public About page</span>
          </label>
        </form>
      </Modal>

      {/* Delete Value Confirmation */}
      <ConfirmDialog
        open={Boolean(deletingValueId)}
        onClose={() => setDeletingValueId(null)}
        onConfirm={handleDeleteValue}
        title="Delete Value Pillar?"
        description="This will permanently delete this core value pillar."
        confirmLabel="Delete Value"
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
