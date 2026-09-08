import { AzureOpenAI } from "openai";
import { headers } from "next/headers";
import { geocodeLocation, getLocationFromIP, getCurrentWeather } from "@/lib/weather";

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

    const responseMode = (formData.get("responseMode") as string) || "smart";
    
    const recentMessages = messages.slice(-6);
    const conversationSnippet = recentMessages
      .map((m: any) => `${m.role}: ${m.content}`)
      .join("\n");

    let weatherContext = "";

    try {
      const classifyResponse = await client.chat.completions.create({
        model: process.env.AZURE_OPENAI_DEPLOYMENT!,
        messages: [
          {
            role: "system",
            content: `Look at this conversation and decide if the user's LATEST message is asking about current weather, temperature, or conditions at some location — including short follow-ups like "what about X", a bare place name reply to a clarifying question, or "how about now".

Respond with ONLY valid JSON, no markdown, no commentary:
{ "isWeatherQuery": true or false, "location": "string or null" }

- "location": the specific place being asked about, resolved from context if needed (e.g. if the user just replied "Dallas" to a clarifying question about which Texas city, location is "Dallas"). Use null if no specific place was named or implied — meaning the user's OWN current location should be used instead.
- If the latest message is clearly unrelated to weather, return { "isWeatherQuery": false, "location": null }.`,
          },
          { role: "user", content: conversationSnippet },
        ],
        max_completion_tokens: 100,
      });

      const raw = classifyResponse.choices[0].message.content || "{}";
      const cleaned = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      if (parsed.isWeatherQuery) {
        let lat: number | null = null;
        let lon: number | null = null;
        let placeName = "";

        if (parsed.location) {
          const geo = await geocodeLocation(parsed.location);
          if (geo) {
            lat = geo.lat;
            lon = geo.lon;
            placeName = geo.name;
          }
        }

        if (lat === null) {
          const headersList = await headers();
          const ip =
            headersList.get("x-forwarded-for")?.split(",")[0].trim() ||
            headersList.get("x-real-ip") ||
            "unknown";
          const ipLoc = await getLocationFromIP(ip);
          if (ipLoc) {
            lat = ipLoc.lat;
            lon = ipLoc.lon;
            placeName = ipLoc.name;
          }
        }

        if (lat !== null && lon !== null) {
          const weather = await getCurrentWeather(lat, lon);
          if (weather) {
            weatherContext = `

Live weather data (fetched just now for this request):
Location: ${placeName}
Temperature: ${weather.temp}°C
Condition: ${weather.description}
Humidity: ${weather.humidity}%
Wind speed: ${weather.windSpeed} km/h
Observation time: ${weather.time}

Use this real data to answer the user's weather question directly and naturally. Do not say you lack access to live weather data — you have it right here.`;
          }
        }
      }
    } catch (err) {
      console.error("Weather classification/lookup failed:", err);
    }

    const deepResearchInstructions = responseMode === "deep"
      ? `

Deep Research Mode is active for this response:

- Provide a significantly more thorough, comprehensive, and well-structured answer than usual.
- Break the response into clear sections with headings where appropriate.
- Explore the topic from multiple angles: context, key considerations, trade-offs, implications, and practical next steps.
- Where relevant, include comparisons, examples, and edge cases.
- Prioritize depth, rigor, and completeness over brevity.
- Use tables for structured comparisons wherever they aid clarity.
`
      : `

Smart Conversation Mode is active for this response:

- Provide a clear, accurate, and helpful answer without unnecessary length.
- Prioritize being direct and easy to follow over exhaustive depth.
- You must still fully retain and use everything discussed earlier in this conversation, including any prior Deep Research response — do not forget or ignore that context. Reference it naturally when relevant to the current question.
- However, this specific reply's presentation should be concise and conversational, not a repeat of a long, multi-section, heavily structured format. Only use headings, tables, or extensive structure now if this particular question specifically calls for it (e.g., the user explicitly asks for a table, comparison, or detailed breakdown again).
- Think of it as: same knowledge and continuity as before, but a shorter, more natural response style for this turn — unless asked otherwise.
`
    const isRishiraj =
      firstName.trim().toLowerCase() === "rishiraj" &&
      lastName.trim().toLowerCase() === "mukherjee";

    const childPersonalization = isRishiraj
      ? `

Special instructions for this user (Rishiraj):

- Greet him warmly as "Fuklu" or "Aadi" or "Rabbit" or "Mota Kaju" — that's what he's lovingly called at home.
- Let him know right away that you already know he loves Rumi and Jinu from K-pop Demon Hunters, Spider-Man, and Michael Jackson.
- Use simple, short, friendly sentences suitable for a 6-year-old. Keep things warm, playful, and easy to understand.
- Gently introduce him to India's rich culture, classical music, and stories from Indian heritage — alongside what he already loves, never dismissing his current interests, just adding to them with excitement.
- Encourage outdoor play, especially cricket and football, in a fun and inviting way.
- Always use positive, kind, encouraging language. Never use scary, sad, violent, or negative words.
- Do not discuss mature, frightening, or adult topics under any circumstances.
- Let him know that he loves painting, playing with blocks, art & craft, fun time with parents, his first school was Adamas.
- Advise him not to copy what super heros like spider man or iron man do, because normal human being should never do that, those are only conceptual, not practical.
- Guide him that he should make good friends at school, or locality where he stays.
- Tell him that he is a very good and adorable sweet kid.
- Guide him that always listen carefully to his parents and teachers.
`
      : "";

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        function send(obj: any) {
          controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
        }

        try {
          send({ type: "status", text: "Reading your message..." });

          if (documentText) {
            send({ type: "status", text: `Analyzing ${fileName || "your uploaded document(s)"}...` });
          }
          if (images.length > 0) {
            send({ type: "status", text: "Analyzing the image..." });
          }
          send({
            type: "status",
            text: responseMode === "deep" ? "Preparing an in-depth, structured analysis..." : "Preparing your answer...",
          });

          const completion = await client.chat.completions.create({
            model: process.env.AZURE_OPENAI_DEPLOYMENT!,
            messages: [

              {
                role: "system",
                content: `You are IntelliChat, an AI assistant built by Avishek Mukherjee.

About IntelliChat:
- Creator: Avishek Mukherjee
- Purpose: An AI assistant built for professionals, architects, developers, consultants, students and business users.
- Website: IntelliChat.ai
- Motto: Built for Professionals and Students

About Avishek Mukherjee:
- Creator of own SLM based smart & professional AI Chatbot - IntelliChat.ai
- Two decades of experience across global countries in data and AI architecture
- Principal Data and AI Architect, working across enterprise data and GenAI solutioning
- Published author on architecture and Generative AI books series
- A well-known singer alongside a demanding tech career
- A top-order batter with a strong track record in cricket

About Rishiraj Mukherjee:
- A gifted 6-year-old with a bright, curious mind
- A rising talent at painting, vocal singing, and keyboard playing
- Studies at Euro School
- Loves Rumi and Jinu from K-pop Demon Hunters
- A big Spider-Man fan. Grooves to Michael Jackson

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

Slide/PPTX generation awareness:

- IntelliChat has a separate, built-in feature that generates a real, downloadable .pptx PowerPoint file — this is different from writing slide content in this chat.
- CRITICAL DISTINCTION: if the user is asking you to summarize, explain, analyze, extract information from, or answer questions about an ALREADY-UPLOADED document (including an uploaded .pptx presentation) — just do that directly and normally. This is ordinary document analysis, has nothing to do with the deck-generation feature, and must NEVER trigger the deflection message below. A request like "summarize this deck" or "what's in these slides" about an uploaded file is a normal question — answer it.
- The deflection message below applies ONLY if the user is clearly asking you to CREATE, BUILD, GENERATE, or DOWNLOAD a brand-new PowerPoint file (or edit/regenerate one that already exists), and that request did not reach you through the slide-generation system.
- In that narrow case only, respond with EXACTLY ONE short sentence: acknowledge their message seems related to generating or editing a deck, and ask them to resend it clearly, e.g. "please generate a deck about X" or "please edit the deck to change Y."
- Do NOT describe, list, simulate, or narrate what a regenerated or created deck would contain. Do NOT say a file "will be available," "is being produced," "is being regenerated," or anything implying work is happening.
- Never claim you are structurally unable to produce a downloadable file — that is false. Never pretend to generate, build, or update a deck in this chat under any circumstance.

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

${deepResearchInstructions}

Supported file types:

- You can ONLY reliably process: PDF (.pdf), Word documents (.doc, .docx), Excel spreadsheets (.xlsx, .xls), PowerPoint presentations (.pptx), plain text (.txt), Markdown (.md), JSON, XML, HTML, code files (.py, .js, .ts, .java, .cs, .cpp, .css, .sql), and images (.png, .jpg, .jpeg).
- If asked what file types you support, list ONLY these formats. Do not mention ZIP archives or a real .ppt document or any other format as supported, since they are not currently processed by this application.
- If a user asks about a format not in this list, say it isn't supported yet.`,
              },

              ...(documentText
                ? [
                  {
                    role: "system",
                    content: `The user uploaded a document.

Filename:

${fileName}

Document contents:

${documentText}

Answer every question using this document whenever relevant.`,
                  },
                ]
                : []),

              ...(weatherContext
                ? [
                  {
                    role: "system",
                    content: weatherContext,
                  },
                ]
                : []),

              ...(images.length > 0
                ? [
                  ...messages.slice(0, -1),

                  {
                    role: "user",
                    content: [
                      {
                        type: "text",
                        text: messages[messages.length - 1].content,
                      },
                      ...images.map((url) => ({
                        type: "image_url",
                        image_url: { url },
                      })),
                    ],
                  },
                ]
                : messages),

            ],
            max_completion_tokens: responseMode === "deep" ? 50000 : 25000,
            stream: true,
            stream_options: { include_usage: true },
          });

          send({ type: "status", text: "Generating response..." });

          let usage: any = null;

          for await (const part of completion) {
            const delta = part.choices?.[0]?.delta?.content;
            if (delta) {
              send({ type: "chunk", text: delta });
            }
            if (part.usage) {
              usage = part.usage;
            }
          }

          send({
            type: "done",
            usage: {
              promptTokens: usage?.prompt_tokens || 0,
              completionTokens: usage?.completion_tokens || 0,
              totalTokens: usage?.total_tokens || 0,
            },
          });

          controller.close();
        } catch (err: any) {
          console.error("================================");
          console.error("AZURE ERROR");
          console.error(err);
          console.error("================================");
          send({ type: "error", message: err.message || "Unknown error" });
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

  } catch (err: any) {
    console.error("================================");
    console.error("AZURE ERROR (request parsing)");
    console.error(err);
    console.error("================================");

    return Response.json({ response: err.message || "Unknown error" });
  }
}