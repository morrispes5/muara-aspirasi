# Codex Handoff Guide — Muara Aspirasi

This guide keeps implementation sessions focused. Send **one milestone at a time** to Codex. Do not ask it to build the full product in one prompt.

## Current handoff — 2 September 2026

Source wave M8 launch-readiness sudah diimplementasikan dan PR #2 sudah merged ke `main` sebagai commit `9b93057`: private R2 evidence intent/upload/verification, admin-only evidence read + audit, ADMIN user management, Better Auth TOTP/backup-code guard, separate production bootstrap, Playwright public smoke, CI browser smoke, dan gitleaks job. Migration lokal `drizzle/20260902113654_minor_emma_frost/` sudah dibuat dan dicek, tetapi belum diterapkan ke Neon. Tidak ada migration production, credential provider, atau production data yang disentuh.

Pada 2 September 2026, nilai `DATABASE_ENVIRONMENT` context Deploy Preview di Netlify sudah dikoreksi menjadi marker non-dictionary yang dipetakan source ke environment preview. Perubahan ini diperlukan agar secret scanner Netlify tidak salah membaca kata umum pada dokumentasi; nilainya sengaja tidak ditulis di repository. Deploy Preview berhasil berstatus `ready`, tetapi kontennya masih mengembalikan `HTTP 401` saat QA sehingga memerlukan akses owner.

Next handoff is owner-controlled Milestone 9 limited launch: configure org-owned preview Neon/R2/Turnstile secrets and CORS, apply the additive migration only to the intended non-production branch, run release preflight, verify the deployed browser/privacy/security journeys, then review production bootstrap/MFA/recovery and rollback gates. Netlify production masih menunjuk deploy lama pada saat verifikasi; jangan menganggap merge sebagai production deploy. Do not use `netlify deploy --trigger --context branch:...`; inspect the resulting context/branch/commit and use the connected PR preview flow.

## 1. Session rules

At the beginning of a Codex session, provide:

1. Repository path and current branch.
2. Exact milestone/task from `MILESTONE_ROADMAP.md` (the detailed execution roadmap); use `IMPLEMENTATION_ROADMAP.md` for the legacy product milestone mapping.
3. Documents it must read before editing.
4. Instruction to inspect existing work and preserve unrelated changes.
5. Required verification commands.

Codex must not invent policy that conflicts with `PRD.md`, `DATA_MODEL.md`, or `SECURITY_PRIVACY.md`.

## 2. Reusable master prompt

```text
You are implementing Muara Aspirasi, a BEM FTI advocacy and student-information portal.

Before changing anything, read:
- README.md
- docs/PRD.md
- docs/ARCHITECTURE.md
- docs/DATA_MODEL.md
- docs/SECURITY_PRIVACY.md
- docs/UX_UI_DESIGN_SYSTEM.md
- docs/MILESTONE_ROADMAP.md
- docs/IMPLEMENTATION_ROADMAP.md
- docs/IMPLEMENTATION_STATUS.md

Current task: <INSERT ONE SPECIFIC MILESTONE TASK>

Rules:
1. Inspect the existing repository first and preserve unrelated work.
2. Implement only the current task; do not start future milestones.
3. Follow the locked stack: Next.js, TypeScript, Tailwind, shadcn/ui, Netlify, Neon, Drizzle, Better Auth, Cloudflare Turnstile, Cloudflare R2.
4. Never expose secrets or private report data to client/public routes.
5. Update the relevant docs if implementation decisions materially change.
6. Run the relevant lint, type-check, test, and build commands.
7. Return a concise summary: files changed, why, verification performed, and anything still blocked.
```

## 3. Milestone prompt add-ons

### Milestone 0 add-on

```text
Bootstrap the repository only. Set up Next.js TypeScript, Tailwind, base lint/type-check/build scripts, Netlify config, GitHub workflow, .env.example, and the documentation/asset structure. Do not add auth, database, or production secrets yet.
```

### Milestone 1 add-on

```text
Implement the public UI shell and static pages from docs/UX_UI_DESIGN_SYSTEM.md. Use the supplied logo files. Use local placeholder content/media only; do not download unlicensed web images. Do not build data mutations or admin routes yet.
```

### Milestone 2 add-on

```text
Implement the public static information and placeholder pages from docs/UX_UI_DESIGN_SYSTEM.md. Keep them non-mutating and label synthetic content clearly. Do not implement database mutation, auth, or the public report form yet.
```

### Milestone 3 add-on

```text
Implement Neon + Drizzle schema/migrations, seed/repository foundation, and database health/transaction helpers according to docs/DATA_MODEL.md and docs/SECURITY_PRIVACY.md. Keep seed synthetic and do not add Better Auth, public submission, or production resources.
```

### Milestone 4 add-on

```text
Implement BEM-only Better Auth with Drizzle adapter, public signup disabled, safe admin bootstrap, auth handler, login/logout/session revoke, server-side role/permission helpers, optimistic proxy redirect, protected admin shell, and auth audit events. Do not implement the public report form or report case workflow yet.
```

### Milestone 5 add-on

```text
Implement public report submission and private tracking exactly as documented. Turnstile must be verified server-side. Store only a hash of the secret tracking token. No report content or identity may appear on public archive pages.
```

### Milestone 6 add-on

```text
Implement the BEM report workflow: filters, report detail, assignment history, safe status transitions, internal notes, reporter-visible updates, and audit events. Enforce roles server-side.
```

Status implementasi 30 Agustus 2026: core M6 sudah tersedia di source pada `/admin/laporan`, `/admin/laporan/[id]`, dan `/api/admin/reports/*`. Tabel report sudah tersedia dari M3 sehingga M6 tidak membuat migration baru. Sebelum mengklaim acceptance runtime penuh, minta izin eksplisit owner untuk smoke mutation dengan data sintetis pada Neon `development` atau `preview`; jangan menyentuh Neon `main`/production.

### Milestone 7 add-on

```text
Implement advocacy update and Info Mahasiswa draft/publish/archive workflows plus public archives/detail pages. Public updates must be independently authored summaries and cannot render original report content.
```

### Milestone 8 add-on

```text
Implement Cloudflare R2 media according to docs/SECURITY_PRIVACY.md. Evidence must remain private. Validate type, count, size, and authorization. Use environment variable names only; do not require real credentials for local tests.
```

### Milestone 9 add-on

```text
Implement and run the relevant tests/checklists. Treat docs/DEPLOYMENT_RUNBOOK.md as the release contract. Do not deploy or modify external production resources without explicit instruction from the project owner.
```

## 4. Definition of done for every Codex task

- Scope matches the requested milestone.
- No unrelated refactor or dependency bloat.
- Relevant documentation is updated.
- Validation/tests/build were actually run and results reported.
- No secret/private data is committed.
- Changes are ready for human review through a pull request and Netlify preview.
