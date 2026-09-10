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
  streaming?: boolean;
}

interface SlideDeckRecord {
  id: string;
  deck: any;
  sources: { title: string; url: string }[];
  createdAt: number;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  timestamp: number;
  decks?: SlideDeckRecord[];
  documentText?: string;
  uploadedFileNames?: string[];
  uploadedImages?: string[];
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

  const [conversationSaved, setConversationSaved] = useState(false);

  const [responseMode, setResponseMode] = useState<"smart" | "deep">("smart");

  const [preferredTheme, setPreferredTheme] = useState("auto");

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


  const [currentDecks, setCurrentDecks] = useState<SlideDeckRecord[]>([]);
  const [generatingSlides, setGeneratingSlides] = useState(false);
  const [showLatestDeckCard, setShowLatestDeckCard] = useState(false);
  const [decksListOpen, setDecksListOpen] = useState(false);

  const [slideStepsList, setSlideStepsList] = useState<{ text: string; done: boolean }[]>([]);

  const [chatSteps, setChatSteps] = useState<{ text: string; done: boolean }[]>([]);

  const USD_TO_INR = 100;
  const INPUT_COST_PER_1K_TOKENS_USD = 0.0025;
  const OUTPUT_COST_PER_1K_TOKENS_USD = 0.015;
  const INPUT_COST_PER_1K_TOKENS = INPUT_COST_PER_1K_TOKENS_USD * USD_TO_INR;
  const OUTPUT_COST_PER_1K_TOKENS = OUTPUT_COST_PER_1K_TOKENS_USD * USD_TO_INR;

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasHydrated = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    if (!hasHydrated.current) return;
    if (messages.length <= 1) return;
    sessionStorage.setItem("intellichat-current-messages", JSON.stringify(messages));
    sessionStorage.setItem("intellichat-current-active-id", activeConversationId || "");
  }, [messages, activeConversationId]);

  useEffect(() => {
    if (!hasHydrated.current) return;
    sessionStorage.setItem("intellichat-current-document-text", documentText);
    sessionStorage.setItem("intellichat-current-filenames", JSON.stringify(uploadedFileNames));
    sessionStorage.setItem("intellichat-current-images", JSON.stringify(uploadedImages));
  }, [documentText, uploadedFileNames, uploadedImages]);

  useEffect(() => {
    if (!hasHydrated.current) return;
    if (!activeConversationId) return;
    persistConversationState();
  }, [documentText, uploadedFileNames, uploadedImages]);

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

    const savedCurrentMessages = sessionStorage.getItem("intellichat-current-messages");
    if (savedCurrentMessages) {
      try {
        setMessages(JSON.parse(savedCurrentMessages));
      } catch (err) {
        console.error("Failed to restore current conversation:", err);
      }
    }

    const savedActiveId = sessionStorage.getItem("intellichat-current-active-id");
    if (savedActiveId) {
      setActiveConversationId(savedActiveId);
    }

    const savedDocText = sessionStorage.getItem("intellichat-current-document-text");
    if (savedDocText) setDocumentText(savedDocText);

    const savedFilenames = sessionStorage.getItem("intellichat-current-filenames");
    if (savedFilenames) {
      try { setUploadedFileNames(JSON.parse(savedFilenames)); } catch {}
    }

    const savedImages = sessionStorage.getItem("intellichat-current-images");
    if (savedImages) {
      try { setUploadedImages(JSON.parse(savedImages)); } catch {}
    }

    const savedActiveIdForDecks = sessionStorage.getItem("intellichat-current-active-id");
    if (savedActiveIdForDecks) {
      try {
        const allConvsRaw = localStorage.getItem("intellichat-conversations");
        if (allConvsRaw) {
          const allConvs: Conversation[] = JSON.parse(allConvsRaw);
          const match = allConvs.find((c) => c.id === savedActiveIdForDecks);
          if (match && match.decks) {
            setCurrentDecks(match.decks);
          }
        }
      } catch (err) {
        console.error("Failed to restore decks for active conversation:", err);
      }
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

    hasHydrated.current = true;
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

  function pushStep(setter: React.Dispatch<React.SetStateAction<{ text: string; done: boolean }[]>>, text: string) {
    setter((prev) => {
      const updated = prev.map((s, i) => (i === prev.length - 1 ? { ...s, done: true } : s));
      return [...updated, { text, done: false }];
    });
  }

  function clearSteps(setter: React.Dispatch<React.SetStateAction<{ text: string; done: boolean }[]>>) {
    setter([]);
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
    if (realMessages.length === 0 && currentDecks.length === 0) return;
    persistConversationState();
  }

  function persistConversationState(decksOverride?: SlideDeckRecord[]) {
    const id = activeConversationId || Date.now().toString();

    const firstUserMessage = messages.find((m) => m.role === "user");
    const title = firstUserMessage
      ? firstUserMessage.content.slice(0, 40)
      : "Untitled chat";

    setConversations((prev) => {
      const existingIndex = prev.findIndex((c) => c.id === id);
      const updatedConversation: Conversation = {
        id,
        title,
        messages,
        timestamp: Date.now(),
        decks: decksOverride ?? currentDecks,
        documentText,
        uploadedFileNames,
        uploadedImages,
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

    if (!activeConversationId) {
      setActiveConversationId(id);
    }
  }

  function handleManualSave() {
    saveCurrentConversation();
    setConversationSaved(true);
    setTimeout(() => setConversationSaved(false), 2000);
  }

  function loadConversation(conv: Conversation) {
    saveCurrentConversation();
    setMessages(conv.messages);
    setActiveConversationId(conv.id);
    setCurrentDecks(conv.decks || []);
    setDocumentText(conv.documentText || "");
    setUploadedFileNames(conv.uploadedFileNames || []);
    setUploadedImages(conv.uploadedImages || []);
    setUploadedFiles([]);
    setShowLatestDeckCard(false);
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


        function detectSlideIntentHeuristic(text: string, hasDeck: boolean): "create" | "edit" | null {
    const lower = text.toLowerCase();

    const deckNouns = ["slide", "slides", "deck", "presentation", "pptx", "ppt", "powerpoint"];
    const createVerbs = ["generate", "create", "build", "make", "produce", "prepare", "design", "put together"];
    const editVerbs = [
      "edit", "update", "change", "modify", "revise", "fix", "add", "remove", "rework",
      "regenerate", "recreate", "redo", "resend", "reattach", "redownload", "correct", "rebuild",
      "fill", "complete", "finish", "improve", "enhance", "redesign",
    ];

    const hasDeckNoun = deckNouns.some((n) => lower.includes(n));
    const hasCreateVerb = createVerbs.some((v) => lower.includes(v));
    const hasEditVerb = editVerbs.some((v) => lower.includes(v));

    if (hasDeckNoun && hasEditVerb && hasDeck) return "edit";
    if (hasDeckNoun && hasCreateVerb) return "create";
    if (hasDeckNoun && hasDeck && (lower.includes("download") || lower.includes("blank") || lower.includes("missing"))) return "edit";

    return null;
  }


   async function sendMessage() {
    if (!prompt.trim()) return;
    if (loading || generatingSlides) return;

    let intent: "create" | "edit" | "none" = "none";

  const heuristicIntent = detectSlideIntentHeuristic(prompt, currentDecks.length > 0);

    if (heuristicIntent) {
      intent = heuristicIntent;
    } else {
      try {
        const intentRes = await fetch("/api/classify-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: prompt, hasExistingDeck: currentDecks.length > 0 }),
        });
        const intentData = await intentRes.json();
        intent = intentData.intent;
      } catch (err) {
        console.error("Intent classification error:", err);
      }
    }

    console.log("Detected slide intent:", intent, "| heuristic hit:", !!heuristicIntent);

        if (intent === "create" || (intent === "edit" && currentDecks.length > 0)) {
      const userMessage: Message = { role: "user", content: prompt };
      setMessages((prev) => [...prev, userMessage]);
      const instructions = prompt;
      setPrompt("");

      const lastAssistantMsg = [...messages].reverse().find(
        (m) => m.role === "assistant" && m.content.length > 400
      );
      const priorContent = lastAssistantMsg ? lastAssistantMsg.content : "";

      await runSlideRequest(intent, instructions, priorContent);
      return;
    }

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

      formData.append("messages", JSON.stringify(updatedMessages));
      formData.append("documentText", documentText);
      formData.append("fileName", uploadedFileNames.join(", "));
      formData.append("firstName", firstName);
      formData.append("lastName", lastName);
      formData.append("responseMode", responseMode);

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

      if (!res.body) throw new Error("No response stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulatedText = "";
      let hasStartedStreaming = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;

          const parsed = JSON.parse(line);

            if (parsed.type === "status") {
            pushStep(setChatSteps, parsed.text);
          } else if (parsed.type === "chunk") {
            accumulatedText += parsed.text;

            if (!hasStartedStreaming) {
              hasStartedStreaming = true;
              clearSteps(setChatSteps);

              setMessages((prev) => [
                ...prev,
                { role: "assistant", content: accumulatedText, streaming: true },
              ]);
            } else {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: accumulatedText,
                };
                return updated;
              });
            }
          } else if (parsed.type === "done") {
            const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);

            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last && last.role === "assistant") {
                updated[updated.length - 1] = {
                  ...last,
                  streaming: false,
                  responseTime: parseFloat(elapsedSeconds),
                };
              }
              return updated;
            });

            if (parsed.usage) {
              setTotalInputTokens((prev) => {
                const updatedVal = prev + (parsed.usage.promptTokens || 0);
                sessionStorage.setItem("intellichat-input-tokens", updatedVal.toString());
                return updatedVal;
              });
              setTotalOutputTokens((prev) => {
                const updatedVal = prev + (parsed.usage.completionTokens || 0);
                sessionStorage.setItem("intellichat-output-tokens", updatedVal.toString());
                return updatedVal;
              });
            }
            } else if (parsed.type === "error") {
            clearSteps(setChatSteps);
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: `⚠️ ${parsed.message}` },
            ]);
          }
        }
      }
    } catch (err) {
      clearSteps(setChatSteps);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ Unable to connect to the private model Clarion-1.1 right now. Please check your internet connection and try again." },
      ]);
    }

    clearSteps(setChatSteps);
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

