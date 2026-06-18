"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  clearSession,
  getSession,
  hashPassword,
  setSession,
  verifyPassword,
} from "@/lib/auth";

export type ActionResult = { ok: true } | { error: string };

const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** Sign in with the single account's credentials. */
export async function login(
  email: string,
  password: string,
): Promise<ActionResult> {
  const user = await prisma.user.findUnique({
    where: { email: normalizeEmail(email) },
  });

  // Same message for both cases so we don't leak which emails exist.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Invalid email or password." };
  }

  await setSession({ userId: user.id, email: user.email });
  return { ok: true };
}

export async function logout(): Promise<void> {
  await clearSession();
}

interface UpdateAccountInput {
  email: string;
  currentPassword: string;
  newPassword?: string;
}

/** Edit the account email and/or password. Requires the current password. */
export async function updateAccount(
  input: UpdateAccountInput,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: "You are not signed in." };

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return { error: "Account not found." };

  if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
    return { error: "Current password is incorrect." };
  }

  const data: Prisma.UserUpdateInput = {};
  const nextEmail = normalizeEmail(input.email);
  if (nextEmail && nextEmail !== user.email) {
    if (!nextEmail.includes("@")) {
      return { error: "Please enter a valid email address." };
    }
    data.email = nextEmail;
  }
  if (input.newPassword) {
    if (input.newPassword.length < 8) {
      return { error: "New password must be at least 8 characters." };
    }
    data.passwordHash = await hashPassword(input.newPassword);
  }

  if (Object.keys(data).length === 0) {
    return { error: "Nothing to update." };
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
  });

  // Refresh the cookie in case the email changed.
  await setSession({ userId: updated.id, email: updated.email });
  return { ok: true };
}
