# Hive MCP Client Install Matrix

Hive's default product path is the hosted remote MCP endpoint:

```text
https://mcp.hiveintelligence.xyz/mcp
```

After the hosted deployment exposes protected-resource metadata, interactive
clients should store only this public URL and complete Hive OAuth in the
browser. Use local `stdio` for Hive development, self-hosting, provider key
experiments, or clients that cannot use remote Streamable HTTP. Use a Hive API
key for headless backends and as the trusted-client fallback while OAuth is not
active.

## Package boundaries

| Package | Role | Who installs it |
| --- | --- | --- |
| `hive-intelligence` | MCP server, CLI, local stdio runtime, bundled skills installer | End users, self-hosters, desktop clients |
| `hive-mcp-client` | Published typed adapter for apps and agent frameworks | TypeScript app/backend developers |
| `@hiveintelligence/agent-skills` | Skills-only corpus for agents and skill registries | Agents and skill package managers |
| `hive-intel` | Private compatibility CLI/docs workspace; not a public install path | Existing internal compatibility consumers |

## Recommended setup flow

1. Check the protected-resource metadata below. Do not advertise a native
   OAuth install until it returns a valid document.
2. Start with the hosted MCP unless the user explicitly needs local `stdio`.
3. Add only the canonical URL; let the client discover OAuth and open consent.
4. Install the skills so the agent uses task toolsets and evidence receipts.
5. Ask one live, read-only question and require a Hive tool call plus source,
   observation/fetch timing, runtime status, and receipt ID.

## Hosted remote MCP (interactive)

```json
{
  "mcpServers": {
    "hive": {
      "url": "https://mcp.hiveintelligence.xyz/mcp"
    }
  }
}
```

Client-specific native paths:

| Client | Install route | Workflow skills |
| --- | --- | --- |
| Codex | `codex mcp add hive --url https://mcp.hiveintelligence.xyz/mcp`, then `codex mcp login hive` | `~/.codex/skills` |
| VS Code / Copilot | Official `vscode:mcp/install` link or `code --add-mcp` | `~/.copilot/skills` |
| Gemini CLI | URL-only `mcpServers.hive.httpUrl` entry | `~/.gemini/skills` |
| Grok | Manual custom connector at `https://grok.com/connectors` | MCP resources; no local skill directory |

Codex, VS Code, and Gemini installation can be handled by `hive init --all`
when their local client directories are detected. Grok remains manual because
it does not expose a supported local programming surface.

If the protected-resource metadata URL returns 404, hosted OAuth has not been
activated on that deployment. Do not advertise the URL-only install until it
returns valid metadata:

```text
https://mcp.hiveintelligence.xyz/.well-known/oauth-protected-resource/mcp
```

## Headless remote MCP

For a backend or API agent that cannot open browser authorization, inject the
key from secret storage at runtime:

```http
Authorization: Bearer $HIVE_API_KEY
```

Never put that header in an install deeplink, published plugin, shared config,
prompt, screenshot, or browser bundle.

## Local stdio MCP

Local stdio does not require a hosted Hive key. Optional upstream provider keys
belong in the local environment when the user wants provider-key experiments:

```json
{
  "mcpServers": {
    "hive-local": {
      "command": "npx",
      "args": ["-y", "-p", "hive-intelligence@latest", "hive"]
    }
  }
}
```

## Skills install

After protected-resource metadata is live, configure detected clients with
URL-only hosted entries and copy the bundled skills:

```bash
npx -y -p hive-intelligence@latest hive init --all
```

Or install the skills alone from the public registry:

```bash
npx skills add hive-intel/hive-skills
npx skills add hive-intel/hive-skills --list
```
