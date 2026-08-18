---
name: hive-solana-analysis
description: Use this skill for anything Solana-native — wallets, mints, SPL token accounts, DAS assets, parsed transactions, priority fees, pump.fun launches, Solana NFTs, Solana token risk. Prefer it over EVM-shaped skills whenever the identifier is a base58 address, mint, or transaction signature, even if the user never says "Solana". Uses Solana-native identifiers and providers instead of EVM assumptions.
license: MIT
metadata:
  package: "@hiveintelligence/agent-skills"
  category: "solana"
  requires_network: "true"
version: 1.3.0
---

# hive-solana-analysis — Solana Analysis

Analyze Solana wallets, mints, SPL accounts, DAS assets, parsed transactions,
priority fees, and launch data with Solana-native tools — never EVM
assumptions.

## Task toolset and identifiers

Toolset: `solana_analysis`. Read `hive://toolsets/solana_analysis` before
execution; it is authoritative for the current output schema, material-call
budget, phases, fallback condition, and stop conditions.

- Required: Solana wallet, mint, token account, asset id, program id, or
  transaction signature.
- Optional: slot/time window, owner, collection, token filter.

Wallets, mints, token accounts, and asset ids are different identifier types —
classify before selecting tools. Do not apply EVM address, chain-id, or
approval assumptions to Solana requests.

Before choosing endpoints, select exactly one matching entry from the exact
workflow's routes[]. Follow its ordered steps, use a fallback only under that
step's published condition, stop at four material calls, and preserve the
selected route_id in the typed result. The broad coverageCatalog is discovery
coverage, not an execution plan.

## Procedure

1. Classify the identifier: wallet, mint, token account, asset, program, or
   transaction signature.
2. Call `search_tools` for Solana wallet, SPL token, DAS, parsed-transaction,
   priority-fee, or launch-data capabilities.
3. Call `get_api_endpoint_schema` for each endpoint before calling it.
4. Use wallet paths for owner/balance/history questions; mint/asset paths for
   token/NFT questions.
5. Prefer Helius `getTransactionsForAddress` or `getTransfersByAddress` for
   current address history. Treat Enhanced Transactions parsers as deprecated
   compatibility surfaces.
6. For a prepared serialized transaction, run the GoPlus Solana pre-execution
   check before signing guidance; never request a private key or seed phrase.
7. For execution context, include slot, priority fee, and freshness.

## Bounded calls

- Limit parsed history, asset lists, and token accounts.
- Include slot or fetched time where available.
- Avoid multi-provider mixing without source labels.

## Worked example

User: "This pump.fun token is mooning — can you check the mint
<base58 mint> for safety and who holds it?"

1. Classify: a base58 mint → token/security and asset paths, not wallet paths.
2. `search_tools` → `{"query": "solana mint token security holders launch data", "limit": 5}`
3. `get_api_endpoint_schema` for the mint-security and holder endpoints
   returned, then `invoke_api_endpoint` with schema-valid arguments.
4. Report safety flags, holder concentration, and launch context with slot or
   provider time, `observed_at`/`cache_age_ms`, and Hive retrieval time
   (`fetched_at`).

If the user gives a wallet instead, use owner/balance/token-account paths and
add parsed history only for activity questions.

## Report template

```markdown
## Summary
[Solana-specific read in one or two sentences.]

## Calls made
- Toolset: solana_analysis
- Endpoint(s): [exact endpoint names]
- Identifiers: [wallet/mint/asset/signature, filters]

## Evidence
- Balances/assets/transactions/fees: [as relevant]
- Provenance: [provider, slot, fetched_at, observed_at/cache_age_ms, runtime status per call]

## Caveats
[Missing key, rate limit, DAS coverage, stale slot, truncated history.]

## Next action
[Transaction drilldown, asset verification, or risk check — only if needed.]
```

## Gotchas

- Wallets, mints, token accounts, and asset ids are different identifiers.
- Priority-fee estimates are time-sensitive.
- Parsed-transaction coverage can vary by provider and transaction type.

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

Classify Helius or other Solana provider issues as `invalid_input`,
`missing_key`, `plan_required`, `rate_limited`, `degraded`, or `failing`. Ask for a retry only when the status
is transient.

## Hand-offs

- EVM wallets and tokens → `hive-wallet-investigation` / `hive-token-diligence`.
- EVM NFT collections → `hive-nft-research`.
- Cross-chain market prices → `hive-market-research`.
