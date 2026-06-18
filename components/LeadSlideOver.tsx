"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Globe,
  Loader2,
  Mail,
  Phone,
  Trash2,
  User,
  X,
} from "lucide-react";
import {
  deleteLead,
  getLeadWithInteractions,
  updateLead,
} from "@/app/actions/leads";
import { deleteInteraction } from "@/app/actions/interactions";
import { STATUS_ORDER, STATUS_META } from "@/lib/constants";
import type {
  LeadStatus,
  SerializedLeadWithInteractions,
} from "@/lib/types";

interface Props {
  leadId: string;
  onClose: () => void;
  onChanged: () => void;
}

type Draft = {
  businessName: string;
  contactPerson: string;
  email: string;
  phone: string;
  website: string;
  status: LeadStatus;
  monthlyRevenue: string;
  notes: string;
};

export function LeadSlideOver({ leadId, onClose, onChanged }: Props) {
  const [lead, setLead] = useState<SerializedLeadWithInteractions | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, startSaving] = useTransition();
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getLeadWithInteractions(leadId).then((data) => {
      if (!active) return;
      setLead(data);
      if (data) {
        setDraft({
          businessName: data.businessName,
          contactPerson: data.contactPerson ?? "",
          email: data.email ?? "",
          phone: data.phone ?? "",
          website: data.website ?? "",
          status: data.status,
          monthlyRevenue: String(data.monthlyRevenue),
          notes: data.notes ?? "",
        });
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [leadId]);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
    setDirty(true);
  }

  function handleSave() {
    if (!draft) return;
    startSaving(async () => {
      await updateLead(leadId, {
        businessName: draft.businessName,
        contactPerson: draft.contactPerson,
        email: draft.email,
        phone: draft.phone,
        website: draft.website,
        status: draft.status,
        monthlyRevenue: parseFloat(draft.monthlyRevenue) || 0,
        notes: draft.notes,
      });
      setDirty(false);
      onChanged();
    });
  }

  function handleDelete() {
    if (!confirm("Delete this lead and all its interactions?")) return;
    startSaving(async () => {
      await deleteLead(leadId);
      onChanged();
      onClose();
    });
  }

  function handleDeleteInteraction(id: string) {
    startSaving(async () => {
      await deleteInteraction(id);
      const refreshed = await getLeadWithInteractions(leadId);
      setLead(refreshed);
      onChanged();
    });
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl">
        <header className="safe-top flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">
            Lead details
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {loading || !draft ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-5">
            <Field label="Business name">
              <input
                className={inputCls}
                value={draft.businessName}
                onChange={(e) => set("businessName", e.target.value)}
              />
            </Field>

            <Field label="Status">
              <select
                className={inputCls}
                value={draft.status}
                onChange={(e) => set("status", e.target.value as LeadStatus)}
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_META[s].label}
                  </option>
                ))}
              </select>
            </Field>

            {draft.status === "active_subscriber" && (
              <Field label="Monthly revenue (USD)">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={inputCls}
                  value={draft.monthlyRevenue}
                  onChange={(e) => set("monthlyRevenue", e.target.value)}
                />
              </Field>
            )}

            <Field label="Contact person" icon={<User className="h-3.5 w-3.5" />}>
              <input
                className={inputCls}
                value={draft.contactPerson}
                onChange={(e) => set("contactPerson", e.target.value)}
              />
            </Field>

            <Field label="Email" icon={<Mail className="h-3.5 w-3.5" />}>
              <input
                className={inputCls}
                value={draft.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </Field>

            <Field label="Phone" icon={<Phone className="h-3.5 w-3.5" />}>
              <input
                className={inputCls}
                value={draft.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </Field>

            <Field label="Website" icon={<Globe className="h-3.5 w-3.5" />}>
              <input
                className={inputCls}
                value={draft.website}
                onChange={(e) => set("website", e.target.value)}
              />
            </Field>

            <Field label="Notes">
              <textarea
                rows={3}
                className={inputCls}
                value={draft.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </Field>

            {/* Interactions */}
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-semibold text-slate-700">
                Interaction history ({lead?.interactions.length ?? 0})
              </h3>
              <div className="space-y-3">
                {lead?.interactions.length === 0 && (
                  <p className="text-xs text-slate-400">
                    No interactions logged yet.
                  </p>
                )}
                {lead?.interactions.map((i) => (
                  <div
                    key={i.id}
                    className="group relative rounded-xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <p className="pr-6 text-sm text-slate-700">{i.summary}</p>
                    <p className="mt-1.5 text-xs text-slate-400">
                      {new Date(i.createdAt).toLocaleString()}
                    </p>
                    <button
                      onClick={() => handleDeleteInteraction(i.id)}
                      className="absolute right-2 top-2 rounded p-1 text-slate-300 opacity-0 transition hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer actions */}
        {draft && (
          <footer className="safe-bottom flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
            <button
              onClick={handleDelete}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-rose-500 hover:bg-rose-50 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {dirty ? "Save changes" : "Saved"}
            </button>
          </footer>
        )}
      </aside>
    </>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-500">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}
