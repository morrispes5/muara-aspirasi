// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReportDetail } from "@/server/aspirations/case-management";
import ReportDetailPage from "@/app/admin/(protected)/laporan/[id]/page";
import { ReportDetailView } from "@/components/admin/report-detail";
import { ReportEditor } from "@/components/admin/report-editor";
import { ReportQueue } from "@/components/admin/report-queue";

const { refresh, getDetail } = vi.hoisted(() => ({
  refresh: vi.fn(),
  getDetail: vi.fn(),
}));
vi.mock("@/server/aspirations/case-management", () => ({
  CaseManagementError: class extends Error {},
  getReportDetail: getDetail,
  listBemAssignees: async () => [],
}));
vi.mock("@/server/auth/session", () => ({
  AuthorizationError: class extends Error {},
  requireBemPermission: async () => ({
    user: { id: "admin-test", role: "ADVOCATE" },
  }),
}));
vi.mock("@/server/db/repositories", () => ({
  createCategoryRepository: () => ({ listActive: async () => [] }),
}));
vi.mock("@/server/auth/audit", () => ({
  recordAuthAuditEvent: async () => {},
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
const stamp = "2026-09-22T01:00:00.000Z";
const detail: ReportDetail = {
  assignments: [],
  audit: [],
  evidence: [],
  internalNotes: [],
  identity: {
    name: "Mahasiswa Sintetis",
    nim: "0012345678",
    email: "student@example.test",
    whatsapp: null,
    contactAllowed: false,
    consentRecordedAt: stamp,
    consentVersion: "1",
    identityShareScope: "BEM_ONLY",
  },
  report: {
    id: "00000000-0000-4000-8000-000000000001",
    category: { id: "00000000-0000-4000-8000-000000000002", name: "Fasilitas" },
    title: "Lampu ruang uji",
    chronology: "Lampu ruang uji padam.",
    impact: "Belajar terganggu.",
    suggestedSolution: "Periksa lampu.",
    location: "Ruang uji",
    trackingCode: "ASP-TEST",
    status: "UNDER_REVIEW",
    urgency: "NORMAL",
    submittedAt: stamp,
    updatedAt: stamp,
    resolvedAt: null,
    archivedAt: null,
    internalSummary: null,
  },
  statusEvents: [
    {
      actorName: "Admin Uji",
      createdAt: stamp,
      fromStatus: "RECEIVED",
      toStatus: "UNDER_REVIEW",
      isReporterVisible: false,
      reasonCode: null,
      reporterMessage: null,
    },
  ],
};
function view(value = detail) {
  return (
    <ReportDetailView
      key={value.report.id}
      initial={value}
      categories={[]}
      assignees={[]}
      canAudit={false}
      canManageLifecycle={false}
      canProcess
    />
  );
}
function reply(text = "BEM sedang memeriksa fasilitas.") {
  fireEvent.change(screen.getByLabelText("Kabar untuk mahasiswa"), {
    target: { value: text },
  });
}
function submit() {
  fireEvent.click(screen.getByRole("button", { name: "Simpan tindak lanjut" }));
}
beforeEach(() => {
  vi.clearAllMocks();
  refresh.mockReset();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("admin follow-up feedback", () => {
  it("keeps confirmation across refreshed props, shows saved history and uses the new version next time", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal("fetch", fetcher);
    getDetail.mockResolvedValue(detail);
    const props = { params: Promise.resolve({ id: detail.report.id }) };
    const ui = render(await ReportDetailPage(props));
    expect(
      (screen.getByLabelText("Status laporan") as HTMLSelectElement).value,
    ).toBe("UNDER_REVIEW");
    expect(
      (
        screen.getByRole("button", {
          name: "Simpan tindak lanjut",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    const next = {
      ...detail,
      report: {
        ...detail.report,
        status: "IN_COORDINATION" as const,
        updatedAt: "2026-09-22T02:00:00.000Z",
      },
      statusEvents: [
        ...detail.statusEvents,
        {
          actorName: "Admin Uji",
          createdAt: "2026-09-22T02:00:00.000Z",
          fromStatus: "UNDER_REVIEW" as const,
          toStatus: "IN_COORDINATION" as const,
          isReporterVisible: true,
          reasonCode: null,
          reporterMessage: "BEM sedang memeriksa fasilitas.",
        },
      ],
    };
    refresh.mockImplementation(() => {
      getDetail.mockResolvedValue(next);
      void ReportDetailPage(props).then((element) => ui.rerender(element));
    });
    fireEvent.change(screen.getByLabelText("Status laporan"), {
      target: { value: "IN_COORDINATION" },
    });
    reply();
    submit();
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    await waitFor(() =>
      expect(
        screen.getByRole("list", { name: "Riwayat status dan tanggapan" })
          .textContent,
      ).toContain("BEM sedang memeriksa fasilitas."),
    );
    expect(screen.getByRole("status").textContent).toContain(
      "Tindak lanjut tersimpan",
    );
    expect(
      screen
        .getByRole("list", { name: "Riwayat status dan tanggapan" })
        .closest("details"),
    ).toBeNull();
    expect(
      screen.getByRole("list", { name: "Riwayat status dan tanggapan" })
        .textContent,
    ).toContain("BEM sedang memeriksa fasilitas.");
    expect(
      (screen.getByLabelText("Kabar untuk mahasiswa") as HTMLTextAreaElement)
        .value,
    ).toBe("");
    expect(
      (screen.getByLabelText("Status laporan") as HTMLSelectElement).value,
    ).toBe("IN_COORDINATION");
    reply("Masih berkoordinasi.");
    submit();
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    expect(JSON.parse(fetcher.mock.calls[1][1].body)).toMatchObject({
      expectedUpdatedAt: next.report.updatedAt,
      toStatus: "IN_COORDINATION",
    });
  });
  it("retains the message and selected status on a version conflict", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          error: { message: "Data sudah berubah. Muat ulang." },
        }),
      }),
    );
    render(view());
    reply();
    submit();
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(
        "Data sudah berubah",
      ),
    );
    expect(
      (screen.getByLabelText("Kabar untuk mahasiswa") as HTMLTextAreaElement)
        .value,
    ).toBe("BEM sedang memeriksa fasilitas.");
    expect(refresh).not.toHaveBeenCalled();
    expect(screen.queryByText(/Tindak lanjut tersimpan/)).toBeNull();
  });
  it("keeps internal note drafts when saving fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: { message: "Penyimpanan gagal." } }),
      }),
    );
    render(view());
    fireEvent.click(
      screen.getByText("Pengelolaan lanjutan: PIC, catatan internal & arsip"),
    );
    const note = screen.getByLabelText("Catatan baru") as HTMLTextAreaElement;
    fireEvent.change(note, {
      target: { value: "Koordinasi internal sintetis" },
    });
    fireEvent.submit(note.closest("form")!);
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(
        "Penyimpanan gagal",
      ),
    );
    expect(note.value).toBe("Koordinasi internal sintetis");
  });
  it("blocks duplicate submissions while a request is pending", async () => {
    let finish!: (value: unknown) => void;
    const fetcher = vi.fn(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetcher);
    render(view());
    reply();
    const form = screen
      .getByLabelText("Kabar untuk mahasiswa")
      .closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(
      (screen.getByLabelText("Kabar untuk mahasiswa") as HTMLTextAreaElement)
        .disabled,
    ).toBe(true);
    finish({ ok: true, json: async () => ({ ok: true }) });
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  });
});

