import Papa from "papaparse";
import { normalize } from "@/lib/attendance";
import { participantSchema } from "@/lib/validation";

export type ImportRow = { name: string; email: string; phone: string; company: string; ticket: string; externalId?: string };
const aliases: Record<keyof ImportRow, string[]> = {
  name: ["nome", "nome completo", "name", "comprador", "nome do comprador", "nome cliente", "cliente", "nome do cliente", "participante"],
  email: ["email", "e-mail", "e mail", "email do comprador", "e-mail do comprador", "email cliente"],
  phone: ["telefone", "phone", "celular", "whatsapp", "telefone do comprador", "telefone cliente"],
  company: ["empresa", "company", "organizacao"],
  ticket: ["ingresso", "lote", "ticket", "produto", "nome do produto"],
  externalId: ["codigo", "id", "pedido", "id do pedido", "id da venda", "id transacao", "codigo da transacao"],
};
export function parseParticipants(text: string) {
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, ""), { header: true, skipEmptyLines: "greedy", transformHeader: normalize });
  if (parsed.errors.length) throw new Error(`CSV inválido: ${parsed.errors[0].message}`);
  if (!parsed.meta.fields?.some(field => aliases.name.includes(field))) throw new Error("A planilha precisa de uma coluna Nome ou Nome completo. Baixe o modelo para conferir o formato.");
  if (parsed.data.length > 1000) throw new Error("Importe até 1.000 participantes por arquivo.");
  const rows: ImportRow[] = [];
  const errors: string[] = [];
  parsed.data.forEach((row, index) => {
    const mapped = Object.fromEntries(Object.entries(aliases).map(([field, names]) => [field, names.map(name => row[name]).find(Boolean)?.trim() || (field === "ticket" ? "Geral" : "")])) as ImportRow;
    const result = participantSchema.safeParse(mapped);
    if (!result.success) errors.push(`Linha ${index + 2}: ${result.error.issues[0].message}`);
    else rows.push(result.data);
  });
  return { rows, errors };
}
export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  const content = Papa.unparse(rows, { delimiter: ";", escapeFormulae: true });
  const url = URL.createObjectURL(new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8;" }));
  const link = document.createElement("a"); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
