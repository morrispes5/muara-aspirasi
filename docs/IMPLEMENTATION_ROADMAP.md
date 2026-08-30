# Implementation Roadmap — Muara Aspirasi

> Build one milestone at a time. Do not begin the next milestone until the previous acceptance criteria pass.
> Untuk eksekusi sesi saat ini, gunakan `MILESTONE_ROADMAP.md` dan `IMPLEMENTATION_STATUS.md`; dokumen ini dipertahankan sebagai roadmap legacy dan pemetaan milestone produk.
> Catatan status: label legacy di bawah tidak mengubah urutan eksekusi terbaru. Case management yang tertulis sebagai Milestone 4 di dokumen legacy selesai pada Milestone 6 execution roadmap; public publishing legacy Milestone 5 menjadi Milestone 7 execution roadmap.

## Milestone 0 — Project bootstrap and documentation

**Goal:** Create a clean, deployable Next.js repository with this documentation.

Tasks:

- Initialize Next.js with TypeScript, ESLint, Tailwind, App Router, and `src/` disabled/enabled consistently.
- Add shadcn/ui only for components actually used.
- Add formatting/lint/type-check scripts.
- Add `.env.example`, `.gitignore`, `netlify.toml`, and GitHub Actions baseline.
- Copy all files in this documentation pack into `/docs` and root README.
- Add provided logos under `public/assets/brand/`.

Acceptance:

- `npm run lint`, `npm run typecheck`, and `npm run build` pass locally.
- A Netlify deploy preview builds from a pull request.

## Milestone 1 — Design foundation and public shell

**Goal:** Implement the approved campus-oriented visual system without backend data.

Tasks:

- Build institution bar, responsive header, footer, buttons, cards, badges, and container primitives.
- Build static public pages: Home, About, Privacy, and reporting ethics.
- Use approved logos and placeholder/sample content only.
- Implement mobile navigation and accessibility basics.

Acceptance:

- Visual hierarchy matches `UX_UI_DESIGN_SYSTEM.md`.
- Mobile and desktop layouts work without horizontal overflow.
- Lighthouse/accessibility issues are manually reviewed for headings, landmarks, focus, and contrast.

## Milestone 2 — Database, ORM, and admin authentication

**Goal:** Create secure data foundations before public submission.

Tasks:

- Provision separate Neon development and production databases/branches.
- Implement Drizzle schema, migrations, seed for one admin and sample content.
- Configure Better Auth and BEM roles.
- Create protected `/admin` layout and role guard.
- Build basic admin shell and audit event helper.

Acceptance:

- Migration applies cleanly to a blank development database.
- Unauthenticated user cannot access `/admin`.
- `EDITOR`, `ADVOCATE`, and `ADMIN` permissions are tested.

## Milestone 3 — Aspirasi submission and private tracking

**Goal:** Deliver the core student input loop.

Tasks:

- Build guided report form and Zod schemas.
- Add server-side Turnstile verification, honeypot, and rate-limit baseline.
- Create tracking code/token generation and hashed storage.
- Build tracking screen using code + secret token.
- Implement private report timeline and safe status text.

Acceptance:

- Valid report creates a `RECEIVED` record.
- Invalid, bot, or oversized submissions are rejected safely.
- Tracking works only with code + token.
- No private report field appears in a public page response.

## Milestone 4 — BEM case management

**Goal:** Let BEM process a report responsibly.

Tasks:

- Admin report list with filters and pagination.
- Report detail with confidential data separation.
- Status transitions, internal notes, reporter-safe updates, assignment history.
- Audit events for sensitive/admin actions.
- Confirm dialogs and required reason for archive/reopen/decline actions.

Acceptance:

- BEM Advocate can process a report end-to-end.
- Editor cannot access confidential reports.
- Audit log proves each status/publication action.

## Milestone 5 — Public updates and Info Mahasiswa

**Goal:** Deliver the BEM-to-student output loop.

Tasks:

- Implement draft/publish/archive workflow for advocacy updates.
- Implement student information posts and categories.
- Build public archives, detail pages, tags/filters, and pagination.
- Ensure public update content is independent from original private reports.

Acceptance:

- Draft content is invisible publicly.
- Published posts render correctly with safe metadata and source links.
- Publishing requires the designated approval role.

## Milestone 6 — Cloudflare R2 media

**Goal:** Add controlled evidence and editorial image storage.

Tasks:

- Configure private R2 bucket and application credentials.
- Implement signed upload flow, metadata record, type/size validation, and cleanup policy.
- Build media management UI for BEM.
- Add private signed read for evidence and public read path only for approved editorial media.

Acceptance:

- Direct unauthenticated evidence URL cannot be accessed.
- Unsupported uploads fail before permanent storage.
- Public cover images include alt text and source/credit metadata.

## Milestone 7 — Quality, security, and content readiness

**Goal:** Make the MVP launch-worthy.

Tasks:

- Unit tests for validation, permissions, status transitions, and token handling.
- Playwright tests for submission, tracking, admin login, and publication.
- Security checklist from `SECURITY_PRIVACY.md`.
- Add real policy copy, BEM contacts, escalation SOP reference, and approved first posts.
- Accessibility review and responsive device checks.

Acceptance:

- CI is green.
- No high-severity known security/privacy gap remains.
- BEM has reviewed operational ownership and moderation workflow.

## Milestone 8 — Deployment and limited launch

**Goal:** Deploy safely and test with BEM before broad release.

Tasks:

- Configure GitHub, Netlify, Neon production database, Cloudflare DNS/Turnstile/R2.
- Add custom domain and TLS.
- Seed only real BEM users and non-sensitive launch content.
- Conduct a limited UAT with BEM team on desktop and mobile.
- Publish a launch announcement and monitoring routine.

Acceptance:

- Production checklist in `DEPLOYMENT_RUNBOOK.md` passes.
- A real report can be submitted, handled, tracked, and safely updated.
- Organization—not one personal account—controls critical services.

## Recommended branch strategy

| Branch | Purpose |
| --- | --- |
| `main` | Production-ready code only; Netlify production deploy |
| `feat/<short-name>` | Feature work, one milestone/task at a time |
| `fix/<short-name>` | Focused production/QA fixes |

Every non-trivial change uses a pull request and a Netlify Deploy Preview. Merge only after checks and visual review pass.
