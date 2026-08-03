import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UsersView } from "@/components/UsersView";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.permissions.includes("users:view")) redirect("/dashboard");

  return <UsersView user={user} />;
}
