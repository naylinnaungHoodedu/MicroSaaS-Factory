import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const PUBLIC_FOOTER_LINKS = [
  { href: "/pricing", label: "Pricing" },
  { href: "/login", label: "Founder login" },
  { href: "/waitlist", label: "Waitlist" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
] as const;

export function PublicSiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-slate-950/35">
      <div className="page-shell flex flex-col gap-5 py-8 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300/80">
            MicroSaaS Factory
          </p>
          <p className="max-w-2xl text-sm leading-7 text-slate-400">
            Self-serve founder operating system for research, validation, launch gating,
            and connected ops.
          </p>
        </div>
        <nav className="flex flex-wrap gap-3">
          {PUBLIC_FOOTER_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}

export function PublicSiteShell({
  children,
  mainClassName,
}: {
  children: ReactNode;
  mainClassName?: string;
}) {
  return (
    <>
      <main className={cn("flex-1", mainClassName)}>{children}</main>
      <PublicSiteFooter />
    </>
  );
}
