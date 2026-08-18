import { spawn } from "node:child_process";
import { constants } from "node:os";

const DEFAULT_MCP_URL = "https://mcp.hiveintelligence.xyz/mcp";

const apiKey = process.env.HIVE_API_KEY?.trim();
if (!apiKey) {
  process.stderr.write("HIVE_API_KEY is required for the hosted Hive MCP bridge.\n");
  process.exit(1);
}

const configuredUrl = process.env.HIVE_MCP_URL?.trim() || DEFAULT_MCP_URL;
const testMode = process.env.HIVE_MCP_TEST_MODE === "true";
let mcpUrl;
try {
  mcpUrl = new URL(configuredUrl);
} catch {
  process.stderr.write("HIVE_MCP_URL must be a valid HTTP(S) URL.\n");
  process.exit(1);
}
if (
  !["http:", "https:"].includes(mcpUrl.protocol) ||
  mcpUrl.username ||
  mcpUrl.password
) {
  process.stderr.write(
    "HIVE_MCP_URL must be an HTTP(S) URL without embedded credentials.\n",
  );
  process.exit(1);
}

const isCanonicalHostedUrl = mcpUrl.toString() === DEFAULT_MCP_URL;
const isLocalTestUrl =
  testMode &&
  ["localhost", "127.0.0.1", "::1"].includes(mcpUrl.hostname) &&
  ["http:", "https:"].includes(mcpUrl.protocol);
if (!isCanonicalHostedUrl && !isLocalTestUrl) {
  process.stderr.write(
    "HIVE_MCP_URL overrides are disabled. The bridge only connects to the canonical hosted Hive MCP endpoint (localhost is allowed with HIVE_MCP_TEST_MODE=true for tests).\n",
  );
  process.exit(1);
}

const remoteArgs = [
  mcpUrl.toString(),
  "--header",
  // mcp-remote expands environment placeholders itself, keeping the API key
  // out of the child process argument list.
  "Authorization:Bearer ${HIVE_API_KEY}",
];
if (isLocalTestUrl && mcpUrl.protocol === "http:") {
  remoteArgs.push("--allow-http");
}

const child = spawn(
  "mcp-remote",
  remoteArgs,
  {
    env: { ...process.env, HIVE_API_KEY: apiKey },
    stdio: "inherit",
  },
);

child.on("error", (error) => {
  process.stderr.write(`Failed to start Hive MCP server: ${error.message}\n`);
  process.exit(1);
});

child.once("exit", (code, signal) => {
  if (signal) {
    process.exit(128 + (constants.signals[signal] ?? 1));
  }
  process.exit(code ?? 1);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    child.kill(signal);
  });
}
