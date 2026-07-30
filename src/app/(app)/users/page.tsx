import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UsersView } from "@/components/UsersView";

export default async function UsersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  return <UsersView user={user} />;
}
