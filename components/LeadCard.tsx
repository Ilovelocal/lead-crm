"use client";

import { Building2, Mail, Phone } from "lucide-react";
import type { SerializedLead } from "@/lib/types";

interface Props {
  lead: SerializedLead;
  onClick: () => void;
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function LeadCard({ lead, onClick }: Props) {
  const isSubscriber = lead.status === "active_subscriber";

  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl border border-slate-200 bg-white p-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
    >
      <div className="flex items-start gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-800">
            {lead.businessName}
          </p>
          {lead.contactPerson && (
            <p className="truncate text-xs text-slate-500">
              {lead.contactPerson}
            </p>
          )}
        </div>
      </div>

      {(lead.email || lead.phone) && (
        <div className="mt-3 space-y-1">
          {lead.email && (
            <p className="flex items-center gap-1.5 truncate text-xs text-slate-500">
              <Mail className="h-3 w-3 shrink-0" />
              {lead.email}
            </p>
          )}
          {lead.phone && (
            <p className="flex items-center gap-1.5 truncate text-xs text-slate-500">
              <Phone className="h-3 w-3 shrink-0" />
              {lead.phone}
            </p>
          )}
        </div>
      )}

      {isSubscriber && (
        <div className="mt-3 rounded-lg bg-emerald-50 px-2.5 py-1.5">
          <span className="text-sm font-bold text-emerald-600">
            {currency.format(lead.monthlyRevenue)}
          </span>
          <span className="text-xs font-medium text-emerald-500"> / mo</span>
        </div>
      )}
    </button>
  );
}
