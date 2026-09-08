import { describe, expect, test, vi } from "vitest";
import { createHiveLangChainTools } from "../src/langchain.js";
import {
  HIVE_CORE_TOOL_NAMES,
  type HiveMcpClient,
  type HiveToolResponseCache,
} from "../src/index.js";

describe("createHiveLangChainTools", () => {
  test("creates only the current five-tool root workflow surface", async () => {
    const client: HiveMcpClient = {
      callTool: vi.fn(async ({ name, arguments: args }) => ({
        content: [{ type: "text", text: JSON.stringify({ args, name }) }],
      })),
      close: vi.fn(async () => undefined),
      getPrompt: vi.fn(async () => ({ messages: [] })),
      listPrompts: vi.fn(async () => ({ prompts: [] })),
      listResources: vi.fn(async () => ({ resources: [] })),
      listResourceTemplates: vi.fn(async () => ({ resourceTemplates: [] })),
      listTools: vi.fn(async () => ({ tools: [] })),
      readResource: vi.fn(async () => ({ contents: [] })),
      withSubject: vi.fn(() => client),
    };
    const tools = createHiveLangChainTools({ client });
    const names = tools.map((tool) => tool.name);

    expect(names).toEqual([...HIVE_CORE_TOOL_NAMES]);
    expect(names).toContain("search_tools");
    expect(names).not.toContain("get_market_and_price_endpoints");
    expect(names).not.toContain("get_social_sentiment_endpoints");

    const search = tools.find((tool) => tool.name === "search_tools");
    await search?.invoke({ query: "bitcoin price", route_id: "spot_price" });
    expect(client.callTool).toHaveBeenCalledWith({
      arguments: { query: "bitcoin price", route_id: "spot_price" },
      name: "search_tools",
    });
  });

  test("does not cache material read invocations", async () => {
    const store = new Map<string, string>();
    const cache: HiveToolResponseCache = {
      get: (key) => store.get(key) ?? null,
      set: (key, value) => {
        store.set(key, value);
      },
    };
    const client: HiveMcpClient = {
      callTool: vi.fn(async ({ name }) => ({
        content: [{ type: "text", text: JSON.stringify({ name }) }],
      })),
      close: vi.fn(async () => undefined),
      getPrompt: vi.fn(async () => ({ messages: [] })),
      listPrompts: vi.fn(async () => ({ prompts: [] })),
      listResources: vi.fn(async () => ({ resources: [] })),
      listResourceTemplates: vi.fn(async () => ({ resourceTemplates: [] })),
      listTools: vi.fn(async () => ({ tools: [] })),
      readResource: vi.fn(async () => ({ contents: [] })),
      withSubject: vi.fn(() => client),
    };
    const invoke = createHiveLangChainTools({ cache, client }).find(
      (tool) => tool.name === "invoke_api_endpoint"
    );
    await invoke?.invoke({
      args: { ids: "bitcoin", vs_currencies: "usd" },
      endpoint_name: "get_price",
    });
    await invoke?.invoke({
      endpoint_name: "get_price",
      args: { vs_currencies: "usd", ids: "bitcoin" },
    });

    expect(client.callTool).toHaveBeenCalledTimes(2);
  });

  test("never caches stateful write invocations", async () => {
    const store = new Map<string, string>();
    const cache: HiveToolResponseCache = {
      get: (key) => store.get(key) ?? null,
      set: (key, value) => {
        store.set(key, value);
      },
    };
    const client: HiveMcpClient = {
      callTool: vi.fn(async ({ name }) => ({
        content: [{ type: "text", text: JSON.stringify({ name }) }],
      })),
      close: vi.fn(async () => undefined),
      getPrompt: vi.fn(async () => ({ messages: [] })),
      listPrompts: vi.fn(async () => ({ prompts: [] })),
      listResources: vi.fn(async () => ({ resources: [] })),
      listResourceTemplates: vi.fn(async () => ({ resourceTemplates: [] })),
      listTools: vi.fn(async () => ({ tools: [] })),
      readResource: vi.fn(async () => ({ contents: [] })),
      withSubject: vi.fn(() => client),
    };
    const invoke = createHiveLangChainTools({
      cache,
      client,
      approveStatefulCall: async () => true,
    }).find(
      (tool) => tool.name === "invoke_stateful_endpoint"
    );

    await invoke?.invoke({
      endpoint_name: "hive_archive_monitor",
      args: { monitor_id: "monitor-123" },
    });
    await invoke?.invoke({
      endpoint_name: "hive_archive_monitor",
      args: { monitor_id: "monitor-123" },
    });

    expect(client.callTool).toHaveBeenCalledTimes(2);
  });

  test("blocks stateful writes until an approval callback grants them", async () => {
    const client: HiveMcpClient = {
      callTool: vi.fn(async () => ({ content: [] })),
      close: vi.fn(async () => undefined),
      getPrompt: vi.fn(async () => ({ messages: [] })),
      listPrompts: vi.fn(async () => ({ prompts: [] })),
      listResources: vi.fn(async () => ({ resources: [] })),
      listResourceTemplates: vi.fn(async () => ({ resourceTemplates: [] })),
      listTools: vi.fn(async () => ({ tools: [] })),
      readResource: vi.fn(async () => ({ contents: [] })),
      withSubject: vi.fn(() => client),
    };
    const invoke = createHiveLangChainTools({ client }).find(
      (tool) => tool.name === "invoke_stateful_endpoint"
    );

    await expect(
      invoke?.invoke({
        endpoint_name: "hive_archive_monitor",
        args: { monitor_id: "monitor-123" },
      })
    ).rejects.toThrow("approveStatefulCall");
    expect(client.callTool).not.toHaveBeenCalled();
  });
});
