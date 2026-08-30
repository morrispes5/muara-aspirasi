const siteverifyEndpoint =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const cloudflareDummySecret = "1x0000000000000000000000000000000AA";

type TurnstileResponse = {
  "error-codes"?: string[];
  hostname?: string;
  success: boolean;
};

export class TurnstileVerificationError extends Error {
  constructor(public readonly reason: "CONFIGURATION" | "REJECTED") {
    super("Turnstile verification failed.");
    this.name = "TurnstileVerificationError";
  }
}

export function getTurnstileSiteKey() {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || null;
}

function acceptsDummyHostname(hostname: string | undefined, secret: string) {
  return (
    hostname === "example.com" &&
    secret === cloudflareDummySecret &&
    (process.env.DATABASE_ENVIRONMENT === "development" ||
      process.env.DATABASE_ENVIRONMENT === "preview")
  );
}

export async function verifyTurnstile(
  token: string,
  expectedHostname: string,
  fetchImplementation: typeof fetch = fetch,
) {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();

  if (!secret) {
    throw new TurnstileVerificationError("CONFIGURATION");
  }

  const body = new URLSearchParams({ response: token, secret });
  let response: Response;

  try {
    response = await fetchImplementation(siteverifyEndpoint, {
      body,
      method: "POST",
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    throw new TurnstileVerificationError("REJECTED");
  }

  if (!response.ok) {
    throw new TurnstileVerificationError("REJECTED");
  }

  let result: TurnstileResponse;
  try {
    result = (await response.json()) as TurnstileResponse;
  } catch {
    throw new TurnstileVerificationError("REJECTED");
  }

  if (
    !result.success ||
    (result.hostname !== expectedHostname &&
      !acceptsDummyHostname(result.hostname, secret))
  ) {
    throw new TurnstileVerificationError("REJECTED");
  }
}
