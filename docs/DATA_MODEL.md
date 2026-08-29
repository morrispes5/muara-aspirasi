# Data Model — Muara Aspirasi

> Status: model konseptual. Dokumen ini belum merupakan Drizzle schema, migration, atau database nyata.  
> Terminologi utama mengikuti `PRD.md`.

## 1. Tujuan model

Model data harus memungkinkan BEM menerima dan menangani aspirasi secara privat, memberi progres aman kepada pelapor, serta menerbitkan update publik yang tidak membocorkan original report atau identity.

Prinsip:

- pisahkan data privat, internal, reporter-visible, dan public;
- simpan tracking secret hanya sebagai hash;
- simpan setiap transition dan tindakan sensitif sebagai event/audit;
- gunakan identifier opaque, bukan NIM/email sebagai primary key;
- simpan timestamp UTC dan tampilkan sesuai timezone Asia/Jakarta;
- gunakan archive/retention workflow; hard delete hanya melalui prosedur terotorisasi.

## 2. Klasifikasi data

| Kelas               | Contoh                                                             | Akses                                                                       |
| ------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Public              | published advocacy update, published student info, category label  | Semua pengunjung                                                            |
| Reporter-visible    | status aman, tanggal update, pesan progres aman                    | Pemegang tracking code + secret token; BEM berwenang                        |
| Internal            | urgency, route, internal summary, assignment, internal note        | `ADVOCATE` dan `ADMIN` sesuai kebutuhan                                     |
| Restricted identity | nama, NIM, email, WhatsApp, consent identity                       | `ADVOCATE`/`ADMIN` dengan need-to-know; tidak pernah public                 |
| Restricted evidence | object, metadata bukti, hasil scan                                 | `ADVOCATE`/`ADMIN` dengan need-to-know; tidak pernah public langsung        |
| Security secret     | tracking token plaintext, session token, password, provider secret | Plaintext tidak disimpan di domain database/log; dikelola auth/secret store |

## 3. Entitas inti

### 3.1 `BemUser`

Akun staf BEM yang dikelola admin.

Field penting:

- `id`: opaque UUID/ULID;
- `name`;
- `email`: normalized, unique;
- `role`: `EDITOR | ADVOCATE | ADMIN`;
- `status`: `ACTIVE | SUSPENDED`;
- `createdAt`, `updatedAt`, `lastLoginAt`;
- `createdByUserId`: nullable untuk bootstrap admin pertama.

Credential, session, verification token, dan account provider dikelola tabel Better Auth. Password plaintext tidak pernah menjadi field domain.

### 3.2 `Category`

Lookup kategori laporan sesuai PRD.

Field penting:

- `id`, `slug`, `name`;
- `description`;
- `defaultRouteLabel`: teks internal, bukan relasi eksternal pada MVP;
- `isActive`, `sortOrder`;
- `createdAt`, `updatedAt`.

Seed awal: facilities, computer laboratory, classroom/learning comfort, academic process, library/resources, student wellbeing, serta suggestion/idea.

### 3.3 `AspirationReport`

Record inti aspirasi privat.

Field penting:

- `id`;
- `trackingCode`: opaque, unique, aman untuk diketik tetapi bukan secret;
- `trackingSecretHash`: hasil hashing token; token plaintext tidak disimpan;
- `categoryId`;
- `title`, `location`, `chronology`, `impact`;
- `suggestedSolution`: nullable;
- `identityMode`: enum `CONFIDENTIAL_BEM_ONLY | CONSENTED_LIMITED_SHARE`; default `CONFIDENTIAL_BEM_ONLY`;
- `ethicsAcceptedAt` dan `privacyNoticeVersion`;
- `status`: lifecycle dari PRD;
- `urgency`: proposed enum `LOW | NORMAL | HIGH | ESCALATE`;
- `internalSummary`: nullable, internal only;
- `submittedAt`, `updatedAt`, `resolvedAt`, `archivedAt`;
- `duplicateOfReportId`: nullable, hanya untuk internal deduplication.

