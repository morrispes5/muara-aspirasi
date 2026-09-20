import { describe, expect, it } from "vitest";

import {
  readJsonResponse,
  UnexpectedJsonResponseError,
} from "@/lib/json-response";

describe("readJsonResponse", () => {
  it("membaca respons application/json", async () => {
    const response = Response.json({ ok: true }, { status: 201 });

    await expect(readJsonResponse<{ ok: boolean }>(response)).resolves.toEqual({
      ok: true,
    });
  });

  it("menerima media type berakhiran +json", async () => {
    const response = new Response('{"code":"example"}', {
      headers: { "content-type": "application/problem+json; charset=utf-8" },
      status: 400,
    });

    await expect(readJsonResponse<{ code: string }>(response)).resolves.toEqual(
      { code: "example" },
    );
  });

  it("menolak HTML tanpa membocorkan body provider", async () => {
    const response = new Response(
      "<!doctype html><title>Unauthorized</title>",
      {
        headers: { "content-type": "text/html; charset=utf-8" },
        status: 401,
      },
    );

    const error = await readJsonResponse(response).catch((value) => value);

    expect(error).toBeInstanceOf(UnexpectedJsonResponseError);
    if (!(error instanceof UnexpectedJsonResponseError)) {
      throw new Error("Expected UnexpectedJsonResponseError.");
    }
    expect(error).toMatchObject({
      contentType: "text/html; charset=utf-8",
      message:
        "Respons layanan tidak valid (HTTP 401). Muat ulang halaman lalu coba lagi.",
      status: 401,
    });
    expect(error.message).not.toContain("Unauthorized");
  });

  it("menolak JSON rusak dengan error yang konsisten", async () => {
    const response = new Response("{", {
      headers: { "content-type": "application/json" },
      status: 502,
    });

    await expect(readJsonResponse(response)).rejects.toMatchObject({
      name: "UnexpectedJsonResponseError",
      status: 502,
    });
  });
});
