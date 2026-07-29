"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ToastProvider, useToast } from "@/components/ui";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { CommandPalette } from "@/components/CommandPalette";
import { LoadFormModal } from "@/components/modals/LoadFormModal";
import type { SessionUser } from "@/types";

function ShellInner({
  user,
  counts,
  children,
}: {
  user: SessionUser;
  counts: Record<string, number>;
  children: React.ReactNode;
}) {
  const [newLoadOpen, setNewLoadOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const toast = useToast();

  return (
    <div className="app-shell">
      <Sidebar user={user} counts={counts} mobileOpen={sidebarOpen} onCloseMobile={() => setSidebarOpen(false)} />
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
      <div className="main">
        <Topbar onNewLoad={() => setNewLoadOpen(true)} onMenuClick={() => setSidebarOpen(true)} />
        <div className="content">{children}</div>
      </div>

      <CommandPalette />

      {newLoadOpen && (
        <LoadFormModal
          mode="create"
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
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <ShellInner {...props} />
    </ToastProvider>
  );
}
