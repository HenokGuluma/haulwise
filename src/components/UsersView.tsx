"use client";

import { useCallback, useState } from "react";
import { Pill, Button, IconButton, ConfirmDialog, useToast } from "@/components/ui";
import { DataTable, type FetchPageParams } from "@/components/DataTable";
import { UserFormModal } from "@/components/modals/UserFormModal";
import { fullName, fmtDate } from "@/lib/format";
import { api, fetchTablePage, ApiRequestError } from "@/lib/api-client";
import type { SessionUser, UserRow } from "@/types";

export function UsersView({ user }: { user: SessionUser }) {
  const [reloadKey, setReloadKey] = useState(0);
  const [form, setForm] = useState<{ open: boolean; row?: UserRow }>({ open: false });
  const [confirm, setConfirm] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const toast = useToast();

  const fetchUsers = useCallback((params: FetchPageParams) => fetchTablePage<UserRow>("/api/users", params), []);

  async function deleteUser(row: UserRow) {
    try {
      await api.del(`/api/users/${row.id}`);
      toast.success("User deleted.");
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Couldn't delete user.");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", marginBottom: 14 }}>
        <div style={{ marginLeft: "auto" }}>
          <Button variant="primary" icon="plus" onClick={() => setForm({ open: true })}>Add User</Button>
        </div>
      </div>

      <DataTable<UserRow>
        tableId="users"
        fetchPage={fetchUsers}
        reloadKey={reloadKey}
        rowKey={(u) => u.id}
        onRowClick={(u) => setForm({ open: true, row: u })}
        searchPlaceholder="Search users…"
        emptyIcon="shield"
        emptyTitle="No users match"
        csvFilename="cober-users.csv"
        initialSort={{ by: "firstName", dir: "asc" }}
        columns={[
          {
            key: "name",
            label: "Name",
            render: (u) => fullName(u.firstName, u.lastName),
            exportValue: (u) => fullName(u.firstName, u.lastName),
          },
          { key: "email", label: "Email" },
          {
            key: "role",
            label: "Role",
            render: (u) => <Pill tone="muted" dot>{u.role.name}</Pill>,
            exportValue: (u) => u.role.name,
          },
          {
            key: "customer",
            label: "Customer",
            render: (u) => u.customer?.companyName ?? <span style={{ color: "var(--muted)" }}>—</span>,
            exportValue: (u) => u.customer?.companyName ?? "",
          },
          {
            key: "createdAt",
            label: "Created",
            sortable: true,
            render: (u) => fmtDate(u.createdAt),
            exportValue: (u) => fmtDate(u.createdAt),
          },
          {
            key: "actions",
            label: "",
            align: "right",
            render: (u) => {
              const isSelf = u.id === user.id;
              return (
                <span style={{ display: "flex", gap: 4, justifyContent: "flex-end" }} onClick={(e) => e.stopPropagation()}>
                  <IconButton icon="edit" title="Edit user" onClick={() => setForm({ open: true, row: u })} />
                  <IconButton
                    icon="trash"
                    title={isSelf ? "You can't delete your own account" : "Delete user"}
                    onClick={isSelf ? undefined : () => setConfirm({
                      title: "Delete user",
                      message: `Remove ${fullName(u.firstName, u.lastName)} (${u.email})? This cannot be undone.`,
                      onConfirm: () => deleteUser(u),
                    })}
                    style={isSelf ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
                  />
                </span>
              );
            },
          },
        ]}
      />

      {form.open && (
        <UserFormModal
          row={form.row}
          onClose={() => setForm({ open: false })}
          onSaved={() => {
            toast.success(form.row ? "User updated." : "User added.");
            setForm({ open: false });
            setReloadKey((k) => k + 1);
          }}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          onCancel={() => setConfirm(null)}
          onConfirm={() => { confirm.onConfirm(); setConfirm(null); }}
        />
      )}
    </div>
  );
}
