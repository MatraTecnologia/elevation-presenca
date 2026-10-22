export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store", headers: { "Content-Type": "application/json", ...init?.headers } });
  const result = await response.json();
  if (response.status === 401) { window.location.assign(new URL("/acesso", window.location.origin).href); throw new Error("Sua sessão terminou. Entre novamente."); }
  if (!response.ok) throw new Error(result.error || "Não foi possível concluir. Confira os dados e tente novamente.");
  return result as T;
}
