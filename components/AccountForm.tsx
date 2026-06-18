"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { updateAccount } from "@/app/actions/auth";
import { inputCls } from "./LoginForm";

export function AccountForm({ initialEmail }: { initialEmail: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    setSaved(false);
    if (newPassword && newPassword !== confirm) {
      setError("New passwords do not match.");
      return;
    }
    start(async () => {
      const res = await updateAccount({
        email,
        currentPassword,
        newPassword: newPassword || undefined,
      });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setSaved(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-lg font-bold text-slate-900">
          Account settings
        </h1>
        <p className="mb-5 text-xs text-slate-500">
          Update your sign-in email or password. Your current password is
          required to save any change.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Field label="Email">
            <input
              type="email"
              className={inputCls}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>

          <hr className="my-4 border-slate-100" />

          <Field label="New password (leave blank to keep current)">
            <input
              type="password"
              autoComplete="new-password"
              className={inputCls}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </Field>
          <Field label="Confirm new password">
            <input
              type="password"
              autoComplete="new-password"
              className={inputCls}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </Field>

          <hr className="my-4 border-slate-100" />

          <Field label="Current password (required)">
            <input
              type="password"
              autoComplete="current-password"
              className={inputCls}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </Field>

          {error && <p className="mb-3 text-sm text-rose-500">{error}</p>}
          {saved && (
            <p className="mb-3 flex items-center gap-1.5 text-sm text-emerald-600">
              <Check className="h-4 w-4" />
              Saved.
            </p>
          )}

          <button
            type="submit"
            disabled={pending || !currentPassword}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save changes
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-xs font-medium text-slate-500">
        {label}
      </label>
      {children}
    </div>
  );
}
