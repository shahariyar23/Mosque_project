"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/finance/ui/badge";
import { Button, IconButton } from "@/components/finance/ui/button";
import { ConfirmDialog } from "@/components/finance/ui/dialogs";
import { SelectField, TextField } from "@/components/finance/ui/form-field";
import { Icon } from "@/components/finance/ui/icon";
import { Modal } from "@/components/finance/ui/modal";
import { Panel, PanelBody, PanelHeader } from "@/components/finance/ui/panel";
import { Can } from "@/components/finance/ui/permission-gate";
import { TableSkeleton } from "@/components/finance/ui/skeleton";
import { InlineNotice } from "@/components/finance/ui/states";
import { useDashboardSession } from "@/components/dashboard/session-provider";
import { PositionsPicker, isValidPhone, roleOptions } from "@/components/mosque/users/account-form";
import { PersonCell } from "@/components/ui/avatar";
import { RoleBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import {
  createUser,
  fetchUsers,
  updateUserPositions,
  updateUserRole,
  type User,
} from "@/services/userService";
import {
  positionLabels,
  type Position,
  type Role,
} from "@/lib/permissions";

const ALL_POSITIONS = Object.keys(positionLabels) as Position[];

export function CommitteeView() {
  const { notify } = useToast();
  const session = useDashboardSession();
  const mosqueId = session.user?.mosqueId ?? "";

  const [loading, setLoading] = useState(true);
  const [committeeUsers, setCommitteeUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [filterPosition, setFilterPosition] = useState<string>("all");

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addMode, setAddMode] = useState<"assign" | "create">("assign");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editPositions, setEditPositions] = useState<Position[]>([]);
  const [savingPositions, setSavingPositions] = useState(false);

  // Assign existing user state
  const [assignUserId, setAssignUserId] = useState("");
  const [assignPositions, setAssignPositions] = useState<Position[]>([]);

  // Create new user state
  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<Role>("member");
  const [newPositions, setNewPositions] = useState<Position[]>([]);
  const [creatingUser, setCreatingUser] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Remove confirmation
  const [removingUser, setRemovingUser] = useState<User | null>(null);
  const [confirmRemoving, setConfirmRemoving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [committeeRes, allRes] = await Promise.all([
        fetchUsers({ hasPositions: true, limit: 100 }).catch(() => ({ rows: [] as User[] })),
        fetchUsers({ limit: 100 }).catch(() => ({ rows: [] as User[] })),
      ]);

      setCommitteeUsers(committeeRes.rows);
      setAllUsers(allRes.rows);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered committee rows
  const filteredUsers = useMemo(() => {
    return committeeUsers.filter((u) => {
      const matchesSearch =
        !search ||
        u.fullName.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        (u.phone && u.phone.includes(search));

      const matchesPosition =
        filterPosition === "all" ||
        u.positions.includes(filterPosition as Position);

      return matchesSearch && matchesPosition;
    });
  }, [committeeUsers, search, filterPosition]);

  // Statistics
  const stats = useMemo(() => {
    const total = committeeUsers.length;
    const executivePosts: Position[] = ["president", "vice_president", "general_secretary", "assistant_secretary", "treasurer", "cashier"];
    const religiousPosts: Position[] = ["imam", "khatib", "muazzin"];

    const executive = committeeUsers.filter((u) =>
      u.positions.some((p) => executivePosts.includes(p))
    ).length;

    const religious = committeeUsers.filter((u) =>
      u.positions.some((p) => religiousPosts.includes(p))
    ).length;

    return { total, executive, religious };
  }, [committeeUsers]);

  // Assign existing user
  const handleAssignExisting = async () => {
    if (!assignUserId) {
      notify({ message: "Please select a user to assign.", tone: "warning" });
      return;
    }
    if (assignPositions.length === 0) {
      notify({ message: "Please select at least one committee post.", tone: "warning" });
      return;
    }

    try {
      setSavingPositions(true);
      await updateUserPositions(assignUserId, assignPositions);
      notify({
        message: "Committee post assigned.",
        description: "Updated user committee positions successfully.",
        tone: "success",
      });
      setAddModalOpen(false);
      setAssignUserId("");
      setAssignPositions([]);
      await loadData();
    } catch (err) {
      notify({
        message: "Failed to assign committee post.",
        description: err instanceof Error ? err.message : "An unexpected error occurred.",
        tone: "danger",
      });
    } finally {
      setSavingPositions(false);
    }
  };

  // Create new leader
  const handleCreateNewLeader = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!newFullName.trim()) {
      setCreateError("Full name is required.");
      return;
    }
    if (!newEmail.trim()) {
      setCreateError("Email is required.");
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setCreateError("Password must be at least 8 characters.");
      return;
    }
    if (newPhone && !isValidPhone(newPhone)) {
      setCreateError("Phone must be in E.164 format (+8801...).");
      return;
    }
    if (newPositions.length === 0) {
      setCreateError("Please select at least one committee post.");
      return;
    }

    try {
      setCreatingUser(true);
      const created = await createUser({
        mosqueId,
        fullName: newFullName.trim(),
        email: newEmail.trim(),
        password: newPassword,
        phone: newPhone.trim() || undefined,
      });

      // Assign role if not default 'member'
      if (newRole !== "member") {
        await updateUserRole(created.id, newRole);
      }

      // Assign committee positions
      await updateUserPositions(created.id, newPositions);

      notify({
        message: "Leader created successfully.",
        description: `${created.fullName} added to committee with ${newPositions.length} post(s).`,
        tone: "success",
      });

      setAddModalOpen(false);
      setNewFullName("");
      setNewEmail("");
      setNewPhone("");
      setNewPassword("");
      setNewRole("member");
      setNewPositions([]);
      await loadData();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create leader account.");
    } finally {
      setCreatingUser(false);
    }
  };

  // Edit positions for existing committee member
  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditPositions([...user.positions]);
    setEditModalOpen(true);
  };

  const handleSaveEditPositions = async () => {
    if (!selectedUser) return;

    try {
      setSavingPositions(true);
      await updateUserPositions(selectedUser.id, editPositions);
      notify({
        message: "Positions updated.",
        description: `Updated posts for ${selectedUser.fullName}.`,
        tone: "success",
      });
      setEditModalOpen(false);
      setSelectedUser(null);
      await loadData();
    } catch (err) {
      notify({
        message: "Failed to update positions.",
        description: err instanceof Error ? err.message : "An unexpected error occurred.",
        tone: "danger",
      });
    } finally {
      setSavingPositions(false);
    }
  };

  // Remove from committee
  const confirmRemoveFromCommittee = async () => {
    if (!removingUser) return;

    try {
      setConfirmRemoving(true);
      await updateUserPositions(removingUser.id, []);
      notify({
        message: "Removed from committee.",
        description: `${removingUser.fullName} no longer holds any committee posts.`,
        tone: "success",
      });
      setRemovingUser(null);
      await loadData();
    } catch (err) {
      notify({
        message: "Failed to remove from committee.",
        description: err instanceof Error ? err.message : "An error occurred.",
        tone: "danger",
      });
    } finally {
      setConfirmRemoving(false);
    }
  };

  // Options for assign user select
  const candidateUsers = useMemo(() => {
    return allUsers.filter((u) => u.isActive);
  }, [allUsers]);

  return (
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Panel>
          <PanelBody className="flex items-center gap-4 py-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0d4d3b]/10 text-[#0d4d3b]">
              <Icon name="users" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#0e2a22]">{stats.total}</p>
              <p className="text-xs font-semibold text-[#69726d] uppercase tracking-wider">Total Committee Members</p>
            </div>
          </PanelBody>
        </Panel>

        <Panel>
          <PanelBody className="flex items-center gap-4 py-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#c79a45]/15 text-[#c79a45]">
              <Icon name="shield" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#0e2a22]">{stats.executive}</p>
              <p className="text-xs font-semibold text-[#69726d] uppercase tracking-wider">Executive Officers</p>
            </div>
          </PanelBody>
        </Panel>

        <Panel>
          <PanelBody className="flex items-center gap-4 py-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0d4d3b]/10 text-[#0d4d3b]">
              <Icon name="sparkle" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#0e2a22]">{stats.religious}</p>
              <p className="text-xs font-semibold text-[#69726d] uppercase tracking-wider">Religious Leadership</p>
            </div>
          </PanelBody>
        </Panel>
      </div>

      {/* Main Committee Panel */}
      <Panel>
        <PanelHeader
          title="Mosque Committee & Leadership Roster"
          description="Manage executive officers, trustees, and religious directors. Posts assigned here are reflected on the public About page."
          icon="users"
          actions={
            <Can anyOf={["position.assign", "user.manage"]}>
              <Button
                variant="primary"
                icon="plus"
                onClick={() => setAddModalOpen(true)}
                className="font-bold min-h-[40px] px-4"
              >
                Add Committee Member
              </Button>
            </Can>
          }
        />

        {/* Filter Bar */}
        <div className="border-b border-[#eae6db] bg-[#faf8f4] p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Search by name, email, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-[#dcdacd] bg-white text-xs text-[#17211d] focus:border-[#0d4d3b] focus:outline-none"
            />
            <span className="absolute left-3 top-3 text-[#69726d]">
              <Icon name="search" size={14} />
            </span>
          </div>

          <div className="w-full sm:w-64">
            <select
              value={filterPosition}
              onChange={(e) => setFilterPosition(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-[#dcdacd] bg-white text-xs text-[#17211d] focus:border-[#0d4d3b] focus:outline-none"
            >
              <option value="all">All Committee Posts</option>
              {ALL_POSITIONS.map((p) => (
                <option key={p} value={p}>
                  {positionLabels[p]?.en || p}
                </option>
              ))}
            </select>
          </div>
        </div>

        <PanelBody className="p-0">
          {loading ? (
            <div className="p-6">
              <TableSkeleton columns={5} rows={5} />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-14 h-14 rounded-full bg-[#0d4d3b]/10 text-[#0d4d3b] mx-auto flex items-center justify-center mb-3">
                <Icon name="users" size={28} />
              </div>
              <h3 className="text-base font-bold text-[#0e2a22]">No Committee Members Found</h3>
              <p className="text-xs text-[#69726d] mt-1 max-w-md mx-auto">
                {search || filterPosition !== "all"
                  ? "No committee members matched your search criteria."
                  : "No committee members or leaders have been assigned yet. Click the button above to add members to the committee."}
              </p>
              <div className="mt-5">
                <Can anyOf={["position.assign", "user.manage"]}>
                  <Button variant="primary" icon="plus" onClick={() => setAddModalOpen(true)}>
                    Add First Member
                  </Button>
                </Can>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#eae6db] bg-[#faf8f4] text-[11px] font-bold uppercase tracking-wider text-[#69726d]">
                    <th className="py-3.5 px-4 sm:px-6">Member</th>
                    <th className="py-3.5 px-4">Committee Posts</th>
                    <th className="py-3.5 px-4">System Role</th>
                    <th className="py-3.5 px-4">Contact</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eae6db]">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-[#fbf9f4] transition-colors">
                      <td className="py-3 px-4 sm:px-6">
                        <PersonCell
                          name={user.fullName}
                          meta={user.email}
                        />
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {user.positions.map((p) => (
                            <Badge key={p} tone="gold">
                              {positionLabels[p]?.en || p}
                            </Badge>
                          ))}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <RoleBadge role={user.role} />
                      </td>

                      <td className="py-3 px-4 text-[#4a5852]">
                        <div>{user.phone || "—"}</div>
                        {user.city && <div className="text-[11px] text-[#69726d]">{user.city}</div>}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Can anyOf={["position.assign", "user.manage"]}>
                            <Button
                              variant="secondary"
                              size="sm"
                              icon="pencil"
                              onClick={() => openEditModal(user)}
                            >
                              Edit Posts
                            </Button>
                            <IconButton
                              icon="trash"
                              label="Remove from committee"
                              tone="danger"
                              onClick={() => setRemovingUser(user)}
                            />
                          </Can>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </PanelBody>
      </Panel>

      {/* Modal: Add Committee Member */}
      <Modal
        open={addModalOpen}
        onClose={() => !savingPositions && !creatingUser && setAddModalOpen(false)}
        title="Add Committee Member or Leader"
        description="Assign a committee post to an existing member or create a new leader account."
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-[#69726d]">
              Posts are visible to the public on the About page.
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => setAddModalOpen(false)}
                disabled={savingPositions || creatingUser}
              >
                Cancel
              </Button>
              {addMode === "assign" ? (
                <Button
                  variant="primary"
                  onClick={handleAssignExisting}
                  disabled={savingPositions || !assignUserId || assignPositions.length === 0}
                >
                  {savingPositions ? "Assigning..." : "Assign Posts"}
                </Button>
              ) : (
                <Button
                  type="submit"
                  form="create-leader-form"
                  variant="primary"
                  disabled={creatingUser}
                >
                  {creatingUser ? "Creating..." : "Create & Assign"}
                </Button>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex border-b border-[#eae6db] gap-2">
            <button
              type="button"
              onClick={() => setAddMode("assign")}
              className={`pb-2 text-xs font-bold transition-colors border-b-2 ${
                addMode === "assign"
                  ? "border-[#0d4d3b] text-[#0d4d3b]"
                  : "border-transparent text-[#69726d] hover:text-[#0e2a22]"
              }`}
            >
              Assign Existing Member
            </button>
            <button
              type="button"
              onClick={() => setAddMode("create")}
              className={`pb-2 text-xs font-bold transition-colors border-b-2 ${
                addMode === "create"
                  ? "border-[#0d4d3b] text-[#0d4d3b]"
                  : "border-transparent text-[#69726d] hover:text-[#0e2a22]"
              }`}
            >
              Create New Leader Account
            </button>
          </div>

          {addMode === "assign" ? (
            <div className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-[#0e2a22] mb-1">
                  Select User / Member
                </label>
                <select
                  value={assignUserId}
                  onChange={(e) => {
                    setAssignUserId(e.target.value);
                    const found = allUsers.find((u) => u.id === e.target.value);
                    if (found) {
                      setAssignPositions(found.positions || []);
                    }
                  }}
                  className="w-full h-10 px-3 rounded-xl border border-[#dcdacd] bg-white text-xs text-[#17211d] focus:border-[#0d4d3b] focus:outline-none"
                >
                  <option value="">-- Choose an account --</option>
                  {candidateUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.email}) — Role: {u.role}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0e2a22] mb-1">
                  Committee Posts
                </label>
                <p className="text-[11px] text-[#69726d] mb-2">
                  Select one or more public leadership titles.
                </p>
                <PositionsPicker value={assignPositions} onChange={setAssignPositions} />
              </div>
            </div>
          ) : (
            <form id="create-leader-form" onSubmit={handleCreateNewLeader} noValidate className="space-y-3.5 pt-1">
              {createError && (
                <InlineNotice tone="danger" icon="alert">
                  {createError}
                </InlineNotice>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <TextField
                  label="Full Name"
                  required
                  placeholder="e.g. Qari Abdul Malik"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                />

                <TextField
                  label="Email Address"
                  type="email"
                  required
                  placeholder="e.g. malik@noor.org"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <TextField
                  label="Initial Password"
                  type="password"
                  required
                  hint="At least 8 characters."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />

                <TextField
                  label="Phone (E.164)"
                  placeholder="+8801712345678"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                />
              </div>

              <SelectField
                label="System Role"
                value={newRole}
                options={roleOptions}
                onChange={(e) => setNewRole(e.target.value as Role)}
                hint="Determines administrative dashboard access."
              />

              <div>
                <label className="block text-xs font-bold text-[#0e2a22] mb-1">
                  Committee Posts
                </label>
                <p className="text-[11px] text-[#69726d] mb-2">
                  Select the public committee post(s) this leader holds.
                </p>
                <PositionsPicker value={newPositions} onChange={setNewPositions} />
              </div>
            </form>
          )}
        </div>
      </Modal>

      {/* Modal: Edit Positions */}
      <Modal
        open={editModalOpen}
        onClose={() => !savingPositions && setEditModalOpen(false)}
        title={selectedUser ? `Edit Posts for ${selectedUser.fullName}` : "Edit Committee Posts"}
        description="Select or toggle committee posts for this leader."
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="secondary"
              onClick={() => setEditModalOpen(false)}
              disabled={savingPositions}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveEditPositions}
              disabled={savingPositions}
            >
              {savingPositions ? "Saving..." : "Save Positions"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-[#4a5852]">
            Assigning or removing committee posts updates the public About page leadership directory.
          </p>
          <PositionsPicker value={editPositions} onChange={setEditPositions} />
        </div>
      </Modal>

      {/* Confirm Remove from Committee Dialog */}
      <ConfirmDialog
        open={Boolean(removingUser)}
        onClose={() => setRemovingUser(null)}
        onConfirm={confirmRemoveFromCommittee}
        title="Remove from Committee?"
        description={`This will clear committee posts for "${removingUser?.fullName}". Their user account and system role will NOT be deleted.`}
        confirmLabel={confirmRemoving ? "Removing..." : "Remove from Committee"}
        tone="danger"
      />
    </div>
  );
}
