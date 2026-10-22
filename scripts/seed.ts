import "dotenv/config";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { db } from "../lib/db";

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 10) throw new Error("Configure ADMIN_EMAIL e ADMIN_PASSWORD (mínimo 10 caracteres) no .env.");
  if (!await db.user.findUnique({ where: { email } })) {
    const id = randomUUID();
    await db.user.create({ data: { id, name: "Organização Elevation", email, role: "ADMIN", accounts: { create: { id: randomUUID(), accountId: id, providerId: "credential", password: await hashPassword(password) } } } });
    console.log("Acesso da organização criado. Consulte ADMIN_EMAIL e ADMIN_PASSWORD no .env.");
  } else console.log("Acesso da organização já existe; senha preservada.");
  if (!await db.event.count()) {
    await db.event.create({ data: { name: "Elevation", edition: "2ª edição", startsAt: new Date("2026-10-23T14:00:00-03:00"), endsAt: new Date("2026-10-23T19:00:00-03:00"), venue: "Villa Gioia · Londrina, PR", capacity: 200 } });
    console.log("Evento do site criado. Nenhuma participante fictícia foi adicionada.");
  }
}
main().catch(() => { console.error("Não foi possível preparar os dados iniciais. Confira a configuração e o acesso ao banco."); process.exitCode = 1; }).finally(() => db.$disconnect());
