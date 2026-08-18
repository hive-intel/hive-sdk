import { AsyncLocalStorage } from "node:async_hooks";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type {
  GetPromptResult,
  ListPromptsResult,
  ListResourcesResult,
  ListResourceTemplatesResult,
  ListToolsResult,
  ReadResourceResult,
} from "@modelcontextprotocol/sdk/types.js";
import { buildHiveAuthHeaders } from "./auth.js";
import {
  HIVE_DEFAULT_MCP_URL,
  HIVE_MCP_CLIENT_VERSION,
} from "./constants.js";
import {
  buildHiveSubjectBodyDigest,
  buildHiveSubjectHeaders,
  type HiveSubjectContext,
} from "./subject.js";
import type {
  HiveCallToolOptions,
  HiveCallToolArgs,
  HiveMcpClient,
  HiveMcpClientOptions,
} from "./types.js";
import { normalizeHiveToolCall } from "./discovery.js";

const DEFAULT_CONNECT_TIMEOUT_MS = 18_000;
const DEFAULT_REQUEST_TIMEOUT_MS = 22_000;

type SubjectRuntime = {
  path: string;
  signingSecret?: string;
  store: AsyncLocalStorage<HiveSubjectContext | undefined>;
};

function normalizeCallToolArgs(
  argsOrName: HiveCallToolArgs | string,
  args?: Record<string, unknown>,
  options?: HiveCallToolOptions
): { args: HiveCallToolArgs; subject?: HiveSubjectContext } {
  if (typeof argsOrName === "string") {
    return {
      args: {
        name: argsOrName,
        arguments: args ?? {},
      },
      subject: options?.subject,
    };
  }
  return {
    args: {
      name: argsOrName.name,
      arguments: argsOrName.arguments ?? {},
    },
    subject: options?.subject ?? argsOrName.subject,
  };
}

function mergeHeaders(
  initHeaders: HeadersInit | undefined,
  subjectHeaders: Record<string, string>
): Headers {
  const headers = new Headers(initHeaders);
  for (const [key, value] of Object.entries(subjectHeaders)) {
    headers.set(key, value);
  }
  return headers;
}

function parseBodyForDigest(body: unknown): unknown {
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }
  if (body instanceof URLSearchParams) return body.toString();
  if (body instanceof ArrayBuffer) {
    return new TextDecoder().decode(body);
  }
  if (ArrayBuffer.isView(body)) {
    return new TextDecoder().decode(body);
  }
  return body;
}

async function buildFetchBodyDigest(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
): Promise<string | undefined> {
  if (init?.body !== undefined && init.body !== null) {
    return buildHiveSubjectBodyDigest(parseBodyForDigest(init.body));
  }
  if (input instanceof Request) {
    const text = await input.clone().text();
    if (text) return buildHiveSubjectBodyDigest(parseBodyForDigest(text));
  }
  return undefined;
}

