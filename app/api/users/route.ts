import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { authorize, body, endpoint, json } from "@/lib/http";
export const GET = endpoint(async request => {
  await authorize(request, true);
  return json(await db.user.findMany({ select: { id: true, name: true, email: true, role: true }, orderBy: { name: "asc" } }));
});
export const POST = endpoint(async request => {
  await authorize(request, true);
  const input = z.object({ name: z.string().trim().min(2).max(100), email: z.email().max(200), password: z.string().min(10, "A senha deve ter pelo menos 10 caracteres.").max(128), role: z.enum(["ADMIN", "RECEPTION"]) }).parse(await body(request));
  const id = randomUUID();
  const password = await hashPassword(input.password);
  const user = await db.user.create({ data: { id, name: input.name, email: input.email.toLowerCase(), role: input.role, accounts: { create: { id: randomUUID(), accountId: id, providerId: "credential", password } } }, select: { id: true, name: true, email: true, role: true } });
  return json(user, 201);
});
