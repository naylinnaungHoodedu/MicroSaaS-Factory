import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const SECRET = createHash("sha256")
  .update(process.env.MICROSAAS_FACTORY_ENCRYPTION_KEY ?? "microsaas-factory-local-dev")
  .digest();

export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", SECRET, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(
    ".",
  );
}

export function decryptSecret(value?: string) {
  if (!value) {
    return "";
  }

  const [ivRaw, tagRaw, payloadRaw] = value.split(".");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    SECRET,
    Buffer.from(ivRaw, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagRaw, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(payloadRaw, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export function createSha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function createHmacSha256(secret: string, value: string) {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function secureCompare(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}
