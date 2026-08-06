import crypto from "crypto";

function key(): Buffer {
  const configured = process.env.DATA_ENCRYPTION_KEY;
  if (!configured && process.env.NODE_ENV === "production") {
    throw new Error("DATA_ENCRYPTION_KEY is required in production");
  }
  return crypto.createHash("sha256").update(configured || "rarefarm-local-data-key-change-me").digest();
}

export function encryptSensitive(value: unknown): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decryptSensitive<T>(value: string | undefined): T | undefined {
  if (!value) return undefined;
  try {
    const [ivRaw, tagRaw, encryptedRaw] = value.split(".");
    if (!ivRaw || !tagRaw || !encryptedRaw) return undefined;
    const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(ivRaw, "base64url"));
    decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
    const plain = Buffer.concat([decipher.update(Buffer.from(encryptedRaw, "base64url")), decipher.final()]).toString("utf8");
    return JSON.parse(plain) as T;
  } catch {
    return undefined;
  }
}

export function maskAccountNumber(accountNumber: string): string {
  const compact = accountNumber.replace(/\s+/g, "");
  if (compact.length <= 4) return "*".repeat(compact.length);
  return `${"*".repeat(compact.length - 4)}${compact.slice(-4)}`;
}
