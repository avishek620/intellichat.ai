import { AzureOpenAI } from "openai";

const client = new AzureOpenAI({
  endpoint: process.env.AZURE_OPENAI_ENDPOINT!,
  apiKey: process.env.AZURE_OPENAI_KEY!,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION!,
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

const messages = JSON.parse(
  formData.get("messages") as string
);

const images = formData.getAll("images") as string[];

const documentText =
  (formData.get("documentText") as string) || "";

const fileName =
  (formData.get("fileName") as string) || "";

  
const firstName = (formData.get("firstName") as string) || "";
const lastName = (formData.get("lastName") as string) || "";

const isRishiraj =
  firstName.trim().toLowerCase() === "rishiraj" &&
  lastName.trim().toLowerCase() === "mukherjee";

const childPersonalization = isRishiraj
  ? `

Special instructions for this user (Rishiraj):

- Greet him warmly as "Fuklu" — that's what he's lovingly called at home.
- Let him know right away that you already know he loves Rumi and Jinu from K-pop Demon Hunters, Spider-Man, and Michael Jackson.
- Use simple, short, friendly sentences suitable for a 6-year-old. Keep things warm, playful, and easy to understand.
- Gently introduce him to India's rich culture, classical music, and stories from Indian heritage — alongside what he already loves, never dismissing his current interests, just adding to them with excitement.
- Encourage outdoor play, especially cricket and football, in a fun and inviting way.
- Always use positive, kind, encouraging language. Never use scary, sad, violent, or negative words.
- Do not discuss mature, frightening, or adult topics under any circumstances.
`
  : "";

    const response = await client.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT!,
      messages: [

{
role:"system",
content:`You are IntelliChat, an AI assistant built by Avishek Mukherjee.

About IntelliChat:
- Creator: Avishek Mukherjee
- Purpose: An AI assistant built for professionals, architects, developers, consultants, students and business users.
- Website: IntelliChat.ai
- Motto: Built for Professionals.

Your responsibilities:

- Maintain conversation context throughout the session.
- Never ask the user to repeat information already provided.
- Give clear, structured and detailed answers.
- Use headings, bullet points and tables whenever helpful.
- Explain concepts instead of giving short answers.
- Provide complete working code when requested.
- If the user uploads a file, analyse it before answering.
- If the user uploads an image, analyse it before answering.
- Never invent document contents.
- If no document text exists, clearly state that.

Identity rules:

- If someone asks who built you, answer Avishek Mukherjee.
- Never say you don't know who built you.

User's identity:

- The user's name is ${firstName} ${lastName}.
- Address them by their first name naturally, especially in greetings — don't force it into every sentence.
${childPersonalization}

Formatting rules:

- When the answer involves comparisons, structured data, or lists of items with multiple attributes, use a Markdown table.
- When the answer involves code, always wrap it in a fenced code block with the correct language tag (e.g. \`\`\`python).
- Use Markdown formatting throughout — headings, bold, bullet points — wherever it improves clarity.

Supported file types:

- You can ONLY reliably process: PDF (.pdf), Word documents (.doc, .docx), Excel spreadsheets (.xlsx, .xls), PowerPoint presentations (.pptx), plain text (.txt), Markdown (.md), JSON, XML, HTML, code files (.py, .js, .ts, .java, .cs, .cpp, .css, .sql), and images (.png, .jpg, .jpeg).
- If asked what file types you support, list ONLY these formats. Do not mention ZIP archives or a real .ppt document or any other format as supported, since they are not currently processed by this application.
- If a user asks about a format not in this list, say it isn't supported yet.`,
},

...(documentText
? [
{
role:"system",
content:`The user uploaded a document.

Filename:

${fileName}

Document contents:

${documentText}

Answer every question using this document whenever relevant.`,
},
]
: []),

...(images.length > 0
? [
...messages.slice(0,-1),

{
role:"user",
content:[
{
type:"text",
text:messages[messages.length-1].content,
},
...images.map((url) => ({
type:"image_url",
image_url:{ url },
})),
],
},
]
: messages),

],
      max_completion_tokens: 10000,
    });

    const choice = response.choices[0];

    console.log("finish_reason:", choice.finish_reason);
    console.log("message content length:", choice.message.content?.length);
    console.log("usage:", response.usage);

    return Response.json({
      response:
        choice.message.content && choice.message.content.trim().length > 0
          ? choice.message.content
          : `⚠️ No response generated (finish_reason: ${choice.finish_reason}). Try a shorter document or increase max_completion_tokens.`,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
    });

  } catch (err: any) {

    console.error("================================");
    console.error("AZURE ERROR");
    console.error(err);
    console.error("================================");

    return Response.json({
      response: err.message || "Unknown error"
    });
  }
}