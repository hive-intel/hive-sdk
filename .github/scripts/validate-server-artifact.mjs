#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  lstatSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { execFileSync } from "node:child_process";

const [tarball, manifestPath] = process.argv.slice(2);
if (!tarball || !manifestPath) {
  throw new Error(
    "Usage: validate-server-artifact.mjs <package.tgz> <release-manifest.json>",
  );
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const expectedManifestKeys = [
  "buildSha",
  "deployedUrl",
  "imageDigest",
  "package",
  "schemaVersion",
  "sha256",
  "tarball",
  "version",
];
assert(
  JSON.stringify(Object.keys(manifest).sort()) ===
    JSON.stringify(expectedManifestKeys),
  "Release manifest has missing or unexpected fields.",
);
assert(manifest.schemaVersion === 1, "Unsupported release manifest schema.");
assert(manifest.package === "hive-intelligence", "Unexpected package name.");
assert(
  /^[0-9]+\.[0-9]+\.[0-9]+$/.test(manifest.version),
  "Manifest version must be exact semver.",
);
assert(
  manifest.tarball === `hive-intelligence-${manifest.version}.tgz`,
  "Manifest tarball name does not match its version.",
);
assert(/^[a-f0-9]{64}$/.test(manifest.sha256), "Invalid tarball SHA-256.");
assert(/^[a-f0-9]{40}$/.test(manifest.buildSha), "Invalid build SHA.");
assert(
  /^sha256:[a-f0-9]{64}$/.test(manifest.imageDigest),
  "Invalid image digest.",
);
assert(
  manifest.deployedUrl === "https://mcp.hiveintelligence.xyz",
  "Unexpected deployed URL.",
);
assert(basename(tarball) === manifest.tarball, "Unexpected tarball filename.");

const archive = readFileSync(tarball);
const actualSha256 = createHash("sha256").update(archive).digest("hex");
assert(actualSha256 === manifest.sha256, "Tarball SHA-256 mismatch.");

const entries = execFileSync("tar", ["-tzf", tarball], {
  encoding: "utf8",
  maxBuffer: 8 * 1024 * 1024,
})
  .split("\n")
  .filter(Boolean);
assert(entries.length > 0, "Package archive is empty.");
assert(
  new Set(entries).size === entries.length,
  "Duplicate tar entries found.",
);

const exactFiles = new Set([
  "package/LICENSE",
  "package/README.md",
  "package/package.json",
  "package/bin/hive-mcp.js",
  "package/agent-skills/LICENSE",
  "package/build/release.json",
]);
function isAllowedEntry(entry) {
  if (exactFiles.has(entry)) return true;
  if (/^package\/build\/[A-Za-z0-9._-]+\.js$/.test(entry)) return true;
  if (
    /^package\/agent-skills\/[A-Za-z0-9._/-]+(?:\.json|\.md|\.mjs|\/LICENSE)$/.test(
      entry,
    )
  ) {
    return true;
  }
  if (!entry.endsWith("/")) return false;
  return /^(?:package\/|package\/(?:bin|build)\/|package\/agent-skills(?:\/[A-Za-z0-9._-]+)*\/)$/.test(
    entry,
  );
}

for (const entry of entries) {
  assert(!/[\0\r\n\\]/.test(entry), `Unsafe tar entry: ${entry}`);
  assert(entry.startsWith("package/"), `Entry outside package/: ${entry}`);
  assert(
    !entry.split("/").some((part) => part === "." || part === ".."),
    `Path traversal entry: ${entry}`,
  );
  assert(isAllowedEntry(entry), `Unexpected package entry: ${entry}`);
}

for (const required of [
  "package/package.json",
  "package/bin/hive-mcp.js",
  "package/build/server.js",
  "package/build/stdio.js",
  "package/build/cli.js",
  "package/build/monitor-worker.js",
  "package/build/release.json",
]) {
  assert(
    entries.includes(required),
    `Required package entry missing: ${required}`,
  );
}

const verboseEntries = execFileSync("tar", ["-tvzf", tarball], {
  encoding: "utf8",
  maxBuffer: 8 * 1024 * 1024,
})
  .split("\n")
  .filter(Boolean);
for (const entry of verboseEntries) {
  assert(
    entry.startsWith("-") || entry.startsWith("d"),
    `Links and special files are forbidden: ${entry.slice(0, 20)}`,
  );
}

const extractionRoot = mkdtempSync(join(tmpdir(), "hive-server-artifact-"));
try {
  execFileSync(
    "tar",
    ["-xzf", tarball, "-C", extractionRoot, "--no-same-owner"],
    { stdio: "pipe" },
  );
  const packageRoot = join(extractionRoot, "package");
  const pkg = JSON.parse(
    readFileSync(join(packageRoot, "package.json"), "utf8"),
  );
  assert(pkg.name === manifest.package, "Package metadata name mismatch.");
  assert(
    pkg.version === manifest.version,
    "Package metadata version mismatch.",
  );
  assert(pkg.private !== true, "Package metadata is private.");
  assert(
    pkg.repository?.url === "git+https://github.com/hive-intel/hive-sdk.git",
    "Package repository metadata is not canonical.",
  );
  const embeddedRelease = JSON.parse(
    readFileSync(join(packageRoot, "build", "release.json"), "utf8"),
  );
  const expectedEmbeddedKeys = [
    "buildSha",
    "deployedUrl",
    "imageDigest",
    "manifest",
    "package",
    "version",
  ];
  assert(
    JSON.stringify(Object.keys(embeddedRelease).sort()) ===
      JSON.stringify(expectedEmbeddedKeys),
    "Embedded release metadata has unexpected fields.",
  );
  for (const key of expectedEmbeddedKeys.filter((key) => key !== "manifest")) {
    assert(
      embeddedRelease[key] === manifest[key],
      `Embedded release metadata mismatch: ${key}.`,
    );
  }
  assert(
    embeddedRelease.manifest ===
      `https://raw.githubusercontent.com/hive-intel/hive-sdk/v${manifest.version}/releases/v${manifest.version}.json`,
    "Embedded release manifest URL is not pinned to its version tag.",
  );

  const forbiddenPatterns = [
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    /\b(?:ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{20,}|npm_[A-Za-z0-9]{36})\b/,
    /\bAKIA[A-Z0-9]{16}\b/,
    /\b(?:sk_live_|hive_(?:live|test)_)[A-Za-z0-9_-]{24,}\b/,
    /\bAIza[0-9A-Za-z_-]{35}\b/,
    /sourceMappingURL=/,
  ];

  function scan(dir) {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      const stat = lstatSync(path);
      assert(!stat.isSymbolicLink(), `Symlink found after extraction: ${name}`);
      if (stat.isDirectory()) {
        scan(path);
        continue;
      }
      const content = readFileSync(path);
      if (content.includes(0)) continue;
      const text = content
        .toString("utf8")
        .replace(/\\u002f/gi, "/")
        .replace(/\\\//g, "/")
        .replace(/%2f/gi, "/");
      for (const pattern of forbiddenPatterns) {
        assert(!pattern.test(text), `Forbidden content found in ${name}.`);
      }

      const allowedGitHubRepositories = new Set([
        "bitcoin/bitcoin",
        "bitinn/node-fetch",
        "graphql/graphql-js",
        "hive-intel/hive-sdk",
        "hive-intel/hive-skills",
        "microsoft/TypeScript",
        "vercel-labs/skills",
      ]);
      for (const match of text.matchAll(
        /(?:git\+)?https?:\/\/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)/g,
      )) {
        const repository = match[1].replace(/\.git$/, "");
        assert(
          allowedGitHubRepositories.has(repository),
          `Unreviewed GitHub repository reference found in ${name}.`,
        );
      }
    }
  }
  scan(packageRoot);
} finally {
  rmSync(extractionRoot, { recursive: true, force: true });
}

process.stdout.write(
  `Validated ${manifest.tarball} for build ${manifest.buildSha.slice(0, 12)}.\n`,
);
