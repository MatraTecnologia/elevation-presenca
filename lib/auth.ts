import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";

export const auth = betterAuth({
  appName: "Elevation Presença",
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 10 },
  user: { additionalFields: { role: { type: "string", defaultValue: "RECEPTION", input: false } } },
  session: { expiresIn: 60 * 60 * 16, updateAge: 60 * 60 },
  rateLimit: { enabled: true, storage: "database", window: 60, max: 60, customRules: { "/sign-in/email": { window: 60, max: 8 } } },
  plugins: [nextCookies()],
});
