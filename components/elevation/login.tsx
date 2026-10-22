"use client";
import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Sparkles } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export function Login() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [show, setShow] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await authClient.signIn.email({ email: String(form.get("email")), password: String(form.get("password")), rememberMe: true });
      if (result.error) setError(result.error.status === 429 ? "Muitas tentativas. Aguarde um minuto e tente novamente." : "Não foi possível entrar. Confira o e-mail e a senha.");
      else window.location.assign(new URL("/", window.location.origin).href);
    } catch { setError("Não foi possível conectar. Confira a internet e tente novamente."); }
    finally { setPending(false); }
  }
  return <main className="login-page"><section className="login-story"><div className="brand"><span className="brand-mark">E</span><div>ELEVATION<small>MULHERES QUE VÃO MAIS ALTO</small></div></div><div className="login-story-copy"><span className="eyebrow"><Sparkles size={16} /> CADA CONEXÃO COMEÇA COM UMA CHEGADA</span><h1>Grandes encontros.<br /><em>Presenças que<br />transformam.</em></h1><p>Cuide de cada chegada. Acompanhe cada conexão.<br />Viva o seu evento por inteiro.</p></div><div className="login-story-footer"><span>CONEXÃO · PROPÓSITO · IMPACTO</span><span>Elevation Presença</span></div><div className="orbit orbit-one" /><div className="orbit orbit-two" /></section><section className="login-form-wrap"><div className="login-form"><span className="login-icon"><LockKeyhole size={24} /></span><span className="eyebrow">ACESSO DA EQUIPE</span><h2>Que bom ter você aqui.</h2><p>Entre para acompanhar e receber as participantes.</p><form onSubmit={submit}><label>E-mail<input name="email" type="email" autoComplete="username" required placeholder="seu@email.com" /></label><label>Senha<div className="password-field"><input name="password" type={show ? "text" : "password"} autoComplete="current-password" required placeholder="Sua senha de acesso" /><button type="button" aria-label={show ? "Ocultar senha" : "Mostrar senha"} onClick={() => setShow(!show)}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="btn primary login-submit" disabled={pending}>{pending ? "Entrando…" : "Entrar no painel"}<ArrowRight size={18} /></button></form><p className="access-note"><LockKeyhole size={13} /> Acesso exclusivo para a organização e recepção.</p></div><small className="login-copyright">ELEVATION · MAIS QUE UM EVENTO. UM MOVIMENTO.</small></section></main>;
}
