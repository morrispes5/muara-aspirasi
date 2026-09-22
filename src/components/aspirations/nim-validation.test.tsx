// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AspirationForm } from "@/components/aspirations/aspiration-form";

vi.mock("next/script", () => ({ default: () => null }));
afterEach(cleanup);
describe("student NIM entry", () => {
  it.each(["", "001234567", "00123456789", "00123x5678"])(
    "blocks invalid NIM without silently replacing it: %s",
    (value) => {
      render(
        <AspirationForm
          categories={[]}
          evidenceEnabled={false}
          turnstileSiteKey="test"
        />,
      );
      fireEvent.change(screen.getByLabelText("Nama lengkap"), {
        target: { value: "Mahasiswa Sintetis" },
      });
      fireEvent.change(screen.getByLabelText("NIM", { exact: true }), {
        target: { value },
      });
      fireEvent.click(screen.getByRole("button", { name: "Lanjut" }));
      expect(screen.getByRole("alert").textContent).toMatch(
        /NIM: (NIM harus tepat 10 angka|Kolom ini wajib diisi)/,
      );
      expect(
        (screen.getByLabelText("NIM", { exact: true }) as HTMLInputElement)
          .value,
      ).toBe(value);
    },
  );
  it("accepts 10 digits with leading zeroes and allows the next step", () => {
    render(
      <AspirationForm
        categories={[]}
        evidenceEnabled={false}
        turnstileSiteKey="test"
      />,
    );
    for (const [label, value] of [
      ["Nama lengkap", "Mahasiswa Sintetis"],
      ["NIM", "0012345678"],
      ["Email", "student@example.test"],
      ["WhatsApp", "08000000000"],
    ])
      fireEvent.change(screen.getByLabelText(label, { exact: true }), {
        target: { value },
      });
    fireEvent.click(screen.getByRole("button", { name: "Lanjut" }));
    expect(screen.getByLabelText("Kategori")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