describe("admin search context", () => {
  const empty = {
    items: [],
    page: 1,
    pageSize: 25,
    totalItems: 0,
    totalPages: 1,
  };
  it("normalizes applied words and can search across all statuses and archives", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ reports: empty }) });
    vi.stubGlobal("fetch", fetcher);
    render(<ReportQueue initial={empty} assignees={[]} categories={[]} />);
    fireEvent.change(screen.getByLabelText("Cari aspirasi"), {
      target: { value: "  Sintetis   Mahasiswa  " },
    });
    fireEvent.change(screen.getByLabelText("Status", { exact: true }), {
      target: { value: "UNDER_REVIEW" },
    });
    expect(screen.getByText(/Isian berubah/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cari / terapkan" }));
    await waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
    const query = new URL(fetcher.mock.calls[0][0], "https://example.test")
      .searchParams;
    expect(query.get("search")).toBe("Sintetis Mahasiswa");
    expect(query.get("status")).toBe("UNDER_REVIEW");
    await screen.findByRole("button", { name: "Cari di semua status & arsip" });
    fireEvent.click(
      screen.getByRole("button", { name: "Cari di semua status & arsip" }),
    );
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    const broad = new URL(fetcher.mock.calls[1][0], "https://example.test")
      .searchParams;
    expect(broad.get("archived")).toBe("ALL");
    expect(broad.get("status")).toBe("");
    expect(broad.get("search")).toBe("Sintetis Mahasiswa");
  });
  it("presents typo candidates separately with only a review link", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          reports: {
            ...empty,
            suggestions: {
              items: [
                {
                  id: "candidate-synthetic",
                  name: "Mikantael Sintetis",
                  nim: "25111500427",
                  title: "Ruang uji",
                  status: "UNDER_REVIEW",
                  archived: false,
                  matchedBy: "nim",
                },
              ],
              totalMatches: 1,
              truncated: false,
            },
          },
        }),
      }),
    );
    render(<ReportQueue initial={empty} assignees={[]} categories={[]} />);
    fireEvent.change(screen.getByLabelText("Cari aspirasi"), {
      target: { value: "2511500427" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cari / terapkan" }));
    await screen.findByRole("heading", {
      name: "Kemungkinan cocok — periksa identitas",
    });
    expect(
      screen
        .getByRole("link", { name: "Periksa laporan" })
        .getAttribute("href"),
    ).toBe("/admin/laporan/candidate-synthetic");
    expect(screen.getByText(/1 kandidat mirip ditemukan/)).toBeTruthy();
    expect(screen.getByText(/Format NIM perlu dikonfirmasi/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Hapus ke arsip" })).toBeNull();
    expect(screen.queryByText("0 laporan sesuai filter")).toBeNull();
  });
  it("does not present a failed request as zero matching reports", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: { message: "Server tidak tersedia." } }),
      }),
    );
    render(<ReportQueue initial={empty} assignees={[]} categories={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Cari / terapkan" }));
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(
        "Server tidak tersedia",
      ),
    );
    expect(screen.queryByText("0 laporan sesuai filter")).toBeNull();
    expect(screen.queryByRole("table")).toBeNull();
  });
});

