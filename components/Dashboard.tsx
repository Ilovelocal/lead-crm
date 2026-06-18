"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SerializedLead } from "@/lib/types";
import { UploadZone } from "./UploadZone";
import { PipelineBoard } from "./PipelineBoard";
import { LeadSlideOver } from "./LeadSlideOver";
import { ConfirmModal, type ProcessResult } from "./ConfirmModal";

export function Dashboard({ leads }: { leads: SerializedLead[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<ProcessResult | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Server actions call revalidatePath("/"); router.refresh() re-pulls the
  // server component data so the board reflects changes immediately.
  const refresh = () => router.refresh();

  return (
    <>
      <section className="mb-8">
        <UploadZone onResult={setPending} />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-800">
          Lead pipeline
        </h2>
        <PipelineBoard leads={leads} onSelectLead={setSelectedId} />
      </section>

      {pending && (
        <ConfirmModal
          result={pending}
          leads={leads}
          onClose={() => setPending(null)}
          onSaved={refresh}
        />
      )}

      {selectedId && (
        <LeadSlideOver
          leadId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={refresh}
        />
      )}
    </>
  );
}
