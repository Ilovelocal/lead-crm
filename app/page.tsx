import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { getLeads } from "./actions/leads";
import { getSession } from "@/lib/auth";
import { Dashboard } from "@/components/Dashboard";
import { UserMenu } from "@/components/UserMenu";

// Always render fresh — this is a single-user internal tool, no caching needed.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const leads = await getLeads();

  const subscribers = leads.filter((l) => l.status === "active_subscriber");
  const mrr = subscribers.reduce((sum, l) => sum + l.monthlyRevenue, 0);

  return (
    <main className="safe-top mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex justify-end">
        <UserMenu email={session.email} />
      </div>

      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Users className="h-6 w-6 text-indigo-600" />
            Lead CRM
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {leads.length} leads · {subscribers.length} active subscribers
          </p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5">
          <p className="text-xs font-medium text-emerald-600">
            Monthly recurring revenue
          </p>
          <p className="text-xl font-bold text-emerald-700">
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
            }).format(mrr)}
          </p>
        </div>
      </header>

      <Dashboard leads={leads} />
    </main>
  );
}
