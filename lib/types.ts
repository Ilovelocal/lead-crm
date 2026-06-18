import type { LeadStatus } from "@prisma/client";

export type { LeadStatus };

/** Screenshot kinds the upload zone can process. */
export type ScreenshotType = "profile" | "chat";

/** Lead shape after Decimal -> number serialization for client components. */
export interface SerializedLead {
  id: string;
  businessName: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  status: LeadStatus;
  monthlyRevenue: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SerializedInteraction {
  id: string;
  leadId: string;
  summary: string;
  rawAiAnalysis: unknown;
  createdAt: string;
}

export interface SerializedLeadWithInteractions extends SerializedLead {
  interactions: SerializedInteraction[];
}

/** Parsed fields when type === "profile". */
export interface ProfileExtraction {
  business_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
}

/** Parsed fields when type === "chat". */
export interface ChatExtraction {
  summary: string | null;
  extracted_details: string | null;
  status_update_suggestion: string | null;
}

export type Extraction = ProfileExtraction | ChatExtraction;
