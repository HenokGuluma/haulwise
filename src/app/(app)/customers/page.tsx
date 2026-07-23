import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CustomersView } from "@/components/CustomersView";

export default async function CustomersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return <CustomersView user={user} />;
}