`trackingCode` tidak cukup untuk membuka report. Akses tracking selalu membutuhkan token yang cocok dengan `trackingSecretHash`.

### 3.4 `ReporterIdentity`

Tepat satu record per report untuk memisahkan PII dari chronology dan memenuhi verifikasi BEM.

Field penting:

- `id`, `reportId` unique;
- `name`, `nim`: required;
- `email`, `whatsapp`: nullable;
- `contactAllowed`: boolean;
- `identityShareScope`: proposed enum `BEM_ONLY | LIMITED_DESTINATION_UNIT`;
- `consentRecordedAt`, `consentVersion`;
- `createdAt`, `updatedAt`, `deletedAt`.

Identity record selalu dibuat bersama report. Field ini tidak pernah masuk public projection atau analytics.

### 3.5 `ReportEvidence`

Metadata file; binary disimpan di private R2.

Field penting:

- `id`, `reportId`;
- `objectKey`: random dan tidak berasal dari original filename;
- `originalFilename`: sanitized dan restricted;
- `mimeType`, `sizeBytes`, `checksumSha256`;
- `validationStatus`: `PENDING | ACCEPTED | REJECTED | QUARANTINED`;
- `createdAt`, `validatedAt`, `deletedAt`.

Maksimum tiga file mengikuti PRD. Batas byte dan allowlist MIME merupakan Open Question sebelum implementasi.

### 3.6 `ReportStatusEvent`

Append-oriented timeline untuk setiap transition atau reporter-safe update.

Field penting:

- `id`, `reportId`;
- `fromStatus`, `toStatus`: salah satunya dapat null untuk initial event;
- `reporterMessage`: nullable dan sudah disanitasi;
- `isReporterVisible`;
- `reasonCode`: internal normalized reason;
- `actorUserId`: nullable untuk system/submission event;
- `createdAt`.

Status current di `AspirationReport` mempercepat query; event menjadi riwayat perubahan. Keduanya harus diubah dalam satu transaksi.

### 3.7 `InternalNote`

Catatan BEM yang tidak pernah reporter-visible.

Field penting:

- `id`, `reportId`, `authorUserId`;
- `body`;
- `createdAt`, `updatedAt`, `deletedAt`;
- `deletionReason`: nullable dan tetap diaudit.

### 3.8 `ReportAssignment`

Riwayat PIC dan route internal.

Field penting:

- `id`, `reportId`;
- `assigneeUserId`: nullable bila route masih berupa unit;
- `routeLabel`;
- `assignedByUserId`;
- `assignedAt`, `endedAt`;
- `reason`: internal.

Maksimal satu assignment aktif per report adalah invariant yang harus ditegakkan.

### 3.9 `AuditEvent`

Jejak keamanan/administratif append-only secara logis.

Field penting:

- `id`, `occurredAt`;
- `actorUserId`: nullable untuk system/public actor;
- `actorType`: `SYSTEM | PUBLIC | BEM_USER`;
- `action`: nama event terkontrol;
- `targetType`, `targetId`;
- `result`: `SUCCESS | DENIED | FAILED`;
- `reasonCode`;
- `metadata`: JSON yang sudah di-allowlist dan tidak memuat PII, token, credential, chronology, atau evidence URL;
- `requestCorrelationId`;
- `ipSignal`: optional pseudonymous/short-lived signal, bukan raw IP permanen secara default.

### 3.10 `AdvocacyUpdate`

Konten publik independen yang dapat berkaitan dengan beberapa report tanpa menyalin data privat.

Field penting:

