import { createHmac, randomBytes, randomUUID } from "node:crypto";
import assert from "node:assert/strict";

// This runner only exercises this project's isolated Netlify Deploy Previews.
// Credentials, cookies, receipt secrets and TOTP seeds remain in memory.
function previewOrigin(value) {
  const url = new URL(value);
  assert.equal(url.protocol, "https:", "QA requires HTTPS.");
  assert.match(
    url.hostname,
    /^deploy-preview-\d+--muaraaspirasi\.netlify\.app$/,
    "Only Muara Aspirasi Deploy Preview hosts are allowed.",
  );
  assert.equal(url.port, "", "Custom ports are not allowed.");
  assert.equal(url.username + url.password, "", "URL credentials forbidden.");
  assert.equal(url.pathname, "/", "Supply the Preview origin only.");
  assert.equal(url.search + url.hash, "", "URL query/fragment forbidden.");
  return url.origin;
}

function totp(secret, now = Date.now()) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bits = secret
    .replace(/=+$/, "")
    .toUpperCase()
    .split("")
    .map((character) => {
      const index = alphabet.indexOf(character);
      assert(index >= 0, "Invalid TOTP seed encoding.");
      return index.toString(2).padStart(5, "0");
    })
    .join("");
  const bytes = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(parseInt(bits.slice(index, index + 8), 2));
  }
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 30_000)));
  const digest = createHmac("sha1", Buffer.from(bytes))
    .update(counter)
    .digest();
  const offset = digest[digest.length - 1] & 15;
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000)
    .toString()
    .padStart(6, "0");
}

if (process.argv.includes("--self-test")) {
  assert.equal(totp("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", 59_000), "287082");
  assert.equal(
    totp("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", 1_111_111_109_000),
    "081804",
  );
  assert.equal(
    previewOrigin("https://deploy-preview-4--muaraaspirasi.netlify.app"),
    "https://deploy-preview-4--muaraaspirasi.netlify.app",
  );
  for (const url of [
    "https://muaraaspirasi.netlify.app",
    "https://example.com",
    "http://deploy-preview-4--muaraaspirasi.netlify.app",
    "https://deploy-preview-4--muaraaspirasi.netlify.app.evil.invalid",
    "https://deploy-preview-4--muaraaspirasi.netlify.app/?secret=x",
  ]) {
    assert.throws(() => previewOrigin(url));
  }
  console.log(
    "launch-qa self-test passed: RFC TOTP vectors and Preview target guards.",
  );
} else {
  await run();
}

