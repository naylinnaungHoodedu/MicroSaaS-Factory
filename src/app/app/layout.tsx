import Link from "next/link";

import { logoutAction } from "@/lib/server/actions";
import { requireFounderContext } from "@/lib/server/auth";

const APP_LINKS = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/crm", label: "CRM" },
] as const;

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user, workspace } = await requireFounderContext();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/78 backdrop-blur-xl">
        <div className="border-b border-white/8 bg-white/[0.03]">
          <div className="page-shell flex flex-wrap items-center justify-between gap-3 py-3 text-xs">
            <div className="flex flex-wrap items-center gap-3 text-slate-300">
              <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 font-semibold uppercase tracking-[0.24em] text-cyan-100">
                Founder workspace
              </span>
              <span className="text-slate-300/90">
                One workspace for signal, shipping, billing, and connected ops.
              </span>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-400">
              {user.email}
            </span>
          </div>
        </div>

        <div className="page-shell py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2">
              <Link href="/" className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-300/90">
                MicroSaaS Factory
              </Link>
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-white">{workspace.name}</h1>
                <p className="text-sm text-slate-400">
                  Founder control tower for product lanes, CRM intelligence, and workspace billing.
                </p>
              </div>
            </div>

            <nav className="hidden flex-wrap items-center gap-2 lg:flex">
              {APP_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:bg-white/8 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="hidden flex-wrap items-center gap-3 lg:flex">
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
                {user.email}
              </span>
              <form action={logoutAction}>
                <button type="submit" className="button-primary">
                  Log out
                </button>
              </form>
            </div>

            <details className="relative lg:hidden">
              <summary className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200">
                Menu
              </summary>
              <div className="absolute right-0 top-full mt-3 w-[min(22rem,calc(100vw-2rem))] rounded-[1.5rem] border border-white/10 bg-slate-950/96 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl">
                <div className="grid gap-2">
                  {APP_LINKS.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="rounded-[1rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
                <div className="mt-4 space-y-3">
                  <span className="block rounded-[1rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                    {user.email}
                  </span>
                  <form action={logoutAction}>
                    <button type="submit" className="button-primary w-full">
                      Log out
                    </button>
                  </form>
                </div>
              </div>
            </details>
          </div>
        </div>
      </header>

      <div className="page-shell py-8 md:py-10">{children}</div>
    </div>
  );
}
