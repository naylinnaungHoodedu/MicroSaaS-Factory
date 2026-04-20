import { createSign } from "node:crypto";

type ServiceAccount = {
  client_email: string;
  private_key: string;
};

type GenerateTextOptions = {
  prompt: string;
  model: "flash" | "pro";
  fallback: string;
};

function toBase64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

async function getGoogleAccessToken(serviceAccount: ServiceAccount, scopes: string[]) {
  const now = Math.floor(Date.now() / 1000);
  const header = toBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claimSet = toBase64Url(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: scopes.join(" "),
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    }),
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claimSet}`);
  signer.end();
  const signature = signer.sign(serviceAccount.private_key).toString("base64url");
  const assertion = `${header}.${claimSet}.${signature}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    throw new Error(`Google token exchange failed: ${response.status}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

function readPlatformServiceAccount() {
  const raw =
    process.env.VERTEX_SERVICE_ACCOUNT_JSON ??
    (process.env.VERTEX_SERVICE_ACCOUNT_JSON_BASE64
      ? Buffer.from(process.env.VERTEX_SERVICE_ACCOUNT_JSON_BASE64, "base64").toString("utf8")
      : undefined);

  if (!raw) {
    return null;
  }

  return JSON.parse(raw) as ServiceAccount;
}

export async function generateText({ prompt, model, fallback }: GenerateTextOptions) {
  const projectId = process.env.VERTEX_PROJECT_ID;
  const location = process.env.VERTEX_LOCATION ?? "us-central1";
  const serviceAccount = readPlatformServiceAccount();

  if (!projectId || !serviceAccount) {
    return fallback;
  }

  try {
    const accessToken = await getGoogleAccessToken(serviceAccount, [
      "https://www.googleapis.com/auth/cloud-platform",
    ]);
    const modelId = model === "pro" ? "gemini-2.5-pro" : "gemini-2.5-flash";
    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelId}:generateContent`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: model === "pro" ? 0.35 : 0.55,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!response.ok) {
      return fallback;
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };
    const text = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim();

    return text || fallback;
  } catch {
    return fallback;
  }
}
