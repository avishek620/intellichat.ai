import { askForJSON, askForText, searchMany, formatSources, ACCURACY_RULES } from "@/lib/agents";

export async function POST(req: Request) {
  const body = await req.json();
  const { agentType, input, documentText } = body;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function sendStatus(status: string) {
        controller.enqueue(encoder.encode(`STATUS:${status}\n`));
      }

      let allSources: { title: string; url: string }[] = [];
      let totalPromptTokens = 0;
      let totalCompletionTokens = 0;

      try {
        const context = documentText ? `\n\nSupporting document context:\n${documentText.slice(0, 6000)}` : "";

        let finalReportMarkdown = "";
        let reportTitle = "";
        let agentLabel = "";

        if (agentType === "challenge") {
          agentLabel = "Challenge My Thinking — Research Report";

          sendStatus("Understanding your position...");
          const assumptions = await askForJSON(
            `You are a rigorous analyst. Given the user's stated position/hypothesis/decision, identify the key underlying assumptions it depends on. Also restate their position clearly and neutrally in one or two sentences, without adding your own opinion.

Respond with JSON: { "position": "string", "assumptions": ["string", ...] }`,
            input + context,
            600
          );

          const positionSummary = assumptions?.position || input;
          const assumptionsList: string[] = assumptions?.assumptions || [];

          sendStatus("Researching supporting evidence...");
          const supportQueries = await askForJSON(
            `Given this position and its assumptions, generate 3 short, specific web search queries that would find real, current evidence SUPPORTING this position. Queries must be specific enough to return factual, checkable results.

Respond with JSON array of strings.`,
            `Position: ${positionSummary}\nAssumptions: ${assumptionsList.join("; ")}`,
            300
          );
          const supportResults = await searchMany(Array.isArray(supportQueries) ? supportQueries.slice(0, 3) : [input], 5);

          sendStatus("Searching for counter-evidence...");
          const counterQueries = await askForJSON(
            `Given this position and its assumptions, generate 3 short, specific web search queries that would find real evidence AGAINST this position, documented risks, failures, or credible alternative approaches.

Respond with JSON array of strings.`,
            `Position: ${positionSummary}\nAssumptions: ${assumptionsList.join("; ")}`,
            300
          );
          const counterResults = await searchMany(Array.isArray(counterQueries) ? counterQueries.slice(0, 3) : [], 5);

          const allResults = [...supportResults, ...counterResults];
          allSources = allResults.map((r) => ({ title: r.title, url: r.url }));

          sendStatus("Investigating contradictions and stress-testing assumptions...");

          const finalSystemPrompt = `You are a senior strategy consultant producing a "Challenge My Thinking" research report. Be rigorous and genuinely stress-test the position — do not simply validate it.

${ACCURACY_RULES}

Structure your response as a well-formatted Markdown report with these sections, in this exact order:

# Challenge My Thinking — Research Report

## Executive Verdict
## Your Original Position
## Key Assumptions Identified
## Evidence Supporting Your Position
## Evidence Against Your Position
## Contradictory Findings
## Risks and Blind Spots
## Alternative Approaches
## Quantitative Analysis (where the sources support numbers — otherwise state that no reliable figures were found)
## What Would Change the Conclusion
## Final Recommendation

Use tables where they aid comparison. Reference sources inline by their bracketed number, e.g. [Source 2]. Do not write your own Sources section.`;

          const finalUserPrompt = `Position: ${positionSummary}

Assumptions identified: ${assumptionsList.join("; ")}

Supporting evidence research:
${formatSources(supportResults)}

Counter-evidence research:
${formatSources(counterResults)}`;

          sendStatus("Writing the final report...");
          const finalResult = await askForText(finalSystemPrompt, finalUserPrompt, 9000);
          finalReportMarkdown = finalResult.text;
          reportTitle = `Challenge: ${positionSummary.slice(0, 60)}`;
          totalPromptTokens += finalResult.usage?.prompt_tokens || 0;
          totalCompletionTokens += finalResult.usage?.completion_tokens || 0;
        }

        if (agentType === "discover") {
          agentLabel = "Everything You Need to Know — Research Dossier";

          sendStatus("Determining what you need to know...");
          const dimensions = await askForJSON(
            `Given this objective, identify 3-5 key dimensions that must be researched for the user to be fully prepared. Tailor these to the actual objective rather than using generic categories.

Respond with JSON: { "dimensions": [{ "name": "string", "queries": ["string", "string"] }] }
Each dimension needs exactly 2 specific, checkable search queries.`,
            input + context,
            700
          );

          const dims: { name: string; queries: string[] }[] = dimensions?.dimensions || [];

          sendStatus(`Researching ${dims.map((d) => d.name).join(", ") || "the topic"}...`);
          const round1Queries = dims.flatMap((d) => d.queries).slice(0, 8);
          const round1Results = await searchMany(round1Queries.length ? round1Queries : [input], 4);

          sendStatus("Identifying remaining knowledge gaps...");
          const gaps = await askForJSON(
            `Based on this research so far, identify up to 3 remaining knowledge gaps that are important but not yet well covered. For each, provide one specific, checkable search query to fill it.

Respond with JSON: { "gapQueries": ["string", ...] }`,
            `Objective: ${input}\n\nResearch so far:\n${formatSources(round1Results).slice(0, 4000)}`,
            400
          );
          const gapQueries: string[] = gaps?.gapQueries || [];

          sendStatus("Closing knowledge gaps...");
          const round2Results = gapQueries.length > 0 ? await searchMany(gapQueries.slice(0, 3), 4) : [];

          const allResults = [...round1Results, ...round2Results];
          allSources = allResults.map((r) => ({ title: r.title, url: r.url }));

          sendStatus("Compiling the research dossier...");

          const finalSystemPrompt = `You are a senior research analyst producing an "Everything You Need to Know" research dossier.

${ACCURACY_RULES}

Structure your response as a well-formatted Markdown report with these sections, in this exact order:

# Everything You Need to Know — Research Dossier

## Executive Summary
## What You Need to Know (organized by dimension, using ## sub-sections)
## Implementation Considerations
## Risks
## Unknowns and Assumptions
## Open Questions
## Recommended Next Actions

CRITICAL — for every substantive factual claim, tag it inline with exactly one of these labels:
- 🟢 Verified — directly supported by the research sources provided
- 🟡 Inferred — not directly documented, but reasonably derived from combining multiple sources
- 🔴 Unknown — could not be established from the research; state this honestly instead of guessing

Reference sources inline by their bracketed number, e.g. [Source 3]. Use tables where they aid clarity. Do not write your own Sources section.`;

          const finalUserPrompt = `Objective: ${input}

Dimensions researched: ${dims.map((d) => d.name).join(", ")}

Research findings:
${formatSources(allResults)}`;

          const finalResult = await askForText(finalSystemPrompt, finalUserPrompt, 9000);
          finalReportMarkdown = finalResult.text;
          reportTitle = `Dossier: ${input.slice(0, 60)}`;
          totalPromptTokens += finalResult.usage?.prompt_tokens || 0;
          totalCompletionTokens += finalResult.usage?.completion_tokens || 0;
        }

        if (!finalReportMarkdown) {
          controller.enqueue(encoder.encode(`ERROR:Unknown agent type.\n`));
          controller.close();
          return;
        }

        sendStatus("Preparing a concise summary...");
        const summaryResult = await askForText(
          `Summarize the following research report in 3-4 short, plain-English sentences for a chat message — the key verdict/finding and nothing else. No headings, no bullet points, no markdown. Be direct and precise.`,
          finalReportMarkdown,
          300
        );
        totalPromptTokens += summaryResult.usage?.prompt_tokens || 0;
        totalCompletionTokens += summaryResult.usage?.completion_tokens || 0;

        const dedupedSources = allSources.filter((s, idx) => allSources.findIndex((x) => x.url === s.url) === idx);

        controller.enqueue(
          encoder.encode(
            `RESULT:${JSON.stringify({
              report: finalReportMarkdown,
              summary: summaryResult.text.trim(),
              title: reportTitle,
              agentLabel,
              agentType,
              sources: dedupedSources,
              usage: {
                promptTokens: totalPromptTokens,
                completionTokens: totalCompletionTokens,
              },
            })}\n`
          )
        );
        controller.close();
      } catch (err: any) {
        console.error("Agent run failed:", err);
        controller.enqueue(encoder.encode(`ERROR:Something went wrong running the agent. Please try again.\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
  });
}