describe("report correction feedback", () => {
  const fields = {
    name: "Mahasiswa Sintetis",
    nim: "0012345678",
    email: "student@example.test",
    whatsapp: "08000000000",
    title: "Lampu ruang uji",
    location: "Ruang uji",
    chronology: "Lampu padam",
    impact: "Belajar terganggu",
    suggestedSolution: "Periksa lampu",
  };
  it("preserves the confirmation when the report version refreshes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) }),
    );
    const ui = render(
      <ReportEditor
        initial={fields}
        reportId={detail.report.id}
        expectedUpdatedAt={stamp}
      />,
    );
    refresh.mockImplementation(() =>
      ui.rerender(
        <ReportEditor
          initial={fields}
          reportId={detail.report.id}
          expectedUpdatedAt="2026-09-22T02:00:00.000Z"
        />,
      ),
    );
    fireEvent.change(screen.getByLabelText("Alasan koreksi"), {
      target: { value: "Dikonfirmasi pelapor sintetis" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Simpan koreksi" }));
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(screen.getByRole("status").textContent).toContain(
      "Koreksi tersimpan",
    );
  });
  it("shows correction failures as alerts without losing the reason", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: { message: "Data berubah." } }),
      }),
    );
    render(
      <ReportEditor
        initial={fields}
        reportId={detail.report.id}
        expectedUpdatedAt={stamp}
      />,
    );
    fireEvent.change(screen.getByLabelText("Alasan koreksi"), {
      target: { value: "Dikonfirmasi pelapor sintetis" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Simpan koreksi" }));
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("Data berubah."),
    );
    expect(
      (screen.getByLabelText("Alasan koreksi") as HTMLTextAreaElement).value,
    ).toBe("Dikonfirmasi pelapor sintetis");
  });
});
