#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { checkHiveB2BReadiness } from "./b2b.js";
import { createHiveMcpClient } from "./client.js";
import { HIVE_DEFAULT_MCP_URL } from "./constants.js";
import { buildHiveSubjectHeaders } from "./subject.js";
import type { HiveAuthScheme } from "./types.js";

type DoctorCheckStatus = "pass" | "warn" | "fail";

type DoctorCheck = {
  message: string;
  name: string;
  status: DoctorCheckStatus;
};

type DoctorConfig = {
  apiKey?: string;
  authScheme?: HiveAuthScheme;
  endUserId?: string;
  json: boolean;
  liveSubjectSmoke: boolean;
  readinessUrl?: string;
  requestTimeoutMs?: number;
  subjectSigningSecret?: string;
  tenantId?: string;
  url: string;
};

type CliIo = {
  stderr: Pick<NodeJS.WriteStream, "write">;
  stdout: Pick<NodeJS.WriteStream, "write">;
};

export type HiveMcpCliOptions = {
  argv?: string[];
  env?: NodeJS.ProcessEnv;
  fetch?: typeof fetch;
  io?: CliIo;
};

function usage(): string {
  return `Hive MCP client

Usage:
  hive-mcp doctor [options]

Environment:
  HIVE_API_KEY                    Hive API key for the partner backend
  HIVE_SUBJECT_SIGNING_SECRET     Subject signing secret for B2B keys
  HIVE_MCP_URL                    Optional MCP URL, defaults to ${HIVE_DEFAULT_MCP_URL}
  HIVE_TENANT_ID                  Optional tenant id for local signing checks
  HIVE_END_USER_ID                Optional end-user id for local signing checks

Options:
  --api-key <key>                 Override HIVE_API_KEY
  --subject-signing-secret <key>  Override HIVE_SUBJECT_SIGNING_SECRET
  --subject-secret <key>          Alias for --subject-signing-secret
  --url <url>                     Override HIVE_MCP_URL
  --readiness-url <url>           Override the readiness endpoint URL
  --tenant-id <id>                Tenant id for subject signing checks
  --end-user-id <id>              End-user id for subject signing checks
  --auth-scheme <scheme>          x-api-key or bearer
  --live-subject-smoke            Call hive_list_monitors for the signed subject
  --json                          Print machine-readable output
  -h, --help                      Show help
`;
}

function valueAfter(args: string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function parseAuthScheme(value: string): HiveAuthScheme {
  if (value === "x-api-key" || value === "bearer" || value === "none") {
    return value;
  }
  throw new Error("--auth-scheme must be x-api-key, bearer, or none.");
}

function parseRequestTimeoutMs(value: string, source: string): number {
  const timeoutMs = Number(value);
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error(
      `${source} must be a positive finite number of milliseconds.`,
    );
  }
  return timeoutMs;
}

