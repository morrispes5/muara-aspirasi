export class UnexpectedJsonResponseError extends Error {
  readonly contentType: string;
  readonly status: number;

  constructor(response: Response) {
    const contentType = response.headers.get("content-type") ?? "";

    super(
      `Respons layanan tidak valid (HTTP ${response.status}). Muat ulang halaman lalu coba lagi.`,
    );
    this.name = "UnexpectedJsonResponseError";
    this.contentType = contentType;
    this.status = response.status;
  }
}

export async function readJsonResponse<T>(response: Response): Promise<T> {
  const mediaType = (response.headers.get("content-type") ?? "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();

  if (mediaType !== "application/json" && !mediaType.endsWith("+json")) {
    throw new UnexpectedJsonResponseError(response);
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new UnexpectedJsonResponseError(response);
  }
}
