import { createHiveMcpClient } from "./client.js";
import { createHash } from "node:crypto";
import { HIVE_DEFAULT_MCP_URL } from "./constants.js";
import { buildHiveAuthHeaders } from "./auth.js";
import type { HiveMcpClient, HiveMcpClientOptions } from "./types.js";
import type { HiveSubjectContext } from "./subject.js";

type JsonObject = Record<string, unknown>;

export const HIVE_B2B_RECOMMENDED_MONITOR_KINDS = [
  "watchlist_digest",
  "risk_watch",
  "token_discovery_risk",
] as const;

export type HiveB2BRecommendedMonitorKind =
  (typeof HIVE_B2B_RECOMMENDED_MONITOR_KINDS)[number];

export type HiveB2BSubject = {
  endUserId: string;
  signingSecret?: string;
  tenantId: string;
};

export type HiveMonitorCadence =
  | "manual"
  | "10m"
  | "1h"
  | "1d"
  | "daily"
  | "weekly"
  | string;

export type HiveAlertStatus = "open" | "acknowledged" | "resolved";
export type HiveAlertSeverity = "low" | "medium" | "high" | "critical";

export type HiveCreateMonitorOptions = {
  cadence?: HiveMonitorCadence;
  /**
   * Stable retry identity. When omitted, the adapter derives one from the
   * canonical monitor definition; supply a distinct value to intentionally
   * create two otherwise identical monitors.
   */
  idempotency_key?: string;
  metadata?: JsonObject;
  name: string;
  next_run_at?: string;
  rules?: JsonObject[];
  status?: "active" | "paused" | "archived";
};

export type HiveWatchlistDigestTarget = JsonObject & {
  markets?: string[];
  protocols?: string[];
  tokens?: string[];
  wallets?: string[];
};

export type HiveRiskWatchTarget = JsonObject & {
  addresses?: string[];
  chains?: string[];
  contracts?: string[];
};

export type HiveTokenDiscoveryRiskTarget = JsonObject & {
  max_age_hours?: number;
  min_liquidity_usd?: number;
  networks?: string[];
  risk_rules?: JsonObject[];
  symbols?: string[];
};

export type HiveListAlertsOptions = {
  limit?: number;
  monitor_id?: string;
  severity?: HiveAlertSeverity;
  status?: HiveAlertStatus;
};

export type HiveMemoryFactInput = {
  confidence?: number;
  expires_at?: string | null;
  key: string;
  namespace?: string;
  source?: string;
  value: unknown;
};

export type HiveListMemoryFactsOptions = {
  include_expired?: boolean;
  key_prefix?: string;
  limit?: number;
  namespace?: string;
};

export type HiveB2BAdapterOptions = Omit<HiveMcpClientOptions, "subject"> & {
  apiKey: string;
  subjectSigningSecret: string;
};

export type HiveB2BReadinessMode =
  | "b2b_enabled"
  | "direct_user"
  | "static_key";

export type HiveB2BReadiness = {
  api_key: {
    b2b_subjects_enabled: boolean;
    key_id?: string;
    name?: string;
    owner_user_id?: string;
    plan_id?: string;
    ratelimit_remaining?: number;
    subject_signing_secret_configured: boolean;
    valid: true;
  };
  auth_backend: "unkey" | "static";
  b2b_adapter_ready: boolean;
  body_digest: {
    algorithm: "SHA-256";
    canonicalization: "recursively_sorted_json_object_keys";
    required_for_stateful_writes: true;
    verified_when_supplied: true;
  };
  endpoints: {
    mcp: string;
    readiness: string;
    rest_execute: string;
  };
  mode: HiveB2BReadinessMode;
  signature_algorithm: "HMAC-SHA256";
  signature_payload: string;
  signed_subject_headers: string[];
  smoke: {
    command: string;
    required_env: string[];
  };
  state: {
    direct_user_subject: "default_self";
    isolation_boundary: "owner_user_id + subject_id";
    signed_subjects_required_for_stateful_writes: boolean;
    stateful_tools_supported: boolean;
  };
  timestamp_skew_seconds: number;
  warnings: string[];
};

export type HiveB2BReadinessOptions = Pick<
  HiveMcpClientOptions,
  "apiKey" | "authScheme" | "fetch" | "headers" | "requestTimeoutMs" | "url"
> & {
  readinessUrl?: string;
};

