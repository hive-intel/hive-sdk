---
name: hive-build
description: Use this skill when the user is integrating Hive into application code, backend services, agents, cron jobs, source-controlled adapters, or production systems — wiring Hive into a Next.js API route, a Python or Go cron job, a Rust or Java service, or a LangChain/CrewAI agent — rather than asking a one-off chat query.
license: MIT
metadata:
  package: "@hiveintelligence/agent-skills"
  category: "build"
  requires_network: "true"
version: 1.3.0
---

# hive-build — Integrate Hive Into App Code

Use this skill when the user is writing code that should call Hive at
runtime (a TypeScript app, Python script, Next.js API route, Rust service,
LangChain agent, Go cron job...).

If the user just wants live data in this chat, route to `hive-query`
instead. If they're adding Hive to an MCP-capable client, route to
`hive-mcp`. This skill is for "I'm writing code."

## Integration path

- **TypeScript / custom app default** — `hive-mcp-client` (`npm install hive-mcp-client`)
- **MCP transport** — `https://mcp.hiveintelligence.xyz/mcp`
- **REST fallback base** — `https://mcp.hiveintelligence.xyz/api/v1`
- **REST execute** — `POST /execute` with `{"tool": "...", "args": {...}}`
- **REST catalog** — `GET /tools?search=...&limit=...`
- **Health** — `GET https://mcp.hiveintelligence.xyz/health`

Auth header on every request: `Authorization: Bearer $HIVE_API_KEY`.

## Pattern by language

### Python (sync — `requests`)

```python
import os, requests
from typing import Any

def hive(tool: str, args: dict[str, Any] | None = None) -> dict[str, Any]:
    r = requests.post(
        "https://mcp.hiveintelligence.xyz/api/v1/execute",
        headers={"Authorization": f"Bearer {os.environ['HIVE_API_KEY']}"},
        json={"tool": tool, "args": args or {}},
        timeout=30,
    )
    r.raise_for_status()
    return r.json()

print(hive("get_price", {"ids": "bitcoin", "vs_currencies": "usd"}))
```

### Python (async — `httpx`)

```python
import os
import asyncio
import httpx

class HiveClient:
    def __init__(self, key: str | None = None):
        key = key or os.environ["HIVE_API_KEY"]
        self._client = httpx.AsyncClient(
            base_url="https://mcp.hiveintelligence.xyz",
            headers={"Authorization": f"Bearer {key}"},
            timeout=httpx.Timeout(30, connect=5),
            limits=httpx.Limits(max_connections=32),
        )

    async def execute(self, tool: str, args: dict | None = None) -> dict:
        r = await self._client.post(
            "/api/v1/execute",
            json={"tool": tool, "args": args or {}},
        )
        r.raise_for_status()
        return r.json()

    async def aclose(self):
        await self._client.aclose()

async def briefing():
    h = HiveClient()
    try:
        prices, tvl, oi = await asyncio.gather(
            h.execute("get_price",         {"ids": "bitcoin,ethereum"}),
            h.execute("get_protocol_tvl",  {}),
            h.execute("get_open_interest", {"exchange": "binance"}),
        )
        return {"prices": prices, "tvl": tvl[:5], "oi": oi}
    finally:
        await h.aclose()
```

Hive bills one credit per material endpoint execution. Discovery, schema
inspection, category listing, resource reads, and task-result validation cost
zero. Do not fan out by default: load one exact task toolset, follow its call
budget and stop conditions, and add a fallback only to resolve a material gap,
unavailable source, staleness concern, or disagreement.

### TypeScript (Node, serverless, edge)

Prefer the typed MCP adapter for TypeScript applications when you control the
server application. It centralizes the root MCP contract, auth headers, schema
lookup, endpoint invocation, retries, metadata resources, and normalized result
parsing.

