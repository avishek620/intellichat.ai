import { AzureOpenAI } from "openai";
import { performWebSearch, SearchResult } from "./webSearch";

const client = new AzureOpenAI({
  endpoint: process.env.AZURE_OPENAI_ENDPOINT!,
  apiKey: process.env.AZURE_OPENAI_KEY!,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION!,
});

export async function askForJSON(systemPrompt: string, userPrompt: string, maxTokens = 800): Promise<any> {
  const response = await client.chat.completions.create({
    model: process.env.AZURE_OPENAI_DEPLOYMENT!,
    messages: [
      { role: "system", content: systemPrompt + "\n\nRespond with ONLY valid JSON, no markdown fences, no commentary." },
      { role: "user", content: userPrompt },
    ],
    max_completion_tokens: maxTokens,
  });

  const raw = response.choices[0].message.content || "{}";
  const cleaned = raw.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("askForJSON parse failed:", raw);
    return null;
  }
}

export async function askForText(systemPrompt: string, userPrompt: string, maxTokens = 9000): Promise<{ text: string; usage: any }> {
  const response = await client.chat.completions.create({
    model: process.env.AZURE_OPENAI_DEPLOYMENT!,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_completion_tokens: maxTokens,
  });

  return {
    text: response.choices[0].message.content || "",
    usage: response.usage,
  };
}

export async function searchMany(queries: string[], perQuery = 5): Promise<SearchResult[]> {
  const arrays = await Promise.all(queries.map((q) => performWebSearch(q, perQuery)));
  return arrays.flat();
}

export function formatSources(results: SearchResult[]) {
  return results.map((r, i) => `[Source ${i + 1}] ${r.title} (${r.url})\n${r.content}`).join("\n\n---\n\n");
}

export const ACCURACY_RULES = `
GROUNDING AND ACCURACY RULES — these override all other stylistic instructions:
- Every factual claim MUST be traceable to the research sources provided to you. Never state a fact you cannot connect to the given sources.
- If the sources are thin, contradictory, or silent on a point, say so explicitly rather than filling the gap with a plausible-sounding guess. Do not hallucinate specifics (numbers, dates, names) that are not in the sources.
- Prefer "the sources indicate..." or "according to [Source X]..." over unattributed confident statements.
- Write in simple, plain, everyday English. Avoid jargon where a plain word works just as well. When a technical term is necessary, briefly explain it in plain terms the first time it's used, so the document is equally readable by a technical, techno-functional, or business reader.
- Be precise and to the point — no filler, no padding, no repeating the same point in different words.
- Do NOT write your own "Sources" or "Bibliography" section — that is generated separately and automatically from the real search results. Just reference sources inline using [Source N] where relevant.
`;