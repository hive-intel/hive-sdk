import { HIVE_PROVIDER_NAMES } from "./constants.js";
import type {
  HiveMcpClient,
  HiveMetadataSnapshot,
  HiveNormalizedToolResult,
  HiveSource,
} from "./types.js";

type ProviderResource = {
  providers?: unknown;
};

type ProviderItem = {
  id?: unknown;
  name?: unknown;
  provider?: unknown;
};

type ToolCatalogResource = {
  tools?: unknown;
};

type ToolCatalogItem = {
  category?: unknown;
  name?: unknown;
  provider?: unknown;
  title?: unknown;
};

function normalized(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const PROVIDER_ENDPOINT_ALIASES: Readonly<Record<string, readonly string[]>> = {
  "Open Data Fetch": ["fetch"],
  "Hive Archive": ["archive"],
};

function providerNames(snapshot?: HiveMetadataSnapshot | null): string[] {
  const resource = snapshot?.resources["hive://providers"] as
    ProviderResource | undefined;
  if (!resource || !Array.isArray(resource.providers)) {
    return [...HIVE_PROVIDER_NAMES];
  }
  return resource.providers
    .map((provider) => {
      const item = provider as ProviderItem;
      const name = item.name ?? item.provider ?? item.id;
      return typeof name === "string" ? name : undefined;
    })
    .filter((provider): provider is string => Boolean(provider));
}

function toolCatalogEntries(
  snapshot?: HiveMetadataSnapshot | null,
): ToolCatalogItem[] {
  const resource = snapshot?.resources["hive://tools"] as
    ToolCatalogResource | undefined;
  if (!resource || !Array.isArray(resource.tools)) {
    return [];
  }
  return resource.tools as ToolCatalogItem[];
}

export function inferHiveProvider(
  endpointName: string,
  snapshot?: HiveMetadataSnapshot | null,
): string | undefined {
  const catalogMatch = toolCatalogEntries(snapshot).find(
    (tool) => tool.name === endpointName && typeof tool.provider === "string",
  );
  if (catalogMatch && typeof catalogMatch.provider === "string") {
    return catalogMatch.provider;
  }
  const endpoint = normalized(endpointName);
  // Hive-native endpoints (hive_*) never belong to a data provider. Without
  // this guard the fuzzy includes() below would match hive_archive_monitor
  // against "Hive Archive".
  if (endpoint.startsWith("hive")) return undefined;
  return providerNames(snapshot).find((provider) => {
    if (endpoint.includes(normalized(provider))) return true;
    return (PROVIDER_ENDPOINT_ALIASES[provider] ?? []).some((alias) =>
      endpoint.startsWith(normalized(alias)),
    );
  });
}

export function inferHiveCategory(
  endpointName: string,
  snapshot?: HiveMetadataSnapshot | null,
): string | undefined {
  const catalogMatch = toolCatalogEntries(snapshot).find(
    (tool) => tool.name === endpointName && typeof tool.category === "string",
  );
  return typeof catalogMatch?.category === "string"
    ? catalogMatch.category
    : undefined;
}

export function extractHiveSources({
  args,
  result,
  snapshot,
  toolName,
}: {
  args?: Record<string, unknown>;
  result?: HiveNormalizedToolResult | unknown;
  snapshot?: HiveMetadataSnapshot | null;
  toolName: string;
}): HiveSource[] {
  const endpoint =
    toolName === "invoke_api_endpoint" ||
    toolName === "invoke_stateful_endpoint"
      ? typeof args?.endpoint_name === "string"
        ? args.endpoint_name
        : typeof args?.endpoint === "string"
          ? args.endpoint
          : toolName
      : toolName;
  const provider = inferHiveProvider(endpoint, snapshot);
  const category = inferHiveCategory(endpoint, snapshot);
  const normalizedResult =
    result && typeof result === "object" && "text" in result
      ? (result as HiveNormalizedToolResult)
      : undefined;

  const title = [provider, endpoint].filter(Boolean).join(" ") || endpoint;
  return [
    {
      ...(category ? { category } : {}),
      endpoint,
      ...(provider ? { provider } : {}),
      title: normalizedResult?.isError ? `${title} (error)` : title,
      toolName,
    },
  ];
}

export type { HiveMcpClient };