function parseArgs(
  argv: string[],
  env: NodeJS.ProcessEnv,
): DoctorConfig | "help" {
  const args = [...argv];
  const command = args[0] && !args[0].startsWith("-") ? args.shift() : "doctor";
  if (command === "help" || args.includes("--help") || args.includes("-h")) {
    return "help";
  }
  if (command !== "doctor") {
    throw new Error(`Unknown command: ${command}`);
  }

  const config: DoctorConfig = {
    apiKey: env.HIVE_API_KEY,
    authScheme: env.HIVE_AUTH_SCHEME
      ? parseAuthScheme(env.HIVE_AUTH_SCHEME)
      : undefined,
    endUserId: env.HIVE_END_USER_ID,
    json: false,
    liveSubjectSmoke: false,
    readinessUrl: env.HIVE_B2B_READINESS_URL,
    requestTimeoutMs: env.HIVE_REQUEST_TIMEOUT_MS
      ? parseRequestTimeoutMs(
          env.HIVE_REQUEST_TIMEOUT_MS,
          "HIVE_REQUEST_TIMEOUT_MS",
        )
      : undefined,
    subjectSigningSecret: env.HIVE_SUBJECT_SIGNING_SECRET,
    tenantId: env.HIVE_TENANT_ID,
    url: env.HIVE_MCP_URL ?? HIVE_DEFAULT_MCP_URL,
  };

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    switch (arg) {
      case "--api-key":
        config.apiKey = valueAfter(args, index, arg);
        index++;
        break;
      case "--auth-scheme":
        config.authScheme = parseAuthScheme(valueAfter(args, index, arg));
        index++;
        break;
      case "--end-user-id":
        config.endUserId = valueAfter(args, index, arg);
        index++;
        break;
      case "--json":
        config.json = true;
        break;
      case "--live-subject-smoke":
        config.liveSubjectSmoke = true;
        break;
      case "--readiness-url":
        config.readinessUrl = valueAfter(args, index, arg);
        index++;
        break;
      case "--subject-secret":
      case "--subject-signing-secret":
        config.subjectSigningSecret = valueAfter(args, index, arg);
        index++;
        break;
      case "--tenant-id":
        config.tenantId = valueAfter(args, index, arg);
        index++;
        break;
      case "--url":
        config.url = valueAfter(args, index, arg);
        index++;
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  return config;
}

function addCheck(
  checks: DoctorCheck[],
  status: DoctorCheckStatus,
  name: string,
  message: string,
): void {
  checks.push({ message, name, status });
}

function icon(status: DoctorCheckStatus): string {
  if (status === "pass") return "PASS";
  if (status === "warn") return "WARN";
  return "FAIL";
}

function writeTextResult(
  io: CliIo,
  checks: DoctorCheck[],
  ok: boolean,
  mode?: string,
): void {
  io.stdout.write("Hive B2B doctor\n");
  if (mode) {
    io.stdout.write(`Mode: ${mode}\n`);
  }
  for (const check of checks) {
    io.stdout.write(`${icon(check.status)} ${check.name}: ${check.message}\n`);
  }
  io.stdout.write(
    ok ? "OK Hive B2B adapter is ready.\n" : "Hive B2B adapter is not ready.\n",
  );
}

function writeJsonResult(
  io: CliIo,
  checks: DoctorCheck[],
  ok: boolean,
  mode?: string,
): void {
  io.stdout.write(
    `${JSON.stringify(
      {
        checks,
        mode,
        ok,
      },
      null,
      2,
    )}\n`,
  );
}

function hasFailure(checks: DoctorCheck[]): boolean {
  return checks.some((check) => check.status === "fail");
}

async function runLiveSubjectSmoke(config: DoctorConfig): Promise<void> {
  const client = await createHiveMcpClient({
    apiKey: config.apiKey,
    authScheme: config.authScheme,
    requestTimeoutMs: config.requestTimeoutMs,
    subjectSigningSecret: config.subjectSigningSecret,
    url: config.url,
  });
  try {
    await client.callTool(
      "hive_list_monitors",
      { limit: 1 },
      {
        subject: {
          endUserId: config.endUserId ?? "",
          tenantId: config.tenantId ?? "",
        },
      },
    );
  } finally {
    await client.close();
  }
}

async function runDoctor(
  config: DoctorConfig,
  io: CliIo,
  fetchImpl?: typeof fetch,
): Promise<number> {
  const checks: DoctorCheck[] = [];
  if (!config.apiKey?.trim()) {
    addCheck(
      checks,
      "fail",
      "api_key",
      "Set HIVE_API_KEY or pass --api-key from a trusted backend environment.",
    );
    if (config.json) {
      writeJsonResult(io, checks, false);
    } else {
      writeTextResult(io, checks, false);
    }
    return 2;
  }

  try {
    const readiness = await checkHiveB2BReadiness({
      apiKey: config.apiKey,
      authScheme: config.authScheme,
      fetch: fetchImpl,
      readinessUrl: config.readinessUrl,
      requestTimeoutMs: config.requestTimeoutMs,
      url: config.url,
    });

    addCheck(checks, "pass", "api_key", "Hive accepted the API key.");
    addCheck(
      checks,
      readiness.api_key.b2b_subjects_enabled ? "pass" : "fail",
      "b2b_subjects_enabled",
      readiness.api_key.b2b_subjects_enabled
        ? "The key is configured for downstream subject isolation."
        : "Enable b2b_subjects_enabled before using one key for many customers.",
    );
    addCheck(
      checks,
      readiness.api_key.subject_signing_secret_configured ? "pass" : "fail",
      "server_signing_secret",
      readiness.api_key.subject_signing_secret_configured
        ? "Hive has a subject signing secret for this key."
        : "Create or rotate the key so Hive issues a subject signing secret.",
    );
    addCheck(
      checks,
      readiness.b2b_adapter_ready ? "pass" : "fail",
      "readiness",
      readiness.b2b_adapter_ready
        ? "Readiness endpoint reports the adapter can run in B2B mode."
        : readiness.warnings.join(" ") ||
            "Readiness endpoint is not B2B-ready.",
    );

    if (!config.subjectSigningSecret?.trim()) {
      addCheck(
        checks,
        "fail",
        "local_signing_secret",
        "Set HIVE_SUBJECT_SIGNING_SECRET server-side so the adapter can sign subjects.",
      );
    } else {
      addCheck(
        checks,
        "pass",
        "local_signing_secret",
        "A local subject signing secret is present.",
      );
    }

    if (
      config.tenantId?.trim() &&
      config.endUserId?.trim() &&
      config.subjectSigningSecret?.trim()
    ) {
      buildHiveSubjectHeaders({
        endUserId: config.endUserId,
        method: "POST",
        path: new URL(config.url).pathname || "/mcp",
        signingSecret: config.subjectSigningSecret,
        tenantId: config.tenantId,
      });
      addCheck(
        checks,
        "pass",
        "subject_signature",
        "Signed subject headers can be generated for the MCP endpoint.",
      );
    } else {
      addCheck(
        checks,
        "warn",
        "subject_signature",
        "Pass --tenant-id and --end-user-id to verify local subject header signing.",
      );
    }

    if (config.liveSubjectSmoke) {
      if (!config.tenantId?.trim() || !config.endUserId?.trim()) {
        addCheck(
          checks,
          "fail",
          "live_subject_smoke",
          "--live-subject-smoke requires --tenant-id and --end-user-id.",
        );
      } else if (!config.subjectSigningSecret?.trim()) {
        addCheck(
          checks,
          "fail",
          "live_subject_smoke",
          "--live-subject-smoke requires HIVE_SUBJECT_SIGNING_SECRET.",
        );
      } else {
        await runLiveSubjectSmoke(config);
        addCheck(
          checks,
          "pass",
          "live_subject_smoke",
          "hive_list_monitors succeeded for the signed subject.",
        );
      }
    } else {
      addCheck(
        checks,
        "warn",
        "live_subject_smoke",
        "Skipped. Add --live-subject-smoke with tenant and end-user ids for an MCP read check.",
      );
    }

    const ok = !hasFailure(checks);
    if (config.json) {
      writeJsonResult(io, checks, ok, readiness.mode);
    } else {
      writeTextResult(io, checks, ok, readiness.mode);
    }
    return ok ? 0 : 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    addCheck(checks, "fail", "readiness_request", message);
    if (config.json) {
      writeJsonResult(io, checks, false);
    } else {
      writeTextResult(io, checks, false);
    }
    return 1;
  }
}

export async function runHiveMcpCli(
  options: HiveMcpCliOptions = {},
): Promise<number> {
  const io = options.io ?? {
    stderr: process.stderr,
    stdout: process.stdout,
  };
  try {
    const parsed = parseArgs(
      options.argv ?? process.argv.slice(2),
      options.env ?? process.env,
    );
    if (parsed === "help") {
      io.stdout.write(usage());
      return 0;
    }
    return await runDoctor(parsed, io, options.fetch);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    io.stderr.write(`${message}\n\n${usage()}`);
    return 2;
  }
}

function isCliEntrypoint(): boolean {
  if (!process.argv[1]) {
    return false;
  }
  const modulePath = fileURLToPath(import.meta.url);
  try {
    return realpathSync(process.argv[1]) === realpathSync(modulePath);
  } catch {
    return process.argv[1] === modulePath;
  }
}

if (isCliEntrypoint()) {
  runHiveMcpCli().then((code) => {
    process.exitCode = code;
  });
}
