"use server";

import { revalidatePath } from "next/cache";
import { Prisma, type Lead, type Interaction, type LeadStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  SerializedLead,
  SerializedLeadWithInteractions,
} from "@/lib/types";

// --- Serialization helpers ------------------------------------------------
// Prisma returns Decimal and Date objects that don't cross the server ->
// client boundary cleanly, so flatten them to number / ISO string.

type LeadWithInteractions = Lead & { interactions: Interaction[] };

function serializeLead(lead: Lead): SerializedLead {
  return {
    id: lead.id,
    businessName: lead.businessName,
    contactPerson: lead.contactPerson,
    email: lead.email,
    phone: lead.phone,
    website: lead.website,
    status: lead.status,
    monthlyRevenue: lead.monthlyRevenue.toNumber(),
    notes: lead.notes,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  };
}

function serializeLeadWithInteractions(
  lead: LeadWithInteractions,
): SerializedLeadWithInteractions {
  return {
    ...serializeLead(lead),
    interactions: lead.interactions.map((i) => ({
      id: i.id,
      leadId: i.leadId,
      summary: i.summary,
      rawAiAnalysis: i.rawAiAnalysis,
      createdAt: i.createdAt.toISOString(),
    })),
  };
}

// --- Read -----------------------------------------------------------------

export async function getLeads(): Promise<SerializedLead[]> {
  const leads = await prisma.lead.findMany({
    orderBy: { updatedAt: "desc" },
  });
  return leads.map(serializeLead);
}

export async function getLeadWithInteractions(
  id: string,
): Promise<SerializedLeadWithInteractions | null> {
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: { interactions: { orderBy: { createdAt: "desc" } } },
  });
  return lead ? serializeLeadWithInteractions(lead) : null;
}

// --- Create / Update ------------------------------------------------------

export interface LeadInput {
  businessName: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  status?: LeadStatus;
  monthlyRevenue?: number;
  notes?: string | null;
}

export async function createLead(input: LeadInput): Promise<SerializedLead> {
  const lead = await prisma.lead.create({
    data: {
      businessName: input.businessName.trim() || "Untitled Lead",
      contactPerson: emptyToNull(input.contactPerson),
      email: emptyToNull(input.email),
      phone: emptyToNull(input.phone),
      website: emptyToNull(input.website),
      status: input.status ?? "new_lead",
      monthlyRevenue: new Prisma.Decimal(input.monthlyRevenue ?? 0),
      notes: emptyToNull(input.notes),
    },
  });
  revalidatePath("/");
  return serializeLead(lead);
}

export async function updateLead(
  id: string,
  input: Partial<LeadInput>,
): Promise<SerializedLead> {
  const lead = await prisma.lead.update({
    where: { id },
    data: {
      ...(input.businessName !== undefined && {
        businessName: input.businessName.trim() || "Untitled Lead",
      }),
      ...(input.contactPerson !== undefined && {
        contactPerson: emptyToNull(input.contactPerson),
      }),
      ...(input.email !== undefined && { email: emptyToNull(input.email) }),
      ...(input.phone !== undefined && { phone: emptyToNull(input.phone) }),
      ...(input.website !== undefined && {
        website: emptyToNull(input.website),
      }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.monthlyRevenue !== undefined && {
        monthlyRevenue: new Prisma.Decimal(input.monthlyRevenue),
      }),
      ...(input.notes !== undefined && { notes: emptyToNull(input.notes) }),
    },
  });
  revalidatePath("/");
  return serializeLead(lead);
}

export async function updateLeadStatus(
  id: string,
  status: LeadStatus,
): Promise<SerializedLead> {
  return updateLead(id, { status });
}

export async function deleteLead(id: string): Promise<void> {
  await prisma.lead.delete({ where: { id } });
  revalidatePath("/");
}

// --- Utils ----------------------------------------------------------------

function emptyToNull(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}
