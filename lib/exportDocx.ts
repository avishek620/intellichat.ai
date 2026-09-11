import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, PageBreak, ExternalHyperlink,
} from "docx";
import { parseMarkdownReport, stripInlineMarkdown } from "./reportExport";

export interface SourceEntry {
  title: string;
  url: string;
}

export async function exportReportToDocx(
  title: string,
  markdown: string,
  agentTypeLabel: string,
  sources: SourceEntry[]
): Promise<Blob> {
  const blocks = parseMarkdownReport(markdown);
  const children: any[] = [];

  // Cover section
  children.push(
    new Paragraph({ text: "", spacing: { before: 2000 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: agentTypeLabel.toUpperCase(), bold: true, size: 20, color: "6B7280" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 200 },
      children: [new TextRun({ text: title, bold: true, size: 44 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
          italics: true,
          size: 20,
          color: "6B7280",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100 },
      children: [new TextRun({ text: "Prepared by IntelliChat.ai", italics: true, size: 20, color: "6B7280" })],
    }),
    new Paragraph({ children: [new PageBreak()] })
  );

  // Body
  blocks.forEach((b) => {
    if (b.type === "h1") {
      children.push(new Paragraph({ text: stripInlineMarkdown(b.text || ""), heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 150 } }));
    } else if (b.type === "h2") {
      children.push(new Paragraph({ text: stripInlineMarkdown(b.text || ""), heading: HeadingLevel.HEADING_2, spacing: { before: 250, after: 120 } }));
    } else if (b.type === "h3") {
      children.push(new Paragraph({ text: stripInlineMarkdown(b.text || ""), heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 } }));
    } else if (b.type === "bullet") {
      children.push(new Paragraph({ text: stripInlineMarkdown(b.text || ""), bullet: { level: 0 }, spacing: { after: 80 } }));
    } else if (b.type === "table" && b.headers && b.rows) {
      const headerRow = new TableRow({
        children: b.headers.map(
          (h) =>
            new TableCell({
              shading: { fill: "1E3A8A" },
              children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: "FFFFFF" })] })],
            })
        ),
      });
      const dataRows = b.rows.map(
        (row, ri) =>
          new TableRow({
            children: row.map(
              (cell) =>
                new TableCell({
                  shading: ri % 2 === 0 ? { fill: "F1F5F9" } : undefined,
                  children: [new Paragraph(stripInlineMarkdown(cell))],
                })
            ),
          })
      );
      children.push(
        new Table({
          rows: [headerRow, ...dataRows],
          width: { size: 100, type: WidthType.PERCENTAGE },
        })
      );
      children.push(new Paragraph({ text: "", spacing: { after: 150 } }));
    } else if (b.type === "p") {
      children.push(new Paragraph({ text: stripInlineMarkdown(b.text || ""), spacing: { after: 120 } }));
    }
  });

  // Bibliography — generated programmatically from the actual search results, never from model text
  if (sources.length > 0) {
    children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(new Paragraph({ text: "Bibliography and Research Sources", heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 150 } }));
    children.push(
      new Paragraph({
        text: "The following sources were retrieved and used as the evidentiary basis for this report. Numbering corresponds to the [Source N] references used throughout.",
        italics: true,
        spacing: { after: 200 },
      })
    );

    const dedupedSources = sources.filter((s, idx) => sources.findIndex((x) => x.url === s.url) === idx);

    dedupedSources.forEach((s, idx) => {
      children.push(
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({ text: `[${idx + 1}] `, bold: true }),
            new TextRun({ text: `${s.title} — `, bold: true }),
            new ExternalHyperlink({
              link: s.url,
              children: [new TextRun({ text: s.url, style: "Hyperlink" })],
            }),
          ],
        })
      );
    });
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}