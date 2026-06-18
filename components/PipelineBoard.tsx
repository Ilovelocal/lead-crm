"use client";

import { useMemo } from "react";
import { STATUS_META, STATUS_ORDER } from "@/lib/constants";
import type { SerializedLead } from "@/lib/types";
import { LeadCard } from "./LeadCard";

interface Props {
  leads: SerializedLead[];
  onSelectLead: (id: string) => void;
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function PipelineBoard({ leads, onSelectLead }: Props) {
  const grouped = useMemo(() => {
    const map = new Map<string, SerializedLead[]>();
    for (const status of STATUS_ORDER) map.set(status, []);
    for (const lead of leads) map.get(lead.status)?.push(lead);
    return map;
  }, [leads]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {STATUS_ORDER.map((status) => {
        const items = grouped.get(status) ?? [];
        const meta = STATUS_META[status];
        const columnRevenue =
          status === "active_subscriber"
            ? items.reduce((sum, l) => sum + l.monthlyRevenue, 0)
            : null;

        return (
          <div
            key={status}
            className="flex flex-col rounded-2xl bg-slate-100/70 p-3"
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                <h2 className="text-sm font-semibold text-slate-700">
                  {meta.label}
                </h2>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500">
                  {items.length}
                </span>
              </div>
            </div>

            {columnRevenue !== null && items.length > 0 && (
              <div className="mb-2 px-1 text-xs font-semibold text-emerald-600">
                {currency.format(columnRevenue)} MRR
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              {items.length === 0 ? (
                <p className="px-1 py-6 text-center text-xs text-slate-400">
                  No leads
                </p>
              ) : (
                items.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onClick={() => onSelectLead(lead.id)}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
