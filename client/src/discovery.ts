import {
  HIVE_CATEGORY_TOOL_NAMES,
  HIVE_CORE_TOOL_NAMES,
  HIVE_STATEFUL_WRITE_ENDPOINT_NAMES,
  type HiveCategoryToolName,
} from "./constants.js";
import { normalizeHiveToolResult } from "./result.js";
import type {
  HiveCallToolArgs,
  HiveCategoryRanking,
  HiveMcpClient,
  HiveMetadataSnapshot,
} from "./types.js";

type CategoryResourceItem = {
  category?: unknown;
  description?: unknown;
  name?: unknown;
  toolName?: unknown;
};

type ToolsetResource = {
  toolsets?: unknown;
};

type ToolsetItem = {
  exampleUserTasks?: unknown;
  id?: unknown;
  label?: unknown;
  outcome?: unknown;
  purpose?: unknown;
  tags?: unknown;
};

const FALLBACK_CATEGORY_KEYWORDS: Record<HiveCategoryToolName, string[]> = {
  get_market_and_price_endpoints: [
    "price",
    "market",
    "volume",
    "ohlc",
    "funding",
    "funding rate",
    "open interest",
    "liquidation",
    "liquidations",
    "order book",
    "orderbook",
    "cex",
    "derivatives",
    "options",
  ],
  get_onchain_dex_pool_endpoints: [
    "dex",
    "pool",
    "swap",
    "liquidity",
    "pair",
    "pump",
  ],
  get_portfolio_wallet_endpoints: [
    "wallet",
    "wallets",
    "portfolio",
    "holdings",
    "balance",
    "balances",
    "pnl",
    "profit",
    "profitable",
    "profitability",
    "swaps",
    "defi positions",
    "chain activity",
    "approval",
  ],
  get_token_contract_endpoints: [
    "token",
    "contract",
    "holder",
    "holders",
    "trader",
    "traders",
    "metadata",
    "socials",
    "supply",
    "spl",
  ],
  get_defi_protocol_endpoints: [
    "defi",
    "protocol",
    "tvl",
    "fees",
    "fee",
    "revenue",
    "yield",
    "yields",
    "apy",
    "lending",
    "stablecoin",
    "bridge",
  ],
  get_nft_analytics_endpoints: [
    "nft",
    "collection",
    "floor",
    "sales",
    "rarity",
    "mint",
    "spam",
    "owner",
    "metadata",
  ],
  get_security_risk_endpoints: [
    "security",
    "risk",
    "honeypot",
    "rug",
    "rugpull",
    "scam",
    "safe",
    "malicious",
    "phishing",
    "dapp",
    "approval",
    "calldata",
    "simulate",
  ],
  get_network_infrastructure_endpoints: [
    "gas",
    "network",
    "rpc",
    "block",
    "logs",
    "receipt",
    "transaction",
    "priority fee",
    "validator",
  ],
  get_search_discovery_endpoints: [
    "search",
    "discover",
    "trending",
    "category",
    "new",
  ],
  get_prediction_markets_endpoints: [
    "prediction",
    "polymarket",
    "kalshi",
    "odds",
    "election",
    "sports",
    "event",
    "outcome",
    "traders",
    "order book",
  ],
};

const TOOLSET_TO_CATEGORY: Record<string, HiveCategoryToolName> = {
  defi_protocol_analysis: "get_defi_protocol_endpoints",
  market_research: "get_market_and_price_endpoints",
  network_infrastructure: "get_network_infrastructure_endpoints",
  nft_research: "get_nft_analytics_endpoints",
  onchain_dex_pool_analysis: "get_onchain_dex_pool_endpoints",
  prediction_markets: "get_prediction_markets_endpoints",
  search_discovery: "get_search_discovery_endpoints",
  security_risk: "get_security_risk_endpoints",
  solana_analysis: "get_network_infrastructure_endpoints",
  token_diligence: "get_token_contract_endpoints",
  wallet_investigation: "get_portfolio_wallet_endpoints",
};

