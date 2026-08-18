import { createHash } from "node:crypto";
import type { HiveExecutionReceipt } from "./types.js";

const SHA256_HEX = /^[a-f0-9]{64}$/;

export type HiveDigestReceipt = Pick<
  HiveExecutionReceipt,
  "digest_algorithm" | "input_digest" | "result_digest"
>;

export type HiveDigestVerification = {
  actual: string;
  expected: string;
  valid: boolean;
};

export type HiveExecutionDigestVerification = {
  algorithm: "sha256";
  input: HiveDigestVerification;
  result: HiveDigestVerification;
  valid: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function compareJsonKeys(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

/**
 * Hive's deterministic JSON serialization for execution-receipt digests.
 * Object keys are recursively sorted and array order is preserved. Values
 * otherwise follow JSON.stringify semantics; BigInts use "<digits>n" because
 * JSON itself cannot encode them.
 */
export function canonicalizeHiveJson(value: unknown): string {
  const seen = new WeakSet<object>();
  try {
    return (
      JSON.stringify(value, (_key, current: unknown) => {
        if (typeof current === "bigint") return `${current.toString()}n`;
        if (!current || typeof current !== "object") return current;
        if (seen.has(current)) return "[circular]";
        seen.add(current);
        if (Array.isArray(current)) return current;
        return Object.fromEntries(
          Object.entries(current as Record<string, unknown>).sort(
            ([left], [right]) => compareJsonKeys(left, right),
          ),
        );
      }) ?? String(value)
    );
  } catch {
    return "[unserializable]";
  }
}

export function digestHiveCanonicalJson(value: unknown): string {
  return createHash("sha256").update(canonicalizeHiveJson(value)).digest("hex");
}

/**
 * Return the normalized result payload covered by result_digest. This accepts
 * a Hive adapter result, a raw MCP tool result, or its parsed structured
 * payload. Only the server-added top-level `_hive` receipt is excluded.
 */
export function hiveResultWithoutReceipt(value: unknown): unknown {
  if (!isRecord(value)) return value;

  if (
    "json" in value &&
    "isError" in value &&
    "raw" in value &&
    "text" in value &&
    value.json !== undefined
  ) {
    return hiveResultWithoutReceipt(value.json);
  }
  if (
    "structuredContent" in value &&
    "content" in value &&
    value.structuredContent !== undefined
  ) {
    return hiveResultWithoutReceipt(value.structuredContent);
  }
  if (!Object.prototype.hasOwnProperty.call(value, "_hive")) return value;

  return Object.fromEntries(
    Object.entries(value).filter(([key]) => key !== "_hive"),
  );
}

function verifyDigest(
  expected: string,
  value: unknown,
  algorithm: string,
): HiveDigestVerification {
  const actual = digestHiveCanonicalJson(value);
  return {
    actual,
    expected,
    valid:
      algorithm === "sha256" &&
      SHA256_HEX.test(expected) &&
      actual === expected,
  };
}

/** Verify input_digest against the exact endpoint arguments sent to Hive. */
export function verifyHiveInputDigest(
  receipt: HiveDigestReceipt,
  toolArguments: Record<string, unknown> | undefined,
): HiveDigestVerification {
  return verifyDigest(
    receipt.input_digest,
    toolArguments ?? {},
    receipt.digest_algorithm,
  );
}

/** Verify result_digest against a normalized Hive result or raw MCP result. */
export function verifyHiveResultDigest(
  receipt: HiveDigestReceipt,
  result: unknown,
): HiveDigestVerification {
  return verifyDigest(
    receipt.result_digest,
    hiveResultWithoutReceipt(result),
    receipt.digest_algorithm,
  );
}

/** Verify both receipt self-checks without treating them as authentication. */
export function verifyHiveExecutionDigests(
  receipt: HiveDigestReceipt,
  toolArguments: Record<string, unknown> | undefined,
  result: unknown,
): HiveExecutionDigestVerification {
  const input = verifyHiveInputDigest(receipt, toolArguments);
  const resultCheck = verifyHiveResultDigest(receipt, result);
  return {
    algorithm: "sha256",
    input,
    result: resultCheck,
    valid: input.valid && resultCheck.valid,
  };
}
