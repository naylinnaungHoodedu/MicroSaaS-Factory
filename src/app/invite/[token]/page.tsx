import Link from "next/link";
import { notFound } from "next/navigation";

import { FirebaseLoginPanel } from "@/components/firebase-login-panel";
import { Section } from "@/components/ui";
import { getAuthModeInfo } from "@/lib/server/auth-mode";
import { acceptInviteAction } from "@/lib/server/actions";
import { getInviteByToken } from "@/lib/server/services";

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const resolved = await searchParams;
  const invite = await getInviteByToken(token);
  const auth = getAuthModeInfo();

  if (!invite) {
    notFound();
  }

  return (
    <main className="page-shell py-10">
      <Section
        eyebrow="Invite Acceptance"
        title={`Activate ${invite.workspaceName}`}
        description={
          auth.firebaseEnabled
            ? "This invite link is the recommended founder entrypoint. Continue with Firebase using the invited email below, or use the invite-token path alongside it."
            : "Accept the invite to create or reopen the founder workspace associated with this token."
        }
      >
        {resolved.error === "invalid_invite" ? (
          <div className="mb-6 rounded-2xl border border-rose-400/25 bg-rose-500/10 p-4 text-sm text-rose-100">
            This invite is invalid, expired, or does not match the provided email.
          </div>
        ) : null}
        <div
          className={
            auth.firebaseEnabled
              ? "grid gap-8 xl:grid-cols-[0.8fr_1fr_1fr]"
              : "grid gap-8 lg:grid-cols-[0.8fr_1fr]"
          }
        >
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-6 text-sm leading-7 text-slate-300">
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-300/80">Invite details</p>
            <p className="mt-3">Email: {invite.email}</p>
            <p>Workspace: {invite.workspaceName}</p>
            <p>Expires: {new Date(invite.expiresAt).toLocaleDateString()}</p>
            <p className="mt-3">
              {auth.firebaseEnabled
                ? "Firebase is the recommended activation path for this invite, but the direct invite-token flow remains available on this page."
                : "This environment is using the direct invite-token flow for founder activation."}
            </p>
            <Link href="/login" className="mt-6 inline-flex rounded-full border border-white/10 px-4 py-2 text-white transition hover:border-white/25">
              Already accepted? Sign in
            </Link>
          </div>

          {auth.firebaseEnabled ? (
            <FirebaseLoginPanel
              enabled={auth.firebaseEnabled}
              testMode={Boolean(auth.firebaseTestMode)}
              inviteToken={token}
              prefilledEmail={invite.email}
              emailLocked
              redirectTo={`/invite/${token}`}
              mode="invite"
            />
          ) : null}

          <form action={acceptInviteAction.bind(null, token)} className="space-y-5 rounded-[1.5rem] border border-white/10 bg-white/5 p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                {auth.firebaseEnabled ? "Invite Token Fallback" : "Invite Token"}
              </p>
              <h3 className="mt-3 text-xl font-semibold text-white">
                {auth.firebaseEnabled ? "Use the invite token directly" : "Activate with invite token"}
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                {auth.firebaseEnabled
                  ? "This manual path stays available if you prefer not to use Firebase for this invite."
                  : "Use the invite token in this link to create or reopen the founder workspace."}
              </p>
            </div>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Name</span>
              <input name="name" required placeholder="Your full name" />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Invite email</span>
              <input name="email" type="email" required defaultValue={invite.email} />
            </label>
            <button type="submit" className="button-primary">
              Activate workspace
            </button>
          </form>
        </div>
      </Section>
    </main>
  );
}
