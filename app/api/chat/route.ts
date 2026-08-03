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
      max_completion_tokens: 5000,
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