`invokeHiveEndpoint` is deliberately read-only. For a known Hive-native write,
show the exact effect to the user, obtain approval in trusted application UI,
then call `invokeHiveStatefulEndpoint`. LangChain stateful tools require the
application callback
`approveStatefulCall({ endpointName, args }): boolean | Promise<boolean>`;
without it they are disabled. Never implement the callback as unconditional
approval or derive consent from model output. Stateful material calls are never
adapter-cached.

```bash
npm install hive-mcp-client
```

```ts
import {
  createHiveMcpClient,
  getHiveEndpointSchema,
  invokeHiveEndpoint,
  readHiveMetadataSnapshot,
} from "hive-mcp-client";

export async function getBtcPrice() {
  const hive = await createHiveMcpClient({
    apiKey: process.env.HIVE_API_KEY,
    clientName: "my-app",
    retry: { attempts: 2, baseDelayMs: 500 },
  });

  try {
    const schema = await getHiveEndpointSchema(hive, "get_price");
    const result = await invokeHiveEndpoint(hive, "get_price", {
      ids: "bitcoin",
      vs_currencies: "usd",
    });
    const metadata = await readHiveMetadataSnapshot(hive);

    return {
      schema,
      result,
      metadataStatus: metadata.status,
    };
  } finally {
    await hive.close();
  }
}
```

Keep `HIVE_API_KEY` server-side. For browser UI, call your own backend route
and never expose a full Hive key to the client.

### Go (`net/http`)

```go
type HiveClient struct {
    Key  string
    HTTP *http.Client
}

func (h *HiveClient) Execute(tool string, args any) ([]byte, error) {
    body, _ := json.Marshal(map[string]any{"tool": tool, "args": args})
    req, _ := http.NewRequest("POST",
        "https://mcp.hiveintelligence.xyz/api/v1/execute",
        bytes.NewReader(body))
    req.Header.Set("Authorization", "Bearer "+h.Key)
    req.Header.Set("Content-Type", "application/json")
    res, err := h.HTTP.Do(req)
    if err != nil { return nil, err }
    defer res.Body.Close()
    if res.StatusCode >= 300 { return nil, fmt.Errorf("hive %d", res.StatusCode) }
    return io.ReadAll(res.Body)
}
```

### Rust (`reqwest`)

```rust
use reqwest::Client;
use serde_json::{json, Value};

pub struct HiveClient {
    key: String,
    http: Client,
}

impl HiveClient {
    pub fn new(key: String) -> Self {
        Self { key, http: Client::new() }
    }

    pub async fn execute(&self, tool: &str, args: Value) -> reqwest::Result<Value> {
        self.http
            .post("https://mcp.hiveintelligence.xyz/api/v1/execute")
            .header("Authorization", format!("Bearer {}", self.key))
            .json(&json!({ "tool": tool, "args": args }))
            .send().await?
            .error_for_status()?
            .json().await
    }
}
```

For typed responses, derive `Deserialize` on a struct and use
`serde_json::from_value(raw)`.

### Java 11+ (`HttpClient`)

```java
public class HiveClient {
    private final HttpClient http = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(5)).build();
    private final ObjectMapper json = new ObjectMapper();
    private final String key = System.getenv("HIVE_API_KEY");

    public Map<String, Object> execute(String tool, Map<String, Object> args)
            throws Exception {
        var body = json.writeValueAsString(Map.of("tool", tool, "args", args));
        var req = HttpRequest.newBuilder()
            .uri(URI.create("https://mcp.hiveintelligence.xyz/api/v1/execute"))
            .header("Authorization", "Bearer " + key)
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(body)).build();
        var res = http.send(req, HttpResponse.BodyHandlers.ofString());
        if (res.statusCode() >= 300) throw new RuntimeException(res.body());
        return json.readValue(res.body(), Map.class);
    }
}
```

## Retry / backoff

Hive returns:

- **400** — invalid tool name or args. Don't retry — the request is
  malformed.
- **401** — invalid API key. Don't retry — the credential is wrong.
- **429** — rate limited. Honor `Retry-After` header (in seconds).
  Use exponential backoff if the header is missing.
