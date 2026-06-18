import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AccountForm } from "@/components/AccountForm";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  // Middleware already guards this, but double-check for a clean type.
  const session = await getSession();
  if (!session) redirect("/login");

  return <AccountForm initialEmail={session.email} />;
}
