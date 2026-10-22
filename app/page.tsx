import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Workspace } from "@/components/elevation/workspace";
import type { EventInfo } from "@/lib/contracts";

async function ProtectedWorkspace() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/acesso");
  const events = await db.event.findMany({ orderBy: { startsAt: "desc" }, include: { _count: { select: { registrations: true } } } });
  return <Workspace user={{ id: session.user.id, name: session.user.name, email: session.user.email, role: session.user.role }} initialEvents={JSON.parse(JSON.stringify(events)) as EventInfo[]} />;
}
export default function Home() { return <Suspense fallback={<div className="page-loader"><span className="brand-mark">E</span><p>Preparando a recepção…</p></div>}><ProtectedWorkspace /></Suspense>; }
