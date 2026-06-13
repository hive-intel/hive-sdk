# hive-mcp-client

Typed TypeScript adapter for building applications on Hive MCP.

Use this package for TypeScript backends, Next.js routes, agent services, cron
jobs, and framework adapters that need MCP discovery, schema lookup, endpoint
invocation, Vercel AI SDK adapters, LangChain adapters, or B2B subject sessions.
Non-TypeScript stacks, constrained runtimes, and low-level debugging can use the
REST API directly.

## Install

```bash
npm install hive-mcp-client
```

Public source and docs: https://github.com/hive-intel/hive-sdk/tree/main/client

Hosted MCP endpoint:

```text
https://mcp.hiveintelligence.xyz/mcp
```

Set the key server-side:

```bash
export HIVE_API_KEY="hive_live_..."
```

For B2B partner setup, install the adapter with `npm install hive-mcp-client` in
the backend project and run the local doctor before writing integration code:

```bash
export HIVE_SUBJECT_SIGNING_SECRET="hive_subject_..."
./node_modules/.bin/hive-mcp doctor \
  --tenant-id workspace_123 \
  --end-user-id user_456
```

The doctor checks the readiness endpoint, verifies that the key is B2B-enabled,
confirms the local signing secret is present, and validates subject header
signing without printing either secret.

## Quick Start

```ts
import {
  createHiveMcpClient,
  invokeHiveEndpoint,
} from "hive-mcp-client";

const hive = await createHiveMcpClient({
  apiKey: process.env.HIVE_API_KEY,
  clientName: "my-app",
});

try {
  const result = await invokeHiveEndpoint(hive, "get_price", {
    ids: "bitcoin",
    vs_currencies: "usd",
  });

  console.log(result.json ?? result.text);
} finally {
  await hive.close();
}
```

`searchHiveTools`, `getHiveEndpointSchema`, and `invokeHiveEndpoint` already
return normalized results with `isError`, `json`, `text`, `raw`, and optional
`structuredContent`. Use `normalizeHiveToolResult` only when you call
`client.callTool()` directly.

Never pass a full Hive API key to browser code. Browser UI should call your own
server route, and that route should use this package.

## B2B Subject Sessions

B2B partners should keep one Hive API key on their backend and isolate each
downstream customer with signed subject context. Do not ask every downstream
customer to create a Hive key.

State is scoped by Hive owner plus resolved subject, not by browser session and
not only by API key. Derive `tenantId` and `endUserId` from trusted partner auth
state on the server.

```ts
const hive = await createHiveMcpClient({
  apiKey: process.env.HIVE_API_KEY,
  subjectSigningSecret: process.env.HIVE_SUBJECT_SIGNING_SECRET,
  clientName: "my-agent-backend",
});

const customerHive = hive.withSubject({
  tenantId: "workspace_123",
  endUserId: "user_456",
});

await customerHive.callTool("hive_create_monitor", {
  kind: "watchlist_digest",
  name: "Daily portfolio brief",
  target: {
    wallets: ["0x..."],
    tokens: ["bitcoin"],
  },
  cadence: "daily",
});
```

For request-scoped adapters, pass the subject per call:

```ts
await hive.callTool(
  "hive_list_monitors",
  {},
  {
    subject: {
      tenantId: request.workspaceId,
      endUserId: request.userId,
    },
  },
);
```

The adapter signs `X-Hive-Tenant-Id`, `X-Hive-End-User-Id`,
`X-Hive-Subject-Timestamp`, and `X-Hive-Subject-Signature` for the MCP request.
Hive stores state under the authenticated Hive account plus the resolved
subject, so monitors, memory, alerts, and reports stay isolated per downstream
customer.

## B2B Product Adapter

For partner products, prefer the B2B adapter helpers over raw tool calls for
the first user-facing workflows:

```ts
import {
  checkHiveB2BReadiness,
  createHiveB2BAdapter,
} from "hive-mcp-client/b2b";

const readiness = await checkHiveB2BReadiness({
  apiKey: process.env.HIVE_API_KEY!,
});

if (!readiness.b2b_adapter_ready) {
  throw new Error(readiness.warnings.join(" "));
}

const hive = await createHiveB2BAdapter({
  apiKey: process.env.HIVE_API_KEY!,
  subjectSigningSecret: process.env.HIVE_SUBJECT_SIGNING_SECRET!,
  clientName: "partner-api",
});

const subject = {
  tenantId: session.workspaceId,
  endUserId: session.userId,
};

await hive.createWatchlistDigestMonitor(subject, {
  cadence: "daily",
  name: "Daily portfolio brief",
  target: {
    tokens: ["bitcoin", "ethereum"],
    wallets: ["0x..."],
  },
});

await hive.createRiskWatchMonitor(subject, {
  name: "Wallet and approvals risk",
  target: {
    addresses: ["0x..."],
    chains: ["ethereum", "base"],
  },
});

await hive.rememberFact(subject, {
  key: "report_style",
  namespace: "watchlist_digest",
  value: { detail: "concise", riskTolerance: "low" },
});

const alerts = await hive.listAlerts(subject, { status: "open", limit: 20 });
```