async function run() {
  const baseUrl = previewOrigin(process.env.LAUNCH_QA_BASE_URL ?? "");
  assert.equal(
    process.env.LAUNCH_QA_ENVIRONMENT,
    "preview",
    "LAUNCH_QA_ENVIRONMENT must be preview.",
  );
  assert.equal(
    process.env.LAUNCH_QA_ALLOW_PREVIEW_MUTATIONS,
    "true",
    "Set LAUNCH_QA_ALLOW_PREVIEW_MUTATIONS=true for synthetic QA writes.",
  );
  const categoryId = process.env.LAUNCH_QA_CATEGORY_ID;
  assert.match(
    categoryId ?? "",
    /^[0-9a-f-]{36}$/i,
    "Provide an active Preview category UUID.",
  );
  assert(
    process.env.LAUNCH_QA_ADMIN_COOKIE ||
      (process.env.LAUNCH_QA_ADMIN_EMAIL &&
        process.env.LAUNCH_QA_ADMIN_PASSWORD &&
        process.env.LAUNCH_QA_ADMIN_TOTP_SECRET),
    "Provide an MFA-verified ADMIN cookie, or ADMIN email/password/TOTP seed.",
  );
  const marker = `launch-qa-${randomUUID()}`;
  const inventory = {
    marker,
    reportId: null,
    users: [],
    content: [],
    holdId: null,
    requestId: null,
    reportDeleted: false,
  };
  const outcomes = [];
  const actors = {};
  let phase = "preflight";
  let adminReady = false;
  let receipt;
  let failure = false;
  const title = `QA sintetis ${marker}`;
  const privateName = `Mahasiswa sintetis ${marker}`;
  const privateNote = `Catatan internal sintetis ${marker}`;
  const publicMessage = "Simulasi QA: BEM telah meninjau laporan sintetis ini.";
  const accessCookie = process.env.LAUNCH_QA_ACCESS_COOKIE ?? "";

  function pass(name) {
    outcomes.push(name);
    console.log(JSON.stringify({ check: name, result: "passed" }));
  }
  function client(extraCookie = "") {
    const cookies = new Map();
    for (const part of `${accessCookie};${extraCookie}`.split(";")) {
      const split = part.indexOf("=");
      if (split > 0)
        cookies.set(part.slice(0, split).trim(), part.slice(split + 1).trim());
    }
    return { cookies };
  }
  const anonymous = client();
  const admin = client(process.env.LAUNCH_QA_ADMIN_COOKIE ?? "");

  async function request(actor, path, method = "GET", body, options = {}) {
    const headers = { ...options.headers };
    if (actor.cookies.size)
      headers.cookie = [...actor.cookies]
        .map(([key, value]) => `${key}=${value}`)
        .join("; ");
    if (method !== "GET") {
      headers.origin = options.origin ?? baseUrl;
      headers["content-type"] = "application/json";
    }
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      redirect: "manual",
      signal: AbortSignal.timeout(45_000),
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    for (const setCookie of response.headers.getSetCookie()) {
      const part = setCookie.split(";", 1)[0];
      const split = part.indexOf("=");
      if (split < 0) continue;
      const key = part.slice(0, split);
      if (/max-age=0(?:;|$)/i.test(setCookie) || !part.slice(split + 1))
        actor.cookies.delete(key);
      else actor.cookies.set(key, part.slice(split + 1));
      if (key.includes("session_token") && part.slice(split + 1)) {
        assert(
          /;\s*secure(?:;|$)/i.test(setCookie),
          "HTTPS session cookie lacks Secure.",
        );
        assert(
          /;\s*httponly(?:;|$)/i.test(setCookie),
          "Session cookie lacks HttpOnly.",
        );
        assert(
          /;\s*samesite=lax(?:;|$)/i.test(setCookie),
          "Session cookie lacks SameSite=Lax.",
        );
      }
    }
    const contentType = response.headers.get("content-type") ?? "";
    const text = await response.text();
    let data;
    if (contentType.includes("application/json")) {
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Invalid JSON at ${path}; HTTP ${response.status}.`);
      }
    }
    return { status: response.status, headers: response.headers, data, text };
  }
  function expectStatus(result, status, label, code) {
    assert.equal(
      result.status,
      status,
      `${label}: HTTP ${result.status}; code ${result.data?.error?.code ?? result.data?.code ?? "non-JSON"}. Team Protection may require LAUNCH_QA_ACCESS_COOKIE.`,
    );
    if (code)
      assert.equal(
        result.data?.error?.code,
        code,
        `${label}: wrong error code.`,
      );
  }
  async function login(actor, email, password, seed) {
    const signedIn = await request(actor, "/api/auth/sign-in/email", "POST", {
      email,
      password,
    });
    expectStatus(signedIn, 200, "Email/password login");
    if (signedIn.data?.twoFactorRedirect) {
      assert(seed, "This account requires its TOTP seed.");
      const verified = await request(
        actor,
        "/api/auth/two-factor/verify-totp",
        "POST",
        { code: totp(seed), trustDevice: false },
      );
      expectStatus(verified, 200, "TOTP challenge");
    }
    return signedIn;
  }
  async function reportDetail(actor = admin) {
    const result = await request(
      actor,
      `/api/admin/reports/${inventory.reportId}`,
    );
    expectStatus(result, 200, "Report detail");
    return result.data.report;
  }
  async function mutateReport(actor, action, values = {}, expectedUpdatedAt) {
    const detail = expectedUpdatedAt ? null : await reportDetail(actor);
    return request(actor, `/api/admin/reports/${inventory.reportId}`, "POST", {
      action,
      expectedUpdatedAt: expectedUpdatedAt ?? detail.report.updatedAt,
      ...values,
    });
  }
  async function privacy(action, values = {}) {
    return request(admin, "/api/admin/privacy/retention", "POST", {
      action,
      ...values,
    });
  }
  function assertPrivateAbsent(text) {
    for (const privateValue of [
      privateName,
      privateNote,
      title,
      receipt?.trackingSecret,
    ].filter(Boolean)) {
      assert(
        !text.includes(privateValue),
        "Private fixture data appeared in a public/reporter projection.",
      );
    }
  }
  async function track(expectedStatus = "RECEIVED") {
    const result = await request(anonymous, "/api/aspirasi/lacak", "POST", {
      trackingCode: receipt.trackingCode,
      trackingSecret: receipt.trackingSecret,
    });
    expectStatus(result, 200, "Private tracking");
    assert.equal(
      result.data.timeline.status,
      expectedStatus,
      "Reporter status differs.",
    );
    assertPrivateAbsent(result.text);
    assert.match(result.headers.get("cache-control") ?? "", /no-store/);
    return result.data.timeline;
  }
  async function discoverReport() {
    if (inventory.reportId) return;
    const found = await request(
      admin,
      `/api/admin/reports?search=${encodeURIComponent(marker)}&archived=ALL`,
    );
    expectStatus(found, 200, "Locate exact synthetic fixture");
    const matches = found.data.reports.items.filter(
      (item) => item.title === title,
    );
    assert(
      matches.length <= 1,
      "Unexpected duplicate synthetic fixture; inspect inventory marker.",
    );
    inventory.reportId = matches[0]?.id ?? null;
  }
  async function deleteFixtureReport() {
    if (!inventory.reportId || inventory.reportDeleted) return;
    if (inventory.holdId) {
      expectStatus(
        await privacy("release-hold", { holdId: inventory.holdId }),
        200,
        "Release synthetic hold",
      );
      inventory.holdId = null;
    }
    if (!inventory.requestId) {
      const recorded = await privacy("record-mailbox-request", {
        reportId: inventory.reportId,
        requestCategory: "SYNTHETIC_QA_CLEANUP",
      });
      expectStatus(recorded, 200, "Record synthetic cleanup request");
      inventory.requestId = recorded.data.result.id;
    }
    for (const action of ["verify-request", "approve-request"]) {
      const result = await privacy(action, { requestId: inventory.requestId });
      assert(
        result.status === 200 ||
          (result.status === 409 &&
            result.data?.error?.code === "INVALID_STATUS"),
        `Synthetic cleanup failed at ${action}.`,
      );
    }
    expectStatus(
      await privacy("execute-deletion", { requestId: inventory.requestId }),
      200,
      "Delete synthetic identity/content",
    );
    inventory.reportDeleted = true;
  }

  console.log(
    JSON.stringify({ marker, target: baseUrl, mode: "synthetic-preview-only" }),
  );
  try {
    phase = "public-access-and-auth";
    for (const path of [
      "/",
      "/aspirasi/kirim",
      "/aspirasi/lacak",
      "/update",
      "/info-mahasiswa",
      "/tentang",
      "/kebijakan-privasi",
    ]) {
      const page = await request(anonymous, path);
      expectStatus(page, 200, `Public route ${path}`);
      assert.equal(
        page.headers.get("x-content-type-options"),
        "nosniff",
        "Public route lacks nosniff.",
      );
      assert.equal(
        page.headers.get("x-frame-options"),
        "DENY",
        "Public route lacks frame protection.",
      );
      assert.match(
        page.headers.get("content-security-policy") ??
          page.headers.get("content-security-policy-report-only") ??
          "",
        /object-src 'none'/,
        "Public route lacks expected CSP.",
      );
    }
    expectStatus(
      await request(anonymous, "/api/admin/reports"),
      401,
      "Anonymous reports denied",
    );
    expectStatus(
      await request(anonymous, "/api/admin/users"),
      401,
      "Anonymous users denied",
    );
    expectStatus(
      await request(
        anonymous,
        "/api/internal/retention/candidates",
        "POST",
        {},
      ),
      401,
      "Retention job rejects absent bearer",
    );
    const signup = await request(anonymous, "/api/auth/sign-up/email", "POST", {
      email: `${marker}@example.invalid`,
      name: "QA synthetic signup",
      password: randomBytes(24).toString("base64url"),
    });
    expectStatus(signup, 400, "Public signup disabled");
    pass(phase);

    phase = "admin-login";
    if (!process.env.LAUNCH_QA_ADMIN_COOKIE) {
      await login(
        admin,
        process.env.LAUNCH_QA_ADMIN_EMAIL,
        process.env.LAUNCH_QA_ADMIN_PASSWORD,
        process.env.LAUNCH_QA_ADMIN_TOTP_SECRET,
      );
    }
    expectStatus(
      await request(admin, "/api/admin/users"),
      200,
      "MFA ADMIN access",
    );
    adminReady = true;
    pass(phase);

    phase = "synthetic-role-provisioning-and-mfa";
    const domain = process.env.LAUNCH_QA_EMAIL_DOMAIN ?? "example.invalid";
    assert.match(domain, /^[a-z0-9.-]+\.[a-z]+$/i, "Invalid QA email domain.");
    for (const role of ["ADMIN", "ADVOCATE", "EDITOR"]) {
      const credentials = {
        email: `${marker}-${role.toLowerCase()}@${domain}`,
        password: randomBytes(27).toString("base64url"),
      };
      const created = await request(admin, "/api/admin/users", "POST", {
        ...credentials,
        name: `QA ${role} ${marker}`,
        role,
      });
      if (created.data?.user?.id)
        inventory.users.push({
          id: created.data.user.id,
          role,
          suspended: false,
        });
      expectStatus(created, 201, "Create synthetic role");
      const actor = client();
      await login(actor, credentials.email, credentials.password);
      actors[role] = { actor, ...credentials, id: created.data.user.id };
    }
    const freshAdmin = actors.ADMIN;
    expectStatus(
      await request(freshAdmin.actor, "/api/admin/reports"),
      401,
      "ADMIN blocked before MFA enrollment",
    );
    const oldPasswordSession = client(
      [...freshAdmin.actor.cookies]
        .map(([key, value]) => `${key}=${value}`)
        .join("; "),
    );
    const enrollment = await request(
      freshAdmin.actor,
      "/api/auth/two-factor/enable",
      "POST",
      { password: freshAdmin.password, method: "totp" },
    );
    expectStatus(enrollment, 200, "TOTP enrollment start");
    assert(
      enrollment.data?.totpURI && enrollment.data.backupCodes?.length,
      "MFA enrollment must issue URI and recovery codes.",
    );
    const seed = new URL(enrollment.data.totpURI).searchParams.get("secret");
    assert(seed, "Enrollment URI lacks a seed.");
    expectStatus(
      await request(
        freshAdmin.actor,
        "/api/auth/two-factor/verify-totp",
        "POST",
        { code: totp(seed), trustDevice: false },
      ),
      200,
      "TOTP enrollment finish",
    );
    expectStatus(
      await request(oldPasswordSession, "/api/admin/reports"),
      401,
      "Old password-only session stays blocked",
    );
    await request(freshAdmin.actor, "/api/auth/sign-out", "POST", {});
    freshAdmin.actor = client();
    const challenge = await request(
      freshAdmin.actor,
      "/api/auth/sign-in/email",
      "POST",
      { email: freshAdmin.email, password: freshAdmin.password },
    );
    expectStatus(challenge, 200, "MFA login challenge issued");
    assert.equal(
      challenge.data?.twoFactorRedirect,
      true,
      "MFA account must require a challenge.",
    );
    expectStatus(
      await request(freshAdmin.actor, "/api/admin/users"),
      401,
      "Unverified MFA challenge cannot access admin",
    );
    expectStatus(
      await request(
        freshAdmin.actor,
        "/api/auth/two-factor/verify-totp",
        "POST",
        { code: totp(seed), trustDevice: false },
      ),
      200,
      "MFA login challenge verified",
    );
    expectStatus(
      await request(freshAdmin.actor, "/api/admin/users"),
      200,
      "Verified MFA session gains admin access",
    );
    pass(phase);

    phase = "role-boundaries";
    for (const role of ["EDITOR", "ADVOCATE"]) {
      expectStatus(
        await request(actors[role].actor, "/api/admin/users"),
        403,
        `${role} cannot manage users`,
      );
      expectStatus(
        await request(actors[role].actor, "/api/admin/privacy/retention"),
        403,
        `${role} cannot manage privacy`,
      );
    }
    expectStatus(
      await request(actors.EDITOR.actor, "/api/admin/reports"),
      403,
      "EDITOR cannot read reports",
    );
    expectStatus(
      await request(actors.EDITOR.actor, "/api/admin/content/advocacy"),
      403,
      "EDITOR cannot read advocacy workspace",
    );
    expectStatus(
      await request(actors.ADVOCATE.actor, "/api/admin/reports"),
      200,
      "ADVOCATE can triage reports",
    );
    pass(phase);

    phase = "student-submission";
    const payload = {
      categoryId,
      chronology: `Kronologi sintetis QA ${marker}. Tidak ada kejadian nyata.`,
      contactAllowed: false,
      evidence: [],
      email: "student@example.test",
      ethicsAccepted: true,
      honeypot: "",
      identityMode: "CONFIDENTIAL_BEM_ONLY",
      impact: "Memverifikasi alur pengiriman dan tindak lanjut sintetis.",
      limitedShareConsent: false,
      location: "Deploy Preview QA",
      name: privateName,
      nim: "9999999999",
      suggestedSolution: "Verifikasi fungsi portal untuk persiapan peluncuran.",
      title,
      turnstileToken:
        process.env.LAUNCH_QA_TURNSTILE_TOKEN ?? "XXXX.DUMMY.TOKEN.XXXX",
      whatsapp: "080000000000",
    };
    const idempotencyKey = randomUUID();
    const headers = { "idempotency-key": idempotencyKey };
    for (const invalid of [
      { name: "" },
      { ethicsAccepted: false },
      { identityMode: "CONSENTED_LIMITED_SHARE", limitedShareConsent: false },
      {
        evidence: Array.from({ length: 4 }, () => ({ intentId: randomUUID() })),
      },
      { turnstileToken: "" },
    ]) {
      expectStatus(
        await request(
          anonymous,
          "/api/aspirasi",
          "POST",
          { ...payload, ...invalid },
          { headers },
        ),
        422,
        "Invalid submission denied",
        "VALIDATION_ERROR",
      );
    }
    expectStatus(
      await request(anonymous, "/api/aspirasi", "POST", payload, {
        headers,
        origin: "https://untrusted.example.invalid",
      }),
      403,
      "Cross-origin submission denied",
    );
    const submitted = await request(
      anonymous,
      "/api/aspirasi",
      "POST",
      payload,
      { headers },
    );
    // Discover immediately, even when receipt assertions fail, so finally can clean up.
    await discoverReport();
    expectStatus(submitted, 201, "Synthetic report submission");
    receipt = submitted.data.receipt;
    assert(
      receipt?.trackingCode && receipt?.trackingSecret && inventory.reportId,
      "Receipt or persisted fixture missing.",
    );
    assert.equal(receipt.status, "RECEIVED");
    assert.match(submitted.headers.get("cache-control") ?? "", /no-store/);
    assert.equal(submitted.headers.get("referrer-policy"), "no-referrer");
    expectStatus(
      await request(
        anonymous,
        "/api/aspirasi",
        "POST",
        {
          ...payload,
          turnstileToken:
            process.env.LAUNCH_QA_TURNSTILE_REPLAY_TOKEN ??
            payload.turnstileToken,
        },
        { headers },
      ),
      409,
      "Duplicate idempotency denied",
      "SUBMISSION_ALREADY_RECEIVED",
    );
    expectStatus(
      await request(anonymous, "/api/aspirasi/evidence/intents", "POST", {
        files: [{ name: "synthetic-qa.txt", size: 128, type: "text/plain" }],
      }),
      503,
      "Disabled evidence upload fails closed",
      "EVIDENCE_UNAVAILABLE",
    );
    const badTracking = await request(
      anonymous,
      "/api/aspirasi/lacak",
      "POST",
      {
        trackingCode: receipt.trackingCode,
        trackingSecret: randomBytes(32).toString("base64url"),
      },
    );
    expectStatus(
      badTracking,
      404,
      "Wrong tracking secret denied",
      "TRACKING_NOT_FOUND",
    );
    await track();
    pass(phase);

    phase = "bem-case-lifecycle";
    const advocate = actors.ADVOCATE.actor;
    let detail = await reportDetail(advocate);
    assert.equal(
      detail.identity.name,
      privateName,
      "BEM sees submitted identity.",
    );
    assert.equal(detail.report.status, "RECEIVED");
    assert.equal(detail.identity.identityShareScope, "BEM_ONLY");
    expectStatus(
      await request(
        actors.EDITOR.actor,
        `/api/admin/reports/${inventory.reportId}`,
      ),
      403,
      "EDITOR denied individual report",
    );
    expectStatus(
      await mutateReport(advocate, "status", { toStatus: "RESOLVED" }),
      409,
      "Invalid transition denied",
      "INVALID_TRANSITION",
    );
    const staleVersion = detail.report.updatedAt;
    expectStatus(
      await mutateReport(advocate, "status", {
        toStatus: "UNDER_REVIEW",
        reporterMessage: publicMessage,
      }),
      200,
      "Review status",
    );
    expectStatus(
      await mutateReport(
        advocate,
        "case-fields",
        { urgency: "HIGH" },
        staleVersion,
      ),
      409,
      "Stale concurrent update denied",
      "CONFLICT",
    );
    expectStatus(
      await mutateReport(advocate, "case-fields", {
        urgency: "NORMAL",
        internalSummary: privateNote,
      }),
      200,
      "Case fields",
    );
    expectStatus(
      await mutateReport(advocate, "assign", {
        assigneeUserId: actors.ADVOCATE.id,
        routeLabel: "Rute internal QA sintetis",
        reason: "Penugasan uji sintetis.",
      }),
      200,
      "Assign PIC",
    );
    const note = await mutateReport(advocate, "internal-note", {
      body: privateNote,
    });
    expectStatus(note, 200, "Internal note");
    for (const toStatus of [
      "NEEDS_CLARIFICATION",
      "IN_COORDINATION",
      "UPDATE_AVAILABLE",
      "ACTION_TAKEN",
      "RESOLVED",
    ]) {
      expectStatus(
        await mutateReport(advocate, "status", {
          toStatus,
          reporterMessage: `${publicMessage} ${toStatus}.`,
        }),
        200,
        `Status ${toStatus}`,
      );
    }
    const timeline = await track("RESOLVED");
    assert(
      timeline.events.some((event) => event.message?.includes(publicMessage)),
      "Reporter-safe message missing.",
    );
    detail = await reportDetail();
    assert(
      detail.audit.some((event) => event.action === "REPORT_STATUS_CHANGED"),
      "Status audit missing.",
    );
    expectStatus(
      await mutateReport(advocate, "archive", {
        reasonCode: "OPERATIONAL_CORRECTION",
      }),
      403,
      "Advocate cannot archive",
    );
    expectStatus(
      await mutateReport(admin, "archive", {
        reasonCode: "OPERATIONAL_CORRECTION",
      }),
      200,
      "Admin archive",
    );
    expectStatus(
      await mutateReport(admin, "reopen", {
        reasonCode: "OPERATIONAL_CORRECTION",
        reporterMessage: "Simulasi QA pembukaan kembali.",
      }),
      200,
      "Admin reopen with reason",
    );
    expectStatus(
      await mutateReport(advocate, "status", {
        toStatus: "CANNOT_PROCESS",
        reasonCode: "OUT_OF_SCOPE",
        reporterMessage: "Laporan sintetis QA selesai diuji.",
      }),
      200,
      "Cannot-process terminal status",
    );
    expectStatus(
      await mutateReport(advocate, "delete-note", {
        noteId: note.data.result.noteId,
        deletionReason: "Pembersihan catatan sintetis QA.",
      }),
      200,
      "Delete internal fixture note",
    );
    pass(phase);

    phase = "editorial-publication-and-privacy";
    for (const kind of ["advocacy", "student-info"]) {
      const drafter = kind === "advocacy" ? advocate : actors.EDITOR.actor;
      const form = {
        body: "Konten sintetis untuk menguji proses editorial Muara Aspirasi. Tidak memuat identitas maupun kejadian nyata.",
        slug: `${marker}-${kind}`,
        summary: "Simulasi QA proses review dan publikasi konten BEM.",
        title: `Simulasi editorial ${kind} ${marker}`,
        ...(kind === "advocacy"
          ? {
              categoryId,
              progressLabel: "Simulasi QA",
              reportIds: [inventory.reportId],
            }
          : { category: "ANNOUNCEMENT", isPinned: true }),
      };
      const created = await request(
        drafter,
        `/api/admin/content/${kind}`,
        "POST",
        form,
      );
      if (created.data?.content?.id)
        inventory.content.push({
          id: created.data.content.id,
          kind,
          form,
          publicationStatus: "DRAFT",
        });
      expectStatus(created, 201, "Create editorial draft");
      const fixture = inventory.content.at(-1);
      const apiPath = `/api/admin/content/${kind}/${fixture.id}`;
      const publicPath = `${kind === "advocacy" ? "/update" : "/info-mahasiswa"}/${form.slug}`;
      expectStatus(
        await request(anonymous, publicPath),
        404,
        "Draft absent publicly",
      );
      let current = created.data.content;
      expectStatus(
        await request(drafter, apiPath, "PATCH", {
          ...form,
          action: "publish",
          expectedUpdatedAt: current.updatedAt,
        }),
        403,
        "Drafter cannot publish",
      );
      expectStatus(
        await request(admin, apiPath, "PATCH", {
          ...form,
          action: "publish",
          expectedUpdatedAt: current.updatedAt,
        }),
        400,
        "Admin cannot skip review",
        "INVALID_TRANSITION",
      );
      const reviewed = await request(drafter, apiPath, "PATCH", {
        ...form,
        action: "submit_review",
        expectedUpdatedAt: current.updatedAt,
      });
      expectStatus(reviewed, 200, "Submit editorial review");
      current = reviewed.data.content;
      fixture.publicationStatus = current.publicationStatus;
      const published = await request(admin, apiPath, "PATCH", {
        ...form,
        action: "publish",
        expectedUpdatedAt: current.updatedAt,
      });
      expectStatus(published, 200, "Admin publish reviewed draft");
      current = published.data.content;
      fixture.publicationStatus = current.publicationStatus;
      const publicArticle = await request(anonymous, publicPath);
      expectStatus(publicArticle, 200, "Published article visible");
      assert(
        publicArticle.text.includes(form.title),
        "Published content missing from page.",
      );
      assertPrivateAbsent(publicArticle.text);
      assert(
        !publicArticle.text.includes(inventory.reportId),
        "Internal report linkage leaked publicly.",
      );
      if (kind === "advocacy") {
        const linked = await track("CANNOT_PROCESS");
        assert(
          linked.publicUpdates.some((update) => update.slug === form.slug),
          "Published advocacy link missing in tracking.",
        );
      }
      expectStatus(
        await request(drafter, apiPath, "PATCH", {
          ...form,
          action: "save_draft",
          expectedUpdatedAt: current.updatedAt,
        }),
        403,
        "Drafter cannot alter published article",
      );
      const archived = await request(admin, apiPath, "PATCH", {
        ...form,
        action: "archive",
        expectedUpdatedAt: current.updatedAt,
      });
      expectStatus(archived, 200, "Admin archive publication");
      fixture.publicationStatus = "ARCHIVED";
      expectStatus(
        await request(anonymous, publicPath),
        404,
        "Archived article absent publicly",
      );
    }
    const noPublicLinks = await track("CANNOT_PROCESS");
    assert.equal(
      noPublicLinks.publicUpdates.length,
      0,
      "Archived advocacy remains linked publicly.",
    );
    pass(phase);

    phase = "privacy-retention-and-hold";
    const recorded = await privacy("record-mailbox-request", {
      reportId: inventory.reportId,
      requestCategory: "SYNTHETIC_QA_CLEANUP",
    });
    expectStatus(recorded, 200, "Record synthetic deletion request");
    inventory.requestId = recorded.data.result.id;
    expectStatus(
      await privacy("execute-deletion", { requestId: inventory.requestId }),
      409,
      "Deletion cannot skip verification and approval",
      "INVALID_STATUS",
    );
    expectStatus(
      await privacy("verify-request", { requestId: inventory.requestId }),
      200,
      "Verify deletion request",
    );
    const held = await privacy("place-hold", {
      reportId: inventory.reportId,
      reasonCode: "SYNTHETIC_QA_HOLD",
    });
    expectStatus(held, 200, "Place retention hold");
    inventory.holdId = held.data.result.id;
    expectStatus(
      await privacy("approve-request", { requestId: inventory.requestId }),
      409,
      "Hold blocks approval",
      "HOLD_ACTIVE",
    );
    await deleteFixtureReport();
    expectStatus(
      await request(anonymous, "/api/aspirasi/lacak", "POST", {
        trackingCode: receipt.trackingCode,
        trackingSecret: receipt.trackingSecret,
      }),
      404,
      "Deletion revokes tracking credential",
      "TRACKING_NOT_FOUND",
    );
    const deleted = await reportDetail();
    assert.equal(
      deleted.identity,
      null,
      "Deleted reporter identity remains available.",
    );
    assert(
      !deleted.report.title.includes(marker),
      "Deleted report was not tombstoned.",
    );
    assert(
      deleted.audit.some(
        (event) => event.action === "PRIVACY_DELETION_COMPLETED",
      ),
      "Deletion audit missing.",
    );
    pass(phase);

    phase = "session-revocation";
    const secondAdvocate = client();
    await login(
      secondAdvocate,
      actors.ADVOCATE.email,
      actors.ADVOCATE.password,
    );
    expectStatus(
      await request(
        secondAdvocate,
        "/api/auth/revoke-other-sessions",
        "POST",
        {},
      ),
      200,
      "Revoke other sessions",
    );
    expectStatus(
      await request(advocate, "/api/admin/reports"),
      401,
      "Revoked session cannot access reports",
    );
    expectStatus(
      await request(secondAdvocate, "/api/auth/sign-out", "POST", {}),
      200,
      "Logout",
    );
    expectStatus(
      await request(secondAdvocate, "/api/admin/reports"),
      401,
      "Logged-out session cannot access reports",
    );
    pass(phase);
  } catch (error) {
    failure = true;
    // Deliberately omit stack, request/response bodies and arbitrary causes.
    console.error(
      JSON.stringify({
        result: "failed",
        phase,
        error:
          error instanceof assert.AssertionError ||
          error?.message?.startsWith("Invalid JSON")
            ? error.message
            : `Request/runtime error (${error?.name ?? "unknown"}); inspect provider logs without exposing secrets.`,
      }),
    );
  } finally {
    if (adminReady) {
      try {
        await discoverReport();
        await deleteFixtureReport();
      } catch {
        failure = true;
        console.error(
          JSON.stringify({
            cleanup: "report-requires-review",
            reportId: inventory.reportId,
            marker,
          }),
        );
      }
      for (const fixture of inventory.content) {
        try {
          const path = `/api/admin/content/${fixture.kind}/${fixture.id}`;
          const current = await request(admin, path);
          expectStatus(current, 200, "Cleanup content lookup");
          fixture.publicationStatus = current.data.content.publicationStatus;
          if (fixture.publicationStatus === "PUBLISHED") {
            const archived = await request(admin, path, "PATCH", {
              ...fixture.form,
              action: "archive",
              expectedUpdatedAt: current.data.content.updatedAt,
            });
            expectStatus(archived, 200, "Cleanup published fixture");
            fixture.publicationStatus = "ARCHIVED";
          }
        } catch {
          failure = true;
          console.error(
            JSON.stringify({
              cleanup: "content-requires-review",
              id: fixture.id,
              kind: fixture.kind,
            }),
          );
        }
      }
      for (const user of inventory.users) {
        try {
          expectStatus(
            await request(admin, `/api/admin/users/${user.id}`, "PATCH", {
              status: "SUSPENDED",
            }),
            200,
            "Suspend exact synthetic user",
          );
          user.suspended = true;
          if (actors[user.role]) {
            expectStatus(
              await request(
                actors[user.role].actor,
                "/api/admin/content/student-info",
              ),
              401,
              "Suspended fixture session is revoked",
            );
          }
        } catch {
          failure = true;
          console.error(
            JSON.stringify({ cleanup: "user-requires-review", id: user.id }),
          );
        }
      }
    }
    const safeInventory = {
      ...inventory,
      content: inventory.content.map(({ id, kind, publicationStatus }) => ({
        id,
        kind,
        publicationStatus,
      })),
    };
    console.log(
      JSON.stringify({
        result: failure ? "failed" : "passed",
        passedPhases: outcomes,
        inventory: safeInventory,
        retained:
          "Audit history, suspended synthetic accounts, tombstoned report and archived/private editorial fixtures remain for traceability. No existing report/account is deleted.",
      }),
    );
    if (failure) process.exitCode = 1;
  }
}
