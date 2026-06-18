import type { LeadStatus } from "@prisma/client";

export interface StatusMeta {
  label: string;
  /** Tailwind classes for the column header / badge. */
  badge: string;
  dot: string;
}

/** Ordered left-to-right across the pipeline board. */
export const STATUS_ORDER: LeadStatus[] = [
  "new_lead",
  "in_conversation",
  "waiting_on_client",
  "active_subscriber",
  "inactive",
];

export const STATUS_META: Record<LeadStatus, StatusMeta> = {
  new_lead: {
    label: "New Lead",
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    dot: "bg-slate-400",
  },
  in_conversation: {
    label: "In Conversation",
    badge: "bg-blue-100 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  waiting_on_client: {
    label: "Waiting on Client",
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  active_subscriber: {
    label: "Active Subscriber",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  inactive: {
    label: "Inactive",
    badge: "bg-rose-100 text-rose-600 border-rose-200",
    dot: "bg-rose-400",
  },
};

export const SCREENSHOT_TYPES = [
  { value: "profile", label: "Facebook About Page" },
  { value: "chat", label: "Messenger Chat Log" },
] as const;
