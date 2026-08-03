import { extractPdf } from "./extractPdf";
import { extractDocx } from "./extractDocx";
import { extractText } from "./extractText";

export interface DocumentResult {
  type: "image" | "text";
  content: string;
  mimeType: string;
  fileName: string;
}

export async function extractDocument(
  file: File
): Promise<DocumentResult> {
  const mimeType = file.type;
  const fileName = file.name;

  // Images are handled by GPT Vision directly.
  if (mimeType.startsWith("image/")) {
    return {
      type: "image",
      content: "",
      mimeType,
      fileName,
    };
  }

  // PDF
  if (mimeType === "application/pdf") {
    return {
      type: "text",
      content: await extractPdf(file),
      mimeType,
      fileName,
    };
  }

  // Word (.docx)
  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return {
      type: "text",
      content: await extractDocx(file),
      mimeType,
      fileName,
    };
  }

  // Plain text
  if (mimeType === "text/plain") {
    return {
      type: "text",
      content: await extractText(file),
      mimeType,
      fileName,
    };
  }

  throw new Error(
    `Unsupported file type: ${mimeType || fileName}`
  );
}