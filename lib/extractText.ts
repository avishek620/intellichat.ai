export async function extractText(file: File): Promise<string> {
  return await file.text();
}