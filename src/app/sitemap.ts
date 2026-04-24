import type { MetadataRoute } from "next";

import { getPublicFunnelState } from "@/lib/server/funnel";
import { toAbsoluteSiteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const funnel = await getPublicFunnelState({ includeFounderContext: false });
  const lastModified = new Date();
  const entries: Array<{
    changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
    path: string;
    priority: number;
  }> = [
    { path: "/", priority: 1, changeFrequency: "weekly" as const },
    { path: "/login", priority: 0.7, changeFrequency: "weekly" as const },
    { path: "/terms", priority: 0.5, changeFrequency: "monthly" as const },
    { path: "/privacy", priority: 0.5, changeFrequency: "monthly" as const },
  ];

  if (funnel.waitlistOpen) {
    entries.push({
      path: "/waitlist",
      priority: 0.8,
      changeFrequency: "weekly" as const,
    });
  }

  if (funnel.pricingVisible) {
    entries.push({
      path: "/pricing",
      priority: 0.9,
      changeFrequency: "weekly" as const,
    });
  }

  if (funnel.signupAvailable) {
    entries.push({
      path: "/signup",
      priority: 0.7,
      changeFrequency: "daily" as const,
    });
  }

  return entries.map((entry) => ({
    url: toAbsoluteSiteUrl(entry.path),
    lastModified,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));
}
