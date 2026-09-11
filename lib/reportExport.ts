export interface ReportBlock {
  type: "h1" | "h2" | "h3" | "p" | "bullet" | "table";
  text?: string;
  headers?: string[];
  rows?: string[][];
}

export function parseMarkdownReport(markdown: string): ReportBlock[] {
  const lines = markdown.split("\n");
  const blocks: ReportBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (!line) {
      i++;
      continue;
    }

    if (line.startsWith("### ")) {
      blocks.push({ type: "h3", text: line.slice(4) });
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push({ type: "h2", text: line.slice(3) });
      i++;
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push({ type: "h1", text: line.slice(2) });
      i++;
      continue;
    }

    if (line.startsWith("|")) {
      const headers = line.split("|").map((c) => c.trim()).filter(Boolean);
      i++;
      if (lines[i] && lines[i].trim().startsWith("|") && lines[i].includes("-")) {
        i++;
      }
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = lines[i].trim().split("|").map((c) => c.trim());
        const trimmedRow = cells.filter((c, idx) => !(idx === 0 && c === "") && !(idx === cells.length - 1 && c === ""));
        rows.push(trimmedRow);
        i++;
      }
      blocks.push({ type: "table", headers, rows });
      continue;
    }

    if (line.startsWith("- ") || line.startsWith("* ")) {
      blocks.push({ type: "bullet", text: line.slice(2) });
      i++;
      continue;
    }

    blocks.push({ type: "p", text: line });
    i++;
  }

  return blocks;
}

export function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1");
}