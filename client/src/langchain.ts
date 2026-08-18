import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import {
  HIVE_CORE_TOOL_NAMES,
} from "./constants.js";
import { createHiveMcpClient } from "./client.js";
import { stableHiveCacheKey } from "./cache-key.js";
import { stringifyHiveToolResult } from "./result.js";
import type {
  HiveLangChainToolOptions,
  HiveMcpClient,
  HiveToolResponseCache,
} from "./types.js";

type ToolCallInput = Record<string, unknown>;

const CACHEABLE_METADATA_TOOLS = new Set<string>([
  "search_tools",
  "get_api_endpoint_schema",
]);

const searchToolsSchema = z.object({
  category: z.string().optional(),
  cursor: z.string().optional(),
  detail: z.enum(["compact", "standard", "full"]).optional(),
  evidence_phase: z.string().optional(),
  limit: z.number().int().min(1).max(50).optional(),
  provider: z.string().optional(),
  query: z.string().optional(),
  route_id: z.string().optional(),
  toolset_cursor: z.string().optional(),
  toolset_id: z.string().optional(),
  toolset_limit: z.number().int().min(1).max(5).optional(),
});

const schemaLookupSchema = z.object({
  endpoint_name: z.string().describe("Exact Hive endpoint/tool name."),
});

const invokeSchema = z.object({
  args: z.record(z.string(), z.unknown()).optional(),
  arguments: z.record(z.string(), z.unknown()).optional(),
  endpoint_name: z.string().describe("Exact Hive endpoint/tool name."),
});

const validateTaskResultSchema = z.object({
  result: z.record(z.string(), z.unknown()),
  task_toolset_id: z.string(),
});

async function cacheGet(
  cache: HiveToolResponseCache | undefined,
  key: string
): Promise<string | null> {
  return (await cache?.get(key)) ?? null;
}

async function cacheSet(
  cache: HiveToolResponseCache | undefined,
  key: string,
  value: string
): Promise<void> {
  await cache?.set(key, value);
}

function shouldCacheResult(result: string): boolean {
  const lower = result.toLowerCase().trim();
  if (lower.startsWith("error:") || lower.startsWith("error -")) {
    return false;
  }
  if (lower.startsWith('{"error"') || lower.startsWith('{"message":"error')) {
    return false;
  }
  return true;
}

export function createHiveLangChainTools(
  options: HiveLangChainToolOptions = {}
): DynamicStructuredTool[] {
  let sharedClient: Promise<HiveMcpClient> | undefined;
  const getClient = async () => {
    if (options.client) {
      return options.client;
    }
    sharedClient ??= createHiveMcpClient(options.clientOptions);
    return sharedClient;
  };

  const call = async (toolName: string, args: ToolCallInput) => {
    const key = stableHiveCacheKey(toolName, args);
    // Never create an invisible second cache for material endpoint results:
    // it would replay an old _hive receipt without truthful cache/freshness
    // metadata. Hive's server-side cache is the provenance-aware cache layer.
    const cacheable = CACHEABLE_METADATA_TOOLS.has(toolName);
    const cached = cacheable ? await cacheGet(options.cache, key) : null;
    if (cached) {
      return cached;
    }
    const client = await getClient();
    const result = stringifyHiveToolResult(
      await client.callTool({ name: toolName, arguments: args })
    );
    if (cacheable && shouldCacheResult(result)) {
      await cacheSet(options.cache, key, result);
    }
    return result;
  };

  const tools: DynamicStructuredTool[] = [
    new DynamicStructuredTool({
      name: "search_tools",
      description:
        "Search the full Hive tool catalog and canonical task toolsets by keyword, provider, or category.",
      schema: searchToolsSchema,
      func: async (input) => call("search_tools", input),
    }),
    new DynamicStructuredTool({
      name: "get_api_endpoint_schema",
      description:
        "Get the input and output schema for an exact Hive endpoint/tool name before invoking it.",
      schema: schemaLookupSchema,
      func: async (input) =>
        call("get_api_endpoint_schema", { endpoint: input.endpoint_name }),
    }),
    new DynamicStructuredTool({
      name: "invoke_api_endpoint",
      description:
        "Invoke a read-only Hive endpoint by exact endpoint_name with schema-valid args. State-changing endpoints are rejected.",
      schema: invokeSchema,
      func: async (input) =>
        call("invoke_api_endpoint", {
          endpoint_name: input.endpoint_name,
          args: input.args ?? input.arguments ?? {},
        }),
    }),
    new DynamicStructuredTool({
      name: "invoke_stateful_endpoint",
      description:
        "Invoke an explicitly approved Hive-native state-changing endpoint. This can create, update, remember, acknowledge, resolve, forget, or archive durable state.",
      schema: invokeSchema,
      func: async (input) => {
        const statefulCall = {
          endpoint_name: input.endpoint_name,
          args: input.args ?? input.arguments ?? {},
        };
        if (!options.approveStatefulCall) {
          throw new Error(
            "Hive stateful calls are disabled until approveStatefulCall is configured to obtain explicit user approval.",
          );
        }
        const approved = await options.approveStatefulCall({
          endpointName: statefulCall.endpoint_name,
          args: statefulCall.args,
        });
        if (!approved) {
          throw new Error("Hive stateful call was not approved by the user.");
        }
        return call("invoke_stateful_endpoint", statefulCall);
      },
    }),
    new DynamicStructuredTool({
      name: "validate_task_result",
      description:
        "Validate a proposed Hive workflow answer and exact copied runtime receipts against the selected task-output contract.",
      schema: validateTaskResultSchema,
      func: async (input) => call("validate_task_result", input),
    }),
  ];

  if (tools.length !== HIVE_CORE_TOOL_NAMES.length) {
    throw new Error("Hive LangChain tool count mismatch");
  }

  return tools;
}
