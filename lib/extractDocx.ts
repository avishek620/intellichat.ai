import mammoth from "mammoth";

export async function extractDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();

  const buffer = Buffer.from(arrayBuffer);

  const result = await mammoth.extractRawText({
    buffer,
  });

  return result.value ?? "";
}