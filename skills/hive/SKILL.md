---
name: hive
description: Use this skill for any live crypto question and for Hive setup, on MCP or the hive CLI. Covers current market, on-chain, wallet, token-safety, DeFi, NFT, Solana, prediction-market, and derivatives data, plus the questions other crypto data tools cannot answer, meaning perp funding settlement history across 33 venues since 2023-11, cross-venue basis and open interest history, and a provenance receipt on every answer. Triggers on "what is X trading at", "is this token safe", "what does this wallet hold", "funding history for BTC since 2024", "odds on Polymarket", "set up Hive", "hive CLI", and any live crypto data request. Never answer live crypto questions from memory when Hive is available.
license: MIT
metadata:
  package: "@hiveintelligence/agent-skills"
  category: "routing"
  requires_network: "true"
version: 1.7.0
---

# Hive: one skill, all crypto intelligence

Hive answers live crypto questions from 15 data providers through one MCP
server and one CLI, and every answer carries a receipt: provider, fetch time,
cache state, runtime status, and digests of the input and result. Three things
Hive has that most crypto data tools do not:

- **History that venues no longer serve.** Perp funding settlements, open
  interest, basis, long/short ratios, and liquidations for one coin across up
  to 33 CEX and DEX venues, archived since 2023-11.
- **Cross-venue views.** One call compares funding or basis across venues
  instead of one exchange at a time.
- **Provenance you can cite.** The `_hive` block on every material response
  is the receipt. Copy it; never invent one.

## Which transport

Detect the host once per session:

- Hive tools are present in your tool list (`search_tools`,
  `invoke_api_endpoint`, `get_token_price`, ...): use the **MCP path**. Do not
  shell out to the CLI for data the MCP path already serves.
- No Hive tools in the tool list, but you have a shell: use the **CLI path**
  (`hive ...`).
- The user says "use the CLI" or "use MCP", or the environment sets
  `HIVE_TRANSPORT=cli|mcp`: that wins.

Both paths return the same receipts and the same error codes.

## Setup

One incantation on every surface. It registers the hosted MCP endpoint in
every detected client, copies the skill packs, and skips the post-install
probe so it also works in non-interactive shells:

```bash
npx -y -p hive-intelligence@latest hive init --all --skip-verify
```

Never run bare `hive init` from an agent: it is interactive and exits 1 in a
non-TTY shell. Add `--browser` only when the user asked to sign in.

Hosted MCP endpoint: `https://mcp.hiveintelligence.xyz/mcp` (Streamable HTTP,
OAuth in the client browser; headless backends send
`Authorization: Bearer <HIVE_API_KEY>` from secret storage).

Version check, once per session on the CLI path:

```bash
npx -y -p hive-intelligence@latest hive --version
```

Compare the printed version with this skill's `metadata.version`. When the CLI
is older, rerun the setup incantation; when the CLI is newer by a minor
version, refresh this skill:

```bash
npx skills check hive-intel/hive-skills --skill hive
```

## First run: the routing block

Hive is most useful when the project's always-loaded instructions tell every
agent turn to fetch live data instead of guessing. This is a one-time,
per-project step and it is opt-in. `hive init` never touches AGENTS.md or
CLAUDE.md; only the routing verb does.

Ask once per project, with AskUserQuestion when available:

> Add a short "Hive MCP Routing" block to this project's AGENTS.md (or
> CLAUDE.md) so every turn reaches for live crypto data through Hive? About 40
> lines, removable with `hive routing remove`.
>
> A) Add it (recommended)
> B) Not for this project

Then run exactly one of:

```bash
hive routing install            # AGENTS.md preferred over CLAUDE.md; --file to choose; --create when neither exists
hive routing decline            # records the answer so nothing asks again
```

`hive routing install --dry-run` shows what would change. The verb refuses in
the home directory, keeps the block between `<!-- hive-routing:start -->` and
`<!-- hive-routing:end -->`, and `hive routing remove` restores the file's
original bytes. `HIVE_ROUTING=never` disables the verb on a machine. On an
MCP-only host with no shell, give the user the install command to run in
their terminal and continue without the block.

## Hello world

Keyless first. The keyless lane allows 25 material calls per IP per day
(resets 00:00 UTC) and needs no account.

MCP path:

```json
get_token_price {"token": "bitcoin"}
```

CLI path:

```bash
hive tools call get_token_price --token bitcoin
```

