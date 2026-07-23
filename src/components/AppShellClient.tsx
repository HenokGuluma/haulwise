"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ToastProvider, useToast } from "@/components/ui";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { LoadFormModal } from "@/components/modals/LoadFormModal";
import type { SessionUser, Customer } from "@/types";

function ShellInner({
  user,
  counts,
  customers,
  children,
}: {
  user: SessionUser;
  counts: Record<string, number>;
  customers: Customer[];
  children: React.ReactNode;
}) {
  const [newLoadOpen, setNewLoadOpen] = useState(false);
  const router = useRouter();
  const toast = useToast();

  return (
    <div className="app-shell">
      <Sidebar user={user} counts={counts} />
      <div className="main">
        <Topbar onNewLoad={() => setNewLoadOpen(true)} />
        <div className="content">{children}</div>
      </div>

      {newLoadOpen && (
        <LoadFormModal
          mode="create"
          customers={customers}
          onClose={() => setNewLoadOpen(false)}
          onSaved={(load) => {
            toast.success(load.loadNumber + " created as a Draft.");
            setNewLoadOpen(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

export function AppShellClient(props: {
  user: SessionUser;
  counts: Record<string, number>;
  customers: Customer[];
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <ShellInner {...props} />
    </ToastProvider>
  );
}