export type HiveB2BAdapter = {
  acknowledgeAlert(subject: HiveB2BSubject, alertId: string): Promise<unknown>;
  archiveMonitor(subject: HiveB2BSubject, monitorId: string): Promise<unknown>;
  callForSubject(
    subject: HiveB2BSubject,
    toolName: string,
    args?: JsonObject
  ): Promise<unknown>;
  client: HiveMcpClient;
  close(): Promise<void>;
  createMonitor(
    subject: HiveB2BSubject,
    input: HiveCreateMonitorOptions & {
      kind: HiveB2BRecommendedMonitorKind;
      target: JsonObject;
    }
  ): Promise<unknown>;
  createRiskWatchMonitor(
    subject: HiveB2BSubject,
    input: HiveCreateMonitorOptions & { target: HiveRiskWatchTarget }
  ): Promise<unknown>;
  createTokenDiscoveryRiskMonitor(
    subject: HiveB2BSubject,
    input: HiveCreateMonitorOptions & { target: HiveTokenDiscoveryRiskTarget }
  ): Promise<unknown>;
  createWatchlistDigestMonitor(
    subject: HiveB2BSubject,
    input: HiveCreateMonitorOptions & { target: HiveWatchlistDigestTarget }
  ): Promise<unknown>;
  forgetMemoryFact(
    subject: HiveB2BSubject,
    input: { key: string; namespace?: string }
  ): Promise<unknown>;
  forSubject(subject: HiveB2BSubject): HiveMcpClient;
  generateMonitorReport(
    subject: HiveB2BSubject,
    input: { limit?: number; monitor_id: string }
  ): Promise<unknown>;
  listAlerts(
    subject: HiveB2BSubject,
    input?: HiveListAlertsOptions
  ): Promise<unknown>;
  listMemoryFacts(
    subject: HiveB2BSubject,
    input?: HiveListMemoryFactsOptions
  ): Promise<unknown>;
  listMonitors(
    subject: HiveB2BSubject,
    input?: { kind?: string; limit?: number; status?: string }
  ): Promise<unknown>;
  listSubjectAuditEvents(
    subject: HiveB2BSubject,
    input?: { limit?: number; subject_id?: string; tool_name?: string }
  ): Promise<unknown>;
  rememberFact(
    subject: HiveB2BSubject,
    input: HiveMemoryFactInput
  ): Promise<unknown>;
  resolveAlert(subject: HiveB2BSubject, alertId: string): Promise<unknown>;
  updateAlertStatus(
    subject: HiveB2BSubject,
    input: { alert_id: string; status: HiveAlertStatus }
  ): Promise<unknown>;
};

function deriveReadinessUrl(url: string | undefined): string {
  const parsed = new URL(url ?? HIVE_DEFAULT_MCP_URL);
  parsed.search = "";
  parsed.hash = "";

  if (parsed.pathname.endsWith("/mcp")) {
    parsed.pathname = `${parsed.pathname.slice(0, -"/mcp".length)}/api/v1/b2b/readiness`;
  } else {
    parsed.pathname = "/api/v1/b2b/readiness";
  }

  return parsed.toString();
}

function mergeInitHeaders(
  headers: HeadersInit | undefined,
  extra: Record<string, string>
): Headers {
  const merged = new Headers(headers);
  for (const [key, value] of Object.entries(extra)) {
    merged.set(key, value);
  }
  return merged;
}

async function fetchWithTimeout(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetchImpl(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseReadinessResponse(value: unknown): HiveB2BReadiness {
  if (!isRecord(value) || value.ok !== true || !isRecord(value.data)) {
    throw new Error("Hive B2B readiness returned an unexpected response.");
  }
  return value.data as HiveB2BReadiness;
}

export async function checkHiveB2BReadiness(
  options: HiveB2BReadinessOptions
): Promise<HiveB2BReadiness> {
  const apiKey = required(options.apiKey, "apiKey");
  const fetchImpl = options.fetch ?? fetch;
  const readinessUrl = options.readinessUrl ?? deriveReadinessUrl(options.url);
  const response = await fetchWithTimeout(
    fetchImpl,
    readinessUrl,
    {
      headers: mergeInitHeaders(
        options.headers,
        buildHiveAuthHeaders({
          apiKey,
          authScheme: options.authScheme,
        })
      ),
      method: "GET",
    },
    Math.max(1, options.requestTimeoutMs ?? 22_000)
  );

  const text = await response.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      `Hive B2B readiness failed with HTTP ${response.status}: ${text.slice(0, 200)}`
    );
  }

  if (!response.ok) {
    const message =
      isRecord(json) &&
      isRecord(json.error) &&
      typeof json.error.message === "string"
        ? json.error.message
        : `HTTP ${response.status}`;
    throw new Error(`Hive B2B readiness failed: ${message}`);
  }

  return parseReadinessResponse(json);
}

function required(value: string | undefined, field: string): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(`Hive B2B ${field} is required.`);
  }
  return trimmed;
}

