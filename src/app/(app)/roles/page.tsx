import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { RolesView } from "@/components/RolesView";

export const metadata: Metadata = { title: "Roles" };

export default async function RolesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.permissions.includes("roles:manage")) redirect("/dashboard");

  return <RolesView />;
}