The adapter intentionally covers the common B2B product actions:
watchlist digests, risk watches, token discovery risk, alerts, reports, and
memory facts, plus monitor cleanup and subject audit reads for support. Use
`callForSubject()` when you need an advanced Hive tool that does not have a
convenience wrapper yet.

## Discovery Flow

Hive root MCP exposes a compact tool surface. Discover the task first, inspect
the exact schema, then invoke the endpoint:

```ts
import {
  createHiveMcpClient,
  getHiveEndpointSchema,
  invokeHiveEndpoint,
  readHiveMetadataSnapshot,
  searchHiveTools,
} from "hive-mcp-client";

const hive = await createHiveMcpClient({
  apiKey: process.env.HIVE_API_KEY,
});

const matches = await searchHiveTools(hive, {
  query: "token security risk",
  limit: 10,
});

const schema = await getHiveEndpointSchema(hive, "get_token_security");
const response = await invokeHiveEndpoint(hive, "get_token_security", {
  chainId: "1",
  contract_addresses: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
});

const metadata = await readHiveMetadataSnapshot(hive);
await hive.close();
```

Preserve `_hive`, `meta`, provider, source, freshness, cache, and runtime status
fields in your own response model. Do not silently strip these fields before
showing data to a user or downstream agent.

## Next.js Route Example

```ts
import { NextResponse } from "next/server";
import { createHiveMcpClient, invokeHiveEndpoint } from "hive-mcp-client";

export async function GET() {
  const hive = await createHiveMcpClient({
    apiKey: process.env.HIVE_API_KEY,
    clientName: "my-next-app",
  });

  try {
    const price = await invokeHiveEndpoint(hive, "get_price", {
      ids: "bitcoin,ethereum",
      vs_currencies: "usd",
    });

    return NextResponse.json({ ok: true, price });
  } finally {
    await hive.close();
  }
}
```

## Runtime Controls

```ts
const hive = await createHiveMcpClient({
  apiKey: process.env.HIVE_API_KEY,
  connectTimeoutMs: 18_000,
  requestTimeoutMs: 22_000,
  retry: {
    attempts: 2,
    baseDelayMs: 500,
  },
});
```

The client retries MCP tool calls with exponential backoff. Treat invalid
schemas, missing keys, and user input errors as non-retryable in your own app
logic.

## Metadata And Sources

```ts
import {
  extractHiveSources,
  inferHiveProvider,
  readHiveMetadataSnapshot,
} from "hive-mcp-client";

const snapshot = await readHiveMetadataSnapshot(hive);
const provider = inferHiveProvider("get_price", snapshot);
const sources = extractHiveSources({
  endpointName: "get_price",
  result,
  snapshot,
});
```

Use metadata to explain where data came from, whether it was cached or degraded,
and when it was fetched.

## Vercel AI SDK

```ts
import {
  buildAiSdkHiveMcpTransportConfig,
  prepareHiveAiSdkTools,
} from "hive-mcp-client/ai-sdk";

const transport = buildAiSdkHiveMcpTransportConfig({
  apiKey: process.env.HIVE_API_KEY,
});

const { tools } = await prepareHiveAiSdkTools({
  client: myAiSdkMcpClient,
  query: "token diligence",
  selectionMode: "ranked",
});
```

Use ranked or core tool selection to avoid flooding the model with unnecessary
category tools.

## LangChain

The LangChain bridge uses `@langchain/core` as an optional peer dependency.
Install it only in apps that use the `/langchain` export:

```bash
npm install hive-mcp-client @langchain/core
```

```ts
import { createHiveLangChainTools } from "hive-mcp-client/langchain";

const tools = createHiveLangChainTools({
  clientOptions: {
    apiKey: process.env.HIVE_API_KEY,
  },
});
```

The LangChain bridge creates tools over the compact Hive root surface and uses
Hive discovery helpers for endpoint invocation.

## REST Fallback

REST is still supported and useful outside TypeScript:

```bash
curl -X POST https://mcp.hiveintelligence.xyz/api/v1/execute \
  -H "Authorization: Bearer $HIVE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "get_price",
    "args": {
      "ids": "bitcoin",
      "vs_currencies": "usd"
    }
  }'
```

## Package Status

`hive-mcp-client` is published on npm as the public TypeScript adapter for Hive
MCP. The release gate below is the canonical flow for cutting a public version.

Release gate:

```bash
npm --workspace hive-mcp-client run typecheck
npm --workspace hive-mcp-client run test
npm --workspace hive-mcp-client run pack:check
npm publish --workspace hive-mcp-client --access public
```

Public source: https://github.com/hive-intel/hive-sdk/tree/main/client
