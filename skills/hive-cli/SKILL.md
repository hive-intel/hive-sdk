---
name: hive-cli
description: Use this skill when the user wants Hive from a terminal — "run a CLI command for…", "show me from the terminal", "pipe this into jq", "give me a shell script", "set up a daily briefing", cron jobs, or local diagnostics like hive doctor. Covers install, auth, hive tools call, JSON/jq output, and scripting patterns. For agent-side tool calls use the MCP path instead; for app code use hive-build.
license: MIT
metadata:
  package: "@hiveintelligence/agent-skills"
  category: "setup"
  requires_network: "true"
version: 1.4.0
---

# hive-cli — Hive From the Terminal

Run Hive from a shell: one-off queries, jq pipelines, cron briefings, and
diagnostics.

The Hive CLI lives in the `hive-intelligence` npm package; the
executable name is `hive`. Package and binary names differ on purpose
— the npm package also ships the stdio MCP server and bundled skills
installer. One install, multiple agent entrypoints.

## Bootstrap

If the user doesn't have the CLI installed:

```bash
# One-time install (adds --browser to sign in at the same time)
npx -y -p hive-intelligence@latest hive init --all --skip-verify --browser

# Or, install globally for repeated use
npm install -g hive-intelligence
hive auth login
```

`init --browser` runs the browser sign-in flow described in `hive-build-onboarding`.

## Common commands

```bash
hive doctor                                                 # connectivity + auth check
hive status                                                 # version, profile, masked key, endpoint
hive tools list                                             # full live tool catalog
hive tools search <keyword>                                 # filter the catalog
hive tools info <tool-name>                                 # input schema for one tool
hive tools call get_price --ids bitcoin --vs-currencies usd # price query
hive tools call get_protocol_tvl --protocol aave            # DeFi TVL query
hive uninstall --all                                        # remove from every client
```

`hive tools call` runs any tool in the catalog. Its flags come from the
tool's schema, in kebab-case or snake_case (`hive tools info <tool-name>`
lists them), and `--args '<json>'` passes the whole payload at once. Run
`hive --help` for the full command list.

## JSON output and jq

Tool output is the envelope `{ ok, data, meta }`. JSON is emitted automatically
when stdout is not a TTY (when piped) or with `--json`; an interactive terminal
prints human-readable output. Filter it two ways:

```bash
# Built-in --jq runs against the data payload directly (envelope-aware)
hive tools call get_price --ids bitcoin --vs-currencies usd --jq '.bitcoin.usd'

# Or pipe the --json envelope to external jq and read under .data
hive tools call get_defi_protocols --json | jq '.data[0].name'
```

## Daily briefing pattern

```bash
#!/bin/bash
set -euo pipefail

echo "=== Daily Crypto Briefing ==="
echo
echo "--- Watchlist ---"
hive tools call get_price --ids bitcoin,ethereum,solana --vs-currencies usd --json \
  | jq -r '.data | to_entries[] | "\(.key): $\(.value.usd)"'
echo
echo "--- Top Coins ---"
hive tools call get_coins_market_data --vs-currency usd --per-page 5 --json | jq '.data'
echo
echo "--- DeFi TVL Leaders ---"
hive tools call get_defi_protocols --json | jq '.data[:5]'
```

Schedule with cron:

```cron
0 8 * * * /path/to/briefing.sh >> /var/log/crypto-briefing.log 2>&1
```

## Authentication options

1. **`hive auth login`** — interactive browser sign-in. Stores the key
   in `~/.config/hive/credentials.json` (override with `HIVE_CONFIG_DIR`).
   Recommended for personal machines.
2. **`HIVE_API_KEY=hive_live_…`** — env var. Recommended for CI,
   Docker, scripts. The CLI reads the env var per-command.
3. **`hive --api-key <key> ...`** — one-shot override. Useful for
   testing a different account without rotating the saved cred.

`hive status` confirms which path the CLI is using.

## Output formats

- `--json` — force the JSON envelope (default when stdout is piped)
- `--pretty` — force human-readable output (default in an interactive terminal)
- `--jq <expr>` — filter the data payload with a jq expression
- `--fields <list>` — keep only the named fields
- `--csv` — CSV for array results
- `-q, --quiet` — suppress non-data output, useful in pipes

## When to use the CLI vs the MCP

- **CLI** — terminal workflows, cron jobs, shell scripts, one-off
  exploration during a chat session.
- **MCP** — let Claude Code / Cursor / Claude Desktop call tools as
  part of its reasoning. The user doesn't see commands; the agent
  calls tools transparently.

If the user is in Claude Code and asks "what's BTC?", call the MCP
tool. If they ask "give me a shell script that fetches BTC daily",
write a `hive tools call get_price …` invocation in the script.

## Runtime status handling

CLI and MCP responses should be interpreted with Hive's runtime states:
`ok`, `invalid_input`, `missing_key`, `plan_required`, `rate_limited`, `degraded`, and
`failing`. In scripts, retry `rate_limited` and `degraded` with backoff, but
surface `missing_key` or `plan_required` to the operator.

## Reference

- CLI command reference: https://www.hiveintelligence.xyz/cli
- CLI tutorial: https://www.hiveintelligence.xyz/tutorials/cli
- One-command install: https://www.hiveintelligence.xyz/install/claude-skill
