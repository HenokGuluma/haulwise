import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SettingsView } from "@/components/SettingsView";

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return <SettingsView user={user} />;
}