export const HIVE_ENDPOINT_ALIASES: Record<string, string> = {
  check_phishing_site: "check_phishing_site",
  coingecko_get_news: "get_news",
  defillama_get_protocol: "get_defi_protocol",
  defillama_get_protocol_fees: "get_protocol_fees",
  defillama_get_protocol_tvl: "get_protocol_tvl",
  defillama_get_yield_pools: "get_yield_pools",
  detect_phishing_site: "check_phishing_site",
  filter_tokens: "search_tokens",
  get_all_nft_list: "get_nfts",
  get_detailed_nft_stats: "get_nft_collection_stats",
  get_detailed_pair_stats: "get_pair_stats",
  get_detailed_wallet_stats: "get_wallet_stats",
  get_gas_prices: "alchemy_get_gas_price",
  get_id_coins: "get_coins_index",
  get_id_coins_tickers: "get_coin_tickers",
  get_id_nfts: "get_nft",
  get_networks_onchain_new_pools: "get_new_pools",
  get_networks_onchain_trending_pools: "get_trending_pools",
  get_new_coins_list: "get_new_coins",
  get_nft_contract_stats: "get_nft_collection_stats",
  get_nft_events: "get_nft_collection_events",
  get_nft_list: "get_nfts",
  get_nfts_market_chart: "get_nft_market_chart",
  get_onchain_networks: "get_networks",
  get_pools_networks_onchain_info: "get_pool_info",
  get_pools_networks_onchain_trades: "get_pool_trades",
  get_range_coins_market_chart: "get_coin_market_chart_range",
  get_range_coins_ohlc: "get_coin_ohlc_range",
  get_search: "search_all",
  get_search_onchain_pools: "search_pools",
  get_search_trending: "get_trending",
  get_simple_price: "get_price",
  get_token_balances: "get_wallet_balances",
  get_tokens_networks_onchain_info: "get_token_info",
  get_tokens_networks_onchain_top_holders: "get_token_top_holders",
  get_topic_news: "get_news",
  goldrush_get_gas_prices: "alchemy_get_gas_price",
  goldrush_get_nft_balances: "alchemy_get_nfts_by_wallet",
  goldrush_get_transactions_latest: "alchemy_get_asset_transfers",
  goplus_detect_rugpull: "detect_rugpull",
} as const;