- `id`, `slug` unique;
- `title`, `summary`, `body`;
- `categoryId`;
- `progressLabel`;
- `publicationStatus`: `DRAFT | IN_REVIEW | PUBLISHED | ARCHIVED`;
- `coverMediaKey`, `coverAlt`, `sourceCredit`: nullable;
- `authorUserId`, `reviewerUserId`, `publishedByUserId`;
- `createdAt`, `updatedAt`, `publishedAt`, `archivedAt`.

### 3.11 `AdvocacyUpdateReport`

Join internal many-to-many antara report dan public update.

Field penting:

- `advocacyUpdateId`, `reportId` composite unique;
- `linkedByUserId`, `linkedAt`.

Relasi ini tidak diekspos pada public response.

### 3.12 `StudentInfoPost`

Konten informasi mahasiswa.

Field penting:

- `id`, `slug` unique;
- `title`, `summary`, `body`;
- `category`: `ACADEMIC | FACILITIES | OPPORTUNITY | EVENT | SERVICE | ANNOUNCEMENT`;
- `publicationStatus`: `DRAFT | IN_REVIEW | SCHEDULED | PUBLISHED | ARCHIVED`;
- `isPinned`;
- `coverMediaKey`, `coverAlt`, `sourceUrl`, `sourceCredit`: nullable;
- `authorUserId`, `reviewerUserId`, `publishedByUserId`;
- `scheduledAt`, `publishedAt`, `archivedAt`, `createdAt`, `updatedAt`.

## 4. ERD konseptual

```mermaid
erDiagram
  BEM_USER ||--o{ REPORT_STATUS_EVENT : acts_on
  BEM_USER ||--o{ INTERNAL_NOTE : writes
  BEM_USER ||--o{ REPORT_ASSIGNMENT : receives
  BEM_USER ||--o{ AUDIT_EVENT : performs
  BEM_USER ||--o{ ADVOCACY_UPDATE : authors
  BEM_USER ||--o{ STUDENT_INFO_POST : authors

  CATEGORY ||--o{ ASPIRATION_REPORT : classifies
  CATEGORY ||--o{ ADVOCACY_UPDATE : classifies

  ASPIRATION_REPORT ||--o| REPORTER_IDENTITY : has
  ASPIRATION_REPORT ||--o{ REPORT_EVIDENCE : includes
  ASPIRATION_REPORT ||--o{ REPORT_STATUS_EVENT : records
  ASPIRATION_REPORT ||--o{ INTERNAL_NOTE : contains
  ASPIRATION_REPORT ||--o{ REPORT_ASSIGNMENT : routes
  ASPIRATION_REPORT ||--o{ ADVOCACY_UPDATE_REPORT : links

  ADVOCACY_UPDATE ||--o{ ADVOCACY_UPDATE_REPORT : links

  BEM_USER {
    string id PK
    string email UK
    string role
    string status
    datetime createdAt
  }
  CATEGORY {
    string id PK
    string slug UK
    string name
    boolean isActive
  }
  ASPIRATION_REPORT {
    string id PK
    string trackingCode UK
    string trackingSecretHash
    string categoryId FK
    string status
    string identityMode
    datetime submittedAt
  }
  REPORTER_IDENTITY {
    string id PK
    string reportId FK
    string email
    string whatsapp
    string identityShareScope
  }
  REPORT_EVIDENCE {
    string id PK
    string reportId FK
    string objectKey UK
    string validationStatus
    int sizeBytes
  }
  REPORT_STATUS_EVENT {
    string id PK
    string reportId FK
    string actorUserId FK
    string fromStatus
    string toStatus
    boolean isReporterVisible
    datetime createdAt
  }
  INTERNAL_NOTE {
    string id PK
    string reportId FK
    string authorUserId FK
    string body
    datetime createdAt
  }
  REPORT_ASSIGNMENT {
    string id PK
    string reportId FK
    string assigneeUserId FK
    string routeLabel
    datetime assignedAt
    datetime endedAt
  }
  AUDIT_EVENT {
    string id PK
    string actorUserId FK
    string action
    string targetType
    string targetId
    string result
    datetime occurredAt
  }
  ADVOCACY_UPDATE {
    string id PK
    string slug UK
    string categoryId FK
    string publicationStatus
    datetime publishedAt
  }
  ADVOCACY_UPDATE_REPORT {
    string advocacyUpdateId FK
    string reportId FK
    datetime linkedAt
  }
  STUDENT_INFO_POST {
    string id PK
    string slug UK
    string category
    string publicationStatus
    datetime publishedAt
  }
```

