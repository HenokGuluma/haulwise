import { getSessionUser, requireInternalRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CustomersView } from "@/components/CustomersView";

export default async function CustomersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  requireInternalRole(user);

  return <CustomersView user={user} />;
}
