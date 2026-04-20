import { beforeEach, describe, expect, it, vi } from "vitest";

const { createProductMock, getFounderContextMock } = vi.hoisted(() => ({
  createProductMock: vi.fn(),
  getFounderContextMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  getFounderContext: getFounderContextMock,
}));

vi.mock("@/lib/server/services", () => ({
  createProduct: createProductMock,
}));

import { POST } from "./route";

describe("POST /api/products", () => {
  beforeEach(() => {
    createProductMock.mockReset();
    getFounderContextMock.mockReset();
  });

  it("returns 401 when the founder is not authenticated", async () => {
    getFounderContextMock.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "Authentication required.",
    });
    expect(createProductMock).not.toHaveBeenCalled();
  });

  it("creates a product for the authenticated founder workspace", async () => {
    getFounderContextMock.mockResolvedValue({
      workspace: { id: "workspace-1" },
    });
    createProductMock.mockResolvedValue({
      id: "product-1",
      name: "Alarm Rationalization Assistant",
    });

    const response = await POST(
      new Request("http://localhost/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Alarm Rationalization Assistant",
          summary: "Reduces noisy alarm review work.",
          vertical: "Industrial automation",
          pricingHypothesis: "$99/month",
          targetUser: "Plant manager",
          coreProblem: "Manual alarm review is too slow.",
          chosenMoat: "domain-expertise",
          templateId: "oee-dashboard",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(createProductMock).toHaveBeenCalledWith("workspace-1", {
      name: "Alarm Rationalization Assistant",
      summary: "Reduces noisy alarm review work.",
      vertical: "Industrial automation",
      pricingHypothesis: "$99/month",
      targetUser: "Plant manager",
      coreProblem: "Manual alarm review is too slow.",
      chosenMoat: "domain-expertise",
      templateId: "oee-dashboard",
    });
    expect(await response.json()).toEqual({
      product: {
        id: "product-1",
        name: "Alarm Rationalization Assistant",
      },
    });
  });

  it("passes an omitted chosenMoat through so templated creation can backfill it", async () => {
    getFounderContextMock.mockResolvedValue({
      workspace: { id: "workspace-1" },
    });
    createProductMock.mockResolvedValue({
      id: "product-2",
      name: "Template default moat",
    });

    const response = await POST(
      new Request("http://localhost/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Template default moat",
          templateId: "oee-dashboard",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(createProductMock).toHaveBeenCalledWith("workspace-1", {
      name: "Template default moat",
      summary: "",
      vertical: "",
      pricingHypothesis: "",
      targetUser: "",
      coreProblem: "",
      chosenMoat: undefined,
      templateId: "oee-dashboard",
    });
  });

  it("returns 400 for an invalid template id", async () => {
    getFounderContextMock.mockResolvedValue({
      workspace: { id: "workspace-1" },
    });

    const response = await POST(
      new Request("http://localhost/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Template test",
          templateId: "invalid-template",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Invalid product template.",
    });
    expect(createProductMock).not.toHaveBeenCalled();
  });

  it("returns 400 when product creation fails", async () => {
    getFounderContextMock.mockResolvedValue({
      workspace: { id: "workspace-1" },
    });
    createProductMock.mockRejectedValue(new Error("Name is required."));

    const response = await POST(
      new Request("http://localhost/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Name is required.",
    });
  });
});