- **500 / 502 / 503** — upstream provider failure. Exponential
  backoff. Retry up to 3 times.

Pseudocode:

```text
for attempt in 0..3 {
    response = http.execute(...)
    if response.status == 429 {
        sleep(retry_after || 2^attempt)
        continue
    }
    if response.status >= 500 {
        sleep(2^attempt)
        continue
    }
    return response
}
throw ExhaustedRetries()
```

## Tool discovery

Don't hardcode tool schemas. In TypeScript, use the adapter:

```ts
import { searchHiveTools, getHiveEndpointSchema } from "hive-mcp-client";

const matches = await searchHiveTools(hive, { query: "token security", limit: 20 });
const schema = await getHiveEndpointSchema(hive, "get_token_security");
```

For REST fallback clients, fetch at runtime:

```http
GET /api/v1/tools?search=wallet&limit=200
```

Returns `{ ok, data, has_more, next_cursor?, meta }`, where each `data` entry has
`name`, `title`, `description`, `inputSchema`, and flattened
`provider`/`category`/`tags`. Walk pages with the top-level `next_cursor` (pass it
back as the `cursor` query param) while `has_more` is true. New tools ship
continuously — `/api/v1/tools` is always authoritative.

For a single tool's input schema:

```http
POST /api/v1/execute
{ "tool": "get_api_endpoint_schema", "args": { "name": "get_price" } }
```

## Frameworks

- **LangChain** — use `hive-mcp-client/langchain` or
  `langchain-mcp-adapters` to expose Hive tools. Connect to
  `https://mcp.hiveintelligence.xyz/mcp` with the auth header.
- **CrewAI** — same pattern; CrewAI accepts MCP servers via the
  generic adapter.
- **Vercel AI SDK** — use `hive-mcp-client/ai-sdk` helpers to
  build the MCP transport config and select only the compact/ranked Hive tools
  the model needs.
- **Spring Boot** — register the Java `HiveClient` as a `@Bean`,
  inject into services, wrap with Resilience4j for retries.

## Response envelope

Every successful response shares the same shape:

```json
{
  "ok": true,
  "data": { /* tool result */ },
  "meta": {
    "tool": "get_price",
    "fetched_at": "2026-04-25T07:42:11Z",
    "observed_at": "2026-04-25T07:42:10Z",
    "cache_age_ms": 1000,
    "duration_ms": 94,
    "provider": "coingecko",
    "runtime_status": "ok",
    "cache_status": "miss",
    "source": "live"
  }
}
```

Read `meta.fetched_at` as Hive retrieval completion.
`meta.observed_at` is when Hive first saw the response and
`meta.cache_age_ms` is time since that observation; neither proves the
provider's underlying datum is current. Use provider block, slot, candle close,
or timestamp for source recency, and mark recency unknown when none is present.
Read `meta.provider`/`meta.source` for provenance.
`meta.runtime_status` is the per-call status
(`ok`/`invalid_input`/`missing_key`/`plan_required`/`rate_limited`/`degraded`/`failing`) and a
non-`ok` value still returns a usable envelope. `meta.cache_status` is a string
(`miss`/`hit`/`bypass`/`unknown`), not a boolean — read it only if the user asks
about caching.

## Runtime status handling

When building on Hive, preserve runtime status in your own response model:
`ok`, `invalid_input`, `missing_key`, `plan_required`, `rate_limited`, `degraded`, and
`failing`. Do not remove a tool from the application because a provider is
temporarily gated; surface the state and retry or fall back based on the class.

## Reference

- TypeScript MCP client: https://www.npmjs.com/package/hive-mcp-client
- Full API integration guide: https://www.hiveintelligence.xyz/api-integration
- SDK pages: https://www.hiveintelligence.xyz/sdk
- Errors: https://www.hiveintelligence.xyz/errors
- Rate limits: https://www.hiveintelligence.xyz/rate-limits
