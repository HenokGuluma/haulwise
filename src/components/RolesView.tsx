"use client";

import { useCallback, useState } from "react";
import { Pill, Button, IconButton, ConfirmDialog, useToast } from "@/components/ui";
import { DataTable, type FetchPageParams, type FetchPageResult } from "@/components/DataTable";
import { RoleFormModal } from "@/components/modals/RoleFormModal";
import { PERMISSION_KEYS } from "@/lib/permissions";
import { api, ApiRequestError } from "@/lib/api-client";
import type { RoleRow } from "@/types";

export function RolesView() {
  const [reloadKey, setReloadKey] = useState(0);
  const [form, setForm] = useState<{ open: boolean; role?: RoleRow }>({ open: false });
  const [confirm, setConfirm] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const toast = useToast();

  // Roles are a small, admin-managed list — fetch the full set and
  // filter/slice client-side, same pattern as the Roster "Types" tab.
  const fetchRoles = useCallback(async (params: FetchPageParams): Promise<FetchPageResult<RoleRow>> => {
    const res = await api.get<{ rows: RoleRow[] }>("/api/roles");
    let rows = res.rows;
    if (params.search.trim()) {
      const q = params.search.trim().toLowerCase();
      rows = rows.filter((r) => r.name.toLowerCase().includes(q));
    }
    const start = (params.page - 1) * params.pageSize;
    return { rows: rows.slice(start, start + params.pageSize), total: rows.length };
  }, []);

  async function deleteRole(role: RoleRow) {
    try {
      await api.del(`/api/roles/${role.id}`);
      toast.success("Role deleted.");
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Couldn't delete role.");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", marginBottom: 14 }}>
        <div style={{ marginLeft: "auto" }}>
          <Button variant="primary" icon="plus" onClick={() => setForm({ open: true })}>Add Role</Button>
        </div>
      </div>

      <DataTable<RoleRow>
        tableId="roles"
        fetchPage={fetchRoles}
        reloadKey={reloadKey}
        rowKey={(r) => r.id}
        onRowClick={(r) => setForm({ open: true, role: r })}
        searchPlaceholder="Search roles…"
        emptyIcon="shield"
        emptyTitle="No roles match"
        csvFilename="cober-roles.csv"
        initialSort={{ by: "name", dir: "asc" }}
        columns={[
          { key: "name", label: "Name", render: (r) => <span style={{ fontWeight: 600 }}>{r.name}</span> },
          {
            key: "isCustomerScoped",
            label: "Customer-scoped",
            render: (r) => r.isCustomerScoped ? <Pill tone="warning" dot>Portal login</Pill> : <span style={{ color: "var(--muted)" }}>—</span>,
            exportValue: (r) => (r.isCustomerScoped ? "Yes" : "No"),
          },
          {
            key: "permissions",
            label: "Permissions",
            render: (r) => `${r.permissions.length} of ${PERMISSION_KEYS.length}`,
            exportValue: (r) => r.permissions.join("; "),
          },
          {
            key: "userCount",
            label: "Users",
            align: "right",
            render: (r) => r.userCount ?? 0,
            exportValue: (r) => r.userCount ?? 0,
          },
          {
            key: "actions",
            label: "",
            align: "right",
            render: (r) => {
              const inUse = (r.userCount ?? 0) > 0;
              return (
                <span style={{ display: "flex", gap: 4, justifyContent: "flex-end" }} onClick={(e) => e.stopPropagation()}>
                  <IconButton icon="edit" title="Edit role" onClick={() => setForm({ open: true, role: r })} />
                  <IconButton
                    icon="trash"
                    title={inUse ? `Assigned to ${r.userCount} user(s)` : "Delete role"}
                    onClick={inUse ? undefined : () => setConfirm({
                      title: "Delete role",
                      message: `Remove the "${r.name}" role? This cannot be undone.`,
                      onConfirm: () => deleteRole(r),
                    })}
                    style={inUse ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
                  />
                </span>
              );
            },
          },
        ]}
      />

      {form.open && (
        <RoleFormModal
          role={form.role}
          onClose={() => setForm({ open: false })}
          onSaved={() => {
            toast.success(form.role ? "Role updated." : "Role added.");
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