const ALCHEMY_NETWORK_ALIASES: Record<string, string> = {
  arbmainnet: "arb-mainnet",
  arbitrummainnet: "arb-mainnet",
  basemainnet: "base-mainnet",
  ethmainnet: "eth-mainnet",
  ethereummainnet: "eth-mainnet",
  lineamainnet: "linea-mainnet",
  maticmainnet: "polygon-mainnet",
  optimismmainnet: "opt-mainnet",
  optmainnet: "opt-mainnet",
  polygonmainnet: "polygon-mainnet",
  polygonpos: "polygon-mainnet",
  scrollmainnet: "scroll-mainnet",
  worldchainmainnet: "worldchain-mainnet",
  zksyncmainnet: "zksync-mainnet",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeNetworkKey(value: string): string {
  return value.toLowerCase().replace(/[\s_-]/g, "");
}

function normalizeAlchemyNetwork(value: unknown): unknown {
  if (typeof value !== "string") return value;
  return ALCHEMY_NETWORK_ALIASES[normalizeNetworkKey(value)] ?? value;
}

function normalizeAlchemyNetworkArgs(
  args: Record<string, unknown>,
  networkValue: unknown
): Record<string, unknown> {
  const { chainName: _chainName, ...remaining } = args;
  const network = remaining.network ?? networkValue;
  return network === undefined
    ? remaining
    : { ...remaining, network: normalizeAlchemyNetwork(network) };
}

export function resolveHiveEndpointName(name: string): string {
  return HIVE_ENDPOINT_ALIASES[name] ?? name;
}

export function normalizeHiveEndpointArgs(
  endpointName: string,
  args: Record<string, unknown> = {}
): Record<string, unknown> {
  const resolvedEndpointName = resolveHiveEndpointName(endpointName);

  if (resolvedEndpointName === "alchemy_get_gas_price") {
    return normalizeAlchemyNetworkArgs(args, args.chainName);
  }

  if (resolvedEndpointName === "alchemy_get_asset_transfers") {
    const { walletAddress, ...remaining } = args;
    const normalized = normalizeAlchemyNetworkArgs(remaining, args.chainName);
    if (typeof walletAddress === "string" && normalized.fromAddress === undefined) {
      normalized.fromAddress = walletAddress;
      normalized.category ??= ["external", "erc20", "erc721", "erc1155"];
      normalized.maxCount ??= "0xa";
    }
    return normalized;
  }

  if (resolvedEndpointName === "alchemy_get_nfts_by_wallet") {
    const { walletAddress, ...remaining } = args;
    const {
      "no-nft-asset-metadata": noNftAssetMetadata,
      ...withoutLegacyMetadataFlag
    } = remaining;
    const normalized = normalizeAlchemyNetworkArgs(
      withoutLegacyMetadataFlag,
      args.chainName
    );
    if (typeof walletAddress === "string" && normalized.address === undefined) {
      normalized.address = walletAddress;
    }
    if (
      typeof noNftAssetMetadata === "boolean" &&
      normalized.withMetadata === undefined
    ) {
      normalized.withMetadata = !noNftAssetMetadata;
    }
    return normalized;
  }

  return args;
}

export function normalizeHiveToolCall(
  name: string,
  args: Record<string, unknown> = {}
): HiveCallToolArgs {
  if (name === "get_api_endpoint_schema") {
    const endpoint = args.endpoint;
    return {
      name,
      arguments: {
        ...args,
        ...(typeof endpoint === "string"
          ? { endpoint: resolveHiveEndpointName(endpoint) }
          : {}),
      },
    };
  }

  if (name === "invoke_api_endpoint" || name === "invoke_stateful_endpoint") {
    const endpointName = args.endpoint_name;
    const endpointArgs = args.args;
    return {
      name,
      arguments: {
        ...args,
        ...(typeof endpointName === "string"
          ? { endpoint_name: resolveHiveEndpointName(endpointName) }
          : {}),
        ...(typeof endpointName === "string" && isRecord(endpointArgs)
          ? { args: normalizeHiveEndpointArgs(endpointName, endpointArgs) }
          : {}),
      },
    };
  }

  if ((HIVE_CORE_TOOL_NAMES as readonly string[]).includes(name)) {
    return { name, arguments: args };
  }

  if ((HIVE_CATEGORY_TOOL_NAMES as readonly string[]).includes(name)) {
    return { name, arguments: args };
  }

  const resolvedName = resolveHiveEndpointName(name);
  const invoker = (
    HIVE_STATEFUL_WRITE_ENDPOINT_NAMES as readonly string[]
  ).includes(resolvedName)
    ? "invoke_stateful_endpoint"
    : "invoke_api_endpoint";
  return {
    name: invoker,
    arguments: {
      endpoint_name: resolvedName,
      args: normalizeHiveEndpointArgs(name, args),
    },
  };
}

function isCategoryToolName(value: string): value is HiveCategoryToolName {
  return (HIVE_CATEGORY_TOOL_NAMES as readonly string[]).includes(value);
}

const RANKING_STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "before",
  "do",
  "does",
  "for",
  "from",
  "get",
  "have",
  "how",
  "i",
  "is",
  "me",
  "of",
  "on",
  "or",
  "should",
  "show",
  "the",
  "this",
  "to",
  "use",
  "versus",
  "vs",
  "war",
  "wars",
  "what",
  "which",
  "who",
  "winning",
  "with",
]);

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/0x[a-f0-9]{20,}/g, " ")
    .replace(/[1-9A-HJ-NP-Za-km-z]{32,}/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^\w\s.]/g, " ");
}

function singularize(term: string): string {
  if (term.length <= 3) return term;
  if (term.endsWith("ies")) return `${term.slice(0, -3)}y`;
  if (term.endsWith("es")) return term.slice(0, -2);
  if (term.endsWith("s")) return term.slice(0, -1);
  return term;
}

function scoreText(query: string, haystack: string): number {
  const normalizedHaystack = normalize(haystack);
  const terms = normalize(query)
    .split(/\s+/)
    .map((term) => singularize(term.trim()))
    .filter((term) => term.length > 2)
    .filter((term) => !RANKING_STOPWORDS.has(term));
  return terms.reduce(
    (score, term) => score + (normalizedHaystack.includes(term) ? 2 : 0),
    0
  );
}

function categoryResourceEntries(
  snapshot: HiveMetadataSnapshot | null | undefined
): Array<{ text: string; toolName: HiveCategoryToolName }> {
  const resource = snapshot?.resources["hive://categories"];
  if (!Array.isArray(resource)) {
    return [];
  }
  return resource
    .map((item) => {
      const category = item as CategoryResourceItem;
      const rawName =
        typeof category.toolName === "string"
          ? category.toolName
          : typeof category.name === "string"
            ? category.name
            : undefined;
      const fallbackName = HIVE_CATEGORY_TOOL_NAMES.find((toolName) => {
        const label =
          typeof category.category === "string" ? category.category : "";
        return normalize(toolName).includes(normalize(label).split(/\s+/)[0] ?? "");
      });
      const toolName = rawName && isCategoryToolName(rawName)
        ? rawName
        : fallbackName;
      if (!toolName) {
        return undefined;
      }
      const text = [
        category.category,
        category.description,
        category.name,
        category.toolName,
      ]
        .filter((value): value is string => typeof value === "string")
        .join(" ");
      return { text, toolName };
    })
    .filter((entry): entry is { text: string; toolName: HiveCategoryToolName } =>
      Boolean(entry)
    );
}

