import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import TermsPage, { metadata as termsMetadata } from "./page";

describe("/terms page", () => {
  it("renders the launch-baseline terms content", async () => {
    const html = renderToStaticMarkup(await TermsPage());

    expect(html).toContain("Launch-baseline terms for founder access");
    expect(html).toContain("Billing and subscriptions");
    expect(html).toContain("Connected systems");
  });

  it("exports canonical terms metadata", () => {
    expect(termsMetadata.alternates?.canonical).toBe("/terms");
    expect(termsMetadata.description).toContain("Launch-baseline terms");
  });
});
