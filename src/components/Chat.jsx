import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Send, MessageSquare, FileText, BookOpen, ChevronRight, ChevronDown,
  Lightbulb, Lock, RotateCcw, Upload, AlertCircle, Loader2, X,
  ExternalLink, Bot, User as UserIcon, BookMarked, RefreshCw,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  getChatTopics,
  getOrCreateChatSession,
  askChatQuestion,
  clearChatHistory,
  backfillDocumentChunks,
} from "../services/api";
import MathRenderer, { FormattedText } from "./MathRenderer";

// ─────────────────────────────────────────────────────────────────────────────
// Markdown & LaTeX response renderer
// ─────────────────────────────────────────────────────────────────────────────
function AIResponseRenderer({ text }) {
  if (!text) return null;
  return <MathRenderer content={text} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Source chips shown below AI answers
// ─────────────────────────────────────────────────────────────────────────────
function SourceChips({ sources }) {
  if (!sources || sources.length === 0) return null;
  // Deduplicate by document name
  const seen = new Set();
  const unique = sources.filter((s) => {
    if (seen.has(s.document_name)) return false;
    seen.add(s.document_name);
    return true;
  });
  return (
    <div className="mt-3 pt-2.5 border-t" style={{ borderColor: "var(--line)" }}>
      <div className="text-xs font-semibold mb-1.5" style={{ color: "var(--muted)" }}>
        Based on:
      </div>
      <div className="flex flex-wrap gap-1.5">
        {unique.map((src, i) => (
          <div key={i}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
            style={{ background: "var(--info-soft)", color: "var(--info)" }}>
            <FileText size={11} />
            <span className="truncate max-w-[180px]">{src.document_name}</span>
            {src.chunk_index !== undefined && (
              <span className="opacity-60">· §{src.chunk_index + 1}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Topic selector panel
// ─────────────────────────────────────────────────────────────────────────────
function TopicSelector({ documents, selectedTopicId, onSelect, onClose }) {
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    // Auto-expand doc that contains the selected topic
    if (selectedTopicId) {
      const doc = documents.find((d) => d.topics.some((t) => t.id === selectedTopicId));
      if (doc) setExpanded((prev) => ({ ...prev, [doc.document_id]: true }));
    } else if (documents.length === 1) {
      setExpanded({ [documents[0].document_id]: true });
    }
  }, [selectedTopicId, documents]);

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <Upload size={28} style={{ color: "var(--muted)" }} className="mb-3" />
        <div className="text-sm font-medium mb-1">No documents yet</div>
        <div className="text-xs" style={{ color: "var(--muted)" }}>
          Upload study material to start asking grounded questions.
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto sa-scroll flex-1">
      {documents.map((doc) => (
        <div key={doc.document_id} className="mb-1">
          <button
            type="button"
            aria-expanded={Boolean(expanded[doc.document_id])}
            onClick={() => setExpanded((prev) => ({ ...prev, [doc.document_id]: !prev[doc.document_id] }))}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm font-medium transition-all hover:opacity-80"
            style={{ color: "var(--text)" }}
          >
            {expanded[doc.document_id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <FileText size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />
            <span className="truncate text-xs">{doc.document_name}</span>
          </button>

          {expanded[doc.document_id] && (
            <div className="ml-6 space-y-0.5 mb-1">
              {doc.topics.length === 0 && (
                <div className="text-xs px-3 py-1.5" style={{ color: "var(--muted)" }}>
                  No topics detected yet
                </div>
              )}
              {doc.topics.map((topic) => {
                const isActive = topic.id === selectedTopicId;
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => { onSelect(topic, doc); onClose?.(); }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs font-medium transition-all"
                    style={{
                      background: isActive ? "var(--accent-soft)" : "transparent",
                      color: isActive ? "var(--accent-ink)" : "var(--text)",
                    }}
                  >
                    <BookOpen size={12} className="flex-shrink-0" />
                    <span className="truncate">{topic.name}</span>
                    {isActive && <Lock size={10} className="ml-auto flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Typing indicator
// ─────────────────────────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-2 rounded-2xl px-4 py-3 max-w-xs"
        style={{ background: "var(--surface-subtle)", borderBottomLeftRadius: 4 }}>
        <Bot size={14} style={{ color: "var(--accent)" }} />
        <div className="flex gap-1.5 items-center">
          {[0, 1, 2].map((i) => (
            <span key={i} className="w-1.5 h-1.5 rounded-full inline-block"
              style={{
                background: "var(--muted)",
                animation: `saFadeIn 1s ${i * 0.2}s infinite alternate`,
              }} />
          ))}
          <span className="text-xs ml-1" style={{ color: "var(--muted)" }}>Searching documents...</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Chat Page
// ─────────────────────────────────────────────────────────────────────────────
function ChatPage({ initialTopicId, initialTopicName, initialDocumentName }) {
  const { accessToken } = useAuth();

  // Data state
  const [documents, setDocuments] = useState([]);
  const [loadingTopics, setLoadingTopics] = useState(true);

  // Selected topic/session state
  const [selectedTopic, setSelectedTopic] = useState(null);   // { id, name }
  const [selectedDoc, setSelectedDoc] = useState(null);       // { document_id, document_name }
  const [session, setSession] = useState(null);               // { id, ... }
  const [messages, setMessages] = useState([]);
  const [loadingSession, setLoadingSession] = useState(false);

  // Chat state
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState(null);

  // Mobile sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // ── Load topics on mount ──────────────────────────────────────────────────
  useEffect(() => {
    async function loadTopics() {
      if (!accessToken) return;
      setLoadingTopics(true);
      try {
        const res = await getChatTopics(accessToken);
        setDocuments(res.documents || []);
      } catch (err) {
        setError("Could not load your study materials: " + (err.message || "Unknown error"));
      } finally {
        setLoadingTopics(false);
      }
    }
    loadTopics();
  }, [accessToken]);

  // ── Auto-select topic if passed as prop ───────────────────────────────────
  useEffect(() => {
    if (initialTopicId && documents.length > 0 && !selectedTopic) {
      const doc = documents.find((d) => d.topics.some((t) => t.id === initialTopicId));
      const topic = doc?.topics.find((t) => t.id === initialTopicId);
      if (topic && doc) {
        handleTopicSelect(topic, doc);
      }
    }
  }, [initialTopicId, documents]);

  // ── Scroll to bottom on new messages ──────────────────────────────────────
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  // ── Select a topic → load/create session ──────────────────────────────────
  const handleTopicSelect = useCallback(async (topic, doc) => {
    if (!accessToken) return;
    setSelectedTopic(topic);
    setSelectedDoc(doc);
    setMessages([]);
    setError(null);
    setLoadingSession(true);

    try {
      // Trigger backfill for existing documents (no-op if chunks exist)
      try {
        await backfillDocumentChunks(doc.document_id, accessToken);
      } catch (_) { /* silent — backfill is best-effort */ }

      const res = await getOrCreateChatSession(topic.id, accessToken);
      setSession(res.session);
      setMessages(res.messages || []);
    } catch (err) {
      setError("Could not open chat session: " + (err.message || "Unknown error"));
    } finally {
      setLoadingSession(false);
    }
  }, [accessToken]);

  // ── Send a question ───────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    const question = (text ?? input).trim();
    if (!question || !session || thinking) return;

    setInput("");
    setThinking(true);
    setError(null);

    // Optimistically add user message
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [...prev, { id: tempId, role: "user", content: question, sources: null }]);

    try {
      const res = await askChatQuestion(session.id, question, accessToken);
      setMessages((prev) => [
        ...prev,
        {
          id: `asst-${Date.now()}`,
          role: "assistant",
          content: res.answer,
          sources: res.sources || [],
        },
      ]);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setError(err.message || "Failed to get an answer. Please try again.");
    } finally {
      setThinking(false);
      inputRef.current?.focus();
    }
  }, [input, session, thinking, accessToken]);

  // ── Clear chat history ────────────────────────────────────────────────────
  const handleClearHistory = useCallback(async () => {
    if (!session || !window.confirm("Clear this chat history?")) return;
    try {
      await clearChatHistory(session.id, accessToken);
      setMessages([]);
    } catch (err) {
      setError("Could not clear history: " + err.message);
    }
  }, [session, accessToken]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  const quickPrompts = [
    "Explain this topic from the beginning",
    "What are the key formulas I should remember?",
    "Give me an example",
    "What should I know for the exam?",
    "Make this simpler",
  ];

  return (
    <div className="sa-fade-in h-full flex gap-3 md:gap-4 min-h-0 p-2 sm:p-4 md:p-6 pb-[calc(3.75rem+env(safe-area-inset-bottom,0px))] md:pb-6 overflow-hidden">

      {/* ── Left panel: topic selector (desktop) ─── */}
      <div className="hidden lg:flex flex-col sa-card w-64 flex-shrink-0 overflow-hidden">
        <div className="p-4 border-b" style={{ borderColor: "var(--line)" }}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--muted)" }}>
            Study Topics
          </div>
          <div className="text-xs" style={{ color: "var(--muted)" }}>
            Select a topic to start an AI chat grounded in your uploaded documents.
          </div>
        </div>

        {loadingTopics ? (
          <div className="flex items-center justify-center flex-1 gap-2">
            <Loader2 size={16} className="animate-spin" style={{ color: "var(--muted)" }} />
            <span className="text-xs" style={{ color: "var(--muted)" }}>Loading...</span>
          </div>
        ) : (
          <TopicSelector
            documents={documents}
            selectedTopicId={selectedTopic?.id}
            onSelect={handleTopicSelect}
          />
        )}
      </div>

      {/* ── Mobile sidebar overlay ────────────────── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 sa-card rounded-none border-r flex flex-col overflow-hidden z-50 pb-[calc(3.75rem+env(safe-area-inset-bottom,0px))] md:pb-0"
            style={{ borderColor: "var(--line)" }}>
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--line)" }}>
              <span className="text-sm font-semibold">Select Topic</span>
              <button onClick={() => setSidebarOpen(false)} className="p-1 rounded hover:opacity-70">
                <X size={16} />
              </button>
            </div>
            {loadingTopics ? (
              <div className="flex items-center justify-center flex-1 gap-2">
                <Loader2 size={16} className="animate-spin" style={{ color: "var(--muted)" }} />
              </div>
            ) : (
              <TopicSelector
                documents={documents}
                selectedTopicId={selectedTopic?.id}
                onSelect={handleTopicSelect}
                onClose={() => setSidebarOpen(false)}
              />
            )}
          </div>
        </div>
      )}

      {/* ── Main chat area ────────────────────────── */}
      <div className="flex-1 sa-card sa-card-lg flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b flex-shrink-0"
          style={{ borderColor: "var(--line)" }}>

          {/* Mobile topic selector toggle */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden sa-btn-outline p-2 rounded-lg flex-shrink-0"
            title="Select topic"
          >
            <BookMarked size={16} />
          </button>

          {selectedTopic ? (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>
                <Lock size={11} />
                Topic Locked
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{selectedTopic.name}</div>
                <div className="text-xs truncate" style={{ color: "var(--muted)" }}>
                  {selectedDoc?.document_name}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1">
              <Bot size={18} style={{ color: "var(--accent)" }} />
              <div>
                <div className="text-sm font-semibold">AI Study Assistant</div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>
                  Select a topic on the left to begin
                </div>
              </div>
            </div>
          )}

          {session && messages.length > 0 && (
            <button
              onClick={handleClearHistory}
              title="Clear chat history"
              className="sa-btn-outline p-2 rounded-lg flex-shrink-0 text-xs flex items-center gap-1.5"
            >
              <RefreshCw size={14} />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}
        </div>

        {/* ── No topic selected state ── */}
        {!selectedTopic && !loadingSession && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "var(--accent-soft)" }}>
              <MessageSquare size={28} style={{ color: "var(--accent)" }} />
            </div>
            <h3 className="sa-serif text-xl font-semibold mb-2">Topic-Grounded Chat</h3>
            <p className="text-sm max-w-xs" style={{ color: "var(--muted)" }}>
              Select a topic from {documents.length > 0 ? "the left panel" : "after uploading documents"} to start asking AI questions grounded in your uploaded study material.
            </p>
            {documents.length === 0 && !loadingTopics && (
              <div className="mt-4 flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
                style={{ background: "var(--info-soft)", color: "var(--info)" }}>
                <AlertCircle size={13} />
                Upload documents first to generate topics
              </div>
            )}
            {/* Mobile: show topic selector inline if no topic */}
            <div className="lg:hidden mt-6 w-full max-w-xs">
              {loadingTopics ? (
                <div className="flex items-center justify-center gap-2 text-xs" style={{ color: "var(--muted)" }}>
                  <Loader2 size={14} className="animate-spin" /> Loading topics...
                </div>
              ) : (
                <div className="sa-card p-3 text-left max-h-60 overflow-y-auto sa-scroll">
                  <TopicSelector
                    documents={documents}
                    selectedTopicId={null}
                    onSelect={handleTopicSelect}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Loading session ── */}
        {loadingSession && (
          <div className="flex-1 flex items-center justify-center gap-3">
            <Loader2 size={20} className="animate-spin" style={{ color: "var(--accent)" }} />
            <span className="text-sm" style={{ color: "var(--muted)" }}>Opening chat session...</span>
          </div>
        )}

        {/* ── Chat messages ── */}
        {selectedTopic && !loadingSession && (
          <div ref={scrollRef} className="flex-1 overflow-y-auto sa-scroll p-5 space-y-5 min-h-0">

            {/* Welcome message */}
            {messages.length === 0 && (
              <div className="flex justify-start">
                <div className="max-w-[88%] rounded-2xl px-4 py-3.5"
                  style={{ background: "var(--surface-subtle)", borderBottomLeftRadius: 4 }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Bot size={14} style={{ color: "var(--accent)" }} />
                    <span className="text-xs font-semibold" style={{ color: "var(--accent)" }}>
                      AI Study Assistant
                    </span>
                  </div>
                  <AIResponseRenderer text={
                    `### Ready to help with ${selectedTopic.name}\nI am grounded in the documents uploaded for this topic. Ask me anything — definitions, examples, formulas, or exam-style questions.\n\n- I will only answer based on your uploaded material\n- I will tell you clearly if something isn't in the documents\n- You can ask follow-up questions naturally`
                  } />
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={msg.id || i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "user" ? (
                  <div className="max-w-[80%] rounded-2xl px-4 py-3 text-sm"
                    style={{ background: "var(--ink-btn)", color: "var(--ink-btn-text)", borderBottomRightRadius: 4 }}>
                    <div className="flex items-center gap-2 mb-1.5 opacity-70">
                      <UserIcon size={12} />
                      <span className="text-xs font-medium">You</span>
                    </div>
                    <div className="leading-relaxed">
                      <FormattedText text={msg.content} />
                    </div>
                  </div>
                ) : (
                  <div className="max-w-[88%] rounded-2xl px-4 py-3.5"
                    style={{ background: "var(--surface-subtle)", borderBottomLeftRadius: 4 }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Bot size={14} style={{ color: "var(--accent)" }} />
                      <span className="text-xs font-semibold" style={{ color: "var(--accent)" }}>
                        AI Study Assistant
                      </span>
                    </div>
                    <AIResponseRenderer text={msg.content} />
                    <SourceChips sources={msg.sources} />
                  </div>
                )}
              </div>
            ))}

            {thinking && <TypingIndicator />}
          </div>
        )}

        {/* ── Error banner ── */}
        {error && (
          <div className="mx-5 mb-3 flex items-start gap-2 text-xs px-3 py-2.5 rounded-lg flex-shrink-0"
            style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
            <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
            <span className="flex-1">{error}</span>
            <button 
              type="button"
              aria-label="Dismiss error"
              onClick={() => setError(null)} 
              className="flex-shrink-0 opacity-70 hover:opacity-100"
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* ── Quick prompts (when session starts or is short) ── */}
        {selectedTopic && !loadingSession && messages.length < 2 && (
          <div className="px-5 pb-2 flex flex-wrap gap-2 flex-shrink-0">
            {quickPrompts.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => sendMessage(p + " about " + selectedTopic.name)}
                disabled={thinking}
                className="text-xs px-3 py-1.5 rounded-full font-medium transition-all hover:scale-105 disabled:opacity-50"
                style={{ background: "var(--chip-bg)", color: "var(--chip-text)" }}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* ── Input bar ── */}
        {selectedTopic && !loadingSession && (
          <div className="p-2.5 sm:p-4 border-t flex-shrink-0" style={{ borderColor: "var(--line)" }}>
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                aria-label={`Ask a question about ${selectedTopic.name}`}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={`Ask something about ${selectedTopic.name}...`}
                rows={1}
                disabled={thinking}
                className="flex-1 px-4 py-2.5 rounded-2xl text-sm outline-none border resize-none overflow-hidden disabled:opacity-50 focus-visible:border-[var(--accent)]"
                style={{
                  borderColor: "var(--line)",
                  background: "var(--input-bg)",
                  color: "var(--text)",
                  lineHeight: "1.5",
                  minHeight: "42px",
                  maxHeight: "120px",
                }}
              />
              <button
                type="button"
                aria-label="Send question"
                onClick={() => sendMessage()}
                disabled={!input.trim() || thinking}
                className="sa-btn-accent p-2.5 rounded-full flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {thinking ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs" style={{ color: "var(--muted)" }}>
              <Lock size={10} />
              <span>Answers grounded in: <strong>{selectedDoc?.document_name}</strong> → <strong>{selectedTopic.name}</strong></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatPage;
