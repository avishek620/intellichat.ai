import { AzureOpenAI } from "openai";
import { performWebSearch } from "@/lib/webSearch";

const client = new AzureOpenAI({
  endpoint: process.env.AZURE_OPENAI_ENDPOINT!,
  apiKey: process.env.AZURE_OPENAI_KEY!,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION!,
});

async function getSearchQueries(topic: string, documentText: string): Promise<string[]> {
  try {
    const response = await client.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT!,
      messages: [
        {
          role: "system",
          content: `Given a topic and optional document context, output ONLY a JSON array of 3 short, specific web search queries that would help research this topic thoroughly for a professional presentation. No commentary, no markdown, just the JSON array.`,
        },
        {
          role: "user",
          content: `Topic/instructions: ${topic}\n\nDocument context (may be empty): ${documentText.slice(0, 3000)}`,
        },
      ],
      max_completion_tokens: 300,
    });

    const raw = response.choices[0].message.content || "[]";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
  } catch (err) {
    console.error("Failed to generate search queries:", err);
    return [topic];
  }
}

export async function POST(req: Request) {
 const body = await req.json();
 const { mode, instructions, documentText, existingDeck, priorContent, preferredTheme } = body;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function sendStatus(status: string) {
        controller.enqueue(encoder.encode(`STATUS:${status}\n`));
      }

      try {
        sendStatus(mode === "edit" ? "Reviewing your edit request..." : "Understanding your request...");

        if (documentText) {
          sendStatus("Reading the uploaded document...");
        }
        if (priorContent) {
          sendStatus("Reviewing our prior discussion...");
        }

        const queries = await getSearchQueries(instructions, documentText || "");

        sendStatus(`Researching: ${queries.join(", ")}`);

        const searchResultsArrays = await Promise.all(
          queries.map((q: string) => performWebSearch(q, 4))
        );
        const allResults = searchResultsArrays.flat();

        sendStatus("Cross-referencing research findings...");

        sendStatus("Structuring the slide outline...");

        const researchContext = allResults
          .map((r) => `Source: ${r.title} (${r.url})\n${r.content}`)
          .join("\n\n---\n\n");

        const systemPrompt = `You are a senior management-consulting presentation architect (McKinsey/BCG/Deloitte caliber). You create deep, specific, executive-ready slide decks — never generic or thin.

Respond with ONLY valid JSON matching this exact schema, no markdown fences, no commentary:

{
  "deckTitle": "string",
   "colorTheme": "blue" | "red" | "green" | "purple" | "teal" | "charcoal" | "slate",
  "slides": [
    {
      "type": "title" | "section" | "flow" | "principles" | "comparison" | "twoColumn" | "layeredStack" | "hubAndSpoke" | "peerToPeer" | "mesh" | "verticalFlow" | "timeline" | "closing",
      "titleAlign": "left" | "center",
      "eyebrow": "string",
      "title": "string",
      "subtitle": "string",
      "bullets": ["string", ...],
      "leftBullets": ["string", ...],
      "rightBullets": ["string", ...],
      "leftHeading": "string",
      "rightHeading": "string",
      "flowStages": [{ "title": "string", "detail": "string" }],
      "principlesHeading": "string",
      "principles": [{ "heading": "string", "description": "string" }],
      "tableData": { "headers": ["string", ...], "rows": [["string", ...], ...] },
      "layers": [{ "heading": "string", "items": ["string", ...] }],
      "hub": { "heading": "string", "items": ["string", ...] },
      "nodes": [{ "heading": "string", "items": ["string", ...] }],
      "spokes": [{ "heading": "string", "items": ["string", ...] }],
      "flowSteps": [{ "label": "string", "detail": "string" }],
      "phases": [{ "name": "string", "duration": "string", "items": ["string", ...] }],
      "notes": "string"
    }
  ]
}

New diagram types — use these for technical/architecture content instead of plain bullets:
- "layeredStack": a real layered architecture diagram — a vertical stack of horizontal bands (e.g. Channel Layer → Orchestration Layer → Decisioning Layer → Data Platform Layer → Integration Layer → Source Systems). Use "layers", each with a "heading" and a few "items" (component names within that layer). Use this when the architecture has a clear top-to-bottom layered/sequential structure.
- "hubAndSpoke": use when the architecture has ONE central platform or service that integrates with several independent, parallel systems around it — NOT a layered or sequential structure. Example: a central AI gateway or CDP connecting out to CRM, billing, digital channels, and analytics as separate peer systems. Use "hub" for the center (heading + up to 3 items) and "spokes" (4-6 entries, each with a heading + up to 3 items) for the surrounding systems.
- "peerToPeer": use when systems integrate DIRECTLY with each other, point-to-point, WITHOUT a central platform or broker coordinating them — a decentralized integration pattern. Example: several regional systems or partner platforms that each talk directly to a few neighboring systems. Use "nodes" (4-6 entries, each with a heading + up to 3 items).
- "mesh": use when MANY systems are all interconnected with each other in a dense, fully-connected network — no clear hierarchy, no single hub, high interconnectivity between most or all components. Example: a set of microservices or domains that all communicate directly with one another. Use "nodes" (4-5 entries, each with a heading + up to 2 items — keep this one small, since full interconnection gets visually busy fast).
- IMPORTANT: actively choose between "layeredStack", "hubAndSpoke", "peerToPeer", "mesh" (and "verticalFlow"/"flow" for sequences) based on which one actually matches the shape of the content you're describing for THIS specific slide — do not default to the same pattern every time. A platform with clear layers should be layeredStack; a platform that many independent systems plug into should be hubAndSpoke; systems integrating directly without a central broker should be peerToPeer; a densely interconnected network should be mesh; a step-by-step process should be verticalFlow or flow.
- "verticalFlow": a top-to-bottom sequential process/event flow (e.g. Event → Ingestion → Enrichment → Decisioning → Activation → Feedback). Use "flowSteps".
- "timeline": a horizontal implementation roadmap with named phases, durations, and per-phase deliverables. Use "phases".
- "flow": short horizontal capability stages (3-5 items), for simpler sequences.
- "principles": a dark highlighted panel of 3-6 architecture/design principles.
- "comparison": a data table.
- "twoColumn" / "section": paired or single panel bullet content.

Reliability rule — this is critical:
- EVERY slide, regardless of its "type", MUST also include a populated "bullets" array (3-8 concise points) summarizing that slide's key content in plain form. This is a mandatory safety fallback, even when you're also using layers/flowSteps/phases/tableData for the primary visual. Never omit it.

Content depth rules — this is critical:
- DO NOT produce thin, generic bullets. Match the depth and specificity of a real consulting deliverable: name actual technologies, actual capability names, actual metrics where available, real trade-offs.
- Layers and flow steps should contain concrete, specific component/capability names (e.g. "Identity Resolution", "Kafka/Event Bus", "MLOps & Model Registry") — not vague placeholders.
- For "layeredStack" layers, include AT MOST 4 items per layer, each item name under 5 words. If a layer genuinely needs more, split it across two layers instead of overcrowding one.
- For "verticalFlow" flowSteps, keep "detail" under 14 words, and include AT MOST 7 steps.
- For "peerToPeer" and "mesh" nodes, each item name under 5 words. Mesh must never exceed 5 nodes — more than that becomes visually unreadable with full interconnection.
- For "comparison" tableData, include AT MOST 7 data rows (plus header row), and keep each cell under 12 words. Long detailed content belongs in a "twoColumn" or "section" slide instead of an oversized table.
- Aim for 10-16 slides for architecture/technical decks: title, executive summary, business context, 1-2 layeredStack architecture slides, 1 verticalFlow slide, 1 principles slide, comparison/table slide(s) where relevant, 1 timeline slide for implementation approach, and a closing/next-steps slide.
- If PRIOR CONTENT is supplied below, it is the PRIMARY, AUTHORITATIVE source — it likely already contains detailed, well-researched material (possibly with its own architecture diagrams described in text/ASCII). Preserve its specificity, terminology, and structure. Your job is to REMAP that existing depth into the JSON schema and appropriate diagram types — not to discard it and write something thinner. Only use the web research to fill genuine gaps the prior content doesn't cover.
- Choose a colorTheme that fits the context (e.g. "red" for telecom/Vi-branded, "charcoal" for formal executive decks, "teal" for modern tech, "slate" for enterprise-neutral).
- If this is an EDIT request and the instruction mentions changing the theme, choose a colorTheme value clearly DIFFERENT from the one currently set in the existing deck.
- Ground content in the provided document and research sources. Do not fabricate specifics not supported by the context.
- When editing an existing deck: preserve every slide's content EXACTLY as given except the ones the instruction specifically targets. Do not simplify, shorten, or regenerate unrelated slides.`;

        const priorContentBlock = priorContent
          ? `\n\nPRIOR CONTENT ALREADY ESTABLISHED IN THIS CONVERSATION (treat as the primary, authoritative source — see content depth rules above):\n\n${priorContent}`
          : "";

        const userPrompt =
          mode === "edit"
            ? `Here is the existing slide deck as JSON:\n\n${JSON.stringify(existingDeck)}\n\nApply this edit instruction and return the FULL updated deck JSON (all slides — unrelated slides must be preserved exactly as given):\n\n${instructions}\n\nRelevant research (use only if helpful):\n\n${researchContext}`
            : `Create a slide deck based on these instructions:\n\n${instructions}\n\nDocument context (may be empty):\n\n${(documentText || "").slice(0, 8000)}${priorContentBlock}\n\nAdditional web research findings (use to fill gaps only):\n\n${researchContext}`;

                sendStatus("Designing slide layouts and diagrams...");

        const response = await client.chat.completions.create({
          model: process.env.AZURE_OPENAI_DEPLOYMENT!,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_completion_tokens: 40000,
        });

        sendStatus("Validating slide structure...");

        const raw = response.choices[0].message.content || "{}";
        const cleaned = raw.replace(/```json|```/g, "").trim();

        let deck;
        try {
          deck = JSON.parse(cleaned);
        } catch (parseErr) {
          controller.enqueue(encoder.encode(`ERROR:Failed to generate a valid slide deck. Please try again.\n`));
          controller.close();
          return;
        }

      if (preferredTheme && preferredTheme !== "auto") {
          deck.colorTheme = preferredTheme;
        } else {
          const themeOptions = ["blue", "red", "green", "purple", "teal", "charcoal", "slate"];
          const title = deck.deckTitle || instructions || "deck";
          let hash = 0;
          for (let i = 0; i < title.length; i++) {
            hash = (hash * 31 + title.charCodeAt(i)) >>> 0;
          }
          deck.colorTheme = themeOptions[hash % themeOptions.length];
        }

          const titleSlide = deck.slides && deck.slides[0];
        if (titleSlide && titleSlide.type === "title" && !titleSlide.titleLayout) {
          const layouts = ["darkLeft", "centered", "splitPanel"];
          const seedText = (deck.deckTitle || "") + "-layout";
          let hash2 = 0;
          for (let i = 0; i < seedText.length; i++) {
            hash2 = (hash2 * 31 + seedText.charCodeAt(i)) >>> 0;
          }
          titleSlide.titleLayout = layouts[hash2 % layouts.length];
        }

          const result = {
          deck,
          sources: allResults.map((r) => ({ title: r.title, url: r.url })),
          usage: {
            promptTokens: response.usage?.prompt_tokens || 0,
            completionTokens: response.usage?.completion_tokens || 0,
          },
        };

        controller.enqueue(encoder.encode(`RESULT:${JSON.stringify(result)}\n`));
        controller.close();
      } catch (err: any) {
        controller.enqueue(encoder.encode(`ERROR:${err.message || "Unknown error"}\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}