function normalizeSubject(subject: HiveB2BSubject): HiveSubjectContext {
  return {
    endUserId: required(subject.endUserId, "endUserId"),
    ...(subject.signingSecret
      ? { signingSecret: required(subject.signingSecret, "signingSecret") }
      : {}),
    tenantId: required(subject.tenantId, "tenantId"),
  };
}

function withoutUndefined(input: JsonObject): JsonObject {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined)
  );
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, canonicalize(child)]),
  );
}

function monitorArgs(
  kind: HiveB2BRecommendedMonitorKind,
  input: HiveCreateMonitorOptions & { target: JsonObject }
): JsonObject {
  const args = withoutUndefined({
    cadence: input.cadence,
    kind,
    metadata: input.metadata,
    name: input.name,
    next_run_at: input.next_run_at,
    rules: input.rules,
    status: input.status,
    target: input.target,
  });
  const derivedIdempotencyKey = `b2b-monitor-${createHash("sha256")
    .update(JSON.stringify(canonicalize(args)))
    .digest("hex")
    .slice(0, 48)}`;
  return {
    ...args,
    idempotency_key: input.idempotency_key?.trim() || derivedIdempotencyKey,
  };
}

export function createHiveB2BAdapterFromClient(
  client: HiveMcpClient
): HiveB2BAdapter {
  const callForSubject: HiveB2BAdapter["callForSubject"] = async (
    subject,
    toolName,
    args = {}
  ) =>
    client.callTool(toolName, args, {
      subject: normalizeSubject(subject),
    });

  return {
    acknowledgeAlert: (subject, alertId) =>
      callForSubject(subject, "hive_update_alert_status", {
        alert_id: alertId,
        status: "acknowledged",
      }),
    archiveMonitor: (subject, monitorId) =>
      callForSubject(subject, "hive_archive_monitor", {
        monitor_id: monitorId,
      }),
    callForSubject,
    client,
    close: () => client.close(),
    createMonitor: (subject, input) =>
      callForSubject(
        subject,
        "hive_create_monitor",
        monitorArgs(input.kind, input)
      ),
    createRiskWatchMonitor: (subject, input) =>
      callForSubject(
        subject,
        "hive_create_monitor",
        monitorArgs("risk_watch", input)
      ),
    createTokenDiscoveryRiskMonitor: (subject, input) =>
      callForSubject(
        subject,
        "hive_create_monitor",
        monitorArgs("token_discovery_risk", input)
      ),
    createWatchlistDigestMonitor: (subject, input) =>
      callForSubject(
        subject,
        "hive_create_monitor",
        monitorArgs("watchlist_digest", input)
      ),
    forgetMemoryFact: (subject, input) =>
      callForSubject(subject, "hive_forget_memory_fact", {
        key: input.key,
        namespace: input.namespace ?? "default",
      }),
    forSubject: (subject) => client.withSubject(normalizeSubject(subject)),
    generateMonitorReport: (subject, input) =>
      callForSubject(
        subject,
        "hive_generate_monitor_report",
        withoutUndefined({
          limit: input.limit,
          monitor_id: input.monitor_id,
        })
      ),
    listAlerts: (subject, input = {}) =>
      callForSubject(subject, "hive_list_alerts", withoutUndefined(input)),
    listMemoryFacts: (subject, input = {}) =>
      callForSubject(subject, "hive_list_memory_facts", withoutUndefined(input)),
    listMonitors: (subject, input = {}) =>
      callForSubject(subject, "hive_list_monitors", withoutUndefined(input)),
    listSubjectAuditEvents: (subject, input = {}) =>
      callForSubject(
        subject,
        "hive_list_subject_audit_events",
        withoutUndefined(input)
      ),
    rememberFact: (subject, input) =>
      callForSubject(
        subject,
        "hive_remember_fact",
        withoutUndefined({
          confidence: input.confidence,
          expires_at: input.expires_at,
          key: input.key,
          namespace: input.namespace ?? "default",
          source: input.source,
          value: input.value,
        })
      ),
    resolveAlert: (subject, alertId) =>
      callForSubject(subject, "hive_update_alert_status", {
        alert_id: alertId,
        status: "resolved",
      }),
    updateAlertStatus: (subject, input) =>
      callForSubject(subject, "hive_update_alert_status", input),
  };
}

export async function createHiveB2BAdapter(
  options: HiveB2BAdapterOptions
): Promise<HiveB2BAdapter> {
  const client = await createHiveMcpClient({
    ...options,
    subjectSigningSecret: required(
      options.subjectSigningSecret,
      "subjectSigningSecret"
    ),
  });
  return createHiveB2BAdapterFromClient(client);
}
