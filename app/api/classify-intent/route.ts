import { AzureOpenAI } from "openai";

const client = new AzureOpenAI({
  endpoint: process.env.AZURE_OPENAI_ENDPOINT!,
  apiKey: process.env.AZURE_OPENAI_KEY!,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION!,
});

export async function POST(req: Request) {
  try {
    const { message, hasExistingDeck } = await req.json();

    const response = await client.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT!,
      messages: [
        {
          role: "system",
          content: `Classify the user's message into exactly one of: "create", "edit", "none".

- "create": the user wants a new PowerPoint / slide deck / presentation to be generated.
- "edit": the user wants to modify, update, or change an existing slide deck that was already generated in this conversation (only valid if a deck already exists).
- "none": anything else — a normal question, a code request, general conversation, etc.

A deck ${hasExistingDeck ? "ALREADY EXISTS" : "does NOT exist yet"} in this conversation.

If a deck already exists and the user asks to regenerate, correct, rebuild, fix, redo, or re-download the deck — or mentions a download link isn't working — that is "edit", not "none".

Respond with ONLY one word: create, edit, or none. No punctuation, no explanation.`,
        },
        { role: "user", content: message },
      ],
      max_completion_tokens: 10,
    });

    const raw = (response.choices[0].message.content || "none").trim().toLowerCase();
    const intent = raw.includes("create") ? "create" : raw.includes("edit") ? "edit" : "none";

    return Response.json({ intent });
  } catch (err) {
    console.error("Intent classification failed:", err);
    return Response.json({ intent: "none" });
  }
}