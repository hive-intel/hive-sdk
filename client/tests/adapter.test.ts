import { describe, expect, test, vi } from "vitest";
import {
  buildAiSdkHiveMcpTransportConfig,
  prepareHiveAiSdkTools,
  selectHiveMcpToolDefinitions,
} from "../src/ai-sdk.js";
import { runHiveMcpCli } from "../src/cli.js";
import {
  buildHiveAuthHeaders,
  buildHiveSubjectHeaders,
  buildHiveSubjectSignaturePayload,
  checkHiveB2BReadiness,
  createHiveB2BAdapterFromClient,
  extractHiveSources,
  getHiveEndpointSchema,
  HIVE_CATEGORY_TOOL_NAMES,
  HIVE_CORE_TOOL_NAMES,
  HIVE_DEFAULT_MCP_URL,
  inspectHiveRootContract,
  invokeHiveEndpoint,
  normalizeHiveEndpointArgs,
  normalizeHiveToolResult,
  normalizeHiveToolCall,
  rankHiveCategoriesForQuery,
  readHiveMetadataSnapshot,
  resolveHiveEndpointName,
  resetHiveMetadataCache,
  searchHiveTools,
  signHiveSubjectHeaders,
  stableHiveCacheKey,
  stringifyHiveToolResult,
  type HiveMcpClient,
} from "../src/index.js";

function createMockClient(): HiveMcpClient {
  const client: HiveMcpClient = {
    callTool: vi.fn(async ({ name }) => ({
      content: [{ type: "text", text: JSON.stringify({ name, ok: true }) }],
    })),
    close: vi.fn(async () => undefined),
    getPrompt: vi.fn(async ({ name }) => ({
      messages: [
        {
          content: { text: `Prompt:${name}`, type: "text" as const },
          role: "user" as const,
        },
      ],
    })),
    listPrompts: vi.fn(async () => ({
      prompts: [{ name: "research", description: "Research prompt" }],
    })),
    listResources: vi.fn(async () => ({
      resources: [
        { name: "toolsets", uri: "hive://toolsets" },
        { name: "providers", uri: "hive://providers" },
        { name: "categories", uri: "hive://categories" },
        { name: "status", uri: "hive://status" },
      ],
    })),
    listTools: vi.fn(async () => ({
      tools: [...HIVE_CORE_TOOL_NAMES, ...HIVE_CATEGORY_TOOL_NAMES].map(
        (name) => ({
          inputSchema: { type: "object" as const },
          name,
        }),
      ),
    })),
    readResource: vi.fn(async ({ uri }) => {
      const payloads: Record<string, unknown> = {
        "hive://categories": [
          {
            category: "Prediction Markets",
            toolName: "get_prediction_markets_endpoints",
          },
        ],
        "hive://providers": {
          providers: [{ name: "CoinGecko" }, { name: "Codex" }],
        },
        "hive://status": { runtimeStatuses: ["ok"] },
        "hive://toolsets": {
          counts: { totalToolsets: 11 },
          toolsets: [
            {
              id: "prediction_markets",
              label: "Prediction Markets",
              purpose: "Research Polymarket and Kalshi odds.",
              tags: ["prediction", "polymarket"],
            },
          ],
        },
      };
      return {
        contents: [
          {
            mimeType: "application/json",
            text: JSON.stringify(payloads[uri]),
            uri,
          },
        ],
      };
    }),
    withSubject: vi.fn(() => client),
  };
  return client;
}

function createCliIo() {
  let stdout = "";
  let stderr = "";
  return {
    io: {
      stderr: {
        write: (chunk: string) => {
          stderr += chunk;
          return true;
        },
      },
      stdout: {
        write: (chunk: string) => {
          stdout += chunk;
          return true;
        },
      },
    },
    stderr: () => stderr,
    stdout: () => stdout,
  };
}