function toolsetResourceEntries(
  snapshot: HiveMetadataSnapshot | null | undefined
): Array<{ text: string; toolName: HiveCategoryToolName }> {
  const resource = snapshot?.resources["hive://toolsets"] as
    | ToolsetResource
    | undefined;
  if (!resource || !Array.isArray(resource.toolsets)) {
    return [];
  }
  return resource.toolsets
    .map((item) => {
      const toolset = item as ToolsetItem;
      const id = typeof toolset.id === "string" ? toolset.id : undefined;
      const toolName = id ? TOOLSET_TO_CATEGORY[id] : undefined;
      if (!toolName) {
        return undefined;
      }
      const tags = Array.isArray(toolset.tags) ? toolset.tags.join(" ") : "";
      const examples = Array.isArray(toolset.exampleUserTasks)
        ? toolset.exampleUserTasks.join(" ")
        : "";
      const text = [
        toolset.id,
        toolset.label,
        toolset.purpose,
        toolset.outcome,
        tags,
        examples,
      ]
        .filter((value): value is string => typeof value === "string")
        .join(" ");
      return { text, toolName };
    })
    .filter((entry): entry is { text: string; toolName: HiveCategoryToolName } =>
      Boolean(entry)
    );
}

export function rankHiveCategoriesForQuery(
  query: string,
  snapshot?: HiveMetadataSnapshot | null
): HiveCategoryRanking[] {
  const scores = new Map<HiveCategoryToolName, number>();
  for (const toolName of HIVE_CATEGORY_TOOL_NAMES) {
    const fallbackText = FALLBACK_CATEGORY_KEYWORDS[toolName].join(" ");
    scores.set(toolName, scoreText(query, `${toolName} ${fallbackText}`));
  }

  for (const entry of [
    ...categoryResourceEntries(snapshot),
    ...toolsetResourceEntries(snapshot),
  ]) {
    scores.set(entry.toolName, (scores.get(entry.toolName) ?? 0) + scoreText(query, entry.text));
  }

  return [...scores.entries()]
    .map(([toolName, score]) => ({ score, toolName }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
}

export async function searchHiveTools(
  client: HiveMcpClient,
  args: {
    category?: string;
    cursor?: string;
    limit?: number;
    provider?: string;
    query?: string;
  }
) {
  return normalizeHiveToolResult(
    await client.callTool({
      name: "search_tools",
      arguments: args,
    })
  );
}

export async function getHiveEndpointSchema(
  client: HiveMcpClient,
  endpointName: string
) {
  return normalizeHiveToolResult(
    await client.callTool({
      name: "get_api_endpoint_schema",
      arguments: { endpoint: resolveHiveEndpointName(endpointName) },
    })
  );
}

export async function invokeHiveEndpoint(
  client: HiveMcpClient,
  endpointName: string,
  args: Record<string, unknown> = {}
) {
  const resolvedName = resolveHiveEndpointName(endpointName);
  if (
    (HIVE_STATEFUL_WRITE_ENDPOINT_NAMES as readonly string[]).includes(
      resolvedName
    )
  ) {
    throw new Error(
      `Endpoint '${resolvedName}' changes durable Hive state. Obtain explicit user approval, then call invokeHiveStatefulEndpoint().`
    );
  }
  return normalizeHiveToolResult(
    await client.callTool({
      name: "invoke_api_endpoint",
      arguments: {
        endpoint_name: resolvedName,
        args: normalizeHiveEndpointArgs(endpointName, args),
      },
    })
  );
}

export async function invokeHiveStatefulEndpoint(
  client: HiveMcpClient,
  endpointName: string,
  args: Record<string, unknown> = {}
) {
  const resolvedName = resolveHiveEndpointName(endpointName);
  if (
    !(HIVE_STATEFUL_WRITE_ENDPOINT_NAMES as readonly string[]).includes(
      resolvedName
    )
  ) {
    throw new Error(
      `Endpoint '${resolvedName}' is not a known Hive stateful write endpoint.`
    );
  }
  return normalizeHiveToolResult(
    await client.callTool({
      name: "invoke_stateful_endpoint",
      arguments: {
        endpoint_name: resolvedName,
        args: normalizeHiveEndpointArgs(endpointName, args),
      },
    })
  );
}

export { HIVE_CORE_TOOL_NAMES };