Tabel session/account/verification Better Auth tidak dirinci di ERD karena struktur final harus mengikuti versi library yang dipasang pada Milestone Auth. Relasinya tetap: satu `BemUser` memiliki zero-or-many session/account records.

## 5. Lifecycle aspirasi

Status resmi mengikuti PRD:

- `RECEIVED`
- `UNDER_REVIEW`
- `NEEDS_CLARIFICATION`
- `IN_COORDINATION`
- `UPDATE_AVAILABLE`
- `ACTION_TAKEN`
- `RESOLVED`
- `CANNOT_PROCESS`

```mermaid
stateDiagram-v2
  [*] --> RECEIVED
  RECEIVED --> UNDER_REVIEW
  UNDER_REVIEW --> NEEDS_CLARIFICATION
  UNDER_REVIEW --> IN_COORDINATION
  UNDER_REVIEW --> CANNOT_PROCESS
  NEEDS_CLARIFICATION --> UNDER_REVIEW
  NEEDS_CLARIFICATION --> CANNOT_PROCESS
  IN_COORDINATION --> UPDATE_AVAILABLE
  IN_COORDINATION --> ACTION_TAKEN
  IN_COORDINATION --> RESOLVED
  UPDATE_AVAILABLE --> IN_COORDINATION
  UPDATE_AVAILABLE --> ACTION_TAKEN
  UPDATE_AVAILABLE --> RESOLVED
  ACTION_TAKEN --> RESOLVED
  RESOLVED --> UNDER_REVIEW: admin reopen with reason
  CANNOT_PROCESS --> UNDER_REVIEW: admin reopen with reason
```

Transition tambahan dari `NEEDS_CLARIFICATION` dan `UPDATE_AVAILABLE` di atas merupakan **Proposed Default** untuk menyelesaikan loop operasional yang belum lengkap di PRD. Harus dikonfirmasi BEM sebelum schema diimplementasikan.

Setiap transition wajib:

1. memvalidasi current state dan permission;
2. memperbarui `AspirationReport.status`;
3. membuat `ReportStatusEvent`;
4. membuat `AuditEvent` untuk aksi sensitif;
5. menggunakan satu transaksi database;
6. menyertakan alasan saat `CANNOT_PROCESS`, reopen, archive, atau perubahan sensitif.

## 6. Lifecycle publikasi

### Advocacy update

`DRAFT → IN_REVIEW → PUBLISHED → ARCHIVED`

- `EDITOR` dapat membuat/edit draft.
- `ADVOCATE` dapat menyiapkan summary advokasi berdasarkan fakta terverifikasi.
- `ADMIN` menjadi approver default untuk publish/archive sampai matriks approval final disetujui.
- Edit pada published content menghasilkan audit event; full revision history merupakan Open Question.

### Student info

`DRAFT → IN_REVIEW → SCHEDULED | PUBLISHED → ARCHIVED`

- Scheduled publish membutuhkan worker/cron yang belum dikonfigurasi.
- Jika scheduler belum tersedia pada release awal, UI tidak boleh menawarkan schedule palsu; gunakan direct publish setelah approval.

## 7. Constraint dan index konseptual

