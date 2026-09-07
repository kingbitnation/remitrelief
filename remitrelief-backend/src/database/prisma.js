/**
 * Centralized Prisma client (serverless-safe singleton).
 * Do not instantiate PrismaClient inside route handlers.
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

/** @type {PrismaClient | undefined} */
let prismaSingleton = globalForPrisma.__remitreliefPrisma;

export function getPrisma() {
  if (!prismaSingleton) {
    prismaSingleton = new PrismaClient({
      log: process.env.PRISMA_LOG === "true" ? ["query", "error", "warn"] : ["error"],
    });
    if (process.env.NODE_ENV !== "production") {
      globalForPrisma.__remitreliefPrisma = prismaSingleton;
    }
  }
  return prismaSingleton;
}

export async function disconnectPrisma() {
  if (prismaSingleton) {
    await prismaSingleton.$disconnect();
    prismaSingleton = undefined;
    delete globalForPrisma.__remitreliefPrisma;
  }
}

export { PrismaClient };
