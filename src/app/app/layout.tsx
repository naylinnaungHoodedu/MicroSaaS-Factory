import Link from "next/link";

import { logoutAction } from "@/lib/server/actions";
import { requireFounderContext } from "@/lib/server/auth";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user, workspace } = await requireFounderContext();

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 bg-slate-950/70 backdrop-blur">
        <div className="page-shell flex flex-wrap items-center justify-between gap-4 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-cyan-300/80">MicroSaaS Factory</p>
            <h1 className="text-xl font-semibold text-white">{workspace.name}</h1>
          </div>
          <nav className="flex flex-wrap items-center gap-3">
            <Link href="/app" className="button-secondary">
              Dashboard
            </Link>
            <Link href="/app/crm" className="button-secondary">
              CRM
            </Link>
            <span className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300">
              {user.email}
            </span>
            <form action={logoutAction}>
              <button type="submit" className="button-primary">
                Log out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <div className="page-shell py-8">{children}</div>
    </div>
  );
}
