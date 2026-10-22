import "server-only";
import { auth } from "@/lib/auth";
import { Prisma } from "@/generated/prisma/client";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function authorize(request: Request, admin = false) {
  if (!["GET", "HEAD"].includes(request.method)) {
    const origin = request.headers.get("origin");
    const expected = new URL(process.env.BETTER_AUTH_URL || request.url).origin;
    if (!origin || origin !== expected) throw new HttpError(403, "Origem da solicitação não autorizada.");
  }
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) throw new HttpError(401, "Sua sessão terminou. Entre novamente.");
  if (admin && session.user.role !== "ADMIN") throw new HttpError(403, "Apenas a organização pode realizar esta ação.");
  return session.user;
}

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
}

type IdContext = { params: Promise<{ id: string }> };
export function endpoint(handler: (request: Request) => Promise<Response>): (request: Request) => Promise<Response>;
export function endpoint(handler: (request: Request, context: IdContext) => Promise<Response>): (request: Request, context: IdContext) => Promise<Response>;
export function endpoint(handler: (request: Request, context: IdContext) => Promise<Response>) {
  return async (request: Request, context: IdContext = { params: Promise.resolve({ id: "" }) }) => {
    try { return await handler(request, context); }
    catch (error) {
      if (error instanceof HttpError) return json({ error: error.message }, error.status);
      if (error instanceof ZodError) return json({ error: error.issues[0]?.message ?? "Confira os dados informados." }, 400);
      if (error instanceof SyntaxError) return json({ error: "Solicitação inválida." }, 400);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return json({ error: "Este registro já existe no evento. Confira a lista antes de cadastrar novamente." }, 409);
      console.error("Falha na operação:", error instanceof Prisma.PrismaClientKnownRequestError ? { name: error.name, code: error.code } : error instanceof Error ? error.name : "UnknownError");
      return json({ error: "Não foi possível salvar ou consultar os dados. Verifique a conexão e tente novamente." }, 503);
    }
  };
}

export async function body(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 2_000_000) throw new HttpError(413, "O arquivo excede o limite de 2 MB.");
  const text = await request.text();
  if (text.length > 2_000_000) throw new HttpError(413, "O arquivo excede o limite de 2 MB.");
  return JSON.parse(text);
}
