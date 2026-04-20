import type { Metadata } from "next";

import { SITE_DESCRIPTION, SITE_NAME, SITE_OG_IMAGE_PATH } from "@/lib/site";

export function buildPublicPageMetadata(input: {
  description?: string;
  path: string;
  title: string;
  useAbsoluteTitle?: boolean;
}): Metadata {
  const description = input.description ?? SITE_DESCRIPTION;
  const openGraphTitle =
    input.title === SITE_NAME ? SITE_NAME : `${input.title} | ${SITE_NAME}`;

  return {
    title: input.useAbsoluteTitle ? { absolute: input.title } : input.title,
    description,
    alternates: {
      canonical: input.path,
    },
    openGraph: {
      title: openGraphTitle,
      description,
      url: input.path,
      images: [
        {
          url: SITE_OG_IMAGE_PATH,
          width: 1200,
          height: 630,
          alt: SITE_NAME,
        },
      ],
    },
    twitter: {
      title: openGraphTitle,
      description,
      images: [SITE_OG_IMAGE_PATH],
    },
  };
}
