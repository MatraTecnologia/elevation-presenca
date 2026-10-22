import type { MoveKind, State } from "@/lib/contracts";

export function transition(state: State, kind: MoveKind): State {
  if (kind === "ENTRY" && state !== "INSIDE") return "INSIDE";
  if (kind === "EXIT" && state === "INSIDE") return "OUTSIDE";
  if (kind === "DEPARTURE" && (state === "INSIDE" || state === "OUTSIDE")) return "LEFT";
  throw new Error(kind === "ENTRY" ? "Esta participante já está no evento." : "A situação da participante mudou. Atualize a lista antes de registrar a saída.");
}

export function identityKey(email?: string | null, phone?: string | null) {
  const normalizedEmail = email?.trim().toLowerCase();
  const normalizedPhone = phone?.replace(/\D/g, "");
  return normalizedEmail ? `email:${normalizedEmail}` : normalizedPhone ? `phone:${normalizedPhone}` : null;
}

export function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
