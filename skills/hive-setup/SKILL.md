---
name: hive-setup
description: Use this skill to install, connect, sign in to, verify or remove Hive in an AI client or shell, or to get an API key for a server or script. Run it yourself with /hive-setup.
disable-model-invocation: true
license: MIT
metadata:
  package: "@hiveintelligence/agent-skills"
  category: "setup"
  requires_network: "true"
version: 1.20.5
---

# Hive setup

Hive is one hosted MCP server, a CLI and the `hive` skill:

- MCP URL: `https://mcp.hiveintelligence.xyz/mcp` (Streamable HTTP).
- Every data call needs a free account or an API key. Clients that support
  OAuth open a sign-in page on first use (GitHub, Google or an emailed code).
  The Free plan has 10,000 credits a month.

## Hermes Agent

Hermes connects with one command and runs no Hive code:

```bash
hermes mcp add hive --url https://mcp.hiveintelligence.xyz/mcp --auth oauth --connect-timeout 300
```

It opens the Hive sign-in page once. Prefer this on Hermes over the command
below.

## One command for every client on this machine

```bash
npx -y -p hive-intelligence@1.20.5 hive init --all --skip-verify
```

This changes the machine in three ways: it adds Hive to the config of every AI
client it detects, installs the `hive` CLI globally with npm (skip with
`--skip-global`), and installs the Hive skills (skip with `--skip-skills`). Tell
the user exactly that and get an explicit yes before running it; for one
client, use the next section instead. Never run bare `hive init` from an
agent: it is interactive and exits 1 in a shell without a terminal. Add
`--browser` only when the user wants to sign the CLI in now.

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
credential; `HIVE_API_KEY` in the environment also works. With no browser on
the machine (SSH, CI, a container), `hive auth login --device` prints a code
and a link. Give both to the person, who approves the code on any device; the
CLI waits and stores the credential. `hive auth login` picks this on its own
when it detects no browser.

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

The `hive` skill (used automatically for crypto questions) and this setup
skill come with the Hive plugin for your client, or with the one command above.
Nothing else needs installing.

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
steps for clients configured in their own UI, and deletes the installed skills.

## Stay current

The hosted server updates itself. A global CLI or a local stdio config stays on
the version it was installed with; to upgrade, install the newer version by its
number from the Hive changelog (https://docs.hiveintelligence.xyz/reference/changelog):

```bash
npm install -g hive-intelligence@1.20.5
```

Never write `npx hive-mcp`: that npm name belongs to an unrelated package.