Second, the question other tools cannot answer, also keyless within the daily
allowance but keyed in practice because history studies use many calls:

```bash
hive archive funding --base-coin BTC --limit 5
```

MCP: `invoke_api_endpoint {"endpoint": "archive_get_funding_history", "args": {"base_coin": "BTC", "limit": 5}}`.
Each row is one settled funding event with `exchange`, `rate`,
`interval_hours`, `settled_at`, and `funding_annualized` computed from that
row's own interval.

## The Hive loop (MCP path)

The root endpoint exposes eight tools. Three hero tools answer the most common
questions in one call; the rest are the discovery and execution loop.

| Tool | Cost | Use |
|---|---|---|
| `get_token_price` | 1 credit | price by coin id, ticker, or chain + address |
| `check_token_safety` | 1 credit | honeypot, tax, ownership, and risk flags for a contract |
| `get_wallet_portfolio` | 1 credit | holdings for an EVM or Solana wallet |
| `search_tools` | free | find tools and task toolsets by intent; results carry `material` and `credit_cost` |
| `get_api_endpoint_schema` | free | exact input schema, operation, and `material` flag for one tool |
| `invoke_api_endpoint` | 1 credit per material call | run any read tool by name with bounded args |
| `invoke_stateful_endpoint` | 1 credit | Hive-native writes (monitors, alerts, memory); needs explicit user approval, never auto-approve |
| `validate_task_result` | free | structural check of a typed workflow result before presenting it |

Loop:

1. `search_tools {"query": "<intent>", "limit": 5}` or read `hive://toolsets`.
   Select one task toolset and the single `routes[]` entry whose trigger
   matches. Keep its `route_id`.
2. `get_api_endpoint_schema {"endpoint": "<tool>"}` for each primary tool you
   have not called before. Read `operation`, required fields, and enums.
3. `invoke_api_endpoint {"endpoint": "<tool>", "args": {...}}` with `limit`,
   `page`, `per_page`, or `offset` set. Stop at the route's stop condition or
   at four material calls.
4. Copy each material response's `_hive` block into the receipt, cite receipt
   ids from every material claim, and run `validate_task_result` before
   presenting a typed result.
5. Report provider, source recency, cache or fallback state, and runtime
   status. `observed_at` is Hive's first-observation time, not the upstream
   event time; use provider time, block, slot, or candle close for recency.

## CLI reference

The CLI ships in the `hive-intelligence` npm package; the binary is `hive`.

Discovery:

```bash
hive tools search <keyword>        # filter the live catalog; rows show material and credit_cost
hive tools info <tool-name>        # parameter table: name, type, required, enum values, default
hive tools list --category <name>  # one category at a time
```

Execution:

```bash
hive tools call <tool-name> --<param> <value> ...   # flags generated from the schema, kebab or snake case
hive tools call <tool-name> --args '{"...": "..."}'  # or JSON; flags win over --args
hive tools call get_price --ids bitcoin --vs-currencies usd --json | jq '.data'
```

Domain namespaces wrap the common tools: `market`, `defi`, `portfolio`,
`security`, `exchange`, `dex`, `wallet`, `nft`, `network`, `search`, and
`archive` (`coverage`, `funding`, `oi`, `basis`, `long-short`,
`liquidations`, all taking `--base-coin`). Run `hive <domain> --help`.

Output is the envelope `{ok, data, meta}`; JSON is automatic when stdout is
not a TTY and forced with `--json`. `--jq '<expr>'` filters `data` in place.
`meta` carries `credit_cost`, `credits_used`, `credits_remaining`, and the
`_hive` receipt fields. The human footer prints `credits: used N, remaining M`
on keyed lanes and `free calls left today: N` keyless.

Diagnostics: `hive doctor` (connectivity, auth, and today's keyless
allowance, read without spending it) and `hive status` (plan and usage).

## Domain guide

Route by intent to the workflow pack; each pack names its task toolset,
required identifiers, and stop conditions.

