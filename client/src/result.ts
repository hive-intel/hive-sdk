import type {
  HiveExecutionReceipt,
  HiveNormalizedToolResult,
} from "./types.js";

type TextContent = {
  text?: string;
  type?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function extractTextFromContent(content: unknown): string {
  if (!Array.isArray(content)) {
    return "";
  }
  return content
    .map((item) => {
      if (!isRecord(item)) {
        return "";
      }
      const block = item as TextContent;
      return block.type === "text" && typeof block.text === "string"
        ? block.text
        : "";
    })
    .filter(Boolean)
    .join("\n");
}

function parseJson(text: string): unknown | undefined {
  if (!text.trim()) {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export function extractHiveExecutionReceipt(
  value: unknown
): HiveExecutionReceipt | undefined {
  if (!isRecord(value) || !isRecord(value._hive)) {
    return undefined;
  }
  const receipt = value._hive;
  const runtimeStatuses = new Set([
    "ok",
    "invalid_input",
    "missing_key",
    "plan_required",
    "rate_limited",
    "degraded",
    "failing",
  ]);
  const cacheStatuses = new Set(["miss", "hit", "bypass", "unknown"]);
  const sources = new Set(["live", "cached", "fallback", "unavailable"]);
  const originSources = new Set(["live", "fallback"]);
  const sha256 = /^[a-f0-9]{64}$/;
  if (
    typeof receipt.receipt_id !== "string" ||
    receipt.receipt_version !== "1.0" ||
    typeof receipt.server_version !== "string" ||
    !(
      receipt.build_sha === null ||
      typeof receipt.build_sha === "string"
    ) ||
    receipt.digest_algorithm !== "sha256" ||
    typeof receipt.input_digest !== "string" ||
    !sha256.test(receipt.input_digest) ||
    typeof receipt.result_digest !== "string" ||
    !sha256.test(receipt.result_digest) ||
    typeof receipt.provider !== "string" ||
    typeof receipt.tool !== "string" ||
    !(
      receipt.category === null ||
      typeof receipt.category === "string"
    ) ||
    typeof receipt.runtime_status !== "string" ||
    !runtimeStatuses.has(receipt.runtime_status) ||
    typeof receipt.fetched_at !== "string" ||
    !(
      receipt.observed_at === null ||
      typeof receipt.observed_at === "string"
    ) ||
    !(
      receipt.cache_age_ms === null ||
      typeof receipt.cache_age_ms === "number"
    ) ||
    typeof receipt.duration_ms !== "number" ||
    typeof receipt.cache_status !== "string" ||
    !cacheStatuses.has(receipt.cache_status) ||
    typeof receipt.source !== "string" ||
    !sources.has(receipt.source) ||
    !(
      receipt.origin_source === undefined ||
      receipt.origin_source === null ||
      (typeof receipt.origin_source === "string" &&
        originSources.has(receipt.origin_source))
    ) ||
    typeof receipt.truncated !== "boolean" ||
    !Array.isArray(receipt.warnings) ||
    !receipt.warnings.every((warning) => typeof warning === "string")
  ) {
    return undefined;
  }
  return {
    ...receipt,
    origin_source:
      receipt.origin_source ??
      (receipt.source === "live" || receipt.source === "fallback"
        ? receipt.source
        : null),
  } as unknown as HiveExecutionReceipt;
}

export function normalizeHiveToolResult(
  result: unknown
): HiveNormalizedToolResult {
  if (!isRecord(result)) {
    const text = typeof result === "string" ? result : JSON.stringify(result);
    return {
      isError: false,
      json: parseJson(text),
      raw: result,
      text,
    };
  }

  const text = extractTextFromContent(result.content);
  const structuredContent = result.structuredContent;
  const json = structuredContent ?? parseJson(text);
  const receipt = extractHiveExecutionReceipt(json);
  const isError =
    result.isError === true ||
    (typeof text === "string" &&
      /^\s*(error:|\{"error"|{"message":"error)/i.test(text));

  return {
    isError,
    ...(json !== undefined ? { json } : {}),
    raw: result,
    ...(receipt ? { receipt } : {}),
    ...(structuredContent !== undefined ? { structuredContent } : {}),
    text,
  };
}

export function stringifyHiveToolResult(result: unknown): string {
  const normalized = normalizeHiveToolResult(result);
  if (normalized.isError) {
    const text = normalized.text || JSON.stringify(normalized.json ?? normalized.raw);
    return text.startsWith("Error:") ? text : `Error: ${text}`;
  }
  if (normalized.text) {
    return normalized.text;
  }
  return JSON.stringify(normalized.json ?? normalized.raw);
}
