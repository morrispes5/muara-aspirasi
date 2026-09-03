import type { NextConfig } from "next";

import { resolveDeployEnvironment } from "./src/server/config/deploy-environment";
import { securityHeaders } from "./src/lib/security-headers";

const environment = resolveDeployEnvironment(process.env.DATABASE_ENVIRONMENT);
const production = environment === "production";
const cspMode =
  process.env.CSP_MODE?.trim().toLowerCase() === "enforce"
    ? "enforce"
    : "report-only";

const nextConfig: NextConfig = {
  agentRules: false,
  allowedDevOrigins: ["127.0.0.1"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders(process.env.NODE_ENV === "development", {
          cspMode,
          production,
        }),
      },
    ];
  },
};

export default nextConfig;