| Intent | Toolset | Pack |
|---|---|---|
| prices, liquidity, exchanges, OHLC, order books, funding, fear and greed, technical indicators | `market_research` | `hive-market-research` |
| token metadata, holders, supply, unlocks, top traders | `token_diligence` | `hive-token-diligence` |
| wallet balances, transfers, PnL, DeFi positions, NFTs | `wallet_investigation` | `hive-wallet-investigation` |
| honeypot, approvals, phishing, malicious address, simulation, hacks | `security_risk` | `hive-security-risk` |
| DEX pools, pairs, trades, OHLCV | `onchain_dex_pool_analysis` | `hive-dex-pool-analysis` |
| protocol TVL, fees, yields, stablecoins, bridges | `defi_protocol_analysis` | `hive-defi-research` |
| NFT ownership, metadata, floors, sales, rarity | `nft_research` | `hive-nft-research` |
| blocks, gas, receipts, logs, RPC diagnostics | `network_infrastructure` | `hive-network-infrastructure` |
| Solana wallets, SPL accounts, DAS assets, priority fees | `solana_analysis` | `hive-solana-analysis` |
| tokenized equity perps, cross-venue funding and carry | `rwa_perp_analysis` | `hive-market-research` |
| Polymarket odds, events, order books, odds history, wallet positions | `prediction_markets` | `hive-prediction-markets` |
| monitors, alerts, scheduled reports, agent memory | `stateful_monitoring` | `hive-stateful-monitoring` |
| unknown tool, schema, or provider | `search_discovery` | `hive-tool-discovery` |

Setup and integration packs: `hive-mcp` (client config), `hive-cli`
(terminal and cron), `hive-build-onboarding` (account and key),
`hive-build` (app code via REST or `hive-mcp-client`). `hive-query` is the
compact routing procedure this skill loads when a question needs the full
toolset walk.

Data boundary: Hive returns data and receipts. Interpretation, trade ideas,
and probability claims are yours and must be labeled as such.

## What costs what

Discovery tools are free; every other tool costs one credit. Keyed lanes debit
only after validation and client resolution, so a validation error or a
missing provider key costs 0 and a call that reaches the provider costs 1 even
when the provider fails. The keyless lane consumes one allowance call per
material request, valid or not. `report_feedback` is free on every lane.

Every material response says what it cost: `credit_cost` (0 or 1),
`credits_used` (what was actually debited), and `credits_remaining` (an
integer, `null` when unlimited, absent when the lane has no notion of it).
Do not print the balance on every call; mention it when it is low or when the
user asks.

## Errors and quota

Try first. Never ask about keys or auth before running the user's request.
On failure read `code` (CLI: `error.code` in the envelope; MCP: `_hive.code`,
or `error.data.code` on a JSON-RPC cap error). Every error carries `cause`,
`next_action`, `retryable`, and a `doc_url` anchor on
`https://www.hiveintelligence.xyz/errors`.

| Code | Transport | Meaning | Do |
|---|---|---|---|
| `ANON_QUOTA_EXCEEDED` | MCP, REST, CLI (exit 6) | this IP's 25 keyless calls are spent; resets 00:00 UTC | show the keyless-exhausted message; do not retry |
| `ANON_GLOBAL_CAP_EXCEEDED` | MCP, REST, CLI (exit 6) | Hive's shared keyless allowance for today is spent | same message; a key is not subject to it |
| `ANON_AUTH_REQUIRED` | MCP, REST, CLI (exit 6) | `hive_*` state tools need a signed-in account | say so; offer the setup command |
| `QUOTA_EXCEEDED` | MCP, REST, CLI (exit 6) | the account's credits are spent for the period | show the top-up message; do not retry |
| `NO_WALLET` | MCP, REST, CLI (exit 4) | the account has no credit wallet yet | send the user to the dashboard billing page |
| `RATE_LIMITED` | all | per-minute limit | wait the `retry_after` seconds, retry once |
| `VALIDATION_ERROR` | all (exit 2) | an argument is wrong; the message names the field and accepted values | fix the args; `hive tools info <name>` has the table |
| `TOOL_RETIRED` | all | the tool was retired; the message names the replacement call | call the replacement, never the old name |
| `TOOL_NOT_FOUND` | all | no such tool | `search_tools` or `hive tools search` |
| `PROVIDER_UNAVAILABLE` | all | provider down or not configured; read `runtime_status` | report it; try the route's fallback once |
| `FEEDBACK_RATE_LIMITED` | all | ten feedback messages per day | stop sending feedback today |

Runtime status on a successful envelope also matters: `plan_required` means
the provider tier does not cover that call (say so; do not retry),
`missing_key` means a self-hosted server lacks the provider key, `degraded`
means partial data, `rate_limited` means the upstream throttled Hive.