function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (item.type.startsWith("image/")) {
        e.preventDefault();

        const file = item.getAsFile();
        if (!file) continue;

        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const pastedFileName = `pasted-screenshot-${timestamp}.png`;

        setUploadedFileNames((prev) => [...prev, pastedFileName]);
        setUploadedFiles((prev) => [...prev, file]);

        const reader = new FileReader();
        reader.onload = () => {
          setUploadedImages((prev) => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      }
    }
  }


  async function runSlideRequest(mode: "create" | "edit", instructions: string, priorContent: string = "") {
    setGeneratingSlides(true);
    setSlideStepsList([{ text: "Starting...", done: false }]);

    const existingDeckForEdit = currentDecks.length > 0 ? currentDecks[currentDecks.length - 1].deck : undefined;

    try {
      const res = await fetch("/api/generate-slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          instructions,
          documentText,
          priorContent,
          preferredTheme,
          existingDeck: mode === "edit" ? existingDeckForEdit : undefined,
        }),
      });

      if (!res.body) throw new Error("No response stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalResult: any = null;
      let errorMsg: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("STATUS:")) {
            pushStep(setSlideStepsList, line.slice(7));
          } else if (line.startsWith("RESULT:")) {
            finalResult = JSON.parse(line.slice(7));
          } else if (line.startsWith("ERROR:")) {
            errorMsg = line.slice(6);
          }
        }
      }

      if (finalResult?.deck) {
        const newRecord: SlideDeckRecord = {
          id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
          deck: finalResult.deck,
          sources: finalResult.sources || [],
          createdAt: Date.now(),
        };

        const updatedDecks =
          mode === "edit" && currentDecks.length > 0
            ? [...currentDecks.slice(0, -1), newRecord]
            : [...currentDecks, newRecord];

        setCurrentDecks(updatedDecks);
        setShowLatestDeckCard(true);
        persistConversationState(updatedDecks);


        if (finalResult.usage) {
          setTotalInputTokens((prev) => {
            const updatedVal = prev + (finalResult.usage.promptTokens || 0);
            sessionStorage.setItem("intellichat-input-tokens", updatedVal.toString());
            return updatedVal;
          });
          setTotalOutputTokens((prev) => {
            const updatedVal = prev + (finalResult.usage.completionTokens || 0);
            sessionStorage.setItem("intellichat-output-tokens", updatedVal.toString());
            return updatedVal;
          });
        }

        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              mode === "edit"
                ? `✅ Updated the deck based on: "${instructions}"`
                : `✅ I've built a ${finalResult.deck.slides.length}-slide deck: "${finalResult.deck.deckTitle}". You can download it below, or ask me to edit any slide.`,
          },
        ]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ ${errorMsg || "Slide generation failed."}` }]);
      }
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", content: "⚠️ Failed to process slide request." }]);
    }

    setSlideStepsList([]);
    setGeneratingSlides(false);
  }

  async function downloadSlideDeck(deckRecord: SlideDeckRecord) {
    const deck = deckRecord.deck;
    if (!deck) return;

    const pptxgen = (await import("pptxgenjs")).default;
    const pres = new pptxgen();
    pres.defineLayout({ name: "WIDE", width: 13.333, height: 7.5 });
    pres.layout = "WIDE";

    const themes: Record<string, { primary: string; dark: string; light: string; accent: string }> = {
      blue: { primary: "1E3A8A", dark: "0F1E42", light: "E8EFFB", accent: "2563EB" },
      red: { primary: "8B1A1A", dark: "3A0A0A", light: "FBEAEA", accent: "DC2626" },
      green: { primary: "14532D", dark: "0A2A16", light: "E7F5EC", accent: "16A34A" },
      purple: { primary: "4C1D95", dark: "24093F", light: "F1EAFB", accent: "7C3AED" },
      teal: { primary: "0F766E", dark: "042F2E", light: "E6FFFA", accent: "14B8A6" },
      charcoal: { primary: "3F3F3F", dark: "1A1A1A", light: "F1EDE5", accent: "C9A227" },
      slate: { primary: "334155", dark: "0F172A", light: "F1F5F9", accent: "F97316" },
    };

    const theme = themes[deck.colorTheme] || themes.blue;
    const WHITE = "FFFFFF";
    const DARK_TEXT = "1F2937";
    const MID_GREY = "6B7280";
    const PANEL_BORDER = "E2E8F0";

    function getIcon(text: string): string {
      const lower = text.toLowerCase();
      if (/kafka|event|stream|queue|message bus/.test(lower)) return "📨";
      if (/database|data store|storage|lakehouse|warehouse|profile store/.test(lower)) return "🗄️";
      if (/cloud|azure|aws|gcp|kubernetes|openshift|container/.test(lower)) return "☁️";
      if (/api|gateway|integration|interface/.test(lower)) return "🔌";
      if (/ai|ml|model|predict|score|genai|llm/.test(lower)) return "🤖";
      if (/security|encrypt|auth|identity|consent|privacy|access/.test(lower)) return "🔒";
      if (/monitor|observ|dashboard|metric|log/.test(lower)) return "📈";
      if (/analytics|report|insight|measurement/.test(lower)) return "📊";
      if (/journey|orchestrat|workflow|channel/.test(lower)) return "🔀";
      if (/crm|billing|bss|oss|erp|source system/.test(lower)) return "🏢";
      if (/mobile|app|web|sdk/.test(lower)) return "📱";
      return "▪️";
    }

    function addHeader(slide: any, eyebrow: string, title: string, subtitle?: string) {
      slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.08, fill: { color: theme.accent } });
      if (eyebrow) {
        slide.addText(eyebrow.toUpperCase(), {
          x: 0.5, y: 0.35, w: 8, h: 0.25, fontSize: 11, bold: true, color: theme.accent, fontFace: "Arial",
        });
      }
      const estimatedLines = title.length > 55 ? 2 : 1;
      const titleY = 0.68;
      const titleH = estimatedLines === 2 ? 0.95 : 0.55;
      slide.addText(title, {
        x: 0.5, y: titleY, w: 12.3, h: titleH, fontSize: 21, bold: true, color: theme.dark, fontFace: "Arial", fit: "shrink", valign: "top",
      });
      const subtitleY = titleY + titleH + 0.1;
      if (subtitle) {
        slide.addText(subtitle, {
          x: 0.5, y: subtitleY, w: 12.3, h: 0.3, fontSize: 11, color: MID_GREY, fontFace: "Arial", fit: "shrink",
        });
      }
    }

    function addFooter(slide: any, pageNum: number) {
      slide.addShape(pres.ShapeType.rect, { x: 0, y: 7.18, w: 13.333, h: 0.32, fill: { color: theme.dark } });
      slide.addText(deck.deckTitle, {
        x: 0.35, y: 7.20, w: 10, h: 0.28, fontSize: 8.5, color: WHITE, fontFace: "Arial", fit: "shrink",
      });
      slide.addText(String(pageNum), {
        x: 12.5, y: 7.20, w: 0.5, h: 0.28, fontSize: 9, bold: true, color: WHITE, fontFace: "Arial", align: "right",
      });
    }

    function addPanel(slide: any, x: number, y: number, w: number, h: number, fill: string, border = PANEL_BORDER) {
      slide.addShape(pres.ShapeType.roundRect, {
        x, y, w, h, rectRadius: 0.08, fill: { color: fill }, line: { color: border, width: 0.75 },
      });
    }

    function addBullets(slide: any, items: string[], x: number, y: number, w: number, h: number, size = 13, color = DARK_TEXT) {
      slide.addText(
        items.map((t) => ({ text: t, options: { bullet: { code: "2022", indent: 18 }, breakLine: true, color, fontSize: size, fontFace: "Arial" } })),
        { x, y, w, h, valign: "top", fit: "shrink" }
      );
    }

    deck.slides.forEach((slide: any, idx: number) => {
      const s = pres.addSlide();
      s.background = { color: WHITE };

      if (slide.type === "title") {
        const titleLen = (deck.deckTitle || "").length;
        const titleLines = titleLen > 80 ? 3 : titleLen > 40 ? 2 : 1;
        const layout = slide.titleLayout || "darkLeft";

        if (layout === "centered") {
          s.background = { color: theme.dark };
          const titleFontSize = titleLines === 3 ? 28 : titleLines === 2 ? 32 : 36;
          const titleH = titleLines * 0.6;
          const titleY = 2.9;

          s.addShape(pres.ShapeType.rect, { x: 5.167, y: titleY - 0.25, w: 3.0, h: 0.04, fill: { color: theme.accent } });

          s.addText(deck.deckTitle, {
            x: 0.8, y: titleY, w: 11.733, h: titleH, fontSize: titleFontSize, bold: true, color: WHITE,
            align: "center", fontFace: "Arial", fit: "shrink", valign: "top",
          });

          const subtitleY = titleY + titleH + 0.25;
          if (slide.subtitle) {
            s.addText(slide.subtitle, {
              x: 1.5, y: subtitleY, w: 10.333, h: 0.5, fontSize: 13, color: "C7D2E0",
              align: "center", fontFace: "Arial", fit: "shrink",
            });
          }
          return;
        }

        if (layout === "splitPanel") {
          s.background = { color: WHITE };
          const panelW = 4.0;

          s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: panelW, h: 7.5, fill: { color: theme.primary } });
          s.addShape(pres.ShapeType.rect, { x: panelW, y: 0, w: 0.06, h: 7.5, fill: { color: theme.accent } });

          const titleFontSize = titleLines === 3 ? 26 : titleLines === 2 ? 30 : 34;
          const titleH = titleLines * 0.58;
          const titleY = 3.0;

          s.addText(deck.deckTitle, {
            x: panelW + 0.6, y: titleY, w: 13.333 - panelW - 1.1, h: titleH, fontSize: titleFontSize, bold: true,
            color: theme.dark, align: "left", fontFace: "Arial", fit: "shrink", valign: "top",
          });

          const subtitleY = titleY + titleH + 0.2;
          if (slide.subtitle) {
            s.addText(slide.subtitle, {
              x: panelW + 0.6, y: subtitleY, w: 13.333 - panelW - 1.1, h: 0.5, fontSize: 13, color: MID_GREY,
              fontFace: "Arial", fit: "shrink",
            });
          }
          return;
        }

        // default: darkLeft
        s.background = { color: theme.dark };
        const titleFontSize = titleLines === 3 ? 30 : titleLines === 2 ? 34 : 38;
        const titleH = titleLines * 0.62;
        const titleY = 2.6;
        const titleAlign = slide.titleAlign === "center" ? "center" : "left";

        s.addText(deck.deckTitle, {
          x: 0.8, y: titleY, w: 11.7, h: titleH, fontSize: titleFontSize, bold: true, color: WHITE, align: titleAlign, fontFace: "Arial", fit: "shrink", valign: "top",
        });

        const subtitleY = titleY + titleH + 0.15;
        const accentY = slide.subtitle ? subtitleY + 0.55 : titleY + titleH + 0.2;

        s.addShape(pres.ShapeType.rect, { x: 0, y: accentY, w: 13.333, h: 0.06, fill: { color: theme.accent } });

        if (slide.subtitle) {
          s.addText(slide.subtitle, {
            x: 0.8, y: subtitleY, w: 11.7, h: 0.5, fontSize: 14, color: "C7D2E0", fontFace: "Arial", fit: "shrink", align: titleAlign,
          });
        }
        return;
      }

      addHeader(s, slide.eyebrow || "", slide.title || "", slide.subtitle);
      addFooter(s, idx + 1);

      let rendered = false;

      if (slide.type === "flow" && slide.flowStages && slide.flowStages.length > 0) {
        rendered = true;
        const stages = slide.flowStages;
        const startX = 0.5;
        const cardW = (12.3 - (stages.length - 1) * 0.35) / stages.length;
        stages.forEach((stage: any, i: number) => {
          const x = startX + i * (cardW + 0.35);
          addPanel(s, x, 2.15, cardW, 1.9, i % 2 === 0 ? theme.light : WHITE);
          s.addShape(pres.ShapeType.ellipse, { x: x + 0.2, y: 2.35, w: 0.4, h: 0.4, fill: { color: theme.accent } });
          s.addText(String(i + 1), { x: x + 0.2, y: 2.35, w: 0.4, h: 0.4, fontSize: 13, bold: true, color: WHITE, align: "center", valign: "middle", fontFace: "Arial" });
          s.addText(stage.title || "", { x: x + 0.15, y: 2.9, w: cardW - 0.3, h: 0.35, fontSize: 14, bold: true, color: theme.dark, fontFace: "Arial", fit: "shrink" });
          s.addText(stage.detail || "", { x: x + 0.15, y: 3.3, w: cardW - 0.3, h: 0.65, fontSize: 10, color: MID_GREY, fontFace: "Arial", fit: "shrink" });
          if (i < stages.length - 1) {
            s.addText("›", { x: x + cardW, y: 2.7, w: 0.35, h: 0.5, fontSize: 24, bold: true, color: theme.accent, align: "center", fontFace: "Arial" });
          }
        });
      }

      else if (slide.type === "layeredStack" && slide.layers && slide.layers.length > 0) {
        rendered = true;
        const layers = slide.layers.map((l: any) => ({
          heading: l.heading || "",
          items: (l.items || []).slice(0, 4),
        }));

        const availableH = 4.75;
        const gap = 0.14;
        const minLayerH = 0.55;
        const headingH = 0.28;
        const lineH = 0.19;

        const rawHeights = layers.map((l: any) => {
          const itemLines = Math.max(1, Math.ceil(l.items.length / 2));
          return Math.max(minLayerH, headingH + itemLines * lineH + 0.14);
        });

        const totalRaw = rawHeights.reduce((a: number, b: number) => a + b, 0) + gap * (layers.length - 1);
        const scale = totalRaw > availableH ? availableH / totalRaw : 1;
        const fontScale = scale < 1 ? Math.max(0.75, scale) : 1;

        let y = 2.15;
        layers.forEach((layer: any, i: number) => {
          const layerH = rawHeights[i] * scale;

          addPanel(s, 0.5, y, 12.3, layerH, i % 2 === 0 ? theme.light : WHITE);
          s.addText(layer.heading, {
            x: 0.75, y: y + 0.06, w: 11.8, h: headingH,
            fontSize: 12.5 * fontScale, bold: true, color: theme.dark, fontFace: "Arial", fit: "shrink",
          });

          const itemsWithIcons = layer.items.map((item: string) => `${getIcon(item)} ${item}`).join("     ");
          s.addText(itemsWithIcons, {
            x: 0.75, y: y + headingH + 0.08, w: 11.8, h: layerH - headingH - 0.14,
            fontSize: 9.5 * fontScale, color: MID_GREY, fontFace: "Arial", valign: "top", fit: "shrink",
          });

          const gapScaled = gap * scale;
          if (i < layers.length - 1 && gapScaled > 0.06) {
            s.addText("▼", {
              x: 6.15, y: y + layerH + gapScaled / 2 - 0.08, w: 1.0, h: 0.18,
              fontSize: 12, color: theme.accent, align: "center", fontFace: "Arial",
            });
          }

          y += layerH + gapScaled;
        });
      }

      else if (slide.type === "hubAndSpoke" && slide.hub && slide.spokes && slide.spokes.length > 0) {
        rendered = true;
        const spokes = slide.spokes.slice(0, 6).map((sp: any) => ({
          heading: sp.heading || "",
          items: (sp.items || []).slice(0, 3),
        }));

        const areaX = 0.5, areaY = 2.15, areaW = 12.3, areaH = 4.75;
        const cx = areaX + areaW / 2;
        const cy = areaY + areaH / 2;

        const hubW = 3.0, hubH = 1.15;
        const spokeW = 2.7, spokeH = 1.15;

        const rx = (areaW - hubW) / 2 - 0.35;
        const ry = (areaH - hubH) / 2 - 0.25;

        const n = spokes.length;

        spokes.forEach((_: any, i: number) => {
          const angle = (2 * Math.PI * i) / n - Math.PI / 2;
          const sx = cx + rx * Math.cos(angle);
          const sy = cy + ry * Math.sin(angle);
          s.addShape(pres.ShapeType.line, {
            x: Math.min(cx, sx),
            y: Math.min(cy, sy),
            w: Math.abs(sx - cx) || 0.01,
            h: Math.abs(sy - cy) || 0.01,
            line: { color: theme.accent, width: 1.5 },
            flipV: sy < cy,
            flipH: sx < cx,
          });
        });

        addPanel(s, cx - hubW / 2, cy - hubH / 2, hubW, hubH, theme.dark, theme.dark);
        s.addText(slide.hub.heading || "", {
          x: cx - hubW / 2 + 0.1, y: cy - hubH / 2 + 0.08, w: hubW - 0.2, h: 0.35,
          fontSize: 13, bold: true, color: WHITE, fontFace: "Arial", fit: "shrink", align: "center",
        });
        const hubItems = (slide.hub.items || []).slice(0, 3).map((it: string) => `${getIcon(it)} ${it}`).join("   ");
        s.addText(hubItems, {
          x: cx - hubW / 2 + 0.1, y: cy - hubH / 2 + 0.45, w: hubW - 0.2, h: hubH - 0.5,
          fontSize: 8.5, color: "D9E2F1", fontFace: "Arial", valign: "top", align: "center", fit: "shrink",
        });

        spokes.forEach((sp: any, i: number) => {
          const angle = (2 * Math.PI * i) / n - Math.PI / 2;
          const bx = cx + rx * Math.cos(angle) - spokeW / 2;
          const by = cy + ry * Math.sin(angle) - spokeH / 2;

          addPanel(s, bx, by, spokeW, spokeH, i % 2 === 0 ? theme.light : WHITE);
          s.addText(sp.heading, {
            x: bx + 0.1, y: by + 0.06, w: spokeW - 0.2, h: 0.3,
            fontSize: 11, bold: true, color: theme.dark, fontFace: "Arial", fit: "shrink",
          });
          const spokeItems = sp.items.map((it: string) => `${getIcon(it)} ${it}`).join("  ");
          s.addText(spokeItems, {
            x: bx + 0.1, y: by + 0.4, w: spokeW - 0.2, h: spokeH - 0.45,
            fontSize: 8, color: MID_GREY, fontFace: "Arial", valign: "top", fit: "shrink",
          });
        });
      }

      else if (slide.type === "peerToPeer" && slide.nodes && slide.nodes.length > 0) {
        rendered = true;
        const nodes = slide.nodes.slice(0, 6).map((n: any) => ({
          heading: n.heading || "",
          items: (n.items || []).slice(0, 3),
        }));

        const areaX = 0.5, areaY = 2.15, areaW = 12.3, areaH = 4.75;
        const cx = areaX + areaW / 2;
        const cy = areaY + areaH / 2;

        const nodeW = 2.9, nodeH = 1.15;
        const rx = (areaW - nodeW) / 2 - 0.2;
        const ry = (areaH - nodeH) / 2 - 0.15;

        const n = nodes.length;
        const positions = nodes.map((_: any, i: number) => {
          const angle = (2 * Math.PI * i) / n - Math.PI / 2;
          return { x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) };
        });

        positions.forEach((pos: any, i: number) => {
          const next = positions[(i + 1) % n];
          s.addShape(pres.ShapeType.line, {
            x: Math.min(pos.x, next.x),
            y: Math.min(pos.y, next.y),
            w: Math.abs(next.x - pos.x) || 0.01,
            h: Math.abs(next.y - pos.y) || 0.01,
            line: { color: theme.accent, width: 1.25 },
            flipV: next.y < pos.y,
            flipH: next.x < pos.x,
          });
        });

        nodes.forEach((node: any, i: number) => {
          const pos = positions[i];
          const bx = pos.x - nodeW / 2;
          const by = pos.y - nodeH / 2;
          addPanel(s, bx, by, nodeW, nodeH, i % 2 === 0 ? theme.light : WHITE);
          s.addText(node.heading, {
            x: bx + 0.1, y: by + 0.06, w: nodeW - 0.2, h: 0.3,
            fontSize: 11, bold: true, color: theme.dark, fontFace: "Arial", fit: "shrink",
          });
          const nodeItems = node.items.map((it: string) => `${getIcon(it)} ${it}`).join("  ");
          s.addText(nodeItems, {
            x: bx + 0.1, y: by + 0.4, w: nodeW - 0.2, h: nodeH - 0.45,
            fontSize: 8, color: MID_GREY, fontFace: "Arial", valign: "top", fit: "shrink",
          });
        });
      }

      else if (slide.type === "mesh" && slide.nodes && slide.nodes.length > 0) {
        rendered = true;
        const nodes = slide.nodes.slice(0, 5).map((n: any) => ({
          heading: n.heading || "",
          items: (n.items || []).slice(0, 2),
        }));

        const areaX = 0.5, areaY = 2.15, areaW = 12.3, areaH = 4.75;
        const cx = areaX + areaW / 2;
        const cy = areaY + areaH / 2;

        const nodeW = 2.6, nodeH = 1.05;
        const rx = (areaW - nodeW) / 2 - 0.2;
        const ry = (areaH - nodeH) / 2 - 0.15;

        const n = nodes.length;
        const positions = nodes.map((_: any, i: number) => {
          const angle = (2 * Math.PI * i) / n - Math.PI / 2;
          return { x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) };
        });

        for (let i = 0; i < n; i++) {
          for (let j = i + 1; j < n; j++) {
            const a = positions[i], b = positions[j];
            s.addShape(pres.ShapeType.line, {
              x: Math.min(a.x, b.x),
              y: Math.min(a.y, b.y),
              w: Math.abs(b.x - a.x) || 0.01,
              h: Math.abs(b.y - a.y) || 0.01,
              line: { color: theme.accent, width: 0.75, transparency: 40 },
              flipV: b.y < a.y,
              flipH: b.x < a.x,
            });
          }
        }

        nodes.forEach((node: any, i: number) => {
          const pos = positions[i];
          const bx = pos.x - nodeW / 2;
          const by = pos.y - nodeH / 2;
          addPanel(s, bx, by, nodeW, nodeH, theme.dark, theme.dark);
          s.addText(node.heading, {
            x: bx + 0.1, y: by + 0.06, w: nodeW - 0.2, h: 0.3,
            fontSize: 10.5, bold: true, color: WHITE, fontFace: "Arial", fit: "shrink", align: "center",
          });
          const nodeItems = node.items.map((it: string) => `${getIcon(it)} ${it}`).join(" ");
          s.addText(nodeItems, {
            x: bx + 0.1, y: by + 0.38, w: nodeW - 0.2, h: nodeH - 0.4,
            fontSize: 7.5, color: "D9E2F1", fontFace: "Arial", valign: "top", fit: "shrink", align: "center",
          });
        });
      }

      else if (slide.type === "verticalFlow" && slide.flowSteps && slide.flowSteps.length > 0) {
        rendered = true;
        const steps = slide.flowSteps.slice(0, 7);
        const boxW = 8.5;
        const x = (13.333 - boxW) / 2;
        const areaY = 2.15, areaH = 4.75;
        const gap = 0.12;

        const estLines = steps.map((st: any) => {
          const detailLen = (st.detail || "").length;
          return detailLen > 70 ? 3 : detailLen > 40 ? 2 : 1;
        });
        const rawHeights = estLines.map((lines: number) => 0.35 + lines * 0.19 + 0.1);
        const totalRaw = rawHeights.reduce((a: number, b: number) => a + b, 0) + gap * (steps.length - 1);
        const scale = totalRaw > areaH ? areaH / totalRaw : 1;
        const fontScale = scale < 1 ? Math.max(0.75, scale) : 1;

        let y = areaY;
        steps.forEach((step: any, i: number) => {
          const boxH = rawHeights[i] * scale;
          const isEnd = i === 0 || i === steps.length - 1;

          addPanel(s, x, y, boxW, boxH, isEnd ? theme.primary : theme.light, theme.primary);
          s.addText(`${getIcon(step.label || "")}  ${step.label || ""}`, {
            x: x + 0.2, y: y + 0.05, w: boxW - 0.4, h: 0.3 * fontScale,
            fontSize: 12 * fontScale, bold: true, color: isEnd ? WHITE : theme.dark, fontFace: "Arial", valign: "top", fit: "shrink",
          });
          if (step.detail) {
            s.addText(step.detail, {
              x: x + 0.2, y: y + 0.35 * fontScale, w: boxW - 0.4, h: boxH - 0.4 * fontScale,
              fontSize: 9 * fontScale, color: isEnd ? "D9E2F1" : MID_GREY, fontFace: "Arial", valign: "top", fit: "shrink",
            });
          }

          const gapScaled = gap * scale;
          if (i < steps.length - 1 && gapScaled > 0.05) {
            s.addText("▼", {
              x: x + boxW / 2 - 0.3, y: y + boxH + gapScaled / 2 - 0.08, w: 0.6, h: 0.18,
              fontSize: 12, bold: true, color: theme.accent, align: "center", fontFace: "Arial",
            });
          }
          y += boxH + gapScaled;
        });
      }

      else if (slide.type === "timeline" && slide.phases && slide.phases.length > 0) {
        rendered = true;
        const phases = slide.phases;
        const gap = 0.3;
        const cardW = (12.3 - gap * (phases.length - 1)) / phases.length;
        let x = 0.5;
        phases.forEach((phase: any) => {
          addPanel(s, x, 2.15, cardW, 4.6, WHITE);
          s.addShape(pres.ShapeType.rect, { x, y: 2.15, w: cardW, h: 0.08, fill: { color: theme.accent } });
          s.addText(phase.name || "", { x: x + 0.15, y: 2.35, w: cardW - 0.3, h: 0.35, fontSize: 13, bold: true, color: theme.dark, fontFace: "Arial", fit: "shrink" });
          if (phase.duration) {
            s.addText(phase.duration, { x: x + 0.15, y: 2.7, w: cardW - 0.3, h: 0.25, fontSize: 9.5, bold: true, color: theme.accent, fontFace: "Arial" });
          }
          if (phase.items) {
            addBullets(s, phase.items, x + 0.15, 3.05, cardW - 0.3, 3.5, 9.5);
          }
          x += cardW + gap;
        });
      }

      else if (slide.type === "principles" && slide.principles && slide.principles.length > 0) {
        rendered = true;
        const principles = slide.principles.slice(0, 6);
        addPanel(s, 0.5, 2.15, 12.3, 4.75, theme.dark, theme.dark);
        s.addText(slide.principlesHeading || "Key Principles", { x: 0.85, y: 2.35, w: 11.6, h: 0.35, fontSize: 15, bold: true, color: WHITE, fontFace: "Arial", fit: "shrink" });

        const startY = 2.83;
        const endY = 6.75;
        const rowH = (endY - startY) / principles.length;

        principles.forEach((p: any, i: number) => {
          const y = startY + i * rowH;
          const badgeSize = Math.min(0.32, rowH - 0.15);
          s.addShape(pres.ShapeType.ellipse, { x: 0.85, y, w: badgeSize, h: badgeSize, fill: { color: theme.accent } });
          s.addText(String(i + 1), { x: 0.85, y, w: badgeSize, h: badgeSize, fontSize: 10, bold: true, color: WHITE, align: "center", valign: "middle", fontFace: "Arial" });
          s.addText(p.heading || "", { x: 1.35, y: y - 0.02, w: 3.4, h: rowH - 0.05, fontSize: 11.5, bold: true, color: WHITE, fontFace: "Arial", fit: "shrink", valign: "top" });
          s.addText(p.description || "", { x: 4.9, y: y - 0.02, w: 7.7, h: rowH - 0.05, fontSize: 10.5, color: "D9E2F1", fontFace: "Arial", fit: "shrink", valign: "top" });
        });
      }

      else if (slide.type === "comparison" && slide.tableData && slide.tableData.headers) {
        rendered = true;

        const headers = slide.tableData.headers;
        const dataRows = slide.tableData.rows.slice(0, 7);

        function truncateCell(text: string, max: number) {
          if (!text) return "";
          return text.length > max ? text.slice(0, max - 1).trim() + "…" : text;
        }

        const avgCellLen =
          dataRows.reduce(
            (sum: number, row: string[]) => sum + row.reduce((s: number, c: string) => s + (c || "").length, 0),
            0
          ) / Math.max(1, dataRows.length * headers.length);

        let bodyFontSize = 10.5;
        let headerFontSize = 11;
        if (dataRows.length > 5 || avgCellLen > 60) {
          bodyFontSize = 9;
          headerFontSize = 9.5;
        }
        if (dataRows.length > 7 || avgCellLen > 100) {
          bodyFontSize = 8;
          headerFontSize = 8.5;
        }

        const rows = [
          headers.map((h: string) => ({
            text: truncateCell(h, 60),
            options: { bold: true, color: WHITE, fill: { color: theme.primary }, fontFace: "Arial", fontSize: headerFontSize },
          })),
          ...dataRows.map((row: string[]) =>
            row.map((cell) => ({
              text: truncateCell(cell, 150),
              options: { color: DARK_TEXT, fontFace: "Arial", fontSize: bodyFontSize },
            }))
          ),
        ];

        s.addTable(rows, {
          x: 0.5, y: 2.15, w: 12.3, h: 4.75,
          autoPage: false,
          valign: "top",
          border: { type: "solid", color: PANEL_BORDER, pt: 0.75 },
        });
      }

      else if (
        (slide.type === "twoColumn" || slide.type === "section") &&
        ((slide.leftBullets && slide.leftBullets.length > 0) || (slide.rightBullets && slide.rightBullets.length > 0))
      ) {
        rendered = true;
        addPanel(s, 0.5, 2.15, 5.95, 4.75, theme.light);
        s.addText(slide.leftHeading || "", { x: 0.75, y: 2.35, w: 5.5, h: 0.35, fontSize: 14, bold: true, color: theme.dark, fontFace: "Arial", fit: "shrink" });
        addBullets(s, slide.leftBullets || [], 0.75, 2.8, 5.5, 3.9, 12);

        addPanel(s, 6.85, 2.15, 5.95, 4.75, WHITE);
        s.addText(slide.rightHeading || "", { x: 7.1, y: 2.35, w: 5.5, h: 0.35, fontSize: 14, bold: true, color: theme.dark, fontFace: "Arial", fit: "shrink" });
        addBullets(s, slide.rightBullets || [], 7.1, 2.8, 5.5, 3.9, 12);
      }

      if (!rendered && slide.bullets && slide.bullets.length > 0) {
        rendered = true;
        addPanel(s, 0.5, 2.15, 12.3, 4.75, theme.light);
        addBullets(s, slide.bullets, 0.85, 2.45, 11.6, 4.3, 13.5);
      }

      if (!rendered) {
        addPanel(s, 0.5, 2.15, 12.3, 4.75, theme.light);
        s.addText(
          "Content for this slide is being finalized. Please ask to regenerate this specific slide for full detail.",
          { x: 0.85, y: 3.9, w: 11.6, h: 1.0, fontSize: 13, italic: true, color: MID_GREY, align: "center", fontFace: "Arial" }
        );
      }

      if (slide.notes) {
        s.addNotes(slide.notes);
      }
    });

    await pres.writeFile({ fileName: `${deck.deckTitle || "presentation"}.pptx` });
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
    sessionStorage.removeItem("intellichat-current-messages");
    sessionStorage.removeItem("intellichat-current-active-id");
    sessionStorage.removeItem("intellichat-current-document-text");
    sessionStorage.removeItem("intellichat-current-filenames");
    sessionStorage.removeItem("intellichat-current-images");
    setPrompt("");
    setUploadedFileNames([]);
    setDocumentText("");
    setUploadedImages([]);
    setUploadedFiles([]);
    setCurrentDecks([]);
    setShowLatestDeckCard(false);
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

        {sidebarOpen && currentDecks.length > 0 && (
          <div className="p-4 border-t border-slate-800 text-xs text-slate-300">
            <button
              onClick={() => setDecksListOpen(!decksListOpen)}
              className="w-full flex items-center justify-between text-slate-500 uppercase text-[10px] mb-2 hover:text-slate-300 transition"
            >
              <span>Decks in this conversation ({currentDecks.length})</span>
              <span>{decksListOpen ? "▲" : "▼"}</span>
            </button>

            {decksListOpen && (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {currentDecks.map((record) => (
                  <div key={record.id} className="bg-slate-800 rounded-lg p-2 space-y-1">
                    <p className="font-medium truncate text-[11px]">{record.deck.deckTitle}</p>
                    <button
                      onClick={() => downloadSlideDeck(record)}
                      className="w-full bg-blue-600 hover:bg-blue-700 rounded-md py-1.5 text-[11px] font-medium transition"
                    >
                      Download PPTX
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
    Built for Professionals and Students
  </p>

<p className="text-slate-500 text-xs mt-1">
    **This SLM does not generate image or video - it is not built for that
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
      : "bg-blue-600 pt-10 whitespace-pre-wrap"
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

  {msg.role === "user" && (

    <button
      onClick={() => copyResponse(msg.content, index)}
      className="absolute top-3 right-3 text-blue-200 hover:text-white transition"
      title="Copy message"
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

              {loading && !(messages[messages.length - 1]?.role === "assistant" && messages[messages.length - 1]?.streaming) && (

              <div className="flex gap-4">

                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                  <Bot size={20} />
                </div>

                <div className="bg-slate-800 rounded-2xl px-5 py-4 space-y-1.5 min-w-[240px]">
                  {chatSteps.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm">
                      <div className="animate-spin h-3.5 w-3.5 border-2 border-slate-500 border-t-white rounded-full" />
                      <span>Thinking...</span>
                    </div>
                  ) : (
                    chatSteps.map((step, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        {step.done ? (
                          <Check size={14} className="text-green-400 flex-shrink-0" />
                        ) : (
                          <div className="animate-spin h-3.5 w-3.5 border-2 border-slate-500 border-t-white rounded-full flex-shrink-0" />
                        )}
                        <span className={step.done ? "text-slate-400" : "text-white"}>{step.text}</span>
                      </div>
                    ))
                  )}
                </div>

              </div>

            )}

            {generatingSlides && (

              <div className="flex gap-4">

                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                  <Bot size={20} />
                </div>

                <div className="bg-slate-800 rounded-2xl px-5 py-4 space-y-1.5 min-w-[260px]">
                  {slideStepsList.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm">
                      <div className="animate-spin h-3.5 w-3.5 border-2 border-slate-500 border-t-white rounded-full" />
                      <span>Working on your slides...</span>
                    </div>
                  ) : (
                    slideStepsList.map((step, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        {step.done ? (
                          <Check size={14} className="text-green-400 flex-shrink-0" />
                        ) : (
                          <div className="animate-spin h-3.5 w-3.5 border-2 border-slate-500 border-t-white rounded-full flex-shrink-0" />
                        )}
                        <span className={step.done ? "text-slate-400" : "text-white"}>{step.text}</span>
                      </div>
                    ))
                  )}
                </div>

              </div>

            )}

            <div ref={messagesEndRef} />

                      </div>
        </div>

        {/* Bottom Input */}

        <div className="border-t border-slate-800 bg-slate-900 p-6">

          <div className="max-w-4xl mx-auto">

            
            {showLatestDeckCard && currentDecks.length > 0 && (
              <div className="mb-4 bg-slate-800 border border-slate-700 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-lg">{currentDecks[currentDecks.length - 1].deck.deckTitle}</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => downloadSlideDeck(currentDecks[currentDecks.length - 1])}
                      className="bg-blue-600 hover:bg-blue-700 rounded-xl px-4 py-2 text-sm font-medium transition"
                    >
                      Download PPTX
                    </button>
                    <button
                      onClick={() => setShowLatestDeckCard(false)}
                      className="text-slate-400 hover:text-white transition p-2"
                      title="Close"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <ol className="text-sm text-slate-300 list-decimal pl-5 space-y-1">
                  {currentDecks[currentDecks.length - 1].deck.slides.map((s: any, i: number) => (
                    <li key={i}>{s.title || s.deckTitle} <span className="text-slate-500 text-xs">({s.type})</span></li>
                  ))}
                </ol>
                {currentDecks[currentDecks.length - 1].sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-700 text-xs text-slate-500">
                    Sources: {currentDecks[currentDecks.length - 1].sources.map((s) => s.title).join(", ")}
                  </div>
                )}
                {currentDecks.length > 1 && (
                  <p className="mt-2 text-xs text-slate-500">
                    You have {currentDecks.length} decks in this conversation — see the sidebar for all of them.
                  </p>
                )}
              </div>
            )}

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

            const meaningfulText = text.replace(/\s/g, "");

            if (meaningfulText.length < 20) {
              console.log("PDF appears to have no real text layer — rendering pages as images instead.");

              const maxPagesToRender = Math.min(pdf.numPages, 5);

              for (let i = 1; i <= maxPagesToRender; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 1.5 });

                const canvas = document.createElement("canvas");
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext("2d");

                if (ctx) {
                  await page.render({ canvasContext: ctx, viewport } as any).promise;
                  const dataUrl = canvas.toDataURL("image/png");
                  setUploadedImages((prev) => [...prev, dataUrl]);
                }
              }

              setDocumentText(
                (prev) =>
                  prev +
                  `\n\n--- ${file.name} ---\n\n(This PDF has no extractable text layer — its pages were converted to images and attached for visual reading instead.)`
              );
            } else {
              setDocumentText((prev) => prev + `\n\n--- ${file.name} ---\n\n` + text);
            }
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
                onPaste={handlePaste}
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
                disabled={loading || generatingSlides}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 rounded-xl p-3 transition"
              >
                <Send size={20} />
              </button>

            </div>

            <div className="flex items-start justify-between mt-3">
              <button
                onClick={handleManualSave}
                className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1 mt-1"
              >
                {conversationSaved ? (
                  <>
                    <Check size={12} />
                    Saved!
                  </>
                ) : (
                  "💾 Save Conversation"
                )}
              </button>

              <div className="flex items-start gap-3">
                <select
                  value={responseMode}
                  onChange={(e) => setResponseMode(e.target.value as "smart" | "deep")}
                  className="text-xs bg-slate-800 text-slate-300 border border-slate-700 rounded-lg px-2 py-1 outline-none hover:border-slate-600 transition cursor-pointer"
                >
                  <option value="smart">💬 Smart Conversation</option>
                  <option value="deep">🔬 Deep Research</option>
                </select>

                <div className="flex flex-col items-center gap-0.5">
                  <select
                    value={preferredTheme}
                    onChange={(e) => setPreferredTheme(e.target.value)}
                    className="text-xs bg-slate-800 text-slate-300 border border-slate-700 rounded-lg px-2 py-1 outline-none hover:border-slate-600 transition cursor-pointer"
                    title="Deck theme (used when generating or editing slides)"
                  >
                    <option value="auto">🎨 Auto Theme</option>
                    <option value="blue">🔵 Corporate Blue</option>
                    <option value="red">🔴 Bold Red</option>
                    <option value="green">🟢 Fresh Green</option>
                    <option value="purple">🟣 Modern Purple</option>
                    <option value="teal">🟦 Tech Teal</option>
                    <option value="charcoal">⚫ Executive Charcoal & Gold</option>
                    <option value="slate">🔶 Slate & Orange</option>
                  </select>
                  <span className="text-[10px] font-bold text-yellow-500">
                    Theme for the day
                  </span>
                </div>
              </div>
            </div>

<div className="flex items-center justify-between text-xs text-slate-500 mt-2">
              <span className="flex-1 text-center">
                IntelliChat can make mistakes. Verify important information.
              </span>
              <span className="ml-4 whitespace-nowrap">
                © 2026 Avishek Mukherjee. All Rights Reserved.
              </span>
            </div>

          </div>

        </div>

      </main>

    </div>
  );
}