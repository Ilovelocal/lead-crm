"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SerializedInteraction } from "@/lib/types";

export interface InteractionInput {
  leadId: string;
  summary: string;
  /** Raw OCR text/extraction for auditing. */
  rawAiAnalysis?: unknown;
}

export async function createInteraction(
  input: InteractionInput,
): Promise<SerializedInteraction> {
  const interaction = await prisma.interaction.create({
    data: {
      leadId: input.leadId,
      summary: input.summary.trim(),
      rawAiAnalysis:
        (input.rawAiAnalysis as Prisma.InputJsonValue) ?? Prisma.JsonNull,
    },
  });

  // Touch the parent so it floats to the top of the "recently updated" list.
  await prisma.lead.update({
    where: { id: input.leadId },
    data: { updatedAt: new Date() },
  });

  revalidatePath("/");
  return {
    id: interaction.id,
    leadId: interaction.leadId,
    summary: interaction.summary,
    rawAiAnalysis: interaction.rawAiAnalysis,
    createdAt: interaction.createdAt.toISOString(),
  };
}

export async function deleteInteraction(id: string): Promise<void> {
  await prisma.interaction.delete({ where: { id } });
  revalidatePath("/");
}