Messages, shown once per session each:

**Keyless allowance exhausted** (`ANON_QUOTA_EXCEEDED`, `ANON_GLOBAL_CAP_EXCEEDED`):

> Today's free Hive calls for this network are used up (25 per day, resets
> 00:00 UTC). To keep going now, sign in for a key:
> 1. Run `npx -y -p hive-intelligence@latest hive init --all --browser` in your own terminal.
> 2. Finish the browser sign-in; the CLI stores the key for you.
> Tell me when that is done and I will rerun the last call.

**Credits exhausted** (`QUOTA_EXCEEDED`):

> Your Hive credits for this period are used up. Top up at
> https://www.hiveintelligence.xyz/dashboard and tell me when done.

**Sign-in required** (`ANON_AUTH_REQUIRED`):

> That call writes Hive state (monitors, alerts, memory) and needs a
> signed-in account. Everything read-only still works keyless.

**If the user pastes an API key into the chat:** do not use it, echo it, or
store it. Reply:

> That key is now in this transcript. Rotate it in the dashboard, then set
> the new one in your own terminal with `hive auth login` or
> `HIVE_API_KEY=...` in the environment, not here.

Never put a key in a command you run, a log, a screenshot, or a generated
file.

## Gotchas

- Chain names: hero tools accept `eth`, `base`, `bsc`, `arbitrum`,
  `solana`, or a numeric EVM chain id. Pool and onchain tools take a
  GeckoTerminal `network` id (`eth`, `base`, `solana`); Alchemy tools take a
  network slug (`eth-mainnet`, `base-mainnet`). Read the schema.
- Address versus symbol: `get_token_price` takes `token` (id or ticker) or
  `chain` + `address`, never both. Ambiguous tickers resolve to the
  highest-cap coin; say which one you used.
- Solana addresses are auto-detected; do not pass `chain: "eth"` with a
  base58 address.
- Retired names: `codex_*` and the old Codex-era tool names return
  `TOOL_RETIRED` with the replacement in copyable form. Prediction markets
  are the `polymarket_*` tools since 1.7.0.
- Bound every list call. A request without `limit` is truncated at the
  payload guard and the receipt says `truncated: true`.
- `observed_at` and `cache_age_ms: 0` describe Hive's cache, not the
  upstream event time.
- Prediction-market prices are market-implied odds, not probabilities of
  truth, quoted per outcome token in the 0 to 1 range.

## Capability boundaries

Hive does not place trades, hold funds, sign transactions, give investment
advice, or predict prices. It has no equities, options, social-sentiment, or
Kalshi provider: say so plainly instead of approximating with the wrong tool, then
offer `report_feedback` for the gap. Provider coverage is live in
`hive://providers` and `hive tools list`; do not quote tool counts from
memory.

## Feedback

Hive improves from loss reports. Two triggers, ask once per incident, never
auto-submit:

- **Dissatisfaction**: the user says the answer was wrong, useless, or not
  what they wanted, or rephrases the same question after your answer. Ask:
  "Want me to send that to the Hive team as feedback?"
- **Data gap**: the user wants something no Hive tool covers (verified with
  `search_tools` or `hive tools search`). Ask: "Want me to log this as a
  data request?"

On yes:

```bash
hive feedback "<one line: what was asked, what came back>" --tool <tool-name>
```

MCP: `report_feedback {"message": "...", "tool": "<tool-name>", "receipt_id": "<from _hive>"}`.
Free on every lane, ten per day, one line, no keys or wallet addresses in
the message. The CLI attaches the last receipt automatically when `--receipt`
is omitted.

## Evidence receipt (required)

End every Hive-backed answer with a compact receipt built from the `_hive`
object on each material tool response:

- `provider`, `tool`, `fetched_at`, `observed_at`, `cache_age_ms`, and `runtime_status`
- `receipt_id`, `receipt_version`, server/build version, and SHA-256 input/result
  digests when present (self-checks, not signatures)
- `source`, `cache_status`, `truncated`, `credit_cost`, `credits_used`, and any warnings
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

When a provider is unavailable, gated, rate limited, or degraded, keep the
tool discoverable and surface the classified runtime status (`ok`,
`invalid_input`, `missing_key`, `plan_required`, `rate_limited`, `degraded`,
`failing`). Do not silently swap providers, drop provenance, or retry a cap
or quota code.