- unique: `trackingCode`, normalized `BemUser.email`, publication `slug`, dan R2 `objectKey`;
- foreign keys menggunakan restrictive delete untuk report/audit; tidak cascade menghapus bukti sejarah tanpa retention job eksplisit;
- partial unique: satu `ReportAssignment` aktif per report;
- index: report `(status, submittedAt)`, `(categoryId, status)`, assignment `(assigneeUserId, endedAt)`, publication `(publicationStatus, publishedAt)`, audit `(targetType, targetId, occurredAt)`;
- semua text memiliki batas panjang server-side dan database constraint;
- `metadata` JSON pada audit memakai allowlist key, bukan dump request/body;
- public query selalu memfilter `PUBLISHED` dan tidak join ke identity/evidence/internal note.

## 8. Data privat dan data publik

### Tidak boleh tampil publik

- original title/chronology/location/impact report kecuali ditulis ulang sebagai publication independen;
- nama, NIM, email, WhatsApp, consent detail;
- tracking secret/hash;
- evidence object key atau signed URL;
- internal summary, note, route, PIC, urgency/risk flag;
- relationship antara public update dan internal report;
- audit metadata internal.

### Boleh tampil publik setelah approval

- title, summary, body, category, progress label, tanggal, cover media, alt text, source/credit dari `AdvocacyUpdate` berstatus `PUBLISHED`;
- content field dari `StudentInfoPost` berstatus `PUBLISHED`;
- informasi program dan kebijakan yang sudah disetujui.

### Boleh tampil pada private tracking

- tracking code yang dimasukkan pengguna;
- current status dan reporter-visible status events;
- tanggal update;
- reporter message yang ditulis khusus untuk pelapor;
- identity yang pernah dimasukkan hanya jika ada kebutuhan UX yang disetujui; default tidak echo kembali PII.

## 9. Audit trail minimum

Catat event berikut:

- admin login success/failure dan session revocation tanpa menyimpan credential;
- account create, role change, suspend/reactivate;
- report create, view identity/evidence, status transition, assignment change;
- internal note create/update/delete;
- tracking access failure secara agregat/pseudonymous untuk abuse detection;
- publication submit-for-review, approve, publish, edit published, archive, reopen;
- evidence upload validation, authorized download, quarantine, delete;
- policy/retention operation dan deletion request.

Audit log tidak boleh menjadi salinan report atau log request mentah.

## 10. Open Question dan Proposed Default

| Open Question                         | Proposed Default                                                                                                                                                              |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Format ID?                            | UUID/ULID opaque yang dihasilkan server; jangan gunakan sequential ID pada URL publik.                                                                                        |
| Hash tracking token?                  | Token acak minimal 128-bit; simpan hash melalui primitive password/token hashing yang direview, bandingkan constant-time. Algoritma final dipilih saat implementasi security. |
| Retention?                            | Report/contact/evidence 180 hari setelah closure dan audit metadata 365 hari, subject to owner/legal review.                                                                  |
| Encryption field-level PII?           | Pisahkan tabel dan batasi permission lebih dulu; evaluasi app-layer encryption sebelum production berdasarkan threat model dan key-management readiness.                      |
| Full content revision history?        | Simpan audit event dan snapshot publication saat publish; detail diff menjadi keputusan editorial/security.                                                                   |
| Urgency enum dan escalation workflow? | `LOW/NORMAL/HIGH/ESCALATE`, tetapi serious-risk handling harus mengikuti SOP kampus yang belum diberikan.                                                                     |
| File allowlist dan size?              | Mulai sempit: image dan PDF terkontrol, total maksimum tiga file; angka byte final menunggu keputusan operasional.                                                            |
| Category dikelola admin?              | Seed dan read-only pada MVP awal; pengubahan category memerlukan milestone policy setelah kebutuhan nyata terlihat.                                                           |

## 11. Referensi implementasi masa depan

- [Drizzle PostgreSQL migrations](https://orm.drizzle.team/docs/get-started/postgresql-existing)
- [Neon database branching workflow](https://neon.com/docs/get-started-with-neon/workflow-primer)
- [OWASP logging guidance](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
