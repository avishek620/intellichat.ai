"use client";

import { useState, useRef, useEffect } from "react";
import {
  Send,
  Plus,
  Paperclip,
  Bot,
  User,
  Menu,
  Sparkles,
  Copy,
  Check,
  Download,
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  responseTime?: number;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  timestamp: number;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "👋 Welcome to IntelliChat.\n\nI can help you with:\n\n• General questions\n• Coding & debugging\n• PDF / DOC / Excel / Presentation analysis\n• Image understanding\n• Code Understanding\n\nHow can I help you today?",
    },
  ]);

  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [uploadedFileNames, setUploadedFileNames] = useState<string[]>([]);
  const [documentText, setDocumentText] = useState("");
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);


  useEffect(() => {
    const saved = localStorage.getItem("intellichat-conversations");
    if (saved) {
      try {
        setConversations(JSON.parse(saved));
      } catch (err) {
        console.error("Failed to load saved conversations:", err);
      }
    }
  }, []);

  function saveCurrentConversation() {
    const realMessages = messages.filter((m, i) => !(i === 0 && m.role === "assistant"));
    if (realMessages.length === 0) return;

    const firstUserMessage = messages.find((m) => m.role === "user");
    const title = firstUserMessage
      ? firstUserMessage.content.slice(0, 40)
      : "Untitled chat";

    const id = activeConversationId || Date.now().toString();

    setConversations((prev) => {
      const existingIndex = prev.findIndex((c) => c.id === id);
      const updatedConversation: Conversation = {
        id,
        title,
        messages,
        timestamp: Date.now(),
      };

      let updated;
      if (existingIndex >= 0) {
        updated = [...prev];
        updated[existingIndex] = updatedConversation;
      } else {
        updated = [updatedConversation, ...prev];
      }

      localStorage.setItem("intellichat-conversations", JSON.stringify(updated));
      return updated;
    });
  }

  function loadConversation(conv: Conversation) {
    saveCurrentConversation();
    setMessages(conv.messages);
    setActiveConversationId(conv.id);
  }

  function deleteConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setConversations((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      localStorage.setItem("intellichat-conversations", JSON.stringify(updated));
      return updated;
    });
    if (activeConversationId === id) {
      setActiveConversationId(null);
    }
  }

  async function handleLogout() {
    alert("You have been logged out. Click OK to log back in.");

    try {
      await fetch("/api/chat", {
        headers: {
          Authorization: "Basic " + btoa("logout:logout"),
        },
      });
    } catch (err) {
      // expected to fail with 401 — that's the point
    }

    window.location.reload();
  }

  async function sendMessage() {
    if (!prompt.trim()) return;

    const userMessage: Message = {
      role: "user",
      content: prompt,
    };

const updatedMessages = [...messages, userMessage];

const currentImages = uploadedImages;

setMessages(updatedMessages);

setPrompt("");

setLoading(true);

try {
  const formData = new FormData();

formData.append(
  "messages",
  JSON.stringify(updatedMessages)
);

formData.append("documentText", documentText);
formData.append("fileName", uploadedFileNames.join(", "));

currentImages.forEach((img) => {
  formData.append("images", img);
});

uploadedFiles.forEach((file) => {
  formData.append("files", file);
});

const startTime = Date.now();

const res = await fetch("/api/chat", {
  method: "POST",
  body: formData,
});

      const data = await res.json();

      const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response,
          responseTime: parseFloat(elapsedSeconds),
        },
      ]);

      // setUploadedFileNames([]);
      // setDocumentText("");
      // setUploadedImages([]);
      // setUploadedFiles([]);

    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "⚠️ Unable to connect to Azure OpenAI.",
        },
      ]);
    }

    // setUploadedFileNames([]);
    // setUploadedImages([]);
    // setUploadedFiles([]);
    setLoading(false);
  }

  function onKeyDown(
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function copyResponse(text: string, index: number) {
  navigator.clipboard.writeText(text);

  setCopiedIndex(index);

  setTimeout(() => {
    setCopiedIndex(null);
  }, 2000);
}

function downloadResponse(text: string, index: number) {
  const codeBlockMatch = text.match(/```(\w+)?\n([\s\S]*?)```/);

  if (!codeBlockMatch) return;

  const language = (codeBlockMatch[1] || "").toLowerCase();
  const content = codeBlockMatch[2];

  const extensionMap: Record<string, string> = {
    python: "py",
    py: "py",
    javascript: "js",
    js: "js",
    typescript: "ts",
    ts: "ts",
    tsx: "tsx",
    jsx: "jsx",
    java: "java",
    csharp: "cs",
    cs: "cs",
    cpp: "cpp",
    "c++": "cpp",
    sql: "sql",
    html: "html",
    xml: "xml",
    json: "json",
    css: "css",
    yaml: "yaml",
    yml: "yml",
    markdown: "md",
    md: "md",
    bash: "sh",
    sh: "sh",
    shell: "sh",
    powershell: "ps1",
    ipynb: "ipynb",
  };

  const extension = extensionMap[language] || "txt";

  // Only trust a filename explicitly mentioned on its own line, e.g. "function_app.py"
  const filenameLineMatch = text.match(
    /^[`\s]*([a-zA-Z0-9_\-]+\.[a-zA-Z0-9]+)[`\s]*$/m
  );

  const filename =
    filenameLineMatch && filenameLineMatch[1].endsWith(`.${extension}`)
      ? filenameLineMatch[1]
      : `code-${index}.${extension}`;

  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}



  return (
    <div className="flex h-screen bg-slate-950 text-white">

      {/* Sidebar */}

      <aside
        className={`${
          sidebarOpen ? "w-72" : "w-16"
        } transition-all duration-300 bg-slate-900 border-r border-slate-800 flex flex-col`}
      >
        <div className="flex items-center justify-between p-4">

          <button
            onClick={() =>
              setSidebarOpen(!sidebarOpen)
            }
          >
            <Menu />
          </button>

          {sidebarOpen && (
            <h1 className="font-bold text-lg flex items-center gap-2">
              <Sparkles size={20} />
              IntelliChat
            </h1>
          )}
        </div>

        <div className="px-4">

          <button
  onClick={() => {
    saveCurrentConversation();
    setMessages([
      {
        role: "assistant",
        content:
          "👋 Welcome to IntelliChat.\n\nI can help you with:\n\n• General questions\n• Coding & debugging\n• PDF / DOC analysis\n• Image understanding\n\nHow can I help you today?",
      },
    ]);

    setActiveConversationId(null);
    setPrompt("");
    setUploadedFileNames([]);
    setDocumentText("");
    setUploadedImages([]);
    setUploadedFiles([]);
  }}
  className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 py-3 flex items-center justify-center gap-2"
>
  <Plus size={18} />
  {sidebarOpen && "New Chat"}
</button>

        </div>

        <div className="flex-1 overflow-auto mt-6 px-3">

          {sidebarOpen && (
            <>
              <p className="text-slate-400 text-xs mb-3 uppercase">
    Recent Chats
</p>

<div className="space-y-2">
  {conversations.length === 0 ? (
    <div className="text-slate-500 text-sm text-center py-6">
        No conversations yet
    </div>
  ) : (
    conversations.map((conv) => (
      <div
        key={conv.id}
        onClick={() => loadConversation(conv)}
        className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm truncate ${
          activeConversationId === conv.id
            ? "bg-slate-700"
            : "hover:bg-slate-800"
        }`}
      >
        <span className="truncate">{conv.title}</span>
        <button
          onClick={(e) => deleteConversation(conv.id, e)}
          className="text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition ml-2"
        >
          ✕
        </button>
      </div>
    ))
  )}
</div>
            </>
          )}

        </div>

<div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full rounded-xl bg-slate-800 hover:bg-red-600 py-3 flex items-center justify-center gap-2 transition"
          >
            {sidebarOpen ? "Logout" : "⏻"}
          </button>
        </div>

      </aside>

      {/* Main */}

      <main className="flex-1 flex flex-col">

        {/* Header */}

        <header className="border-b border-slate-800 px-8 py-5 flex items-center justify-between">

          <div>

            <h2 className="text-2xl font-bold">
              IntelliChat.ai
            </h2>

             <p className="text-slate-400 text-sm">
    Built for Professionals
  </p>

  <p className="text-slate-500 text-xs mt-1">
    © 2026 Avishek Mukherjee. All Rights Reserved.
  </p>

          </div>

        </header>

        {/* Messages */}

        <div className="flex-1 overflow-auto px-8 py-8">

          <div className="max-w-4xl mx-auto space-y-6">

            {messages.map((msg, index) => (

              <div
                key={index}
                className={`flex gap-4 ${
                  msg.role === "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >

                {msg.role === "assistant" && (
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                    <Bot size={20} />
                  </div>
                )}

   <div
  className={`relative max-w-3xl rounded-2xl px-5 py-4 whitespace-pre-wrap ${
    msg.role === "assistant"
      ? "bg-slate-800 pt-10"
      : "bg-blue-600"
  }`}
>             

  {msg.role === "assistant" && (

    <button
      onClick={() => copyResponse(msg.content, index)}
      className="absolute top-3 right-10 text-slate-400 hover:text-white transition"
      title="Copy response"
    >
      {copiedIndex === index ? (
        <Check size={16} />
      ) : (
        <Copy size={16} />
      )}
    </button>

  )}

  {msg.role === "assistant" && msg.content.includes("```") && (

    <button
      onClick={() => downloadResponse(msg.content, index)}
      className="absolute top-3 right-3 text-slate-400 hover:text-white transition"
      title="Download as file"
    >
      <Download size={16} />
    </button>

  )}

  {msg.content}

  {msg.role === "assistant" && msg.responseTime !== undefined && (
    <div className="text-xs text-slate-500 mt-3">
      ⏱ {msg.responseTime}s
    </div>
  )}

</div>

                {msg.role === "user" && (
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                    <User size={20} />
                  </div>
                )}

              </div>

            ))}

            {loading && (

              <div className="flex gap-4">

                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                  <Bot size={20} />
                </div>

                <div className="bg-slate-800 rounded-2xl px-5 py-4">
                  Thinking...
                </div>

              </div>

            )}

            <div ref={messagesEndRef} />

                      </div>
        </div>

        {/* Bottom Input */}

        <div className="border-t border-slate-800 bg-slate-900 p-6">

          <div className="max-w-4xl mx-auto">

            <div className="relative flex items-end gap-3 bg-slate-800 rounded-2xl p-3">

              <>
  <input
    ref={fileInputRef}
    type="file"
    hidden
    accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.xlsx,.xls,.ppt,.pptx,.json,.xml,.html,.htm,.py,.js,.ts,.java,.cs,.cpp,.css,.sql,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/*,text/*,application/json,application/xml"
    onChange={async (e) => {
      const files = Array.from(e.target.files || []);

      if (files.length === 0) return;

      setUploadedFileNames((prev) => [...prev, ...files.map((f) => f.name)]);
      setUploadedFiles((prev) => [...prev, ...files]);

      for (const file of files) {

        // PDF Extraction
        if (file.type === "application/pdf") {
          try {
            const pdfjsLib = await import("pdfjs-dist");

            pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
              "pdfjs-dist/build/pdf.worker.min.mjs",
              import.meta.url
            ).toString();

            const arrayBuffer = await file.arrayBuffer();

            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            let text = "";

            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const content = await page.getTextContent();

              text += content.items
                .map((item: any) => ("str" in item ? item.str : ""))
                .join(" ");

              text += "\n\n";
            }

            console.log("PDF extracted text length:", text.length);
            console.log("PDF extracted text preview:", text.slice(0, 300));

            setDocumentText((prev) => prev + `\n\n--- ${file.name} ---\n\n` + text);
          } catch (err) {
            console.error("PDF extraction failed:", err);
          }
        }

        // DOCX Extraction
        if (
          file.type ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ) {

          const mammoth = await import("mammoth");

          const arrayBuffer = await file.arrayBuffer();

          const result = await mammoth.extractRawText({
            arrayBuffer,
          });

          setDocumentText((prev) => prev + `\n\n--- ${file.name} ---\n\n` + result.value);
        }

        // TXT Extraction
        if (file.type === "text/plain") {

          const text = await file.text();

          setDocumentText((prev) => prev + `\n\n--- ${file.name} ---\n\n` + text);

        }

        // Excel Extraction
        if (
          file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
          file.type === "application/vnd.ms-excel" ||
          file.name.endsWith(".xlsx") ||
          file.name.endsWith(".xls")
        ) {
          const XLSX = await import("xlsx");

          const arrayBuffer = await file.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer, { type: "array" });

          let text = "";

          workbook.SheetNames.forEach((sheetName) => {
            const sheet = workbook.Sheets[sheetName];
            const csv = XLSX.utils.sheet_to_csv(sheet);
            text += `\n[Sheet: ${sheetName}]\n${csv}\n`;
          });

          console.log("Excel extracted text length:", text.length);

          setDocumentText((prev) => prev + `\n\n--- ${file.name} ---\n\n` + text);
        }

        if (file.type.startsWith("image/")) {

          const reader = new FileReader();

          reader.onload = () => {
            setUploadedImages((prev) => [...prev, reader.result as string]);
          };

          reader.readAsDataURL(file);
        }

        // PPTX Extraction
        if (
          file.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
          file.name.endsWith(".pptx")
        ) {
          try {
            const JSZip = (await import("jszip")).default;

            const arrayBuffer = await file.arrayBuffer();
            const zip = await JSZip.loadAsync(arrayBuffer);

            const slideFiles = Object.keys(zip.files)
              .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
              .sort((a, b) => {
                const numA = parseInt(a.match(/\d+/)?.[0] || "0");
                const numB = parseInt(b.match(/\d+/)?.[0] || "0");
                return numA - numB;
              });

            let text = "";

            for (let i = 0; i < slideFiles.length; i++) {
              const xml = await zip.files[slideFiles[i]].async("text");
              const matches = xml.match(/<a:t>(.*?)<\/a:t>/g) || [];
              const slideText = matches
                .map((m) => m.replace(/<a:t>|<\/a:t>/g, ""))
                .join(" ");
              text += `\n[Slide ${i + 1}]\n${slideText}\n`;
            }

            console.log("PPTX extracted text length:", text.length);

            setDocumentText((prev) => prev + `\n\n--- ${file.name} ---\n\n` + text);
          } catch (err) {
            console.error("PPTX extraction failed:", err);
          }

        }

        // Code / JSON / XML / HTML / Markdown Extraction
        const codeExtensions = [
          ".json", ".xml", ".html", ".htm", ".py", ".js", ".ts",
          ".java", ".cs", ".cpp", ".css", ".sql", ".md",
        ];

        if (codeExtensions.some((ext) => file.name.endsWith(ext))) {
          const text = await file.text();
          setDocumentText((prev) => prev + `\n\n--- ${file.name} ---\n\n` + text);
        }

      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `📎 Files selected:\n\n${files.map((f) => f.name).join("\n")}`,
        },
      ]);
      e.target.value = "";
    }}

  />

  <button
    onClick={() => fileInputRef.current?.click()}
    className="p-3 rounded-xl hover:bg-slate-700 transition"
    title="Upload File"
  >
    <Paperclip size={22} />
  </button>
</>

{uploadedFileNames.length > 0 && (
  <div className="absolute -top-12 left-0 right-0 flex items-center justify-between rounded-xl bg-slate-700 px-4 py-2 text-sm border border-slate-600">
    <span>📄 {uploadedFileNames.join(", ")}</span>

    <button
  onClick={() => {
    setUploadedFileNames([]);
    setDocumentText("");
    setUploadedImages([]);
    setUploadedFiles([]);
  }}
  className="text-slate-300 hover:text-white"
>
  ✕
</button>
  </div>
)}

              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder={
  uploadedFileNames.length > 0
    ? "Ask anything about this document..."
    : "Ask anything..."
}
                className="flex-1 bg-transparent resize-none outline-none text-white placeholder:text-slate-400 max-h-40"
              />

              <button
                onClick={sendMessage}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 rounded-xl p-3 transition"
              >
                <Send size={20} />
              </button>

            </div>

            <p className="text-center text-xs text-slate-500 mt-3">
              IntelliChat can make mistakes. Verify important information.
            </p>

          </div>

        </div>

      </main>

    </div>
  );
}