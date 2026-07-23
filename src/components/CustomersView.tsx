"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Pill, Button, useToast } from "@/components/ui";
import { DataTable, type FetchPageParams } from "@/components/DataTable";
import { CustomerFormModal } from "@/components/modals/CustomerFormModal";
import { fetchTablePage } from "@/lib/api-client";
import type { Customer, CustomerListRow, CustomerStatus, SessionUser } from "@/types";

const STATUS_OPTIONS: { value: CustomerStatus; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "PROSPECT", label: "Prospect" },
  { value: "INACTIVE", label: "Inactive" },
];

function statusTone(status: CustomerStatus): "success" | "warning" | "muted" {
  if (status === "ACTIVE") return "success";
  if (status === "PROSPECT") return "warning";
  return "muted";
}

export function CustomersView({ user }: { user: SessionUser }) {
  const [formOpen, setFormOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const router = useRouter();
  const toast = useToast();

  const fetchPage = useCallback((params: FetchPageParams) => fetchTablePage<CustomerListRow>("/api/customers", params), []);

  return (
    <div>
      <div style={{ display: "flex", marginBottom: 14 }}>
        <div style={{ marginLeft: "auto" }}>
          <Button variant="primary" icon="plus" onClick={() => setFormOpen(true)}>Add Customer</Button>
        </div>
      </div>

      <DataTable<CustomerListRow>
        tableId="customers"
        fetchPage={fetchPage}
        reloadKey={reloadKey}
        rowKey={(c) => c.id}
        onRowClick={(c) => router.push(`/customers/${c.id}`)}
        searchPlaceholder="Search customers…"
        emptyIcon="briefcase"
        emptyTitle="No customers yet"
        emptyHint="Add your first customer to start creating loads for them."
        csvFilename="haulwise-customers.csv"
        initialSort={{ by: "companyName", dir: "asc" }}
        columns={[
          { key: "companyName", label: "Company", sortable: true, render: (c) => <span style={{ fontWeight: 600 }}>{c.companyName}</span> },
          { key: "contactName", label: "Primary Contact", sortable: true },
          { key: "phone", label: "Phone" },
          { key: "email", label: "Email" },
          { key: "activeLoadCount", label: "Active Loads", align: "right" },
          { key: "totalLoadCount", label: "Lifetime Loads", align: "right" },
          {
            key: "status",
            label: "Status",
            sortable: true,
            filterOptions: STATUS_OPTIONS,
            render: (c) => <Pill tone={statusTone(c.status)} dot>{STATUS_OPTIONS.find((o) => o.value === c.status)?.label}</Pill>,
            exportValue: (c) => c.status,
          },
        ]}
      />

      {formOpen && (
        <CustomerFormModal
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            toast.success("Customer added.");
            setFormOpen(false);
            setReloadKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
