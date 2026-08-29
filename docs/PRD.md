# Product Requirements Document — Muara Aspirasi

> **Version:** 0.2 (identity and aspiration-flow clarification)  
> **Product owner:** BEM FTI Universitas Budi Luhur  
> **Primary audience:** Mahasiswa aktif FTI Universitas Budi Luhur

## 1. Product summary

**Muara Aspirasi** is a public-facing BEM FTI portal that gives students a structured, safer way to submit aspirations, criticism, suggestions, and ideas about FTI-related learning and campus experience. It also becomes BEM FTI's public accountability channel: verified advocacy progress and useful student information are published in clear language.

The product is a bridge, not a replacement for official academic systems or a direct public complaint wall.

### Core promise

> Suaramu didengar. Perubahannya dikawal.

## 2. Problem statement

Students may not know where to submit issues involving laboratories, classrooms, schedules, academic services, libraries, or learning comfort. Informal chat channels make reports hard to organize, track, protect, and follow up. At the same time, BEM advocacy work is often invisible because students do not receive structured progress updates.

## 3. Goals and success signals

| Goal | Initial signal |
| --- | --- |
| Make it easier to submit relevant aspirations | A student can submit in under 5 minutes on mobile |
| Protect reporters | No personal identity is published without explicit consent |
| Help BEM manage advocacy work | Every valid report has a status, category, and PIC |
| Show transparency | Public updates explain progress in safe, non-inflammatory language |
| Keep the portal maintainable | New BEM admins can publish updates without editing code |

### Non-goals for MVP

- Replacing Web Student, academic administration, or official campus complaint systems.
- Allowing public comments, public accusations, polls, or direct student-to-dosen messaging.
- Promising that every issue will be solved by BEM.
- Building a full campus account system or a faculty-partner portal.

## 4. Users and permissions

| User | Needs | Access |
| --- | --- | --- |
| Student visitor | Submit an aspiration, track its code, read updates and student info | Public |
| BEM Editor | Draft/update public posts and assist with reports | Admin dashboard, restricted actions |
| BEM Advocate | Verify reports, assign routes/PIC, record coordination, publish approved updates | Admin dashboard |
| BEM Admin | Manage users, all records, policy settings, and publication approval | Full dashboard |
| Campus partner (future) | Provide an official response to assigned cases | Not in MVP |

There is no student login in the MVP. BEM accounts are created by an admin only; public registration is disabled.

## 5. Student-facing information architecture

| Route | Purpose | Main content |
| --- | --- | --- |
| `/` | Explain the program and provide quick actions | Hero, categories, latest updates, info posts, transparency, commitment |
| `/aspirasi/kirim` | Submit a report | Guided, protected form |
| `/aspirasi/lacak` | Track a private report | Tracking code + required secret token |
| `/update` | Read public advocacy updates | Filters, cards, detail pages |
| `/info-mahasiswa` | Read useful BEM information | Announcements, opportunities, services, events |
| `/tentang` | Explain scope, process, ethics, and contacts | Program explanation, FAQ, commitment |
| `/kebijakan-privasi` | Explain data processing | Privacy policy |
| `/admin/*` | BEM work area | Protected dashboard |

## 6. Main user flows

### 6.1 Submit an aspiration

1. Student opens **Kirim Aspirasi** and completes their identity for BEM verification: full name and NIM are required; email and WhatsApp are optional for follow-up.
2. Student chooses a category and fills the issue title, location, chronology, impact, and suggested solution.
3. Student selects the identity-consent mode. The default is **Confidential BEM only**: BEM may see name/NIM, while FTI and the public cannot. The alternative **Consented limited share** lets BEM share the minimum approved identity field with the relevant FTI unit only for private coordination.
4. Student optionally uploads evidence within upload rules.
5. Student reviews all answers, completes Turnstile, and accepts reporting ethics.
6. System validates the report, stores it as `RECEIVED`, and shows a tracking code plus a one-time secret token with save/copy guidance.
7. System displays proof that the report was received, explains that BEM will review it, and reminds students that emergency/safety matters must use the appropriate urgent channel.

### 6.2 BEM verifies and advocates

1. BEM Advocate reviews incoming reports. The dashboard may present initial `RECEIVED` reports as **Menunggu verifikasi BEM**.
2. The advocate rejects spam/unsafe content, requests clarification when contact exists, or verifies the report.
3. BEM assigns category, urgency, internal PIC, and destination route.
4. BEM creates a safe internal summary and records external coordination.
5. BEM records coordination results, creates a reporter-safe progress message, and updates the report status.
6. If appropriate, BEM proposes a generalized public update. Publication requires preview and an explicit reviewer decision; it must not reveal the reporter's identity or let readers infer it.

### 6.3 Student reads the outcome

1. Student opens `Lacak Aspirasi` and enters both their tracking code and secret token.
2. Student sees proof of receipt, their current status, last update date, and BEM messages that are safe to expose to the reporter.
3. Students may separately read generalized public advocacy updates, relevant student information, and transparency views; none may reveal or allow inference of the reporter's identity.

## 7. Functional requirements

### FR-01 — Public program content

- Display University, FTI, and BEM FTI identity in the header/footer.
- Clearly state that Muara Aspirasi is a BEM FTI advocacy program.
- Provide calls to action for submitting a report and reading BEM updates.

### FR-02 — Report submission

