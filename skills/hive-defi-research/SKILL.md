---
name: hive-defi-research
description: Use this skill when the user asks about DeFi protocol metrics — TVL, fees, revenue, yields, APY, stablecoin supply, bridge volume, or chain-level DeFi totals — or wants protocols compared ("Aave vs Compound", "top protocols by TVL", "best stablecoin yields"). Use it whenever the answer needs current protocol-level numbers. For token prices and venue data use hive-market-research; for a specific pool's depth use hive-dex-pool-analysis.
license: MIT
metadata:
  package: "@hiveintelligence/agent-skills"
  category: "defi"
  requires_network: "true"
version: 1.4.0
---

# hive-defi-research — DeFi Protocol Analysis

Answer protocol, TVL, fee, revenue, yield, stablecoin, bridge, and chain-level
DeFi questions with like-for-like, timestamped metrics.

## Task toolset and identifiers

Toolset: `defi_protocol_analysis`. Read
`hive://toolsets/defi_protocol_analysis` before execution; it is authoritative
for the current output schema, material-call budget, phases, fallback
condition, and stop conditions.

- Required: protocol name/slug or chain.
- Optional: time window, metric type, yield pool, stablecoin, bridge.

Ask for a protocol slug, or choose a provider-supported slug only when the
user clearly named the protocol.

Before choosing endpoints, select exactly one matching entry from the exact
workflow's routes[]. Follow its ordered steps, use a fallback only under that
step's published condition, stop at four material calls, and preserve the
selected route_id in the typed result. The broad coverageCatalog is discovery
coverage, not an execution plan.

## Procedure

1. Resolve the protocol slug or chain name.
2. Call `search_tools` for protocol, TVL, fee/revenue, yield, stablecoin,
   bridge, or chain-metric capabilities.
3. Call `get_api_endpoint_schema` for each endpoint before calling it.
4. Pull only the metrics the question needs.
5. Compare protocols only with like-for-like metrics and timestamps, and
   state when a metric is unavailable or stale.

## Bounded calls

- Limit protocol lists and yield pools.
- Avoid comparing TVL snapshots from different dates without a caveat.
- Mark missing fee/yield/stablecoin metrics instead of omitting them.

## Worked example

User: "Compare Aave and Compound — TVL and fees, which one actually earns
more?"

1. `search_tools` → `{"query": "protocol tvl fees revenue defi", "limit": 5}`
2. `get_api_endpoint_schema` for the protocol-metric endpoints returned, then
   `invoke_api_endpoint` once per protocol slug with schema-valid arguments.
3. Normalize: same metric definitions, same window, same timestamps.
4. Summarize the comparison in a table, with provider and `fetched_at` per
   metric, using the report template.

## Report template

```markdown
## Summary
[Protocol or chain DeFi read in one or two sentences.]

## Calls made
- Toolset: defi_protocol_analysis
- Endpoint(s): [exact endpoint names]
- Identifiers: [protocol slugs, chains, metric filters]

## Evidence
- TVL: [value + as-of]
- Fees/revenue: [value + window]
- Yields/stablecoins/bridges: [if requested]
- Provenance: [provider, fetched_at, observed_at/cache_age_ms, runtime status per call]

## Caveats
[Unavailable metrics, stale snapshots, methodology differences.]

## Next action
[Compare peers, inspect a yield pool, or add token/pool diligence — only if needed.]
```

## Gotchas

- TVL, revenue, and fees answer different questions — do not substitute one
  for another.
- High APY without liquidity/risk context is not a recommendation.
- Provider methodology can differ across chains and protocols.

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
slot, transaction, or candle close for source recency; if absent, mark it
unknown. Run `validate_task_result` before presenting the typed workflow result;
it checks structure but cannot authenticate an invented receipt.

## Runtime status handling

Treat unreliable or temporarily unavailable DeFi endpoints as `degraded`. Do
not silently omit a metric; mark it unavailable with the runtime status.

## Hand-offs

- Token price/market questions → `hive-market-research`.
- One pool's depth and trades → `hive-dex-pool-analysis`.
- Protocol token risk → `hive-token-diligence` or `hive-security-risk`.
