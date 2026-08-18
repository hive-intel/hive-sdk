import { createHash, createHmac } from "node:crypto";

export const HIVE_TENANT_ID_HEADER = "X-Hive-Tenant-Id";
export const HIVE_END_USER_ID_HEADER = "X-Hive-End-User-Id";
export const HIVE_SUBJECT_TIMESTAMP_HEADER = "X-Hive-Subject-Timestamp";
export const HIVE_SUBJECT_SIGNATURE_HEADER = "X-Hive-Subject-Signature";
export const HIVE_SUBJECT_BODY_SHA256_HEADER = "X-Hive-Subject-Body-Sha256";

export type HiveSubjectContext = {
  endUserId: string;
  signingSecret?: string;
  tenantId: string;
};

export type HiveSubjectSigningInput = {
  endUserId: string;
  method: string;
  path: string;
  secret: string;
  tenantId: string;
  timestamp: string;
  bodyDigest?: string;
};

export type HiveSubjectHeaderOptions = {
  endUserId: string;
  method: string;
  path: string;
  signingSecret?: string;
  tenantId: string;
  timestamp?: Date | number | string;
  bodyDigest?: string;
};

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item ?? null)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export function buildHiveSubjectBodyDigest(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function normalizeTimestamp(value: Date | number | string | undefined): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "number") {
    return String(Math.floor(value));
  }
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return String(Math.floor(Date.now() / 1000));
}

function requireNonEmpty(value: string, field: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`Hive B2B subject ${field} is required.`);
  }
  return trimmed;
}

export function buildHiveSubjectSignaturePayload({
  bodyDigest,
  endUserId,
  method,
  path,
  tenantId,
  timestamp,
}: Omit<HiveSubjectSigningInput, "secret">): string {
  const parts = [
    requireNonEmpty(method, "method").toUpperCase(),
    requireNonEmpty(path, "path"),
    requireNonEmpty(tenantId, "tenantId"),
    requireNonEmpty(endUserId, "endUserId"),
    requireNonEmpty(timestamp, "timestamp"),
  ];
  if (bodyDigest) parts.push(requireNonEmpty(bodyDigest, "bodyDigest"));
  return parts.join("\n");
}

export function signHiveSubjectHeaders(input: HiveSubjectSigningInput): string {
  const secret = requireNonEmpty(input.secret, "signingSecret");
  return createHmac("sha256", secret)
    .update(buildHiveSubjectSignaturePayload(input))
    .digest("hex");
}

export function buildHiveSubjectHeaders({
  bodyDigest,
  endUserId,
  method,
  path,
  signingSecret,
  tenantId,
  timestamp,
}: HiveSubjectHeaderOptions): Record<string, string> {
  const normalizedTimestamp = normalizeTimestamp(timestamp);
  const normalizedTenantId = requireNonEmpty(tenantId, "tenantId");
  const normalizedEndUserId = requireNonEmpty(endUserId, "endUserId");
  const secret = requireNonEmpty(signingSecret ?? "", "signingSecret");
  const headers: Record<string, string> = {
    [HIVE_TENANT_ID_HEADER]: normalizedTenantId,
    [HIVE_END_USER_ID_HEADER]: normalizedEndUserId,
    [HIVE_SUBJECT_TIMESTAMP_HEADER]: normalizedTimestamp,
    [HIVE_SUBJECT_SIGNATURE_HEADER]: signHiveSubjectHeaders({
      endUserId: normalizedEndUserId,
      method,
      path,
      secret,
      tenantId: normalizedTenantId,
      timestamp: normalizedTimestamp,
      bodyDigest,
    }),
  };
  if (bodyDigest) headers[HIVE_SUBJECT_BODY_SHA256_HEADER] = bodyDigest;
  return headers;
}
