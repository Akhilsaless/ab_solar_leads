import { describe, expect, it } from "vitest";
import { buildBillOcrContent } from "./billOcrContent";

describe("bill OCR content routing", () => {
  it("sends a supported PDF as file content rather than image content", () => {
    const [documentPart] = buildBillOcrContent("https://example.test/bill.pdf", "application/pdf");
    expect(documentPart).toEqual({
      type: "file_url",
      file_url: { url: "https://example.test/bill.pdf", mime_type: "application/pdf" },
    });
  });

  it("keeps supported image uploads on the high-detail image path", () => {
    const [documentPart] = buildBillOcrContent("https://example.test/bill.png", "image/png");
    expect(documentPart).toEqual({
      type: "image_url",
      image_url: { url: "https://example.test/bill.png", detail: "high" },
    });
  });
});
