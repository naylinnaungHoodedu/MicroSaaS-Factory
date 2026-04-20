import { beforeEach, describe, expect, it, vi } from "vitest";

const { applyProductTemplateMock, getFounderContextMock } = vi.hoisted(() => ({
  applyProductTemplateMock: vi.fn(),
  getFounderContextMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  getFounderContext: getFounderContextMock,
}));

vi.mock("@/lib/server/services", () => ({
  applyProductTemplate: applyProductTemplateMock,
}));

import { POST } from "./route";

describe("POST /api/products/[productId]/template/apply", () => {
  beforeEach(() => {
    applyProductTemplateMock.mockReset();
    getFounderContextMock.mockReset();
  });

  it("returns 401 when the founder is not authenticated", async () => {
    getFounderContextMock.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/products/product-1/template/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: "oee-dashboard" }),
      }),
      { params: Promise.resolve({ productId: "product-1" }) },
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "Authentication required.",
    });
  });

  it("requires a template id", async () => {
    getFounderContextMock.mockResolvedValue({
      workspace: { id: "workspace-1" },
    });

    const response = await POST(
      new Request("http://localhost/api/products/product-1/template/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ productId: "product-1" }) },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Template selection is required.",
    });
    expect(applyProductTemplateMock).not.toHaveBeenCalled();
  });

  it("applies the selected template", async () => {
    getFounderContextMock.mockResolvedValue({
      workspace: { id: "workspace-1" },
    });
    applyProductTemplateMock.mockResolvedValue({
      product: { id: "product-1", templateId: "oee-dashboard" },
      template: { id: "oee-dashboard", label: "OEE Dashboard" },
    });

    const response = await POST(
      new Request("http://localhost/api/products/product-1/template/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: "oee-dashboard" }),
      }),
      { params: Promise.resolve({ productId: "product-1" }) },
    );

    expect(response.status).toBe(200);
    expect(applyProductTemplateMock).toHaveBeenCalledWith(
      "workspace-1",
      "product-1",
      "oee-dashboard",
    );
    expect(await response.json()).toEqual({
      product: { id: "product-1", templateId: "oee-dashboard" },
      template: { id: "oee-dashboard", label: "OEE Dashboard" },
    });
  });
});
