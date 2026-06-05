<div align="center">

# Hive Intelligence

**Managed crypto market infrastructure for AI agents.**

One hosted MCP server. [369 live tools](https://mcp.hiveintelligence.xyz/api/v1/tools). 10 categories. 9 data providers — [Alchemy, CoinGecko, DeFiLlama, Moralis, Codex, GoPlus, Helius, Tenderly, and CCXT](#powered-by) normalized into a single agent-ready surface, so your agent gets prices, DeFi, wallets, security, and DEX flows through one API key instead of separate provider credentials.

[![MCP](https://img.shields.io/badge/MCP-compatible-111827.svg)](https://modelcontextprotocol.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Docs](https://img.shields.io/badge/docs-hiveintelligence.xyz-purple.svg)](https://hiveintelligence.xyz)
[![Add to Cursor](https://img.shields.io/badge/Add%20to-Cursor-000000.svg?logo=cursor)](https://cursor.com/en/install-mcp?name=hive&config=eyJ1cmwiOiJodHRwczovL21jcC5oaXZlaW50ZWxsaWdlbmNlLnh5ei9tY3AiLCJoZWFkZXJzIjp7IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgWU9VUl9ISVZFX0FQSV9LRVkifX0%3D)
[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install-0098FF?logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=hive&config=%7B%22type%22%3A%22http%22%2C%22url%22%3A%22https%3A%2F%2Fmcp.hiveintelligence.xyz%2Fmcp%22%2C%22headers%22%3A%7B%22Authorization%22%3A%22Bearer%20YOUR_HIVE_API_KEY%22%7D%7D)

[**Connect**](#connect) · [**Tools**](#tools--discovery) · [**Security**](#security--trust) · [**SDK**](#typescript-sdk--hive-mcp-client) · [**CLI**](#cli) · [**Pricing**](#pricing) · [**FAQ**](#faq) · [**Get an API key**](https://hiveintelligence.xyz/dashboard/keys)

</div>

> ⚡ **New here?** [Try the free Demo](https://hiveintelligence.xyz/dashboard/keys) (10K credits/month, no card required) · [Install guides](https://hiveintelligence.xyz/install) · [Example prompts](#example-prompts)

---

## Connect

Hive is a **hosted MCP server** for clients that support remote HTTP MCP and API-key headers. Point a supported client at the endpoint and authenticate with a Bearer key:

```text
https://mcp.hiveintelligence.xyz/mcp
```

[![Add to Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/en/install-mcp?name=hive&config=eyJ1cmwiOiJodHRwczovL21jcC5oaXZlaW50ZWxsaWdlbmNlLnh5ei9tY3AiLCJoZWFkZXJzIjp7IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgWU9VUl9ISVZFX0FQSV9LRVkifX0%3D)
[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install-0098FF?logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=hive&config=%7B%22type%22%3A%22http%22%2C%22url%22%3A%22https%3A%2F%2Fmcp.hiveintelligence.xyz%2Fmcp%22%2C%22headers%22%3A%7B%22Authorization%22%3A%22Bearer%20YOUR_HIVE_API_KEY%22%7D%7D)

After clicking, replace `YOUR_HIVE_API_KEY` with a key from [hiveintelligence.xyz/dashboard/keys](https://hiveintelligence.xyz/dashboard/keys) (the deep link can't carry your secret). Per-client config blocks are below.

## What is Hive Intelligence?

A managed MCP server, REST API, and CLI that give AI agents one normalized, runtime tool surface over live crypto market data, DeFi, wallets, token security, DEX flows, NFTs, prediction markets, and on-chain network data. One API key, nine upstream providers — instead of stitching Alchemy + CoinGecko + DeFiLlama + Moralis + GoPlus and several others yourself.

## Connect to your AI client

The hosted endpoint is the same everywhere; only the config file and shape differ. Replace `hive_live_...` with your API key.

### Claude Code

```bash
claude mcp add --transport http hive https://mcp.hiveintelligence.xyz/mcp \
  --header "Authorization: Bearer hive_live_..."
```

### Cursor

`~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (project):

```json
{
  "mcpServers": {
    "hive": {
      "url": "https://mcp.hiveintelligence.xyz/mcp",
      "headers": { "Authorization": "Bearer hive_live_..." }
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
      "url": "https://mcp.hiveintelligence.xyz/mcp",
      "headers": { "Authorization": "Bearer hive_live_..." }
    }
  }
}
```

### Claude Desktop

Claude Desktop uses the Custom Connectors UI for remote MCP. Open Settings → Connectors → Add custom connector, set the URL to `https://mcp.hiveintelligence.xyz/mcp`, and add the `Authorization: Bearer hive_live_...` header there. Do not paste a remote `url` + `headers` block into `claude_desktop_config.json`; that file is for local stdio servers.

### Windsurf · Gemini CLI

Use the same `url` + `headers` block as Cursor. Config locations: Windsurf → `~/.codeium/windsurf/mcp_config.json`; Gemini CLI → `~/.gemini/settings.json`. Full per-client guides: [hiveintelligence.xyz/install](https://hiveintelligence.xyz/install).

### Local stdio (self-host / desktop / your own provider keys)

Prefer a local process or your own upstream keys? Run the published CLI as a stdio MCP server:

```json
{
  "mcpServers": {
    "hive": {
      "command": "npx",
      "args": ["-y", "-p", "hive-intelligence@latest", "hive"],
      "env": { "HIVE_API_KEY": "hive_live_..." }
    }
  }
}
```

`hive-intelligence` is a stdio transport (a JSON-RPC channel, not an interactive command). For terminal use, see the [CLI](#cli).

## Authentication

- Get a key at [hiveintelligence.xyz/dashboard/keys](https://hiveintelligence.xyz/dashboard/keys); the free Demo plan needs no card.
- Authenticate the hosted endpoint with `Authorization: Bearer hive_live_...` (legacy alias `x-api-key` also works).
- One key, least privilege: keys are scoped to your plan's rate limit and credits. Rotate or revoke from the dashboard; never commit a key or paste it into client-side code.

## Powered by

Nine production data providers, normalized into one tool surface:

```
Alchemy · CoinGecko · DeFiLlama · Moralis · Codex · GoPlus · Helius · Tenderly · CCXT
```

| Provider | Coverage |
|----------|----------|
| **Alchemy** | EVM portfolio, token, NFT, transfer, simulation, gas, and network data |
| **CoinGecko** | Market data, prices, OHLCV, exchanges, NFT collections |
| **DeFiLlama** | TVL, yield pools, protocol metrics, bridges, treasuries |
| **Moralis** | Wallet analytics, NFT data, token transfers, EVM coverage |
| **Codex** (Defined.fi) | DEX pair OHLCV, prediction markets (Polymarket) |
| **GoPlus** | Token security, honeypot detection, contract risk, malicious-address reputation |
| **Helius** | Solana RPC, DAS, compressed NFTs, priority fees |
| **Tenderly** | EVM transaction simulation, contract decode, debugging |
| **CCXT** | Centralized exchange data, order books, derivatives, funding rates |

## Tools & discovery

**369 callable tools across 10 categories.** Agents don't browse a wall of endpoints — they discover the right task toolset with `search_tools` (or the `hive://toolsets` resource), inspect parameters with `get_api_endpoint_schema`, then run a bounded call with `invoke_api_endpoint`.

| # | Category | Tools | What's inside |
|---|----------|-------|---------------|
| 1 | **Market Data & Price** | 87 | Prices, OHLCV, market caps, derivatives, funding rates, stablecoins, gainers/losers, exchange tickers |
| 2 | **On-Chain DEX & Pool** | 52 | DEX pools, liquidity, trending pairs, swap history, bridges, aggregator volumes |
| 3 | **Portfolio & Wallet** | 40 | Balances, PnL, DeFi positions, swap history, NFT holdings, multi-chain history |
| 4 | **Token & Contract** | 34 | Token metadata, holders, top traders, ENS resolution, treasury tracking, transfers |
| 5 | **DeFi Protocol** | 17 | TVL, fees, yield farming, chain metrics, treasuries, emissions |
| 6 | **NFT Analytics** | 30 | Collection data, floors, market charts, NFT pools, trait metadata, sales |
| 7 | **Security & Risk** | 29 | Honeypot detection, rugpull checks, approval risk, Tenderly simulation, gas estimation |
| 8 | **Network & Infrastructure** | 26 | Chain health, blocks, gas prices, supported networks, Solana infrastructure |
| 9 | **Search & Discovery** | 15 | Cross-provider search, trending coins, categories, token discovery |
| 10 | **Prediction Markets** | 21 | Polymarket events, traders, outcome prices, trade history, market stats |

Clients that want a smaller, scoped tool surface can connect to a category endpoint directly, e.g. `https://mcp.hiveintelligence.xyz/hive_market_data/mcp` (one per category). Full live list: `https://mcp.hiveintelligence.xyz/api/v1/tools` or [hiveintelligence.xyz/tools/live-catalog](https://hiveintelligence.xyz/tools/live-catalog).

## Security & trust

Crypto answers are only useful if they're trustworthy. Hive is built for that:

- **Provenance on every response.** Tool results carry the source provider, freshness/timestamp, and runtime status. Hive **never silently mixes provider data** — fallback, cached, or degraded data is labeled as such.
- **Point-in-time, not drift.** Time-series tools accept `at` / `block_number` so agents answer historical questions without quietly defaulting to "latest."
- **Security-first tools.** `get_token_security`, `detect_rugpull`, approval-risk, and Tenderly transaction simulation return structured risk flags so an agent can check *before* a user signs.
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
import {
  createHiveMcpClient,
  invokeHiveEndpoint,
} from "hive-mcp-client";

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

`invokeHiveEndpoint` already returns a normalized result. Use `normalizeHiveToolResult` only when you call the lower-level `client.callTool()` method directly.

Includes Vercel AI SDK and LangChain adapters, plus B2B subject sessions for multi-tenant backends. Full API: [`client/README.md`](./client/README.md).

## Agent skills

Installable [agent skills](https://github.com/hive-intel/hive-skills) teach Claude Code, Cursor, Codex, and other agents the Hive workflow — MCP setup, tool discovery, and live crypto research:

```bash
npx skills add hive-intel/hive-skills
```

## CLI

The `hive` CLI is a thin terminal client over the same API. Set `HIVE_API_KEY` (or run `hive auth login` once):

```bash
hive market price --ids bitcoin,ethereum,solana --vs usd   # prices
hive defi tvl --protocol aave                              # DeFi TVL
hive security scan --token 0x...                           # token security
hive portfolio balance --address 0x...                     # wallet portfolio
hive tools search "funding rate"                           # search the 369-tool catalog
hive tools call get_price --args '{"ids":"bitcoin","vs_currencies":"usd"}'
```

Global flags include `--json`, `--pretty`, `--jq <expr>`, `--csv`, `--fields`, `--timeout`, `-q/--quiet`. Auth: `hive auth login | whoami | profiles | switch`. Diagnostics: `hive doctor`, `hive status`. Shell completion: `hive completion <bash|zsh|fish> --install`. Aliases: `hive alias set btc 'market price --ids bitcoin --vs usd'`. Full reference: [hiveintelligence.xyz/cli](https://hiveintelligence.xyz/cli).

## Configuration

| Variable | Description |
|----------|-------------|
| `HIVE_API_KEY` | **Required.** API key — or run `hive auth login` |
| `HIVE_API_URL` | Custom base URL (default: `https://mcp.hiveintelligence.xyz`) |
| `API_EXECUTE_ENDPOINT` | Override execute endpoint (advanced) |

## Pricing

| Plan | Monthly credits | Rate limit | API keys | Price |
|------|-----------------|------------|----------|-------|
| **Demo** | 10,000 | 30 req/min | 1 | Free |
| **Analyst** | 500,000 | 500 req/min | 10 | $129/mo |
| **Pro** | 2,000,000 | 1,000 req/min | 25 | $499/mo |
| **Enterprise** | Custom | 3,000 req/min | 100 | Custom |

One credit = one tool call, regardless of provider or response size. Discovery calls (`tools/list`, `GET /api/v1/tools`) are free. Full pricing: [hiveintelligence.xyz/pricing](https://hiveintelligence.xyz/pricing) · machine-readable: [hiveintelligence.xyz/pricing.md](https://hiveintelligence.xyz/pricing.md).

## Why Hive over a single-provider MCP?

| | Hive | CoinGecko MCP | Moralis MCP | DeFiLlama MCP | GoPlus only |
|---|---|---|---|---|---|
| Providers normalized | **9** | 1 | 1 | 1 | 1 |
| Categories | **10** | 2 | 3 | 1 | 1 |
| Total tools | **369** | ~50 | ~60 | ~15 | ~20 |
| Market data | ✓ | ✓ | partial | – | – |
| DeFi TVL + yields | ✓ | – | – | ✓ | – |
| Wallet portfolio | ✓ | – | ✓ | – | – |
| Pre-signing security | **✓** | – | – | – | ✓ |
| DEX pool analytics | ✓ | – | partial | – | – |
| Prediction markets | **✓** | – | – | – | – |
| Solana depth (DAS) | ✓ | – | – | – | – |
| Managed (no ops) | ✓ | ✓ | partial | varies | varies |

Single-provider MCPs win on niche depth. Hive wins when the agent needs **broad crypto context in one request** — prices + DeFi + wallet + security + DEX in a single conversation, without anyone figuring out which tool lives in which provider.

## FAQ

**What does an API key cost?**
Free Demo plan with 10,000 monthly credits — no card required. Paid plans start at $129/month for 500K credits. [Get a key](https://hiveintelligence.xyz/dashboard/keys).

**Hosted vs local stdio — which should I use?**
Hosted (`https://mcp.hiveintelligence.xyz/mcp`) is recommended for most integrations: no local server, Hive runs auth, rate limits, and provider infrastructure. Use local stdio for desktop setups, self-hosting, or your own upstream provider keys.

**Which AI clients support MCP?**
Claude Desktop, Claude Code, Cursor, Windsurf, VS Code (Copilot Chat), Codex CLI, Gemini CLI, OpenAI Responses API, and clients that support Streamable HTTP MCP plus API-key headers.

**What chains are supported?**
EVM (Ethereum, Arbitrum, Optimism, Base, Polygon, BNB Chain, Avalanche, and 90+ more), Solana with full Helius DAS coverage including compressed NFTs, Bitcoin, and others depending on the provider mix per category.

**Is the source code open?**
The typed client SDK (`client/`) and the [Hive agent skills](https://github.com/hive-intel/hive-skills) are MIT-licensed and open source. The Hive MCP server that powers `mcp.hiveintelligence.xyz` is a managed, proprietary service.

**How does Hive keep answers trustworthy?**
Every tool result carries provider attribution, freshness, and runtime status; Hive never silently mixes provider data, and time-series tools accept point-in-time params. See [Security & trust](#security--trust).

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
