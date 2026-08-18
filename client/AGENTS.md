# Client SDK Guidelines

This directory is the standalone public `hive-mcp-client` package. Keep its
API typed, transport-agnostic, and backward-compatible unless a release is
explicitly marked as breaking.

Run commands from this directory:

- `npm install`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run pack:check`

Do not add Hive server source, provider credentials, private repository links,
or generated `dist/` artifacts. Public examples should use
`https://mcp.hiveintelligence.xyz/mcp` and the public
`https://github.com/hive-intel/hive-sdk` repository.
