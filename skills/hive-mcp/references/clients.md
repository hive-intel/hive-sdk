# Per-client install instructions

Use the canonical hosted endpoint everywhere:

```text
https://mcp.hiveintelligence.xyz/mcp
```

After hosted OAuth activation, interactive clients use URL-only OAuth
discovery. Headless API and backend paths keep `HIVE_API_KEY` in server-side
secret storage. Before giving any native connector instruction, verify that
`https://mcp.hiveintelligence.xyz/.well-known/oauth-protected-resource/mcp`
returns valid metadata; otherwise use a trusted headless path and say that the
native connector is not live yet.

## Claude Code

```bash
claude mcp add --transport http --scope user hive https://mcp.hiveintelligence.xyz/mcp
```

After OAuth activation, Claude opens Hive authorization on first connect. Use
`--scope user` for a global entry or `--scope project` for the current project.

## Claude Desktop / Claude.ai

Do not put a remote URL in `claude_desktop_config.json`; that file is for local
stdio servers. Open **Settings → Connectors → Add custom connector**, enter the
Hive URL, and, after OAuth activation, complete browser authorization.

## Cursor

Edit `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "hive": {
      "url": "https://mcp.hiveintelligence.xyz/mcp"
    }
  }
}
```

After OAuth activation, reload MCP servers, approve the public URL, and
complete OAuth when Cursor opens the browser. Never add a placeholder
Authorization header.

## VS Code (GitHub Copilot Chat)

Create `.vscode/mcp.json` or use the MCP user configuration:

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

The official one-click form is a `vscode:mcp/install?` URL containing the
URL-encoded object `{ "name": "hive", "type": "http", "url": "..." }`.
The Hive CLI installs workflow skills for Copilot-compatible agents under
`~/.copilot/skills`.

## Windsurf / Devin Desktop

Edit `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "hive": {
      "serverUrl": "https://mcp.hiveintelligence.xyz/mcp"
    }
  }
}
```

After OAuth activation, reload the client and complete native OAuth.

## Gemini CLI

Edit `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "hive": {
      "httpUrl": "https://mcp.hiveintelligence.xyz/mcp"
    }
  }
}
```

After OAuth activation, Gemini CLI discovers OAuth for the remote HTTP server
and stores tokens in its credential store. Hive workflow skills install under
`~/.gemini/skills`.

## ChatGPT custom app

In ChatGPT open **Settings → Apps**, enable Developer mode if the workspace
requires it, choose **Create app**, enter the Hive URL, scan tools, and complete
Hive OAuth. If the production protected-resource metadata is unavailable, use
the server-side Responses API path until the OAuth deployment is activated.

## Grok

After OAuth activation, open `grok.com/connectors`, add a custom MCP connector
with the Hive URL, and complete OAuth. Verify a visible Hive tool call and
runtime receipt rather than accepting an answer generated only from model
memory.

## OpenAI Responses API (headless)

Use Hive as a server-side remote MCP tool. Keep `HIVE_API_KEY` in backend secret
storage and pass it through the Responses API authorization field; never expose
it to a browser or prompt.

## Codex

Use Codex's supported CLI flow so the server entry is URL-only and Codex owns
the OAuth token lifecycle:

```bash
codex mcp add hive --url https://mcp.hiveintelligence.xyz/mcp
codex mcp login hive
```

Complete Hive authorization in the browser. Hive workflow skills install under
`~/.codex/skills`. For a truly headless Codex process that cannot open a
browser, `bearer_token_env_var = "HIVE_API_KEY"` remains an explicit fallback;
keep the key in the launching process's secret store, never in a shared file.

## Local stdio fallback

For local-only clients, self-hosting, or provider-key experiments:

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

Local stdio does not need `HIVE_API_KEY`; optional upstream provider keys can be
supplied locally when needed.
