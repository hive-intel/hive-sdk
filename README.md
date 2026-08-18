<div align="center">

# Hive Intelligence

**One connection for evidence-backed crypto due diligence.**

Every Hive-backed answer carries sources, freshness, and a runtime receipt. The
hosted MCP normalizes market, wallet, DeFi, security, DEX, NFT, network, and
prediction-market evidence behind one agent-ready connection.

[![MCP](https://img.shields.io/badge/MCP-compatible-111827.svg)](https://modelcontextprotocol.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Docs](https://img.shields.io/badge/docs-hiveintelligence.xyz-purple.svg)](https://hiveintelligence.xyz)
[![Cursor setup](https://img.shields.io/badge/Cursor-Setup-000000.svg?logo=cursor)](https://www.hiveintelligence.xyz/install/cursor)
[![VS Code setup](https://img.shields.io/badge/VS_Code-Setup-0098FF?logo=visualstudiocode&logoColor=white)](https://www.hiveintelligence.xyz/install/vs-code)

[**Connect**](#connect) · [**Tools**](#tools--discovery) · [**Security**](#security--trust) · [**SDK**](#typescript-sdk--hive-mcp-client) · [**CLI**](#cli) · [**Pricing**](#pricing) · [**FAQ**](#faq) · [**Get an API key**](https://hiveintelligence.xyz/dashboard/keys)

</div>

> ⚡ **New here?** [Run a fixed read-only demo](https://www.hiveintelligence.xyz/playground) without an account · [Install guides](https://www.hiveintelligence.xyz/install) · [Example prompts](#example-prompts)

---

## Connect

Hive is a **hosted MCP server** for clients that support remote Streamable HTTP.
Once the hosted OAuth deployment is enabled, interactive clients discover it
from the public endpoint and open browser authorization. Headless agents can
use an API key from secret storage:

```text
https://mcp.hiveintelligence.xyz/mcp
```

[![Cursor setup](https://img.shields.io/badge/Cursor-Setup-000000.svg?logo=cursor)](https://www.hiveintelligence.xyz/install/cursor)
[![VS Code setup](https://img.shields.io/badge/VS_Code-Setup-0098FF?logo=visualstudiocode&logoColor=white)](https://www.hiveintelligence.xyz/install/vs-code)

The setup pages check the live protected-resource metadata, server card,
release version, and required client redirect profiles before showing a native
install action. Until that gate passes, use the API-key fallback from a trusted
backend/client; never put a key in an install link. Per-client config blocks are
below.

## What is Hive Intelligence?

A managed MCP server, REST API, and CLI that give AI agents one evidence-backed
workflow surface over live crypto market data, DeFi, wallets, token security,
DEX flows, NFTs, prediction markets, and on-chain network data. Agents receive
the provider, Hive retrieval time, Hive first-observation/original cache time,
cache age, fallback state, runtime status, and a unique receipt for every
material execution instead of silently mixing provider data.

## Connect to your AI client

The hosted endpoint is the same everywhere. After OAuth activation,
interactive clients should start with URL-only OAuth discovery. API-key auth
remains the explicit headless fallback.

### Claude Code

```bash
claude mcp add --transport http --scope user hive https://mcp.hiveintelligence.xyz/mcp
```

### Cursor

`~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (project):

```json
{
  "mcpServers": {
    "hive": {
      "url": "https://mcp.hiveintelligence.xyz/mcp"
    }
  }
}
```

### VS Code (GitHub Copilot Chat)

`.vscode/mcp.json` (note the required `type: "http"`):

```json
{
  "servers": {
    "hive": {
      "type": "http",
      "url": "https://mcp.hiveintelligence.xyz/mcp"
    }
  }
}
```

### Claude Desktop

Claude Desktop uses the Custom Connectors UI for remote MCP. Open Settings →
Connectors → Add custom connector, set the URL to
`https://mcp.hiveintelligence.xyz/mcp`, then, after OAuth activation, complete
browser authorization. Do not paste a remote `url` block into
`claude_desktop_config.json`; that file is for local stdio servers.

### Windsurf / Devin Desktop

Windsurf uses `serverUrl` (not Cursor's `url`) in
`~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "hive": {
      "serverUrl": "https://mcp.hiveintelligence.xyz/mcp"
    }
  }
}
```

### Gemini CLI

Gemini CLI requires `httpUrl` in `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "hive": {
      "httpUrl": "https://mcp.hiveintelligence.xyz/mcp"
    }
  }
}
```

Both configs are URL-only and can use native OAuth after hosted OAuth
activation. Full per-client guides:
[hiveintelligence.xyz/install](https://hiveintelligence.xyz/install).

### Headless API-key fallback

For automation that cannot open a browser, keep a Hive API key in secret
storage and send `Authorization: Bearer $HIVE_API_KEY`. Never embed a real key
in an install link, shared config, screenshot, or repository.

### Local stdio (self-host / desktop / your own provider keys)

Prefer a local process or your own upstream keys? Run the published CLI as a stdio MCP server:

```json
{
  "mcpServers": {
    "hive": {
      "command": "npx",
      "args": ["-y", "-p", "hive-intelligence@latest", "hive"],
      "env": {
        "COINGECKO_DEMO_API_KEY": "optional",
        "ALCHEMY_API_KEY": "optional",
        "HELIUS_API_KEY": "optional",
        "MORALIS_API_KEY": "optional"
      }
    }
  }
}
```

Local stdio does not use a hosted `HIVE_API_KEY`; configure only the upstream
provider keys you want that local process to call. Keyless providers remain
available and providers without credentials stay discoverable with a classified
`missing_key` runtime status. `hive-intelligence` is a stdio transport (a
JSON-RPC channel, not an interactive command). For terminal use, see the
[CLI](#cli).

## Authentication

- Get a key at [hiveintelligence.xyz/dashboard/keys](https://hiveintelligence.xyz/dashboard/keys); the free Demo plan needs no card.
- Authenticate the hosted endpoint with `Authorization: Bearer hive_live_...` (legacy alias `x-api-key` also works).
- One key, least privilege: keys are scoped to your plan's rate limit and credits. Rotate or revoke from the dashboard; never commit a key or paste it into client-side code.

## Powered by

Ten upstream provider integrations plus Open Data Fetch, normalized into one tool surface:

```
Alchemy · CoinGecko · DeFiLlama · Moralis · Codex · GoPlus · Helius · Tenderly · CCXT · Hyperliquid · Open Data Fetch
```

| Provider               | Coverage                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Alchemy**            | EVM portfolio, token, NFT, transfer, simulation, gas, network data, and Solana DAS                           |
| **CoinGecko**          | Market data, prices, OHLCV, exchanges, NFT collections                                                       |
| **DeFiLlama**          | TVL, yield pools, protocol metrics, bridges, treasuries                                                      |
| **Moralis**            | EVM and Solana wallet, token, NFT, DeFi, transfer, and market analytics                                      |
| **Codex** (Defined.fi) | DEX pair OHLCV, prediction markets (Polymarket)                                                              |
| **GoPlus**             | Token security, honeypot detection, contract risk, malicious-address reputation                              |
| **Helius**             | Solana RPC, DAS, compressed NFTs, priority fees                                                              |
| **Tenderly**           | EVM simulation, gas estimation, traces, contract decode, signatures, storage changes, and transaction ranges |
| **CCXT**               | Centralized exchange data, order books, derivatives, funding, leverage, and borrow rates                     |
| **Hyperliquid**        | Native perpetual DEX volume, funding, candles, open-interest caps, and builder DEXs                          |
| **Open Data Fetch**    | Allowlisted, size-capped access to long-tail public crypto APIs when no typed tool covers the source         |

## Tools & discovery

Hive's default contract is a compact five-tool root focused on evidence-backed
decisions: search, schema inspection, separate read/write routers, and
workflow-result validation. Agents start with compact,
paginated `search_tools` results, load one exact `hive://toolsets/{id}` workflow,
inspect `get_api_endpoint_schema`, then call `invoke_api_endpoint` for reads or
`invoke_stateful_endpoint` after explicit approval for a Hive-native state
change. `validate_task_result` checks the final envelope and receipt structure;
it requires claim-to-receipt citations and canonical phase coverage, but cannot
make invented receipt data authentic.

The long-tail catalog remains discoverable behind that workflow surface: 615
callable tools across 10 categories.

Every exact workflow publishes a default and maximum material-call budget,
phases, fallback condition, and stop conditions. Agents stop once the requested
decision is supported and call a fallback only to resolve a material gap,
unavailable source, staleness concern, or disagreement.

| #   | Category                     | Tools | What's inside                                                                                         |
| --- | ---------------------------- | ----- | ----------------------------------------------------------------------------------------------------- |
| 1   | **Market Data & Price**      | 106   | Prices, OHLCV, market caps, derivatives, funding rates, stablecoins, gainers/losers, exchange tickers |
| 2   | **On-Chain DEX & Pool**      | 64    | DEX pools, liquidity, trending pairs, swap history, bridges, aggregator volumes                       |
| 3   | **Portfolio & Wallet**       | 77    | Balances, PnL, DeFi positions, swap history, NFT holdings, multi-chain history                        |
| 4   | **Token & Contract**         | 50    | Token metadata, holders, top traders, ENS resolution, treasury tracking, transfers                    |
| 5   | **DeFi Protocol**            | 18    | TVL, fees, yield farming, chain metrics, treasuries, emissions                                        |
| 6   | **NFT Analytics**            | 67    | Collection data, floors, market charts, NFT pools, trait metadata, sales                              |
| 7   | **Security & Risk**          | 51    | Honeypot detection, rugpull checks, approval risk, Tenderly simulation, gas estimation                |
| 8   | **Network & Infrastructure** | 40    | Chain health, blocks, gas prices, supported networks, Solana infrastructure                           |
| 9   | **Search & Discovery**       | 25    | Cross-provider search, trending coins, categories, token discovery                                    |
| 10  | **Prediction Markets**       | 21    | Events, markets, prices, trades, traders, holdings, order books, and category filters                 |

Clients that want a smaller, scoped tool surface can connect to a category endpoint directly, e.g. `https://mcp.hiveintelligence.xyz/hive_market_data/mcp` (one per category). Public catalog overview: [www.hiveintelligence.xyz/tools/live-catalog](https://www.hiveintelligence.xyz/tools/live-catalog). Authenticated REST catalog: `https://mcp.hiveintelligence.xyz/api/v1/tools`.

## Security & trust

Crypto answers are only useful if they're trustworthy. Hive is built for that:

- **Provenance on every response.** Tool results carry a server-minted receipt with provider, Hive retrieval/observation time, cache age, source state, runtime status, server/build version, and SHA-256 input/result self-checks. The digests are not signatures or a retained lookup service. `observed_at` is Hive's first-observation/original cache time, not necessarily the upstream event time; `cache_age_ms: 0` only means newly retrieved by Hive. `source` reports the delivery state, while `origin_source` preserves whether cached data originally came from the live or fallback tier. Use provider timestamps, blocks, slots, transactions, or candle closes for source recency, and mark it unknown when absent. Hive **never silently mixes provider data** — fallback, cached, or degraded data is labeled as such.
- **Point-in-time, not drift.** Time-series tools accept `at` / `block_number` so agents answer historical questions without quietly defaulting to "latest."
- **Security-first tools.** `get_token_security`, `detect_rugpull`, approval-risk, and Tenderly transaction simulation return structured risk flags so an agent can check _before_ a user signs.
- **Least privilege & prompt-injection awareness.** Use a scoped key per environment and rotate from the dashboard. As with any tool-using agent, treat on-chain text (token names, memos) as untrusted input — Hive returns structured fields rather than free-form instructions to reduce injection surface.
- **No client-side keys.** Keep your Hive key server-side; browser UIs should call your own backend, which uses the key (see the [SDK](#typescript-sdk--hive-mcp-client) B2B subject sessions).

## Example prompts

Once Hive is connected, ask in plain English — each maps to a real tool call you don't have to write:

```
What's the price of BTC, ETH, and SOL right now in USD?
List the top 20 yield pools above 10% APY on Ethereum.
Show me the portfolio of vitalik.eth across all chains.
Is this token a honeypot? 0x...   ·   Run a rugpull check on $PEPE.
What are the current funding rates for BTC perps across exchanges?
What are the most-traded events on Polymarket this week?
Simulate this transaction before I sign it: <tx hash or calldata>
```

More workflow guides: [hiveintelligence.xyz/use-cases](https://hiveintelligence.xyz/use-cases).

## TypeScript SDK — `hive-mcp-client`

Call Hive from your own agent or backend without wiring MCP by hand. The typed client ships on npm and in [`client/`](./client):

```bash
npm install hive-mcp-client
```

```ts
import { createHiveMcpClient, invokeHiveEndpoint } from "hive-mcp-client";

const hive = await createHiveMcpClient({
  apiKey: process.env.HIVE_API_KEY,
  clientName: "my-app",
});

const result = await invokeHiveEndpoint(hive, "get_price", {
  ids: "bitcoin",
  vs_currencies: "usd",
});
console.log(result.json ?? result.text);
await hive.close();
```

`invokeHiveEndpoint` is intentionally read-only and already returns a
normalized result. It rejects known Hive state-changing endpoints. After your
application shows the exact effect and receives explicit user approval, call
the separately named `invokeHiveStatefulEndpoint`; never derive approval from
model output or tool arguments:

```ts
import { invokeHiveStatefulEndpoint } from "hive-mcp-client";

if (!(await approvalUi.confirm({ endpointName, args }))) {
  throw new Error("User declined the Hive state change");
}

const saved = await invokeHiveStatefulEndpoint(hive, endpointName, args);
```

Use `normalizeHiveToolResult` only when you call the lower-level
`client.callTool()` method directly.

Includes Vercel AI SDK and LangChain adapters, plus B2B subject sessions for
multi-tenant backends. LangChain stateful tools are disabled unless the app
supplies `approveStatefulCall({ endpointName, args })`; the callback must return
the user's explicit approval, and material stateful invocations are never
adapter-cached. Full API: [`client/README.md`](./client/README.md).

## Agent skills

Installable [agent skills](https://github.com/hive-intel/hive-skills) teach Claude Code, Cursor, Codex, and other agents the Hive workflow — MCP setup, tool discovery, and live crypto research:

```bash
npx skills add hive-intel/hive-skills
```

### OpenAI / Codex and Cursor plugin bundle

This repository root is also a distribution-ready Codex plugin bundle. It
combines three public, reviewable pieces:

- [`.codex-plugin/plugin.json`](./.codex-plugin/plugin.json) — product and
  interface metadata, starter prompts, and component declarations.
- [`.cursor-plugin/plugin.json`](./.cursor-plugin/plugin.json) — the
  Cursor-native manifest over the same MCP connection and workflow skills.
- [`.mcp.json`](./.mcp.json) — the URL-only hosted Hive connection. It contains
  no API key, token, header, or credential placeholder.
- [`skills/`](./skills) — bundled setup, discovery, and crypto-research
  workflows that teach the agent to inspect schemas, stay within workflow call
  budgets, preserve provenance, and require explicit approval before a
  Hive-native state change.
- [`marketplace-review.json`](./marketplace-review.json) — release-bound listing
  copy, starter prompts, and the exact five positive plus three negative review
  cases. It is a public preparation fixture, not a Cursor or OpenAI manifest;
  reviewer credentials, domain challenges, availability choices, and legal
  attestations remain portal-only.

A Codex catalog or Cursor plugin review can ingest the repository root so the
remote MCP connection and its workflow guidance arrive together. This bundle
does not claim that Hive is already listed in either public marketplace; use the current
[Hive install guide](https://www.hiveintelligence.xyz/install) until a catalog
listing is live.

## CLI

The `hive` CLI is a thin terminal client over the same API. Set `HIVE_API_KEY` (or run `hive auth login` once):

```bash
hive market price --ids bitcoin,ethereum,solana --vs usd   # prices
hive defi tvl --protocol aave                              # DeFi TVL
hive security scan --token 0x...                           # token security
hive portfolio balance --address 0x...                     # wallet portfolio
hive tools search "funding rate"                           # search the 615-tool catalog
hive tools call get_price --args '{"ids":"bitcoin","vs_currencies":"usd"}'
```

Global flags include `--json`, `--pretty`, `--jq <expr>`, `--csv`, `--fields`, `--timeout`, `-q/--quiet`. Auth: `hive auth login | whoami | profiles | switch`. Diagnostics: `hive doctor`, `hive status`. Shell completion: `hive completion <bash|zsh|fish> --install`. Aliases: `hive alias set btc 'market price --ids bitcoin --vs usd'`. Full reference: [hiveintelligence.xyz/cli](https://hiveintelligence.xyz/cli).

## Configuration

| Variable               | Description                                                   |
| ---------------------- | ------------------------------------------------------------- |
| `HIVE_API_KEY`         | **Required.** API key — or run `hive auth login`              |
| `HIVE_API_URL`         | Custom base URL (default: `https://mcp.hiveintelligence.xyz`) |
| `API_EXECUTE_ENDPOINT` | Override execute endpoint (advanced)                          |

## Pricing

| Plan           | Monthly credits | Rate limit     | API keys | Price   |
| -------------- | --------------- | -------------- | -------- | ------- |
| **Demo**       | 10,000          | 30 req/min     | 5        | Free    |
| **Analyst**    | 500,000         | 500 req/min    | 10       | $129/mo |
| **Pro**        | 2,000,000       | 1,000 req/min  | 25       | $499/mo |
| **Enterprise** | Custom          | Custom req/min | Custom   | Custom  |

One credit = one material endpoint execution, regardless of provider or response size. `search_tools`, `get_api_endpoint_schema`, `validate_task_result`, MCP `tools/list`, MCP resource reads, and authenticated `GET /api/v1/tools` are free. Full pricing: [hiveintelligence.xyz/pricing](https://hiveintelligence.xyz/pricing) · machine-readable: [hiveintelligence.xyz/pricing.md](https://hiveintelligence.xyz/pricing.md).

## Why Hive over a single-provider MCP?

|                      | Hive    | CoinGecko MCP | Moralis MCP | DeFiLlama MCP | GoPlus only |
| -------------------- | ------- | ------------- | ----------- | ------------- | ----------- |
| Provider groups      | **13**  | 1             | 1           | 1             | 1           |
| Categories           | **10**  | 2             | 3           | 1             | 1           |
| Total tools          | **615** | ~50           | ~60         | ~15           | ~20         |
| Market data          | ✓       | ✓             | partial     | –             | –           |
| DeFi TVL + yields    | ✓       | –             | –           | ✓             | –           |
| Wallet portfolio     | ✓       | –             | ✓           | –             | –           |
| Pre-signing security | **✓**   | –             | –           | –             | ✓           |
| DEX pool analytics   | ✓       | –             | partial     | –             | –           |
| Prediction markets   | **✓**   | –             | –           | –             | –           |
| Solana depth (DAS)   | ✓       | –             | –           | –             | –           |
| Managed (no ops)     | ✓       | ✓             | partial     | varies        | varies      |

Single-provider MCPs win on niche depth. Hive wins when the agent needs **broad crypto context in one request** — prices + DeFi + wallet + security + DEX in a single conversation, without anyone figuring out which tool lives in which provider.

## FAQ

**What does an API key cost?**
Free Demo plan with 10,000 monthly credits — no card required. Paid plans start at $129/month for 500K credits. [Get a key](https://hiveintelligence.xyz/dashboard/keys).

**Hosted vs local stdio — which should I use?**
Hosted (`https://mcp.hiveintelligence.xyz/mcp`) is recommended for most integrations: no local server, Hive runs auth, rate limits, and provider infrastructure. Use local stdio for desktop setups, self-hosting, or your own upstream provider keys.

**Which AI clients support MCP?**
Claude Desktop, Claude Code, Cursor, Windsurf, VS Code (Copilot Chat), Codex CLI, Gemini CLI, OpenAI Responses API, and clients that support Streamable HTTP MCP. Native OAuth connectors become available after hosted OAuth activation; API-key headers remain the trusted headless fallback.

**What chains are supported?**
EVM (Ethereum, Arbitrum, Optimism, Base, Polygon, BNB Chain, Avalanche, and 90+ more), Solana with full Helius DAS coverage including compressed NFTs, Bitcoin, and others depending on the provider mix per category.

**Is the source code open?**
The typed client SDK (`client/`) and the [Hive agent skills](https://github.com/hive-intel/hive-skills) are MIT-licensed and open source. The Hive MCP server that powers `mcp.hiveintelligence.xyz` is a managed, proprietary service.

**How does Hive keep answers trustworthy?**
Every material result carries provider attribution, source/cache state, runtime status, and a server-minted receipt. Hive separates its own observation time from provider source recency, never silently mixes provider data, and exposes point-in-time parameters where providers support them. See [Security & trust](#security--trust).

## Documentation

- **Quick Start** — [hiveintelligence.xyz/quick-start](https://hiveintelligence.xyz/quick-start)
- **API Reference** — [hiveintelligence.xyz/api-integration](https://hiveintelligence.xyz/api-integration)
- **Install Guides** — [hiveintelligence.xyz/install](https://hiveintelligence.xyz/install)
- **CLI Reference** — [hiveintelligence.xyz/cli](https://hiveintelligence.xyz/cli)
- **Tool Catalog** — [hiveintelligence.xyz/tools/live-catalog](https://hiveintelligence.xyz/tools/live-catalog)
- **Agent Skills** — [github.com/hive-intel/hive-skills](https://github.com/hive-intel/hive-skills)

## Support

- **GitHub Issues** — [github.com/hive-intel/hive-sdk/issues](https://github.com/hive-intel/hive-sdk/issues)
- **Email** — [support@hiveintelligence.xyz](mailto:support@hiveintelligence.xyz)
- **Telegram** — [t.me/HiveIntelligence](https://t.me/HiveIntelligence)
- **Twitter / X** — [@Hive_Intel](https://x.com/Hive_Intel)

## License

MIT © Hive Intelligence
