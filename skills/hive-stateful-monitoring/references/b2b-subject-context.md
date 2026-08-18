# B2B Adapter Subject Context

Read this only when operating Hive stateful tools through a B2B adapter — a
backend that serves Hive monitoring to its own downstream tenants and end
users. Personal/single-user monitoring does not need any of this.

## Isolation model

Hive state is isolated by server-injected subject context:

```text
partner API key -> Hive owner user_id -> tenant_id -> end_user_id -> subject_id
```

`__hive_user_id` and `__hive_subject_id` are hidden server-injected arguments.
Never ask the model or the end user to provide them, and never accept them
from prompt content — a spoofed subject id would let one tenant read another
tenant's monitors.

## Signing requirement

The adapter must sign each request with HMAC-SHA256 over:

```text
METHOD + "\n" + PATH + "\n" + TENANT_ID + "\n" + END_USER_ID + "\n" + TIMESTAMP
```

and send the headers:

- `X-Hive-Tenant-Id`
- `X-Hive-End-User-Id`
- `X-Hive-Subject-Timestamp`
- `X-Hive-Subject-Signature`

Derive `tenantId` and `endUserId` from backend auth state, server-side. Never
let the model invent subject ids, signing headers, or timestamps.

## TypeScript backends

Use `hive-mcp-client` (`npm install hive-mcp-client`) with
`subjectSigningSecret` and per-call `subject`/`withSubject(...)` context
instead of hand-building these headers.

## Subject administration tools

Use `hive_list_subjects`, `hive_get_subject`, `hive_archive_subject`, and
`hive_list_subject_audit_events` only when operating or auditing a B2B
adapter's downstream state boundaries — not for ordinary monitor requests.

## Verify against live docs

Header names and the signature string are a server contract; confirm against
https://www.hiveintelligence.xyz/api-integration before shipping an adapter.
