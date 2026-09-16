---
name: hive-prediction-markets
description: Use this skill when the user asks about prediction markets, meaning Polymarket events, markets, outcomes, odds, prices, order books, liquidity, odds history, or a wallet's positions and trades, including "what are the odds of X", "find markets about Y", or Kalshi questions (answer from Polymarket and say Kalshi is not covered). Use it whenever live prediction-market evidence is needed. Never present market probability as ground truth.
license: MIT
metadata:
  package: "@hiveintelligence/agent-skills"
  category: "prediction-markets"
  requires_network: "true"
version: 1.7.0
---

# hive-prediction-markets: Prediction Markets

Discover and analyze Polymarket prediction markets with prices, order books,
odds history, and wallet positions and trades, always framed as
market-implied odds rather than truth. Polymarket's Gamma, CLOB, and Data
APIs are keyless, so these tools work on the keyless lane. Kalshi is not
covered: its developer agreement requires a data license Hive does not hold,
so answer Kalshi questions from Polymarket where a matching market exists and
say plainly that the Kalshi side is unavailable.

## Task toolset and identifiers

Toolset: `prediction_markets`. Read `hive://toolsets/prediction_markets` before
execution; it is authoritative for the current output schema, material-call
budget, phases, fallback condition, and stop conditions.

- Polymarket: `polymarket_search_markets` (topic), `polymarket_get_events`
  (event slug), `polymarket_get_market` (market slug or condition id),
  `polymarket_get_price_history` and `polymarket_get_orderbook` (CLOB token
  id), `polymarket_get_wallet_positions` and `polymarket_get_wallet_activity`
  (EVM wallet address).
- Required: a market slug, condition id, token id, wallet address, or a
  search query, depending on the request.
- Optional: status filter, limit, interval, depth, outcome.

If the user starts with a topic, search candidates first and ask for selection
when multiple markets match; similar markets can have different resolution
criteria.

Before choosing endpoints, select exactly one matching entry from the exact
workflow's routes[]. Follow its ordered steps, use a fallback only under that
step's published condition, stop at three material calls, and preserve the
selected route_id in the typed result. The broad coverageCatalog is discovery
coverage, not an execution plan.

## Procedure

1. Call `search_tools` with the venue and need, or read
   `hive://toolsets/prediction_markets`.
2. Call `get_api_endpoint_schema` for each endpoint before calling it.
3. Search markets or events for topic prompts; resolve the exact slug,
   ticker, condition id, or token id before pulling books, history, or
   trades.
4. Add liquidity, spread, and freshness context before interpreting prices.
5. Report the implied odds per outcome, volume or liquidity, venue, provider,
   and freshness, and never present probability as ground truth.

## Bounded calls

- Use small search limits and page through only when needed.
- Do not fetch all trades or a wallet's full history unless the user asks
  for a deep dive.
- Keep outcome-token prices separate from event-level interpretation.

## Worked example

User: "What are the odds on the next Fed rate decision, and how has that
moved this month?"

1. `polymarket_search_markets` with `{"query": "fed rate decision", "limit": 5}`.
2. If several markets match, list candidates with resolution criteria and ask
   which to inspect, or pick the highest-liquidity exact match and say so.
3. `polymarket_get_orderbook` for the YES token, then
   `polymarket_get_price_history` with `{"token_id": "...", "interval": "1m"}`,
   and report bid, ask, mid, spread, liquidity, and the month's move.
4. Frame the prices as market-implied odds with volume and freshness.

## Report template

```markdown
## Summary
[Market or event read and top outcomes in one or two sentences.]

## Calls made
- Toolset: prediction_markets
- Endpoint(s): [exact endpoint names]
- Identifiers: [slug, condition id, token id, wallet]

## Evidence
- Outcomes and prices: [per outcome, per venue]
- Liquidity, spread, volume: [values plus as-of]
- Provenance: [provider, fetched_at, observed_at or cache_age_ms, runtime status per call]

## Caveats
[Market probability is not truth, thin liquidity, stale history, candidate ambiguity.]

## Next action
[Inspect the selected market, book, history, or wallet, only if needed.]
```

## Gotchas

- Market prices reflect trading and liquidity, not verified probability.
- Similar markets can have different resolution criteria; quote them when
  comparing venues.
- Prices are per outcome token in the 0 to 1 range; the YES and NO tokens of
  one market are separate books.
- Event-level and market-level data are not interchangeable.

## Evidence receipt (required)

End every Hive-backed answer with a compact receipt built from the `_hive`
object on each material tool response:

- `provider`, `tool`, `fetched_at`, `observed_at`, `cache_age_ms`, and `runtime_status`
- `receipt_id`, `receipt_version`, server/build version, and SHA-256 input/result
  digests when present (self-checks, not signatures)
- `source`, `cache_status`, `truncated`, and any warnings
- canonical market identifiers (slug, condition id, token id) present
  in provider data
- material provider disagreements and how they were handled
- checks that were unavailable, gated, stale, truncated, or intentionally not run
- a `claims[]` citation from each material statement to exact receipt IDs
- one `coverage[]` entry for every canonical evidence phase, with each gap explained

Never turn missing evidence into a clean result, silently merge conflicting
provider values, or omit a degraded/fallback call from the receipt.
`observed_at` is Hive's first-observation/original cache-population time, and
`cache_age_ms: 0` only means newly retrieved by Hive. Use provider time or
trade time for source recency; if absent, mark it unknown. Run
`validate_task_result` before presenting the typed workflow result; it checks
structure but cannot authenticate an invented receipt.

## Runtime status handling

If a market search succeeds but the book or history read is `degraded`,
return the candidates and label the missing market details clearly.

## Hand-offs

- General crypto market prices: `hive-market-research`.
- A trader's full wallet activity outside Polymarket: `hive-wallet-investigation`.
- Standing "alert me when odds move" requests: `hive-stateful-monitoring`
  with a `prediction_market` monitor.