function createSubjectAwareFetch({
  fetchImpl,
  runtime,
}: {
  fetchImpl?: typeof fetch;
  runtime: SubjectRuntime;
}): typeof fetch {
  const baseFetch = fetchImpl ?? fetch;
  return async (input, init) => {
    const subject = runtime.store.getStore();
    if (!subject) {
      return baseFetch(input, init);
    }
    const method =
      init?.method ??
      (input instanceof Request && input.method ? input.method : "POST");
    const bodyDigest = await buildFetchBodyDigest(input, init);
    const subjectHeaders = buildHiveSubjectHeaders({
      bodyDigest,
      endUserId: subject.endUserId,
      method,
      path: runtime.path,
      signingSecret: subject.signingSecret ?? runtime.signingSecret,
      tenantId: subject.tenantId,
    });
    return baseFetch(input, {
      ...init,
      headers: mergeHeaders(init?.headers, subjectHeaders),
    });
  };
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${operation} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

class HiveMcpClientImpl implements HiveMcpClient {
  constructor(
    private readonly client: Client,
    private readonly options: Required<
      Pick<HiveMcpClientOptions, "requestTimeoutMs">
    >,
    private readonly subjectRuntime: SubjectRuntime,
    private readonly defaultSubject?: HiveSubjectContext
  ) {}

  async listTools(): Promise<ListToolsResult> {
    return withTimeout(
      this.client.listTools(),
      this.options.requestTimeoutMs,
      "Hive MCP listTools"
    );
  }

  async listResources(): Promise<ListResourcesResult> {
    return withTimeout(
      this.client.listResources(),
      this.options.requestTimeoutMs,
      "Hive MCP listResources"
    );
  }

  async listResourceTemplates(): Promise<ListResourceTemplatesResult> {
    return withTimeout(
      this.client.listResourceTemplates(),
      this.options.requestTimeoutMs,
      "Hive MCP listResourceTemplates"
    );
  }

  async listPrompts(): Promise<ListPromptsResult> {
    return withTimeout(
      this.client.listPrompts(),
      this.options.requestTimeoutMs,
      "Hive MCP listPrompts"
    );
  }

  async getPrompt(args: {
    arguments?: Record<string, string>;
    name: string;
  }): Promise<GetPromptResult> {
    return withTimeout(
      this.client.getPrompt(args),
      this.options.requestTimeoutMs,
      `Hive MCP getPrompt(${args.name})`
    );
  }

  async readResource(args: { uri: string }): Promise<ReadResourceResult> {
    return withTimeout(
      this.client.readResource(args),
      this.options.requestTimeoutMs,
      `Hive MCP readResource(${args.uri})`
    );
  }

  async callTool(
    argsOrName: HiveCallToolArgs | string,
    args?: Record<string, unknown>,
    options?: HiveCallToolOptions
  ): Promise<unknown> {
    const normalized = normalizeCallToolArgs(argsOrName, args, options);
    const callSubject = normalized.subject ?? this.defaultSubject;
    const isCompactRoot =
      this.subjectRuntime.path.replace(/\/+$/, "") === "/mcp";
    const routed = isCompactRoot
      ? normalizeHiveToolCall(
          normalized.args.name,
          normalized.args.arguments ?? {},
        )
      : normalized.args;

    const execute = async () => {
      // Tool-call timeouts have an unknown outcome: the server may finish
      // after the client disconnects. Never launch an automatic duplicate.
      // The SDK timeout also propagates cancellation to the transport.
      return this.client.callTool(
        {
          name: routed.name,
          arguments: routed.arguments ?? {},
        },
        undefined,
        {
          timeout: this.options.requestTimeoutMs,
          maxTotalTimeout: this.options.requestTimeoutMs,
        },
      );
    };

    if (callSubject) {
      return this.subjectRuntime.store.run(callSubject, execute);
    }

    return execute();
  }

  withSubject(subject: HiveSubjectContext): HiveMcpClient {
    return new HiveMcpClientImpl(
      this.client,
      this.options,
      this.subjectRuntime,
      subject
    );
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}

export async function createHiveMcpClient(
  options: HiveMcpClientOptions = {}
): Promise<HiveMcpClient> {
  const url = options.url ?? HIVE_DEFAULT_MCP_URL;
  const mcpPath = new URL(url).pathname || "/";
  const subjectRuntime: SubjectRuntime = {
    path: mcpPath,
    signingSecret: options.subjectSigningSecret,
    store: new AsyncLocalStorage<HiveSubjectContext | undefined>(),
  };
  const headers = buildHiveAuthHeaders({
    apiKey: options.apiKey,
    authScheme: options.authScheme,
    headers: options.headers,
  });
  const transport = new StreamableHTTPClientTransport(new URL(url), {
    fetch: createSubjectAwareFetch({
      fetchImpl: options.fetch,
      runtime: subjectRuntime,
    }),
    requestInit: {
      headers,
    },
  });
  const client = new Client({
    name: options.clientName ?? "hive-mcp-client",
    version: options.clientVersion ?? HIVE_MCP_CLIENT_VERSION,
  });
  const connectTimeoutMs = options.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS;
  const signal = AbortSignal.timeout(connectTimeoutMs);
  await client.connect(transport, { signal });

  return new HiveMcpClientImpl(
    client,
    {
      requestTimeoutMs: options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
    },
    subjectRuntime,
    options.subject
  );
}
