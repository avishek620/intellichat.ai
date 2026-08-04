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
  Clock,
} from "lucide-react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

function MessageContent({ content }: { content: string }) {
  return (
    <div className="prose prose-invert prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => (
            <div className="overflow-x-auto my-3">
              <table className="border-collapse w-full text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-slate-600 bg-slate-700 px-3 py-2 text-left font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-slate-600 px-3 py-2">{children}</td>
          ),
          code: ({ className, children, ...props }: any) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="bg-slate-700 px-1.5 py-0.5 rounded text-sm" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <pre className="bg-slate-950 border border-slate-700 rounded-lg p-4 overflow-x-auto my-3">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            );
          },
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>,
          h1: ({ children }) => <h1 className="text-lg font-bold mt-3 mb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-bold mt-3 mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-bold mt-2 mb-1">{children}</h3>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
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

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nameSubmitted, setNameSubmitted] = useState(false);
  const [trialStartTime, setTrialStartTime] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [showGoodwillGate, setShowGoodwillGate] = useState(false);
  const [goodwillCode, setGoodwillCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [checkingCode, setCheckingCode] = useState(false);

  const TRIAL_DURATION_MS = 10 * 60 * 1000;

  const [sessionAccessStart, setSessionAccessStart] = useState<number | null>(null);
  const [elapsedSessionMs, setElapsedSessionMs] = useState(0);
  const [totalInputTokens, setTotalInputTokens] = useState(0);
  const [totalOutputTokens, setTotalOutputTokens] = useState(0);

  const USD_TO_INR = 100;
  const INPUT_COST_PER_1K_TOKENS_USD = 0.0025;
  const OUTPUT_COST_PER_1K_TOKENS_USD = 0.015;
  const INPUT_COST_PER_1K_TOKENS = INPUT_COST_PER_1K_TOKENS_USD * USD_TO_INR;
  const OUTPUT_COST_PER_1K_TOKENS = OUTPUT_COST_PER_1K_TOKENS_USD * USD_TO_INR;

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


  useEffect(() => {
    const savedFirst = localStorage.getItem("intellichat-first-name");
    const savedLast = localStorage.getItem("intellichat-last-name");
    const savedUnlocked = sessionStorage.getItem("intellichat-unlocked");
    const savedAccessStart = sessionStorage.getItem("intellichat-session-access-start");
    const savedInputTokens = sessionStorage.getItem("intellichat-input-tokens");
    const savedOutputTokens = sessionStorage.getItem("intellichat-output-tokens");

    if (savedFirst && savedLast) {
      setFirstName(savedFirst);
      setLastName(savedLast);
      setNameSubmitted(true);
    }

    if (savedUnlocked === "true" && savedAccessStart) {
      setUnlocked(true);
      setSessionAccessStart(parseInt(savedAccessStart));
    }

    if (savedInputTokens) {
      setTotalInputTokens(parseInt(savedInputTokens));
    }

    if (savedOutputTokens) {
      setTotalOutputTokens(parseInt(savedOutputTokens));
    }
  }, []);

  useEffect(() => {
    if (!nameSubmitted || unlocked) return;

    async function startOrResumeTrial() {
      try {
        const res = await fetch("/api/start-trial", { method: "POST" });
        const data = await res.json();
        setTrialStartTime(data.startTime);
      } catch (err) {
        console.error("Failed to start trial:", err);
      }
    }

    startOrResumeTrial();
  }, [nameSubmitted, unlocked]);

  useEffect(() => {
    if (!trialStartTime || unlocked) return;

    function tick() {
      const elapsed = Date.now() - trialStartTime!;
      const remaining = TRIAL_DURATION_MS - elapsed;

      if (remaining <= 0) {
        setRemainingMs(0);
        setShowGoodwillGate(true);
      } else {
        setRemainingMs(remaining);
        setShowGoodwillGate(false);
      }
    }

    tick();
    const interval = setInterval(tick, 1000);

    return () => clearInterval(interval);
  }, [trialStartTime, unlocked]);

  useEffect(() => {
    if (!unlocked || !sessionAccessStart) return;

    function tick() {
      setElapsedSessionMs(Date.now() - sessionAccessStart!);
    }

    tick();
    const interval = setInterval(tick, 1000);

    return () => clearInterval(interval);
  }, [unlocked, sessionAccessStart]);


function formatTime(ms: number) {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  function formatElapsed(ms: number) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  function handleNameSubmit() {
    if (!firstName.trim() || !lastName.trim()) return;

    localStorage.setItem("intellichat-first-name", firstName.trim());
    localStorage.setItem("intellichat-last-name", lastName.trim());

    setNameSubmitted(true);
  }

  async function handleCodeSubmit() {
    setCheckingCode(true);
    setCodeError("");

    try {
      const res = await fetch("/api/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: goodwillCode }),
      });

      const data = await res.json();

      if (data.valid) {
        const accessStart = Date.now();
        sessionStorage.setItem("intellichat-unlocked", "true");
        sessionStorage.setItem("intellichat-session-access-start", accessStart.toString());
        setSessionAccessStart(accessStart);
        setUnlocked(true);
        setShowGoodwillGate(false);
        setGoodwillCode("");
      } else {
        setCodeError("Invalid code. Please try again.");
      }
    } catch (err) {
      setCodeError("Something went wrong. Please try again.");
    }

    setCheckingCode(false);
  }



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

formData.append("firstName", firstName);
formData.append("lastName", lastName);

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

      if (data.usage) {
        setTotalInputTokens((prev) => {
          const updated = prev + (data.usage.promptTokens || 0);
          sessionStorage.setItem("intellichat-input-tokens", updated.toString());
          return updated;
        });

        setTotalOutputTokens((prev) => {
          const updated = prev + (data.usage.completionTokens || 0);
          sessionStorage.setItem("intellichat-output-tokens", updated.toString());
          return updated;
        });
      }

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

    {!nameSubmitted && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 w-full max-w-md">
            <h2 className="text-xl font-bold mb-2">Welcome to IntelliChat</h2>
            <p className="text-slate-400 text-sm mb-6">
              Please tell us your name to get started.
            </p>

            <input
              type="text"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full mb-3 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-blue-600"
            />

            <input
              type="text"
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
              className="w-full mb-4 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-blue-600"
            />

            <button
              onClick={handleNameSubmit}
              disabled={!firstName.trim() || !lastName.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 rounded-xl py-3 font-medium transition"
            >
              Start Chatting
            </button>
          </div>
        </div>
      )}

      {nameSubmitted && showGoodwillGate && !unlocked && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 w-full max-w-md">
            <h2 className="text-xl font-bold mb-2">Your free trial has ended</h2>
            <p className="text-slate-400 text-sm mb-6">
              Enter your goodwill code to continue. Your conversation is safe and will resume exactly where you left off.
            </p>

            <input
              type="text"
              placeholder="Goodwill code"
              value={goodwillCode}
              onChange={(e) => setGoodwillCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCodeSubmit()}
              className="w-full mb-2 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-blue-600"
            />

            {codeError && (
              <p className="text-red-400 text-sm mb-3">{codeError}</p>
            )}

            <button
              onClick={handleCodeSubmit}
              disabled={!goodwillCode.trim() || checkingCode}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 rounded-xl py-3 font-medium transition"
            >
              {checkingCode ? "Checking..." : "Unlock"}
            </button>
          </div>
        </div>
      )}

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

        {sidebarOpen && unlocked && (
          <div className="p-4 border-t border-slate-800 text-xs text-slate-400 space-y-1">
            <p className="text-slate-500 uppercase text-[10px] mb-2">Session Usage</p>
            <p>Input tokens: {totalInputTokens.toLocaleString()}</p>
            <p>Output tokens: {totalOutputTokens.toLocaleString()}</p>
            <p>
              Est. cost: ₹
              {(
                (totalInputTokens / 1000) * INPUT_COST_PER_1K_TOKENS +
                (totalOutputTokens / 1000) * OUTPUT_COST_PER_1K_TOKENS
              ).toFixed(2)}
            </p>
          </div>
        )}

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

          {nameSubmitted && !unlocked && remainingMs !== null && (
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border ${
                remainingMs <= 60000
                  ? "bg-red-600/20 text-red-400 border-red-600/40"
                  : "bg-slate-800 text-slate-300 border-slate-700"
              }`}
            >
              <Clock size={16} />
              {formatTime(remainingMs)} remaining
            </div>
          )}

          {nameSubmitted && unlocked && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border bg-slate-800 text-slate-300 border-slate-700">
              <Clock size={16} />
              {formatElapsed(elapsedSessionMs)} session time
            </div>
          )}

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
  className={`relative max-w-3xl rounded-2xl px-5 py-4 ${
    msg.role === "assistant"
      ? "bg-slate-800 pt-10"
      : "bg-blue-600 whitespace-pre-wrap"
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

  <MessageContent content={msg.content} />

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