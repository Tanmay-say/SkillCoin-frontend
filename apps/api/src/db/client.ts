import { PrismaClient } from "@prisma/client";
import { JsonDevStore } from "./dev-store";

const globalForPrisma = globalThis as unknown as {
  prisma: any;
};

const shouldUseLocalDevStore =
  process.env.NODE_ENV === "development" &&
  ["1", "true", "yes"].includes((process.env.LOCAL_DEV_MODE || "").toLowerCase());

export const prisma: any =
  globalForPrisma.prisma ??
  (shouldUseLocalDevStore
    ? new JsonDevStore()
    : new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
      }));

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export const usingLocalDevStore = shouldUseLocalDevStore;

export default prisma;
