"use client";
import { useState, type FormEvent } from "react";
import { Upload, FileSpreadsheet, Download, CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/elevation/modal";
import { api } from "@/lib/api-client";
import { downloadCsv, parseParticipants, type ImportRow } from "@/lib/csv";
import type { EventInfo } from "@/lib/contracts";

type Props = { onClose: () => void; onSaved: (message: string) => void };
export function PersonForm({ eventId, ...props }: Props & { eventId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try { await api(`/api/events/${eventId}/participants`, { method: "POST", body: JSON.stringify(values) }); props.onSaved("Participante cadastrada. Ela já pode ser credenciada."); }
    catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  return <Modal title="Nova participante" subtitle="Adicione à lista deste evento. A entrada será confirmada na recepção." onClose={props.onClose} busy={busy}><form className="modal-form" onSubmit={submit}><label>Nome completo<input name="name" required minLength={2} maxLength={160} autoComplete="name" autoFocus placeholder="Como ela se chama?" /></label><div className="form-row"><label>E-mail<input name="email" type="email" autoComplete="email" placeholder="nome@email.com" /></label><label>WhatsApp com DDD<input name="phone" type="tel" autoComplete="tel" placeholder="(43) 99999-9999" /></label></div><div className="form-row"><label>Empresa<input name="company" maxLength={160} placeholder="Opcional" /></label><label>Ingresso / categoria<input name="ticket" maxLength={80} defaultValue="Geral" /></label></div><p className="form-hint">Informe um contato para distinguir participantes com o mesmo nome.</p>{error && <p role="alert" className="form-error">{error}</p>}<div className="modal-actions"><button className="btn" type="button" disabled={busy} onClick={props.onClose}>Cancelar</button><button className="btn primary" disabled={busy}>{busy ? "Salvando…" : "Cadastrar participante"}</button></div></form></Modal>;
}

export function EventForm({ onCreated, ...props }: Props & { onCreated: (event: EventInfo) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await api<EventInfo>("/api/events", { method: "POST", body: JSON.stringify({ name: values.name, edition: values.edition, venue: values.venue, capacity: Number(values.capacity), startsAt: `${values.date}T${values.start}:00-03:00`, endsAt: `${values.date}T${values.end}:00-03:00` }) });
      onCreated(result); props.onSaved("Evento criado. Agora você pode preparar a lista de participantes.");
    } catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  return <Modal title="Preparar um novo encontro" subtitle="Cada edição tem sua própria lista e histórico." onClose={props.onClose} busy={busy}><form className="modal-form" onSubmit={submit}><div className="form-row"><label>Nome do evento<input name="name" defaultValue="Elevation" required maxLength={120} autoFocus /></label><label>Edição<input name="edition" placeholder="3ª edição" maxLength={80} /></label></div><label>Local<input name="venue" required placeholder="Espaço · Cidade, UF" maxLength={160} /></label><div className="form-row three"><label>Data<input name="date" type="date" required /></label><label>Início<input name="start" type="time" defaultValue="14:00" required /></label><label>Encerramento<input name="end" type="time" defaultValue="19:00" required /></label></div><label>Capacidade do local<input name="capacity" type="number" min={1} max={100000} defaultValue={200} required /></label><p className="form-hint">Horários de Brasília. A capacidade serve como referência no painel.</p>{error && <p role="alert" className="form-error">{error}</p>}<div className="modal-actions"><button className="btn" type="button" disabled={busy} onClick={props.onClose}>Cancelar</button><button className="btn primary" disabled={busy}>{busy ? "Criando…" : "Criar evento"}</button></div></form></Modal>;
}

export function UserForm(props: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try { await api("/api/users", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) }); props.onSaved("Acesso criado para a equipe."); }
    catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  return <Modal title="Adicionar alguém à equipe" subtitle="Cada pessoa terá seu próprio acesso e identificação no histórico." onClose={props.onClose} busy={busy}><form className="modal-form" onSubmit={submit}><label>Nome<input name="name" required minLength={2} maxLength={100} autoFocus /></label><label>E-mail<input name="email" type="email" required /></label><label>Senha inicial<input name="password" type="password" autoComplete="new-password" minLength={10} maxLength={128} required placeholder="Pelo menos 10 caracteres" /></label><label>Permissão<select name="role"><option value="RECEPTION">Recepção · entradas, saídas e cadastros</option><option value="ADMIN">Organização · acesso completo</option></select></label>{error && <p role="alert" className="form-error">{error}</p>}<div className="modal-actions"><button className="btn" type="button" onClick={props.onClose} disabled={busy}>Cancelar</button><button className="btn primary" disabled={busy}>{busy ? "Criando…" : "Criar acesso"}</button></div></form></Modal>;
}

