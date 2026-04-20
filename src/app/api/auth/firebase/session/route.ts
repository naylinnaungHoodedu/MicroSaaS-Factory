import { NextResponse } from "next/server";

import {
  createFounderSessionRecord,
  getSessionCookieDescriptor,
} from "@/lib/server/auth";
import { getAuthModeInfo } from "@/lib/server/auth-mode";
import { verifyFirebaseIdToken } from "@/lib/server/firebase-admin";
import {
  activateSelfServeSignupWithFirebaseIdentity,
  completeInviteWithFirebaseIdentity,
  loginWithFirebaseIdentity,
} from "@/lib/server/services";

function methodNotAllowed() {
  return NextResponse.json(
    { error: "Method Not Allowed" },
    {
      status: 405,
      headers: {
        Allow: "POST",
      },
    },
  );
}

export async function POST(request: Request) {
  const auth = getAuthModeInfo();

  if (!auth.firebaseEnabled) {
    return NextResponse.json(
      { error: "Sign-in is currently unavailable." },
      { status: 501 },
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      idToken?: string;
      inviteToken?: string;
      signupIntentId?: string;
    };
    const idToken = body.idToken?.trim();
    const inviteToken = body.inviteToken?.trim() || undefined;
    const signupIntentId = body.signupIntentId?.trim() || undefined;

    if (!idToken) {
      return NextResponse.json({ error: "Firebase ID token is required." }, { status: 400 });
    }

    const decoded = await verifyFirebaseIdToken(idToken);

    if (!decoded.email || decoded.email_verified !== true) {
      return NextResponse.json(
        { error: "Firebase account must have a verified email address." },
        { status: 403 },
      );
    }

    const user = inviteToken
      ? await completeInviteWithFirebaseIdentity({
          token: inviteToken,
          email: decoded.email,
          name: decoded.name,
          providerId: decoded.firebase.sign_in_provider,
        })
      : signupIntentId
        ? await activateSelfServeSignupWithFirebaseIdentity({
            signupIntentId,
            email: decoded.email,
            name: decoded.name,
            providerId: decoded.firebase.sign_in_provider,
          })
      : await loginWithFirebaseIdentity({
          email: decoded.email,
          name: decoded.name,
          providerId: decoded.firebase.sign_in_provider,
        });
    const session = await createFounderSessionRecord(user.id);
    const cookie = getSessionCookieDescriptor(session.id);
    const response = NextResponse.json({
      ok: true,
      user: {
        email: user.email,
        name: user.name,
      },
    });

    response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Firebase sign-in failed." },
      { status: 400 },
    );
  }
}

export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
