import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import PrivacyPage, { metadata as privacyMetadata } from "./page";

describe("/privacy page", () => {
  it("renders the launch-baseline privacy disclosure", async () => {
    const html = renderToStaticMarkup(await PrivacyPage());

    expect(html).toContain("Launch-baseline privacy disclosure");
    expect(html).toContain("Cookies and local storage");
    expect(html).toContain("Non-essential analytics");
  });

  it("exports canonical privacy metadata", () => {
    expect(privacyMetadata.alternates?.canonical).toBe("/privacy");
    expect(privacyMetadata.description).toContain("privacy disclosure");
  });
});
