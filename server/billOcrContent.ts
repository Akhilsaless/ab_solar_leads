export const BILL_OCR_INSTRUCTION = "This is an Indian electricity bill. Extract: 1) Total amount due (in INR), 2) Units consumed (kWh), 3) DISCOM/utility name, 4) State. Return JSON with fields: amount (number), units (number), discom (string), state (string). If you cannot read a field clearly, return null for that field.";

export type BillOcrContentType = "application/pdf" | "image/jpeg" | "image/png";

export function buildBillOcrContent(url: string, contentType: BillOcrContentType) {
  const documentPart = contentType === "application/pdf"
    ? { type: "file_url" as const, file_url: { url, mime_type: contentType } }
    : { type: "image_url" as const, image_url: { url, detail: "high" as const } };

  return [
    documentPart,
    { type: "text" as const, text: BILL_OCR_INSTRUCTION },
  ];
}