function readyB2BResponse() {
  return new Response(
    JSON.stringify({
      ok: true,
      data: {
        api_key: {
          b2b_subjects_enabled: true,
          subject_signing_secret_configured: true,
          valid: true,
        },
        auth_backend: "unkey",
        b2b_adapter_ready: true,
        endpoints: {
          mcp: "/mcp",
          readiness: "/api/v1/b2b/readiness",
          rest_execute: "/api/v1/execute",
        },
        mode: "b2b_enabled",
        signature_algorithm: "HMAC-SHA256",
        signature_payload:
          'METHOD + "\\n" + PATH + "\\n" + TENANT_ID + "\\n" + END_USER_ID + "\\n" + TIMESTAMP',
        signed_subject_headers: [
          "X-Hive-Tenant-Id",
          "X-Hive-End-User-Id",
          "X-Hive-Subject-Timestamp",
          "X-Hive-Subject-Signature",
        ],
        smoke: {
          command: "npm run smoke:b2b-partner",
          required_env: ["HIVE_API_KEY", "HIVE_SUBJECT_SIGNING_SECRET"],
        },
        state: {
          direct_user_subject: "default_self",
          isolation_boundary: "owner_user_id + subject_id",
          signed_subjects_required_for_stateful_writes: true,
          stateful_tools_supported: true,
        },
        timestamp_skew_seconds: 300,
        warnings: [],
      },
    }),
  );
}

