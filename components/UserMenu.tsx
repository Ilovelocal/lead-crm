"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LogOut, Settings } from "lucide-react";
import { logout } from "@/app/actions/auth";

export function UserMenu({ email }: { email: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function signOut() {
    start(async () => {
      await logout();
      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs text-slate-400 sm:inline">{email}</span>
      <Link
        href="/account"
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
      >
        <Settings className="h-3.5 w-3.5" />
        Account
      </Link>
      <button
        onClick={signOut}
        disabled={pending}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
      >
        <LogOut className="h-3.5 w-3.5" />
        Sign out
      </button>
    </div>
  );
}
