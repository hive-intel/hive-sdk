---
name: hive-setup
description: Use this skill to install, connect, sign in to, verify or remove Hive in an AI client or shell, or to get an API key for a server or script. Run it yourself with /hive-setup.
disable-model-invocation: true
license: MIT
metadata:
  package: "@hiveintelligence/agent-skills"
  category: "setup"
  requires_network: "true"
version: 1.20.1
---

# Hive setup

Hive is one hosted MCP server, a CLI and the `hive` skill:

- MCP URL: `https://mcp.hiveintelligence.xyz/mcp` (Streamable HTTP).
- Every data call needs a free account or an API key. Clients that support
  OAuth open a sign-in page on first use (GitHub, Google or an emailed code).
  The Free plan has 10,000 credits a month.

## One command for every client on this machine

```bash
npx -y -p hive-intelligence@latest hive init --all --skip-verify
```

It registers the hosted URL in every detected client and copies the Hive
skills. Never run bare `hive init` from an agent: it is interactive and exits 1
in a shell without a terminal. Add `--browser` only when the user wants to
sign the CLI in now.

## One client

Read `references/clients.md` and follow the block for the user's client
(Claude Code, Claude, Cursor, VS Code, Windsurf, Gemini CLI, Codex, ChatGPT,
Grok, and the OpenAI Responses API). The URL is the same everywhere; only
where it goes differs. Never put a placeholder `Authorization` header in a
config.

## Servers, scripts and CI

No browser to click means an API key:

1. The user creates one at https://www.hiveintelligence.xyz/dashboard/keys.
2. It goes in secret storage as `HIVE_API_KEY`, never in a prompt, a shared
   config, a repository or browser code.
3. MCP clients send it as `Authorization: Bearer <key>`; the CLI reads it from
   the environment (`hive research-token PEPE --json`).

For the CLI: `hive auth login` signs in through the browser and stores the
credential; `HIVE_API_KEY` in the environment also works.

## Runtime status handling

- `missing_key` or HTTP 401 on a data call: the client is not signed in.
  Reconnect the server in the client (it reopens the sign-in page) or set
  `HIVE_API_KEY`.
- `rate_limited` with a quota message: the plan's monthly credits are spent;
  the message says when they reset.
- Any other status: run `hive doctor` and follow its fix.

## Verify

Ask the connected client: "What Hive tools do you have?" It should list nine
tools (`find_token`, `get_token_price`, `check_token_safety`,
`research_token`, `analyze_wallet`, `market_positioning`, `market_overview`,
`defi_yields`, `prediction_markets`). Then ask "Is PEPE on Ethereum safe to
buy, and what is it worth?" The answer should name GoPlus and CoinGecko with
fetch times. From a shell:

```bash
hive doctor
```

## Skills

```bash
npx skills add hive-intel/hive-sdk
```

installs `hive` (used automatically for crypto questions) and this setup
skill.

## Optional: project routing block

`hive routing install` adds a short block to the project's AGENTS.md or
CLAUDE.md telling every agent turn to use Hive for live crypto data. Ask the
user first; `hive routing remove` restores the file. `hive routing decline`
records a no.

## Remove

```bash
hive uninstall
```

removes Hive entries from client configs it can safely locate, prints the
steps for clients configured in their own UI, and deletes the copied skills.

## Stay current

The hosted server updates itself. A local stdio config must launch
`hive-intelligence@latest`. Never write `npx hive-mcp`: that npm name belongs
to an unrelated package. To update a global CLI:

```bash
npm install -g hive-intelligence@latest
```
