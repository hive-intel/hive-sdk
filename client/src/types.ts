import type {
  GetPromptResult,
  ListPromptsResult,
  ListResourcesResult,
  ListResourceTemplatesResult,
  ListToolsResult,
  ReadResourceResult,
} from "@modelcontextprotocol/sdk/types.js";
import type {
  HiveCategoryToolName,
  HiveMetadataResourceUri,
} from "./constants.js";
import type { HiveSubjectContext } from "./subject.js";

export type HiveAuthScheme = "x-api-key" | "bearer" | "none";

export type HiveRuntimeStatus =
  | "ok"
  | "invalid_input"
  | "missing_key"
  | "plan_required"
  | "rate_limited"
  | "degraded"
  | "failing";

export type HiveExecutionReceipt = {
  build_sha: string | null;
  cache_age_ms: number | null;
  cache_status: "miss" | "hit" | "bypass" | "unknown";
  category: string | null;
  digest_algorithm: "sha256";
  duration_ms: number;
  fetched_at: string;
  input_digest: string;
  observed_at: string | null;
  provider: string;
  receipt_id: string;
  receipt_version: "1.0";
  result_digest: string;
  runtime_status: HiveRuntimeStatus;
  server_version: string;
  source: "live" | "cached" | "fallback" | "unavailable";
  origin_source: "live" | "fallback" | null;
  tool: string;
  truncated: boolean;
  warnings: string[];
  /** Additive since 1.7.0: static credit price of the tool (0 or 1). */
  credit_cost?: 0 | 1;
  /** Additive since 1.7.0: credits actually debited for this call. */
  credits_used?: number;
  /** Additive since 1.7.0: balance after the call; null means unlimited. */
  credits_remaining?: number | null;
  /** Additive since 1.7.0: docs anchor for the error code (errors only). */
  doc_url?: string;
  cause?: string;
  next_action?: string;
  fallback_used?: boolean;
  sanitized?: boolean;
};

export type HiveMcpClientOptions = {
  apiKey?: string;
  authScheme?: HiveAuthScheme;
  clientName?: string;
  clientVersion?: string;
  connectTimeoutMs?: number;
  fetch?: typeof fetch;
  headers?: HeadersInit;
  metadataTtlMs?: number;
  requestTimeoutMs?: number;
  subject?: HiveSubjectContext;
  subjectSigningSecret?: string;
  url?: string;
};

export type HiveCallToolArgs = {
  name: string;
  arguments?: Record<string, unknown>;
  subject?: HiveSubjectContext;
};

export type HiveCallToolOptions = {
  subject?: HiveSubjectContext;
};

export type HiveCallTool = {
  (args: HiveCallToolArgs, options?: HiveCallToolOptions): Promise<unknown>;
  (
    name: string,
    args?: Record<string, unknown>,
    options?: HiveCallToolOptions
  ): Promise<unknown>;
};

export type HiveMcpClient = {
  callTool: HiveCallTool;
  close(): Promise<void>;
  getPrompt(args: {
    arguments?: Record<string, string>;
    name: string;
  }): Promise<GetPromptResult>;
  listPrompts(): Promise<ListPromptsResult>;
  listResources(): Promise<ListResourcesResult>;
  listResourceTemplates(): Promise<ListResourceTemplatesResult>;
  listTools(): Promise<ListToolsResult>;
  readResource(args: { uri: string }): Promise<ReadResourceResult>;
  withSubject(subject: HiveSubjectContext): HiveMcpClient;
};

export type HiveMetadataClient = Pick<
  HiveMcpClient,
  "listResources" | "readResource"
>;

export type HiveMetadataSnapshot = {
  availableResourceUris: string[];
  errors: Partial<Record<HiveMetadataResourceUri | "list", string>>;
  fetchedAt: number;
  resources: Partial<Record<HiveMetadataResourceUri, unknown>>;
  status: "available" | "partial" | "unavailable";
};

export type HiveNormalizedToolResult = {
  isError: boolean;
  json?: unknown;
  raw: unknown;
  receipt?: HiveExecutionReceipt;
  structuredContent?: unknown;
  text: string;
};

export type HiveSource = {
  category?: string;
  endpoint?: string;
  provider?: string;
  title: string;
  toolName?: string;
};

export type HiveCategoryRanking = {
  score: number;
  toolName: HiveCategoryToolName;
};

export type HiveLangChainToolOptions = {
  approveStatefulCall?: (call: {
    endpointName: string;
    args: Record<string, unknown>;
  }) => Promise<boolean> | boolean;
  cache?: HiveToolResponseCache;
  client?: HiveMcpClient;
  clientOptions?: HiveMcpClientOptions;
};

export type HiveToolResponseCache = {
  get(key: string): Promise<string | null> | string | null;
  set(key: string, value: string): Promise<void> | void;
};
