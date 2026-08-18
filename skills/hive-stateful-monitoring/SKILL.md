---
name: hive-stateful-monitoring
description: Use this skill whenever the user wants Hive to remember, watch, monitor, schedule, alert, or report on crypto state across sessions — "watch this wallet", "alert me if the price moves", "send me a daily digest", "what changed since last time", "remember that I care about X". Converts durable intent into Hive monitors, alerts, reports, and memory facts that Hive workers execute later. For one-off live questions use hive-query or a domain skill instead.
license: MIT
metadata:
  package: "@hiveintelligence/agent-skills"
  category: "stateful-monitoring"
  requires_network: "true"
version: 1.3.0
---

# hive-stateful-monitoring — Stateful Monitoring

Turn durable intent — watch, alert, schedule, remember — into Hive monitors,
alerts, reports, and memory facts. Monitor execution happens on Hive workers
between sessions, not in the current chat, so the contract is: capture intent
precisely, confirm what was saved, and never pretend something was saved when
the call failed.

## Task toolset and identifiers

Toolset: `stateful_monitoring`. Read `hive://toolsets/stateful_monitoring`
before execution; it is authoritative for the current output schema,
material-call budget, phases, fallback condition, stop conditions, and the
read/write routing policy.

Required identifiers: monitor kind and target object. Worker-supported monitor
kinds are `wallet`, `token`, `protocol`, `market`, `prediction_market`,
`watchlist_digest`, `token_discovery_risk`, and `risk_watch`.

Before choosing endpoints, select exactly one matching entry from the exact
workflow's routes[]. Follow its ordered steps, use a fallback only under that
step's published condition, stop at four material calls, and preserve the
selected route_id in the typed result. The broad coverageCatalog is discovery
coverage, not an execution plan.

## Procedure

1. Convert the user's durable intent into a monitor `kind`, `target`,
   `rules`, and `cadence`.
2. Inspect each exact endpoint schema. On the compact root, state reads route
   through `invoke_api_endpoint`. Every create, update, archive, remember,
   forget, acknowledge, or resolve action routes through
   `invoke_stateful_endpoint`, which must never be auto-approved.
3. Call `hive_list_monitors` before creating — update instead of duplicating.
4. Describe the proposed state change to the user and obtain explicit approval.
5. Call `hive_create_monitor` for new watch requests, `hive_update_monitor`
   to change cadence, rules, target, metadata, or status, and
   `hive_archive_monitor` when the user asks Hive to stop watching.
6. For "what changed / what is alerting / what does Hive remember": use
   `hive_get_monitor_runs`, `hive_list_observations`, `hive_list_alerts`,
   `hive_get_latest_snapshot`, or `hive_generate_monitor_report`.
7. Use `hive_update_alert_status` when the user acknowledges, reopens, or
   resolves an alert.
8. Use `hive_remember_fact`, `hive_list_memory_facts`, and
   `hive_forget_memory_fact` for durable user-scoped facts that should appear
   in future monitor reports.
9. After any write, verify the persisted result, then confirm back to the user exactly what is being watched,
   the rules, and the cadence — that confirmation is their only window to
   catch a mis-captured intent before workers start running it.

For B2B adapters serving multiple tenants/end users, read
`references/b2b-subject-context.md` before using subject-scoped state or the
`hive_list_subjects` / `hive_get_subject` / `hive_archive_subject` /
`hive_list_subject_audit_events` tools.

## Worked example

User: "Watch this Ethereum wallet and tell me when it moves more than $100k."

1. `hive_list_monitors` — no existing monitor for this wallet.
2. `hive_create_monitor` with kind `wallet`, the Ethereum address as target,
   a large-transfer rule with the $100k threshold, and the requested or
   default cadence.
3. Confirm: "Watching 0x… on Ethereum; you'll get an alert on any transfer
   over $100k; checks run on Hive workers at [cadence]."

User: "Send every customer a daily crypto watchlist brief."

Create a `watchlist_digest` monitor per B2B subject with saved wallets,
tokens, protocols, markets, and optional prediction markets in the target —
after reading the B2B reference above.

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
`observed_at` is Hive's first-observation/original cache-population time, not
necessarily upstream event time. Use provider time, block, slot, transaction,
or candle close for source recency; if absent, mark upstream recency unknown.
Run `validate_task_result` before presenting the typed workflow result; it
checks structure but cannot authenticate an invented receipt.

## Runtime status handling

If stateful tools return `missing_key` or an auth-required error, explain
that hosted MCP authentication or the Hive persistence backend must be
configured before durable monitoring can be used. Do not pretend the monitor
was saved.

## Hand-offs

- One-off live question, no durable intent → `hive-query` or the matching
  domain skill.
- The data to monitor needs diligence first (which token? which pool?) → run
  the domain skill, then create the monitor.