export function ImportForm({ eventId, ...props }: Props & { eventId: string }) {
  const [preview, setPreview] = useState<{ rows: ImportRow[]; errors: string[] } | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function load(file?: File) {
    if (!file) return;
    setError(""); setPreview(null); setFileName(file.name);
    if (file.size > 2_000_000) { setError("Escolha um CSV de até 2 MB."); return; }
    try { setPreview(parseParticipants(await file.text())); }
    catch (error) { setError((error as Error).message); }
  }
  async function submit() {
    if (!preview?.rows.length || preview.errors.length) return;
    setBusy(true); setError("");
    try { const result = await api<{ imported: number; skipped: number }>(`/api/events/${eventId}/import`, { method: "POST", body: JSON.stringify({ rows: preview.rows }) }); props.onSaved(`${result.imported} participante(s) importada(s). ${result.skipped} registro(s) já existente(s) ignorado(s).`); }
    catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  return <Modal title="Importar participantes" subtitle="Revise a lista antes de adicionar ao evento. Até 1.000 participantes por arquivo." onClose={props.onClose} wide busy={busy}><div className="modal-form"><label className="upload-zone"><Upload size={27} /><strong>Selecione sua planilha CSV</strong><span>Exportação da sua lista ou arquivo seguindo o modelo · até 2 MB</span><input type="file" accept=".csv,text/csv" disabled={busy} onChange={event => load(event.target.files?.[0])} /></label><button className="text-btn" onClick={() => downloadCsv("modelo-participantes.csv", [{ Nome: "Nome da participante", Email: "participante@exemplo.com", Telefone: "43999999999", Empresa: "Empresa", Ingresso: "1º lote", Codigo: "PEDIDO-001" }])}><Download size={15} /> Baixar modelo de planilha</button><p className="form-hint">Exporte apenas inscrições válidas. A importação não verifica pagamentos na Kiwify. Repetições são identificadas por contato ou código do pedido.</p>{preview && <><div className="import-summary"><FileSpreadsheet size={20} /><div><strong>{fileName}</strong><span>{preview.rows.length} linhas válidas · {preview.errors.length} com problema</span></div>{!preview.errors.length && <CheckCircle2 size={20} className="green" />}</div>{preview.errors.length ? <div className="form-error" role="alert"><strong>Corrija as linhas abaixo e selecione o arquivo novamente:</strong>{preview.errors.slice(0, 10).map(line => <p key={line}>{line}</p>)}{preview.errors.length > 10 && <p>E mais {preview.errors.length - 10} linhas.</p>}</div> : <div className="table-scroll preview-table"><table><thead><tr><th>Nome</th><th>E-mail</th><th>Ingresso</th></tr></thead><tbody>{preview.rows.slice(0, 8).map((row, i) => <tr key={i}><td>{row.name}</td><td>{row.email || "—"}</td><td>{row.ticket}</td></tr>)}</tbody></table>{preview.rows.length > 8 && <p className="form-hint">Prévia das primeiras 8 participantes.</p>}</div>}</>}{error && <p role="alert" className="form-error">{error}</p>}<div className="modal-actions"><button className="btn" disabled={busy} onClick={props.onClose}>Cancelar</button><button className="btn primary" disabled={busy || !preview?.rows.length || !!preview.errors.length} onClick={submit}>{busy ? "Importando…" : `Importar${preview?.rows.length ? ` ${preview.rows.length} participantes` : " lista"}`}</button></div></div></Modal>;
}
