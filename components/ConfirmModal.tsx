"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Sparkles, X } from "lucide-react";
import { createLead, updateLead, type LeadInput } from "@/app/actions/leads";
import { createInteraction } from "@/app/actions/interactions";
import { STATUS_META, STATUS_ORDER } from "@/lib/constants";
import type {
  ChatExtraction,
  LeadStatus,
  ProfileExtraction,
  ScreenshotType,
  SerializedLead,
} from "@/lib/types";

export interface ProcessResult {
  type: ScreenshotType;
  data: ProfileExtraction | ChatExtraction;
}

interface Props {
  result: ProcessResult;
  leads: SerializedLead[];
  onClose: () => void;
  onSaved: () => void;
}

export function ConfirmModal(props: Props) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            <h2 className="text-base font-semibold text-slate-800">
              Review AI extraction
            </h2>
          </div>
          <button
            onClick={props.onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {props.result.type === "profile" ? (
          <ProfileForm {...props} />
        ) : (
          <ChatForm {...props} />
        )}
      </div>
    </div>
  );
}

// --- Profile: create a new lead ------------------------------------------

function ProfileForm({ result, onClose, onSaved }: Props) {
  const d = result.data as ProfileExtraction;
  const [form, setForm] = useState({
    businessName: d.business_name ?? "",
    email: d.email ?? "",
    phone: d.phone ?? "",
    website: d.website ?? "",
    contactPerson: "",
    status: "new_lead" as LeadStatus,
  });
  const [saving, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    start(async () => {
      try {
        const payload: LeadInput = {
          businessName: form.businessName,
          email: form.email,
          phone: form.phone,
          website: form.website,
          contactPerson: form.contactPerson,
          status: form.status,
        };
        await createLead(payload);
        onSaved();
        onClose();
      } catch (e) {
        setError(
          e instanceof Error && e.message.includes("Unique")
            ? "A lead with this email already exists."
            : "Could not save lead.",
        );
      }
    });
  }

  return (
    <>
      <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
        <p className="mb-4 text-xs text-slate-500">
          Gemini read this from the screenshot. Edit anything before saving — a
          new lead will be created.
        </p>
        <Labeled label="Business name">
          <input
            className={inputCls}
            value={form.businessName}
            onChange={(e) => setForm({ ...form, businessName: e.target.value })}
          />
        </Labeled>
        <Labeled label="Contact person">
          <input
            className={inputCls}
            value={form.contactPerson}
            onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
          />
        </Labeled>
        <Labeled label="Email">
          <input
            className={inputCls}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </Labeled>
        <Labeled label="Phone">
          <input
            className={inputCls}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </Labeled>
        <Labeled label="Website">
          <input
            className={inputCls}
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
          />
        </Labeled>
        <Labeled label="Initial status">
          <select
            className={inputCls}
            value={form.status}
            onChange={(e) =>
              setForm({ ...form, status: e.target.value as LeadStatus })
            }
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </select>
        </Labeled>
        {error && <p className="mt-2 text-xs text-rose-500">{error}</p>}
      </div>
      <Footer
        saving={saving}
        disabled={!form.businessName.trim()}
        onCancel={onClose}
        onSave={save}
        label="Create lead"
      />
    </>
  );
}

// --- Chat: log an interaction against an existing lead --------------------

function ChatForm({ result, leads, onClose, onSaved }: Props) {
  const d = result.data as ChatExtraction;
  const [leadId, setLeadId] = useState(leads[0]?.id ?? "");
  const [summary, setSummary] = useState(d.summary ?? "");
  const [newStatus, setNewStatus] = useState<LeadStatus | "">("");
  const [saving, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    if (!leadId) {
      setError("Select a lead to attach this interaction to.");
      return;
    }
    setError(null);
    start(async () => {
      try {
        await createInteraction({
          leadId,
          summary,
          // Persist the full Gemini object for auditing / re-processing.
          rawAiAnalysis: d,
        });
        if (newStatus) await updateLead(leadId, { status: newStatus });
        onSaved();
        onClose();
      } catch {
        setError("Could not save interaction.");
      }
    });
  }

  return (
    <>
      <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
        {leads.length === 0 ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            You have no leads yet. Add a lead from a Facebook About Page first,
            then attach chat interactions to it.
          </p>
        ) : (
          <Labeled label="Attach to lead">
            <select
              className={inputCls}
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
            >
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.businessName}
                </option>
              ))}
            </select>
          </Labeled>
        )}

        <Labeled label="Summary">
          <textarea
            rows={3}
            className={inputCls}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
        </Labeled>

        {d.extracted_details && (
          <ReadOnly label="Extracted details" value={d.extracted_details} />
        )}
        {d.status_update_suggestion && (
          <ReadOnly
            label="Gemini's status suggestion"
            value={d.status_update_suggestion}
          />
        )}

        <Labeled label="Apply a status change (optional)">
          <select
            className={inputCls}
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as LeadStatus | "")}
          >
            <option value="">— Leave status unchanged —</option>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </select>
        </Labeled>

        {error && <p className="mt-2 text-xs text-rose-500">{error}</p>}
      </div>
      <Footer
        saving={saving}
        disabled={leads.length === 0 || !summary.trim()}
        onCancel={onClose}
        onSave={save}
        label="Log interaction"
      />
    </>
  );
}

// --- Shared bits ----------------------------------------------------------

function Footer({
  saving,
  disabled,
  onCancel,
  onSave,
  label,
}: {
  saving: boolean;
  disabled?: boolean;
  onCancel: () => void;
  onSave: () => void;
  label: string;
}) {
  return (
    <footer className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4">
      <button
        onClick={onCancel}
        className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200"
      >
        Cancel
      </button>
      <button
        onClick={onSave}
        disabled={saving || disabled}
        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Check className="h-4 w-4" />
        )}
        {label}
      </button>
    </footer>
  );
}

function Labeled({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3.5">
      <label className="mb-1.5 block text-xs font-medium text-slate-500">
        {label}
      </label>
      {children}
    </div>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-3.5">
      <label className="mb-1.5 block text-xs font-medium text-slate-500">
        {label}
      </label>
      <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-600">
        {value}
      </p>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";
