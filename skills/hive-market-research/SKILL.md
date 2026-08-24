---
name: hive-market-research
description: Use this skill for any live crypto market question — prices, 24h moves, liquidity, exchange/venue data, OHLC candles, order books, tickers, funding rates, derivatives, trading context — even casual asks like "what's BTC at" or "is ETH pumping". Use it whenever the answer needs current market numbers instead of memory. For on-chain pool depth and DEX trades use hive-dex-pool-analysis; for protocol TVL/fees/yields use hive-defi-research.
license: MIT
metadata:
  package: "@hiveintelligence/agent-skills"
  category: "market"
  requires_network: "true"
version: 1.4.0
---

# hive-market-research — Market Research

Answer live price, liquidity, exchange, OHLC, order-book, derivatives, and
trading-context questions with sourced, timestamped market data.

## Task toolset and identifiers

Toolset: `market_research`. Read `hive://toolsets/market_research` before
execution; it is authoritative for the current output schema, material-call
budget, phases, fallback condition, and stop conditions.

For tokenized real-world-asset perps (stock/pre-IPO/ETF/index/commodity/FX
perps — funding, rollover carry, cross-venue markets), route to
`rwa_perp_analysis` instead and read `hive://toolsets/rwa_perp_analysis`; its
rows carry `funding_mechanism` (a `funding_plus_borrow` rollover is never
sign-comparable with a funding transfer), `is_delisted`, and
`is_price_suspect` fields that must be respected in the answer.

- Required: asset (token id, symbol, or contract address) and quote currency
  (usually `usd`).
- Venue/exchange id when the request is order-book, ticker, or derivatives
  specific.
- Time window and candle interval for OHLC or trend questions.

Ask for missing venue or chain details when the choice changes the answer. For
general price questions, choose a broad market-data tool and state the source.

Before choosing endpoints, select exactly one matching entry from the exact
workflow's routes[]. Follow its ordered steps, use a fallback only under that
step's published condition, stop at four material calls, and preserve the
selected route_id in the typed result. The broad coverageCatalog is discovery
coverage, not an execution plan.

## Procedure

1. Resolve ambiguous symbols first — call `search_tools` with the asset and
   intent.
2. Call `get_api_endpoint_schema` for each market endpoint before calling it.
3. Prefer focused calls: price, ticker, OHLC, order book, or funding data —
   not everything at once.
4. For derivatives questions, include funding/open-interest context when
   available.
5. For Hyperliquid perp questions, filter discovery to `Hyperliquid`, inspect
   the typed endpoint schema, and bound time-series calls by time range and
   pagination limits. Continue from the returned timestamp when a funding
   scan reports an incomplete range.
6. Return freshness with every number, and avoid trading conclusions without
   liquidity context.

## Bounded calls

- Use small limits for candles and order-book depth unless the user asks for
  more.
- Avoid fetching all exchanges or all markets for a single-asset question.
- Bound Hyperliquid funding scans with an explicit time range, `max_points`,
  and `max_pages`. Treat `pointCount` as the range total only when
  `pointCountIsTotal` is true; otherwise continue from `range.nextStartTime`
  and de-duplicate the inclusive boundary.
- Do not compare data from different timestamps without saying so.

## Worked example

User: "What's the BTC funding picture across exchanges right now — anything
crowded?"

1. `search_tools` → `{"query": "funding rates derivatives bitcoin exchanges", "limit": 5}`
2. `get_api_endpoint_schema` for the funding-rate endpoint returned, then
   `invoke_api_endpoint` with schema-valid arguments and a bounded venue list.
3. Report per-venue funding with the provider timestamp when present. Treat
   `observed_at` as Hive first-observation time and `fetched_at` as retrieval
   completion; flag source recency as unknown when no provider time exists,
   and flag stale or degraded venues,
   and avoid a directional trade call unless asked.

If the user says "check the order book" without naming a venue, ask which
exchange — order-book liquidity is venue-specific.

## Report template

```markdown
## Summary
[Current market read in one sentence.]

## Calls made
- Toolset: market_research
- Endpoint(s): [exact endpoint names]
- Identifiers: [asset, venue, interval, quote]

## Evidence
- [Key metrics: price, volume, depth, funding — with venue and provider]
- Freshness: [Hive observed_at/cache_age_ms plus provider timestamps or candle closes; fetched_at is retrieval completion; source recency unknown if provider time is absent]

## Caveats
[Stale data, missing venue, fallback, degraded provider, thin liquidity.]

## Next action
[Deeper venue, time-window, or liquidity drilldown — only if needed.]
```

## Gotchas

- Symbols collide. Prefer contract addresses, provider ids, or venue ids over
  bare tickers.
- Order-book liquidity is venue-specific; do not generalize it to the full
  market.
- Market data can be fresh but still incomplete if a venue/provider is
  degraded.

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

Report `ok`, `invalid_input`, `missing_key`, `plan_required`, `rate_limited`,
`degraded`, or `failing` per tool/provider. If a venue endpoint is degraded, fall back to
another public market-data endpoint and state the substitution.

## Hand-offs

- On-chain pool depth, swaps, OHLCV per pool → `hive-dex-pool-analysis`.
- Protocol TVL, fees, revenue, yields → `hive-defi-research`.
- "Is this token safe" rather than "what's the price" → `hive-token-diligence`.