- Required: full name, NIM, category, title, location/area, chronology, impact, identity-consent mode, and consent to ethics.
- Optional: suggested solution, email, WhatsApp, and up to three evidence files.
- Default identity-consent mode is `CONFIDENTIAL_BEM_ONLY`: only authorized BEM roles may access name/NIM. `CONSENTED_LIMITED_SHARE` requires affirmative consent before BEM shares the minimum necessary identity field with a stated FTI destination unit for private follow-up.
- Name, NIM, email, WhatsApp, consent details, and evidence are never public content.
- Require Cloudflare Turnstile validation on the server.
- Generate an opaque tracking code and a one-time secret tracking token.
- Never put the tracking token in a public URL, analytics event, or log.

### FR-03 — Report tracking

- Tracking requires both the visible code and secret token, unless a secure email notification flow is introduced later.
- Show proof of receipt, status timeline, last update date, and non-sensitive messages.
- Do not show internal BEM notes, internal routes, other reports, or reporter identity beyond what the reporter submitted.

### FR-04 — BEM case management

- Filter by status, category, urgency, date, and assigned PIC.
- View original report, consent, contact information, internal notes, evidence metadata, and audit history.
- Change status only according to the defined status transition rules.
- Add internal notes and student-safe progress entries separately.
- Publish a public update only after preview and approval.

### FR-05 — Public advocacy updates

- Each update has title, summary, category, status, date, optional cover image, and safe body content.
- Updates can be linked to one or more internal reports but must not reveal private details.
- Drafts are not visible publicly.
- Published updates support an archive and category filter.

### FR-06 — Student information posts

- BEM can draft, schedule/publish, edit, archive, and pin information posts.
- Post categories: academic, facilities, opportunity, event, service, and announcement.
- A post may use a cover image stored in R2.

### FR-07 — Admin access

- Dashboard requires BEM-only login.
- Roles: `ADMIN`, `ADVOCATE`, `EDITOR`.
- Only `ADMIN` can manage users and sensitive policy settings.
- Actions that publish, archive, or change sensitive report state must be auditable.

## 8. Report categories and routing defaults

| Category | Example | Default route |
| --- | --- | --- |
| Facilities | AC, projector, chair, cleanliness | Facility/housekeeping route through BEM |
| Computer laboratory | PC, network, software, lab schedule | Lab management / relevant FTI unit |
| Classroom & learning comfort | Room condition, accessibility | FTI/facility route |
| Academic process | schedule, academic service, practicum coordination | Kaprodi/academic route through BEM |
| Library & learning resources | availability, comfort, service | Library route through BEM |
| Student wellbeing | non-emergency welfare concern | Adkesma internal triage |
| Suggestion & idea | proposal for an improvement | BEM review and applicable route |

Reports alleging serious misconduct, immediate danger, violence, harassment, self-harm risk, or crime must be handled by a separate internal escalation SOP. The portal must not present itself as an emergency service.

## 9. Status model

| Status | Meaning | Student visibility |
| --- | --- | --- |
| `RECEIVED` | Submitted successfully; dashboard label: **Menunggu verifikasi BEM** | Yes, as “Laporan diterima” |
| `UNDER_REVIEW` | BEM is checking scope and completeness | Yes |
| `NEEDS_CLARIFICATION` | BEM needs more information | Yes, if contact/tracking is available |
| `IN_COORDINATION` | BEM has begun/continues coordination | Yes |
| `UPDATE_AVAILABLE` | A meaningful progress update is available | Yes |
| `ACTION_TAKEN` | A relevant party has taken an action | Yes |
| `RESOLVED` | Closed with outcome or explanation | Yes |
| `CANNOT_PROCESS` | Outside scope, insufficient information, spam, or policy violation | Yes, with safe reason |

Allowed core transitions: `RECEIVED → UNDER_REVIEW → NEEDS_CLARIFICATION | IN_COORDINATION | CANNOT_PROCESS`; `IN_COORDINATION → UPDATE_AVAILABLE | ACTION_TAKEN | RESOLVED`; `ACTION_TAKEN → RESOLVED`. Reopening requires an admin reason and audit entry.

## 10. Content and moderation policy

- No hate speech, threats, slander, doxxing, explicit personal attacks, passwords, OTPs, or private documents unrelated to the issue.
- BEM may redact, request clarification, combine duplicate reports, or decline to process reports based on these rules.
- Do not name individual students, lecturers, or staff in public posts unless an approved official communication and a clear reason exists.
- Distinguish verified facts, BEM actions, and requested follow-up. Never state assumptions as outcomes.

## 11. MVP acceptance criteria

The MVP is ready for a limited BEM launch when:

1. A mobile user can submit a valid report and receive a tracking code/token.
2. Turnstile, server validation, and upload limits block invalid submissions.
3. An authorized BEM user can verify, assign, update, and close a report.
4. A student can track only their own report with code + token.
5. BEM can publish and unpublish both advocacy updates and student info posts.
6. Private identity/contact/evidence never appears on public routes.
7. Audit logs exist for login, state changes, publication, and administrative actions.
8. Build, lint, type-check, migration, and core end-to-end tests pass in CI.

## 12. Open decisions to revisit before public launch

- Official domain name and account ownership model.
- Exact campus escalation contacts and turnaround expectations.
- Data retention duration and a formal deletion request channel.
- Whether tracking updates should be emailed in a later release.
- Written permission/brand approval for university logos and official photographs.