describe("hive-mcp-client", () => {
  test("exports current defaults and auth headers", () => {
    expect(HIVE_DEFAULT_MCP_URL).toBe("https://mcp.hiveintelligence.xyz/mcp");
    expect(buildHiveAuthHeaders({ apiKey: "key" })).toEqual({
      "x-api-key": "key",
    });
    expect(
      buildHiveAuthHeaders({ apiKey: "key", authScheme: "bearer" }),
    ).toEqual({ Authorization: "Bearer key" });
    expect(buildHiveAuthHeaders({ apiKey: "key", authScheme: "none" })).toEqual(
      {},
    );
  });

  test("builds signed B2B subject headers for partner adapters", () => {
    const payload = buildHiveSubjectSignaturePayload({
      endUserId: "user-456",
      method: "post",
      path: "/mcp",
      tenantId: "tenant-123",
      timestamp: "1760000000",
    });
    expect(payload).toBe("POST\n/mcp\ntenant-123\nuser-456\n1760000000");

    const signature = signHiveSubjectHeaders({
      endUserId: "user-456",
      method: "POST",
      path: "/mcp",
      secret: "subject-secret",
      tenantId: "tenant-123",
      timestamp: "1760000000",
    });

    expect(
      buildHiveSubjectHeaders({
        endUserId: "user-456",
        method: "POST",
        path: "/mcp",
        signingSecret: "subject-secret",
        tenantId: "tenant-123",
        timestamp: "1760000000",
      }),
    ).toEqual({
      "X-Hive-End-User-Id": "user-456",
      "X-Hive-Subject-Signature": signature,
      "X-Hive-Subject-Timestamp": "1760000000",
      "X-Hive-Tenant-Id": "tenant-123",
    });
  });

  test("adds signed B2B subject headers to AI SDK transport config", () => {
    const config = buildAiSdkHiveMcpTransportConfig({
      apiKey: "key",
      subject: { endUserId: "user-456", tenantId: "tenant-123" },
      subjectSigningSecret: "subject-secret",
      url: "https://mcp.hiveintelligence.xyz/mcp",
    });
    const headers = config.transport.headers as Record<string, string>;
    const timestamp = headers["X-Hive-Subject-Timestamp"];
    if (!timestamp) {
      throw new Error("Expected subject timestamp header");
    }

    expect(headers["x-api-key"]).toBe("key");
    expect(headers["X-Hive-Tenant-Id"]).toBe("tenant-123");
    expect(headers["X-Hive-End-User-Id"]).toBe("user-456");
    expect(headers["X-Hive-Subject-Signature"]).toBe(
      signHiveSubjectHeaders({
        endUserId: "user-456",
        method: "POST",
        path: "/mcp",
        secret: "subject-secret",
        tenantId: "tenant-123",
        timestamp,
      }),
    );
  });

  test("provides subject-scoped B2B product action helpers", async () => {
    const callTool = vi.fn(async () => ({
      content: [{ type: "text", text: JSON.stringify({ ok: true }) }],
    })) as unknown as HiveMcpClient["callTool"];
    const client: HiveMcpClient = {
      callTool,
      close: vi.fn(async () => undefined),
      getPrompt: vi.fn(async () => ({ messages: [] })),
      listPrompts: vi.fn(async () => ({ prompts: [] })),
      listResources: vi.fn(async () => ({ resources: [] })),
      listTools: vi.fn(async () => ({ tools: [] })),
      readResource: vi.fn(async () => ({ contents: [] })),
      withSubject: vi.fn(() => client),
    };
    const adapter = createHiveB2BAdapterFromClient(client);
    const subject = { endUserId: "user-456", tenantId: "tenant-123" };

    await adapter.createWatchlistDigestMonitor(subject, {
      cadence: "daily",
      metadata: { destination: "in_app" },
      name: "Daily watchlist brief",
      target: {
        tokens: ["bitcoin"],
        wallets: ["0xabc"],
      },
    });
    await adapter.createRiskWatchMonitor(subject, {
      name: "Wallet risk",
      target: { addresses: ["0xabc"], chains: ["ethereum"] },
    });
    await adapter.createTokenDiscoveryRiskMonitor(subject, {
      name: "New Base tokens",
      target: { min_liquidity_usd: 100_000, networks: ["base"] },
    });
    await adapter.listAlerts(subject, { limit: 20, status: "open" });
    await adapter.rememberFact(subject, {
      key: "risk_profile",
      namespace: "watchlist_digest",
      value: { style: "conservative" },
    });
    await adapter.generateMonitorReport(subject, {
      limit: 10,
      monitor_id: "monitor-123",
    });
    await adapter.acknowledgeAlert(subject, "alert-123");
    await adapter.archiveMonitor(subject, "monitor-123");
    await adapter.listSubjectAuditEvents(subject, {
      limit: 5,
      tool_name: "hive_create_monitor",
    });

    expect(callTool).toHaveBeenNthCalledWith(
      1,
      "hive_create_monitor",
      {
        cadence: "daily",
        kind: "watchlist_digest",
        metadata: { destination: "in_app" },
        name: "Daily watchlist brief",
        target: {
          tokens: ["bitcoin"],
          wallets: ["0xabc"],
        },
      },
      { subject },
    );
    expect(callTool).toHaveBeenNthCalledWith(
      2,
      "hive_create_monitor",
      {
        kind: "risk_watch",
        name: "Wallet risk",
        target: { addresses: ["0xabc"], chains: ["ethereum"] },
      },
      { subject },
    );
    expect(callTool).toHaveBeenNthCalledWith(
      3,
      "hive_create_monitor",
      {
        kind: "token_discovery_risk",
        name: "New Base tokens",
        target: { min_liquidity_usd: 100_000, networks: ["base"] },
      },
      { subject },
    );
    expect(callTool).toHaveBeenNthCalledWith(
      4,
      "hive_list_alerts",
      { limit: 20, status: "open" },
      { subject },
    );
    expect(callTool).toHaveBeenNthCalledWith(
      5,
      "hive_remember_fact",
      {
        key: "risk_profile",
        namespace: "watchlist_digest",
        value: { style: "conservative" },
      },
      { subject },
    );
    expect(callTool).toHaveBeenNthCalledWith(
      6,
      "hive_generate_monitor_report",
      { limit: 10, monitor_id: "monitor-123" },
      { subject },
    );
    expect(callTool).toHaveBeenNthCalledWith(
      7,
      "hive_update_alert_status",
      { alert_id: "alert-123", status: "acknowledged" },
      { subject },
    );
    expect(callTool).toHaveBeenNthCalledWith(
      8,
      "hive_archive_monitor",
      { monitor_id: "monitor-123" },
      { subject },
    );
    expect(callTool).toHaveBeenNthCalledWith(
      9,
      "hive_list_subject_audit_events",
      { limit: 5, tool_name: "hive_create_monitor" },
      { subject },
    );
  });

  test("checks B2B readiness through the REST preflight endpoint", async () => {
    const fetchMock = vi.fn(async (input, init) => {
      expect(String(input)).toBe(
        "https://mcp.hiveintelligence.xyz/api/v1/b2b/readiness",
      );
      const headers = new Headers(init?.headers);
      expect(init?.method).toBe("GET");
      expect(headers.get("x-api-key")).toBe("hive_live_test");
      return readyB2BResponse();
    }) as unknown as typeof fetch;

    const readiness = await checkHiveB2BReadiness({
      apiKey: "hive_live_test",
      fetch: fetchMock,
    });

    expect(readiness.b2b_adapter_ready).toBe(true);
    expect(readiness.mode).toBe("b2b_enabled");
  });

  test("runs the B2B doctor CLI with readiness and local signature checks", async () => {
    const fetchMock = vi.fn(async () =>
      readyB2BResponse(),
    ) as unknown as typeof fetch;
    const cli = createCliIo();

    const code = await runHiveMcpCli({
      argv: [
        "doctor",
        "--api-key",
        "hive_live_test",
        "--subject-signing-secret",
        "subject-secret",
        "--tenant-id",
        "tenant-123",
        "--end-user-id",
        "user-456",
      ],
      env: {},
      fetch: fetchMock,
      io: cli.io,
    });

    expect(code).toBe(0);
    expect(cli.stdout()).toContain("OK Hive B2B adapter is ready.");
    expect(cli.stdout()).toContain("PASS subject_signature");
    expect(cli.stdout()).not.toContain("hive_live_test");
    expect(cli.stdout()).not.toContain("subject-secret");
  });

  test("fails the B2B doctor CLI when local subject secret is missing", async () => {
    const fetchMock = vi.fn(async () =>
      readyB2BResponse(),
    ) as unknown as typeof fetch;
    const cli = createCliIo();

    const code = await runHiveMcpCli({
      argv: ["doctor", "--api-key", "hive_live_test"],
      env: {},
      fetch: fetchMock,
      io: cli.io,
    });

    expect(code).toBe(1);
    expect(cli.stdout()).toContain("FAIL local_signing_secret");
    expect(cli.stdout()).toContain("Hive B2B adapter is not ready.");
  });

  test("rejects invalid doctor request timeout values", async () => {
    const cli = createCliIo();

    const code = await runHiveMcpCli({
      argv: ["doctor"],
      env: { HIVE_REQUEST_TIMEOUT_MS: "Infinity" },
      io: cli.io,
    });

    expect(code).toBe(2);
    expect(cli.stderr()).toContain(
      "HIVE_REQUEST_TIMEOUT_MS must be a positive finite number of milliseconds.",
    );
  });

  test("prints B2B doctor errors as JSON when requested", async () => {
    const cli = createCliIo();

    const code = await runHiveMcpCli({
      argv: ["doctor", "--json"],
      env: {},
      io: cli.io,
    });

    expect(code).toBe(2);
    expect(JSON.parse(cli.stdout())).toMatchObject({
      checks: [{ name: "api_key", status: "fail" }],
      ok: false,
    });
  });

  test("surfaces structured B2B readiness failures", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            ok: false,
            error: {
              code: "INVALID_API_KEY",
              message: "Invalid API key.",
            },
          }),
          { status: 403 },
        ),
    ) as unknown as typeof fetch;

    await expect(
      checkHiveB2BReadiness({
        apiKey: "bad-key",
        fetch: fetchMock,
      }),
    ).rejects.toThrow("Invalid API key.");
  });

  test("inspects the current root contract and rejects removed categories", () => {
    const ok = inspectHiveRootContract([
      ...HIVE_CORE_TOOL_NAMES,
      ...HIVE_CATEGORY_TOOL_NAMES,
    ]);
    expect(ok.ok).toBe(true);

    const stale = inspectHiveRootContract([
      ...HIVE_CORE_TOOL_NAMES,
      ...HIVE_CATEGORY_TOOL_NAMES,
      "get_social_sentiment_endpoints",
    ]);
    expect(stale.ok).toBe(false);
    expect(stale.removedCategoryToolsPresent).toContain(
      "get_social_sentiment_endpoints",
    );
  });

  test("uses stable deep cache keys", () => {
    const first = stableHiveCacheKey("invoke_api_endpoint", {
      args: { ids: "bitcoin", vs_currencies: "usd" },
      endpoint_name: "get_price",
    });
    const second = stableHiveCacheKey("invoke_api_endpoint", {
      endpoint_name: "get_price",
      args: { vs_currencies: "usd", ids: "bitcoin" },
    });
    const third = stableHiveCacheKey("invoke_api_endpoint", {
      endpoint_name: "get_price",
      args: { vs_currencies: "usd", ids: "ethereum" },
    });
    expect(first).toBe(second);
    expect(first).not.toBe(third);
  });

  test("reads metadata resources and reuses TTL cache", async () => {
    const client = createMockClient();
    resetHiveMetadataCache(client);
    const first = await readHiveMetadataSnapshot(client, { now: 1 });
    const second = await readHiveMetadataSnapshot(client, { now: 2 });

    expect(first.status).toBe("available");
    expect(second).toBe(first);
    expect(client.readResource).toHaveBeenCalledTimes(4);
  });

  test("handles malformed metadata resources gracefully", async () => {
    const client = createMockClient();
    client.readResource = vi.fn(async ({ uri }) => ({
      contents: [{ mimeType: "application/json", text: "{bad", uri }],
    }));
    resetHiveMetadataCache(client);
    const snapshot = await readHiveMetadataSnapshot(client, {
      forceRefresh: true,
    });
    expect(snapshot.status).toBe("unavailable");
    expect(snapshot.errors["hive://toolsets"]).toContain("Malformed");
  });

  test("normalizes text, JSON, structured content, and errors", () => {
    const structured = normalizeHiveToolResult({
      content: [{ type: "text", text: '{"fallback":true}' }],
      structuredContent: { price: 100 },
    });
    expect(structured.structuredContent).toEqual({ price: 100 });
    expect(structured.json).toEqual({ price: 100 });

    const error = normalizeHiveToolResult({
      content: [{ type: "text", text: "Error: nope" }],
      isError: true,
    });
    expect(error.isError).toBe(true);
    expect(
      stringifyHiveToolResult({
        content: [{ type: "text", text: "validation failed" }],
        isError: true,
      }),
    ).toBe("Error: validation failed");
  });

  test("ranks categories from runtime metadata and fallback keywords", async () => {
    const snapshot = await readHiveMetadataSnapshot(createMockClient(), {
      forceRefresh: true,
    });
    expect(
      rankHiveCategoriesForQuery("polymarket odds", snapshot)[0].toolName,
    ).toBe("get_prediction_markets_endpoints");
    expect(rankHiveCategoriesForQuery("wallet pnl", snapshot)[0].toolName).toBe(
      "get_portfolio_wallet_endpoints",
    );
    expect(
      rankHiveCategoriesForQuery("is WOJAK safe to buy", snapshot)[0].toolName,
    ).toBe("get_security_risk_endpoints");
    expect(
      rankHiveCategoriesForQuery("does this dapp look phishing", snapshot)[0]
        .toolName,
    ).toBe("get_security_risk_endpoints");
    expect(
      rankHiveCategoriesForQuery("show profitable wallets on base", snapshot)[0]
        .toolName,
    ).toBe("get_portfolio_wallet_endpoints");
    expect(
      rankHiveCategoriesForQuery(
        "what is the floor price for this NFT",
        snapshot,
      )[0].toolName,
    ).toBe("get_nft_analytics_endpoints");
  });

  test("wraps search, schema lookup, invoke, and source extraction", async () => {
    const client = createMockClient();
    const search = await searchHiveTools(client, { query: "bitcoin price" });
    const schema = await getHiveEndpointSchema(client, "get_price");
    const invoke = await invokeHiveEndpoint(client, "get_price", {
      ids: "bitcoin",
    });
    expect(search.json).toEqual({ name: "search_tools", ok: true });
    expect(schema.json).toEqual({ name: "get_api_endpoint_schema", ok: true });
    expect(invoke.json).toEqual({ name: "invoke_api_endpoint", ok: true });

    const snapshot = await readHiveMetadataSnapshot(client, {
      resourceUris: ["hive://providers", "hive://categories", "hive://status"],
      forceRefresh: true,
    });
    const sources = extractHiveSources({
      args: { endpoint_name: "coingecko_get_key_usage" },
      snapshot,
      toolName: "invoke_api_endpoint",
    });
    expect(sources[0].provider).toBe("CoinGecko");
  });

  test("normalizes legacy endpoint aliases and root tool calls", () => {
    expect(resolveHiveEndpointName("get_simple_price")).toBe("get_price");
    expect(
      normalizeHiveToolCall("get_api_endpoint_schema", {
        endpoint: "get_range_coins_ohlc",
      }),
    ).toEqual({
      arguments: { endpoint: "get_coin_ohlc_range" },
      name: "get_api_endpoint_schema",
    });
    expect(
      normalizeHiveToolCall("get_simple_price", { ids: "bitcoin" }),
    ).toEqual({
      arguments: {
        args: { ids: "bitcoin" },
        endpoint_name: "get_price",
      },
      name: "invoke_api_endpoint",
    });
    expect(normalizeHiveToolCall("search_tools", { query: "btc" })).toEqual({
      arguments: { query: "btc" },
      name: "search_tools",
    });
  });

  test("normalizes removed GoldRush endpoint names and arguments", () => {
    expect(resolveHiveEndpointName("goldrush_get_gas_prices")).toBe(
      "alchemy_get_gas_price",
    );
    expect(
      normalizeHiveEndpointArgs("goldrush_get_nft_balances", {
        chainName: "matic-mainnet",
        walletAddress: "0x123",
        "no-nft-asset-metadata": true,
      }),
    ).toEqual({
      address: "0x123",
      network: "polygon-mainnet",
      withMetadata: false,
    });
    expect(
      normalizeHiveToolCall("goldrush_get_gas_prices", {
        chainName: "optimism-mainnet",
      }),
    ).toEqual({
      arguments: {
        args: { network: "opt-mainnet" },
        endpoint_name: "alchemy_get_gas_price",
      },
      name: "invoke_api_endpoint",
    });
    expect(
      normalizeHiveToolCall("invoke_api_endpoint", {
        endpoint_name: "goldrush_get_transactions_latest",
        args: {
          chainName: "arbitrum-mainnet",
          walletAddress: "0xabc",
        },
      }),
    ).toEqual({
      arguments: {
        args: {
          category: ["external", "erc20", "erc721", "erc1155"],
          fromAddress: "0xabc",
          maxCount: "0xa",
          network: "arb-mainnet",
        },
        endpoint_name: "alchemy_get_asset_transfers",
      },
      name: "invoke_api_endpoint",
    });
  });

  test("selects AI SDK tool definitions by mode and filters removed categories", () => {
    const definitions = {
      tools: [
        ...HIVE_CORE_TOOL_NAMES,
        ...HIVE_CATEGORY_TOOL_NAMES,
        "get_social_sentiment_endpoints",
      ].map((name) => ({ name })),
    };

    expect(
      selectHiveMcpToolDefinitions({
        definitions,
        selectionMode: "core",
      }).tools.map((tool) => tool.name),
    ).toEqual([...HIVE_CORE_TOOL_NAMES]);

    const allNames = selectHiveMcpToolDefinitions({
      definitions,
      selectionMode: "all",
    }).tools.map((tool) => tool.name);
    expect(allNames).toContain("get_prediction_markets_endpoints");
    expect(allNames).not.toContain("get_social_sentiment_endpoints");

    const rankedNames = selectHiveMcpToolDefinitions({
      definitions,
      maxCategoryTools: 1,
      query: "polymarket odds",
      selectionMode: "ranked",
    }).tools.map((tool) => tool.name);
    expect(rankedNames).toEqual([
      ...HIVE_CORE_TOOL_NAMES,
      "get_prediction_markets_endpoints",
    ]);
  });

  test("prepares AI SDK tools from runtime definitions", async () => {
    const definitions = {
      tools: [
        ...HIVE_CORE_TOOL_NAMES,
        ...HIVE_CATEGORY_TOOL_NAMES,
        "get_social_sentiment_endpoints",
      ].map((name) => ({ name })),
    };
    const client = {
      listTools: vi.fn(async () => definitions),
      toolsFromDefinitions: vi.fn((selected: typeof definitions) =>
        Object.fromEntries(selected.tools.map((tool) => [tool.name, tool])),
      ),
    };

    const prepared = await prepareHiveAiSdkTools({
      client,
      maxCategoryTools: 1,
      query: "wallet pnl",
      selectionMode: "ranked",
    });

    expect(client.listTools).toHaveBeenCalledTimes(1);
    expect(client.toolsFromDefinitions).toHaveBeenCalledWith(
      prepared.definitions,
    );
    expect(prepared.definitions.tools.map((tool) => tool.name)).toEqual([
      ...HIVE_CORE_TOOL_NAMES,
      "get_portfolio_wallet_endpoints",
    ]);
    expect(Object.keys(prepared.tools)).toEqual([
      ...HIVE_CORE_TOOL_NAMES,
      "get_portfolio_wallet_endpoints",
    ]);
  });

  test("prepares all and core AI SDK modes from runtime definitions", async () => {
    const definitions = {
      tools: [
        ...HIVE_CORE_TOOL_NAMES,
        ...HIVE_CATEGORY_TOOL_NAMES,
        "get_social_sentiment_endpoints",
      ].map((name) => ({ name })),
    };
    const client = {
      listTools: vi.fn(async () => definitions),
      toolsFromDefinitions: vi.fn((selected: typeof definitions) =>
        Object.fromEntries(selected.tools.map((tool) => [tool.name, tool])),
      ),
    };

    const all = await prepareHiveAiSdkTools({
      client,
      selectionMode: "all",
    });
    expect(all.definitions.tools.map((tool) => tool.name)).toEqual([
      ...HIVE_CORE_TOOL_NAMES,
      ...HIVE_CATEGORY_TOOL_NAMES,
    ]);

    const core = await prepareHiveAiSdkTools({
      client,
      selectionMode: "core",
    });
    expect(core.definitions.tools.map((tool) => tool.name)).toEqual([
      ...HIVE_CORE_TOOL_NAMES,
    ]);
  });
});
