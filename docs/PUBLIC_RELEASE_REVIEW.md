# Public repository security review — 21 September 2026

Owner decision: publish `morrispes5/muara-aspirasi` after review. The owner explicitly confirmed that public source can be cloned/downloaded. This supersedes the earlier private-only repository policy; archive exclusions never hide files from a clone.

## Reviewed baseline

Main commit `fc723b9f295fa531189594741bf1b0f77aaeced7` (merged PR #7). The separate local checkout was older and had a user modification to `next-env.d.ts`; it was preserved. An isolated worktree was used for review and another for fixes.

The static review covered 250 tracked files: server/client code, tests, scripts, configuration, documentation, migration schema data, dependency metadata and visual assets. Independent source and architecture reviews were followed by parent validation. No confirmed authentication bypass, public report-data disclosure, SQL/HTML injection or spreadsheet formula execution was found in this scope. This is bounded evidence, not a guarantee that vulnerabilities cannot exist.

## Findings and fixes

1. **Medium: shared submission quota could be consumed by invalid evidence requests.** Evidence requests now check the feature flag, bound streamed JSON to 8 KiB, validate descriptors, and use an independent upload budget. Failed CAPTCHA submissions no longer consume the global report budget. The per-network submission limit remains five attempts/hour, and the global budget remains 150 verified attempts/hour. Valid uploads remain limited to ten/network/hour and 150 globally/hour in a separate scope.
2. **Low: permanent deletion left dependent free text.** The existing approved deletion transaction now tombstones internal notes and their deletion reason, clears reporter messages and assignment text, and redacts upload-intent filenames. Minimal status/account/timestamp metadata and opaque staging keys remain for audit and safe cleanup retries. Existing owner/MFA/approval/hold checks remain. This patch performs no database mutation or retrospective cleanup of earlier completed deletions.

Regression tests exercise rejected/disabled uploads, independent quotas, failed CAPTCHA, exhausted quotas, body limits, Retry-After, a sentinel private value across dependent records, exact report scoping, active holds and failed storage deletion. Database/service mocks prove application behavior, not a live PostgreSQL deletion transaction.

## Publication exposure checks

- Gitleaks 8.30.1, official release checksum verified: all 57 reachable commits across fetched refs scanned. One additional finding was the deterministic hexadecimal fixture in the historical release-preflight test. Its exact commit/file/rule/line fingerprint is documented in `.gitleaksignore`; no broad path/rule exemption was added.
- All 51 available GitHub Actions run logs and 30 unexpired artifacts downloaded locally and scanned, plus issue/PR/review/commit comments. Three scanner matches were historical scanner-report metadata, not service credentials. The historical SARIF finding itself referred to the same dummy preflight fixture and redacted its snippet.
- Seven server-secret values/password components from local environment files were compared locally against 1,022 reachable Git objects and 264 downloaded metadata/log/artifact files: zero matches. Values were never printed or uploaded. This does not cover credentials absent from those local files.
- Tracked environment history contains the template only; no private environment, key, log, spreadsheet, or database export files were found. Test identities are synthetic. Institutional/public images were visually reviewed; no private-report or credential screenshots were found. Git author metadata remains part of public commit history.
- Dependency advisory audit: zero reported vulnerabilities. Lockfile URLs use the public npm registry without embedded credentials.

## Validation and operational limits

- Baseline: 329 unit tests passed, three opt-in integration tests skipped; lint/typecheck passed.
- Fix: 343 unit tests passed, three opt-in integration tests skipped; lint, typecheck and migration consistency passed. Production webpack build passed after allowing the expected Google Fonts download. No production environment file was loaded.
- CI, browser results, merge commit, visibility and final repository protection readback are recorded in the PR and release follow-up.
- No production report was created/deleted and no production database migration was run. Existing residual data from historical deletions requires a separately scoped operator review; this release does not silently rewrite old records.
- Live provider isolation, R2 policy, real CAPTCHA resistance and every possible encoded secret are not certified by this source review. Public repository access does not grant database/admin credentials.

Codex Security scan `e988232a-7ce5-402d-8d33-433d791f93f1` is the immutable pre-fix report (one medium, one low finding). Its usage accounting reports 17,433,058 aggregate tokens across five threads, including 16,705,920 cached input tokens; these are tool-reported cumulative counts, not billing estimates. The remediation and release evidence belongs to this PR.
