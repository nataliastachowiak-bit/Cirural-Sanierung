# ResourceLoop AI V2.1 RC — 26.11.2026

Baseline f7bc21170a6e3be965b0c469e3b2d0f7c5063cec. Static review and first remediation batch, not a validated release.

Implemented in this batch: loopback default and fail-closed network access password (single-user Basic Auth, HTTPS required), global AI request budget, top-level workspace validation and atomic file replacement, ignore local data, conservative MCDA technical gate incl. individual criteria and exclusion, separate benchmark ranking, regression tests, disabled actual approval action, honest demonstrator labels, version metadata.

Pending: verified identities/roles, separate participant workspaces, deep server schema validation, optimistic concurrency, append-only approval events, editable evidence-based time assumptions (existing scores remain hypotheses), actual Gemini connectivity test, distributed quotas, E2E and user/fach review. No public deployment with real data. A password does not close multi-user P0. Do not claim compliance or immutable audit trails.

Verification: test definitions added; no test execution claimed. Run bun install --frozen-lockfile, bun run lint, bun run test, bun run build; verify authentication, rejection of invalid data, workspace isolation and demo workflows. KPI targets remain hypotheses.
