import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/app-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/masuk"],
    },
    // Must be absolute: a relative sitemap directive is invalid in robots.txt
    // and is ignored by crawlers.
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
