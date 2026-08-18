---
name: hive-security-risk
description: Use this skill before the user signs, approves, swaps, connects a wallet to a dApp, or touches an unknown contract, URL, or transaction payload — any "should I sign/approve/ape/connect" moment, even when the user only implies the transaction. Runs token, address, approval, phishing, and simulation risk checks and reports severity, evidence, and remediation instead of guessing. For research-style "is this token worth a look" questions use hive-token-diligence.
license: MIT
metadata:
  package: "@hiveintelligence/agent-skills"
  category: "security"
  requires_network: "true"
version: 1.3.0
---

# hive-security-risk — Security Risk

Assess transaction-time risk — tokens, addresses, approvals, dApps, phishing,
simulations — and report severity, evidence, and remediation. Wrong "looks
fine" answers here cost users real money, so never conclude safety without a
tool-backed check.

## Task toolset and identifiers

Toolset: `security_risk`. Read `hive://toolsets/security_risk` before
execution; it is authoritative for the current output schema, material-call
budget, phases, fallback condition, and stop conditions.

Required identifiers depend on the risk object: chain plus token contract,
wallet address, spender, dApp URL, or transaction payload. Never invent a
spender, owner, calldata, or URL — ask for whatever is missing.

Before choosing endpoints, select exactly one matching entry from the exact
workflow's routes[]. Follow its ordered steps, use a fallback only under that
step's published condition, stop at four material calls, and preserve the
selected route_id in the typed result. The broad coverageCatalog is discovery
coverage, not an execution plan.

## Procedure

1. Identify the risk object: token, address, approval, dApp, contract, or
   transaction payload.
2. Call `search_tools` for the matching security/risk capabilities.
3. Call `get_api_endpoint_schema` for each endpoint before calling it.
4. Run the narrowest risk check first; add simulation or approval analysis
   only when the required payload/owner details exist.
5. For Solana, send only the base64 serialized transaction to the GoPlus
   pre-execution check. Never ask for or forward signing secrets.
6. Report severity, evidence, and remediation steps.
7. Do not provide signing guidance while a critical risk is unresolved.

## Bounded calls

- Keep risk checks scoped to the provided contract, address, or payload.
- Avoid broad scans unless the user explicitly asks for an audit.
- Use severity and evidence rather than unsupported certainty.

## Worked example

User: "A dApp wants unlimited approval of my USDC
(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48) on Ethereum to spender
0x… — should I sign?"

1. Collect chain, token contract, owner wallet, and spender — all four are
   required before any approval analysis.
2. `search_tools` → `{"query": "token approval allowance spender risk ethereum", "limit": 5}`
3. `get_api_endpoint_schema` for the approval/address-risk endpoints returned,
   then `invoke_api_endpoint` with schema-valid arguments.
4. Report severity and remediation (for example "revoke, or approve a bounded
   amount") using the template below. If the spender flags critical risk, say
   "do not sign" plainly.

## Report template

```markdown
## Summary
[Risk level and the safest recommendation in one or two sentences.]

## Calls made
- Toolset: security_risk
- Endpoint(s): [exact endpoint names]
- Identifiers: [chain, risk object, addresses, payload]

## Evidence
- Flags: [provider risk flags with the fields that triggered them]
- Simulation/approval results: [if run]
- Provenance: [provider, fetched_at, observed_at/cache_age_ms, runtime status per call]

## Caveats
[Missing payload, incomplete provider coverage, degraded/rate-limited provider.]

## Next action
[Revoke approval, avoid signing, retry simulation, or provide missing payload.]
```

## Gotchas

- A token can pass metadata checks and still be risky.
- `plan_required` means the tool exists but cannot run under current upstream
  credentials — say the check is unavailable, never that the asset is safe.
- Do not provide signing instructions when a critical risk is unresolved.

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

`rate_limited` and `degraded` can be retried with backoff. `plan_required`
means the tool exists but the upstream account cannot execute it right now. A
blocked check is a caveat in the report, not a clean bill of health.

## Hand-offs

- Broader "is this token a good buy" research → `hive-token-diligence`.
- Wallet-wide activity review → `hive-wallet-investigation`.
- Solana mint or transaction safety → `hive-solana-analysis`.
