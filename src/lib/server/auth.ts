import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { readDatabase, updateDatabase } from "@/lib/server/db";
import type { Session, User, Workspace } from "@/lib/types";

const SESSION_COOKIE = "msf_session";
const SESSION_DURATION_DAYS = 30;

function getExpiryDate() {
  return new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);
}

export function getSessionCookieDescriptor(sessionId: string) {
  return {
    name: SESSION_COOKIE,
    value: sessionId,
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      expires: getExpiryDate(),
      path: "/",
    },
  };
}

export async function setSessionCookie(sessionId: string) {
  const cookieStore = await cookies();
  const cookie = getSessionCookieDescriptor(sessionId);
  cookieStore.set(cookie.name, cookie.value, cookie.options);
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function createFounderSessionRecord(userId: string) {
  return updateDatabase((database) => {
    const nextSession: Session = {
      id: crypto.randomUUID(),
      userId,
      kind: "founder",
      createdAt: new Date().toISOString(),
      expiresAt: getExpiryDate().toISOString(),
    };

    database.sessions = database.sessions.filter(
      (existing) => !(existing.kind === "founder" && existing.userId === userId),
    );
    database.sessions.push(nextSession);
    return nextSession;
  });
}

export async function createFounderSession(userId: string) {
  const session = await createFounderSessionRecord(userId);

  await setSessionCookie(session.id);
  return session;
}

export async function createAdminSession() {
  const session = await updateDatabase((database) => {
    const nextSession: Session = {
      id: crypto.randomUUID(),
      kind: "admin",
      createdAt: new Date().toISOString(),
      expiresAt: getExpiryDate().toISOString(),
    };

    database.sessions.push(nextSession);
    return nextSession;
  });

  await setSessionCookie(session.id);
  return session;
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionId) {
    return null;
  }

  const database = await readDatabase();
  const session = database.sessions.find((entry) => entry.id === sessionId);

  if (!session) {
    return null;
  }

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    await updateDatabase((nextDatabase) => {
      nextDatabase.sessions = nextDatabase.sessions.filter((entry) => entry.id !== session.id);
    });
    await clearSessionCookie();
    return null;
  }

  return session;
}

export async function getFounderContext() {
  const session = await getCurrentSession();

  if (!session || session.kind !== "founder" || !session.userId) {
    return null;
  }

  const database = await readDatabase();
  const user = database.users.find((entry) => entry.id === session.userId);

  if (!user) {
    await clearSessionCookie();
    return null;
  }

  const workspace = database.workspaces.find(
    (entry) => entry.id === user.workspaceId && entry.ownerUserId === user.id,
  );

  if (!workspace) {
    await clearSessionCookie();
    return null;
  }

  return { session, user, workspace };
}

export async function requireFounderContext(): Promise<{
  session: Session;
  user: User;
  workspace: Workspace;
}> {
  const context = await getFounderContext();

  if (!context) {
    redirect("/login");
  }

  return context;
}

export async function requireAdminSession() {
  const session = await getCurrentSession();

  if (!session || session.kind !== "admin") {
    redirect("/admin");
  }

  return session;
}
