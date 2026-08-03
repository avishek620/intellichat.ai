import { PDFParse } from "pdf-parse";

export async function extractPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();

  const parser = new PDFParse({
    data: arrayBuffer,
  });

  try {
    const result = await parser.getText();

    return result.text ?? "";
  } finally {
    await parser.destroy();
  }
}