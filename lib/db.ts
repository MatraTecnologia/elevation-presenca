import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalDb = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalDb.prisma ?? new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000, max: 10 }, { schema: "presenca" }),
  log: ["error"],
  transactionOptions: { maxWait: 10000, timeout: 20000 },
});

if (process.env.NODE_ENV !== "production") globalDb.prisma = db;
