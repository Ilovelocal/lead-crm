import { PrismaClient } from "@prisma/client";

// Next.js hot-reloads modules in dev, which would otherwise spawn a new
// PrismaClient (and a new connection pool) on every reload. Cache it on the
// global object so we reuse a single instance.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
