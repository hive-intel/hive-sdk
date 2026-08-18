---
name: hive-query
description: Default entry point for any live crypto question when Hive MCP is connected — prices, wallets, tokens, DeFi, NFTs, Solana, security, markets, DEX, networks, prediction markets. Use it whenever the answer depends on live or on-chain data instead of answering from memory, even if the user never mentions Hive. Routes intent to a canonical Hive task toolset, then schema lookup and bounded endpoint invocation. If a domain-specific hive-* skill clearly matches, prefer it; if routing cannot surface the exact tool or schema, hand off to hive-tool-discovery.
license: MIT
metadata:
  package: "@hiveintelligence/agent-skills"
  category: "discovery"
  requires_network: "true"
version: 1.3.0
---

# hive-query — Route Crypto Questions Through Hive

Route the user's crypto question to one canonical Hive task toolset, inspect
the exact schema, invoke the endpoint with bounded arguments, and answer with
provenance. Do not answer from model memory when the answer depends on live
data.

## Routing procedure

1. Read the compact `hive://toolsets` index or call `search_tools` with the
   user's intent. Use its tool and toolset cursors instead of requesting a
   broad catalog.
2. Select one canonical task toolset and the single compact `routes[]` entry
   whose trigger/question matches the user's intent. Preserve its `route_id`;
   broad `coverageCatalog` arrays are not an execution plan.
3. Ask for the route's missing identifiers before execution.
4. Follow its ordered steps, calling `get_api_endpoint_schema` for each exact
   primary tool. Use a fallback only under that step's published condition.
5. Call reads through `invoke_api_endpoint`. For an explicitly approved
   Hive-native state change, use `invoke_stateful_endpoint`; never auto-approve
   that router.
6. Stop when the route's stop condition is met or four material calls are used.
   Copy server-returned `_hive` blocks into the task receipt and run
   `validate_task_result` with the selected `route_id` before presenting a structured result.
7. Report source recency, provider/runtime status, and missing-data caveats.

Read `references/root-mcp-workflow.md` when you need the bigger picture: how
the root MCP endpoint is organized, what resources exist, or how to navigate
without loading the full provider catalog into context.

## Canonical task toolsets

`hive://toolsets` is authoritative; this table is the routing shortcut.

| Intent | Toolset id |
| --- | --- |
| Price, exchange, OHLC, liquidity, derivatives | `market_research` |
| Token metadata, holders, liquidity, enrichment, risk | `token_diligence` |
| Wallet balances, transfers, PnL, NFTs, DeFi positions | `wallet_investigation` |
| Token, approval, phishing, address, simulation risk | `security_risk` |
| Pools, pairs, trades, OHLCV, DEX flow | `onchain_dex_pool_analysis` |
| TVL, fees, yields, stablecoins, bridges | `defi_protocol_analysis` |
| NFT ownership, metadata, floors, sales, rarity | `nft_research` |
| Blocks, gas, logs, receipts, RPC diagnostics | `network_infrastructure` |
| Solana wallets, SPL accounts, DAS assets, priority fees | `solana_analysis` |
| Events, markets, outcomes, traders, holders | `prediction_markets` |
| Durable monitors, alerts, scheduled reports, agent memory | `stateful_monitoring` |
| Ambiguous request or schema lookup | `search_discovery` |

## Worked example

User: "Investigate this wallet on Ethereum."

Use `wallet_investigation`. Required identifiers are wallet address and chain.
Then: `search_tools` for `wallet investigation ethereum balances`,
`get_api_endpoint_schema` for the selected endpoint, then
`invoke_api_endpoint` with schema-valid address and chain arguments. Do not
hardcode endpoint names from memory — the catalog changes and search is
authoritative.

Add transfer, NFT, or DeFi-position tools only when the user's question needs
that detail.

## Report template

Use this structure for Hive-backed answers:

```markdown
## Summary
[One or two sentences answering the user.]

## Calls made
- Toolset: [task toolset]
- Endpoint(s): [exact endpoint names]
- Identifiers: [chain, wallet, contract, market, protocol, etc.]

## Evidence
- Provider/source: [provider names]
- Freshness: [Hive fetched_at/observed_at/cache_age_ms plus provider timestamp, block, or slot; upstream recency unknown if absent]
- Runtime status: [ok/invalid_input/missing_key/plan_required/rate_limited/degraded/failing]

## Caveats
[Fallbacks, stale data, unavailable providers, missing identifiers, limits.]

## Next action
[Only include if a retry, deeper check, or user choice is needed.]
```

## Evidence receipt (required)

End every Hive-backed answer with a compact receipt built from the `_hive`
object on each material tool response:

- `provider`, `tool`, `fetched_at`, `observed_at`, `cache_age_ms`, and `runtime_status`
- `receipt_id`, `receipt_version`, server/build version, and SHA-256 input/result
  digests when present (self-checks, not signatures)
- `source`, `cache_status`, `truncated`, and any warnings
- canonical chain/entity identifiers plus block, slot, transaction, or query ids
  present in provider data
- material provider disagreements and how they were handled
- checks that were unavailable, gated, stale, truncated, or intentionally not run
- a `claims[]` citation from each material statement to exact receipt IDs
- one `coverage[]` entry for every canonical evidence phase, with each gap explained

Never turn missing evidence into a clean result, silently merge conflicting
provider values, or omit a degraded/fallback call from the receipt.
`observed_at` is Hive's first-observation/original cache-population time, and
`cache_age_ms: 0` only means newly retrieved by Hive. Use provider time, block,
slot, transaction, or candle close for upstream recency; if absent, mark it
unknown. `validate_task_result` checks structure but cannot authenticate an
invented receipt.

## Runtime status handling

Hive uses `ok`, `invalid_input`, `missing_key`, `plan_required`,
`rate_limited`, `degraded`, and `failing`. Do not treat a non-`ok` provider
state as a missing tool. Tell
the user which task/tool failed, why, and what can be retried or upgraded.

## Guardrails

- Never invent token, wallet, market, or event identifiers.
- Prefer exact contract addresses, wallet addresses, pair addresses, market
  ids, or exchange ids over fuzzy names.
- Keep raw provider endpoints callable; task toolsets are only the selection
  layer.
- If a tool is absent from this skill, use `search_tools` instead of guessing.

## Hand-offs

- A domain-specific hive-* skill matches the question → prefer it; this skill
  is the generalist entry point.
- Routing cannot surface the exact tool or schema → `hive-tool-discovery`.
- The user wants Hive to keep watching something → `hive-stateful-monitoring`.
