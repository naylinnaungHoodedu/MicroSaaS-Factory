import Link from "next/link";

import { PublicSiteShell } from "@/components/public-shell";

export default function NotFound() {
  return (
    <PublicSiteShell mainClassName="page-shell flex items-center py-16">
      <div className="w-full rounded-[2rem] border border-white/10 bg-[linear-gradient(140deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] px-6 py-10 shadow-2xl shadow-black/20 md:px-10">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300/80">
          Route Not Found
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-white md:text-5xl">
          The requested founder route does not exist in this workspace.
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
          Return to the public overview, founder login, or invite queue and continue through the
          current MicroSaaS Factory funnel.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className="button-primary">
            Back to overview
          </Link>
          <Link href="/login" className="button-secondary">
            Founder login
          </Link>
          <Link href="/pricing" className="button-secondary">
            Review pricing
          </Link>
          <Link href="/waitlist" className="button-secondary">
            Request invite
          </Link>
        </div>
      </div>
    </PublicSiteShell>
  );
}
