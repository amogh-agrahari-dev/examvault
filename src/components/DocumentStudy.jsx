import React, { useState, useEffect } from "react";
import { ArrowLeft, BookOpen, FileText, Upload, Sparkles, MessageSquare, Layers } from "lucide-react";
import { getDocumentTopics, getDocuments } from "../services/api";
import Flashcards from "./Flashcards";
import { Badge, EmptyState } from "./UI";

import GroupDiscussions from "./GroupDiscussions";
import DiscussionRoom from "./DiscussionRoom";

function DocumentStudy({ go, doc, selectDoc, accessToken, showToast, defaultTab = "flashcards" }) {
  const [activeDoc, setActiveDoc] = useState(doc);
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [docsList, setDocsList] = useState([]);
  
  // States for Tab & Discussions
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [activeDiscussion, setActiveDiscussion] = useState(null);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  // If no document passed, fetch user's documents from Neon
  useEffect(() => {
    async function initDocs() {
      if (!activeDoc && accessToken) {
        setLoading(true);
        try {
          const res = await getDocuments(accessToken);
          const docs = res.documents || [];
          setDocsList(docs);
          if (docs.length > 0) {
            const firstCompleted = docs.find((d) => d.status === "completed") || docs[0];
            setActiveDoc(firstCompleted);
            if (selectDoc) selectDoc(firstCompleted);
          }
        } catch (err) {
          console.warn("Could not load documents for study:", err);
        } finally {
          setLoading(false);
        }
      } else if (activeDoc) {
        setLoading(false);
      }
    }
    initDocs();
  }, [activeDoc, accessToken, selectDoc]);

  // Load topics for the active document
  useEffect(() => {
    async function loadTopics() {
      if (!activeDoc?.id) return;
      setLoading(true);
      try {
        const res = await getDocumentTopics(activeDoc.id, accessToken);
        setTopics(res.topics || []);
        if (res.topics?.length > 0) {
          setSelectedTopic(res.topics[0]);
          setActiveDiscussion(null);
        } else {
          setSelectedTopic(null);
        }
      } catch (err) {
        if (showToast) showToast(err.message || "Failed to load topics");
      } finally {
        setLoading(false);
      }
    }
    if (activeDoc?.id) {
      loadTopics();
    }
  }, [activeDoc, accessToken, showToast]);

  // Reset tab when topic changes
  useEffect(() => {
    setActiveDiscussion(null);
  }, [selectedTopic]);

  if (!activeDoc && !loading) {
    return (
      <div className="sa-fade-in max-w-xl mx-auto py-12">
        <EmptyState
          icon={FileText}
          title="No Study Document Selected"
          description="Upload course materials or notes to generate topics, summaries, and flashcards."
          action={
            <button onClick={() => go("upload")} className="sa-btn-accent px-5 py-2.5 text-xs font-semibold flex items-center gap-1.5">
              <Upload size={14} /> Upload Study Material
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="sa-fade-in flex flex-col md:flex-row gap-4 md:gap-6 min-h-0 md:h-[calc(100vh-100px)] pb-16 md:pb-6">
      {/* ─────────────────────────────────────────────────────────────
          DESKTOP SIDEBAR: Topics list (hidden on mobile)
          ───────────────────────────────────────────────────────────── */}
      <div className={`hidden md:flex md:w-64 flex-col gap-4 shrink-0 ${activeDiscussion ? "hidden lg:flex" : "flex"}`}>
        <button 
          onClick={() => go("documents")} 
          className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] transition-colors py-1"
        >
          <ArrowLeft size={14} /> Back to Documents
        </button>

        <div className="sa-card p-4 flex-1 flex flex-col overflow-hidden">
          <div className="mb-3 pb-3 border-b border-[var(--line-subtle)]">
            <h3 className="sa-serif font-bold text-sm truncate text-[var(--text)]" title={activeDoc?.filename || activeDoc?.name}>
              {activeDoc?.filename || activeDoc?.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {activeDoc?.status === "completed" ? "Analyzed" : activeDoc?.status || "Processing..."}
              </span>
              <span className="text-[11px] text-[var(--muted)]">{topics.length} Topics</span>
            </div>
          </div>
          
          {loading ? (
            <div className="text-xs text-[var(--muted)] py-4 text-center">Loading syllabus topics...</div>
          ) : topics.length === 0 ? (
            <div className="text-xs space-y-1.5 text-[var(--muted)] py-4 text-center">
              <p>No topics generated yet.</p>
              {activeDoc?.status !== "completed" && (
                <p className="text-[11px] text-amber-500 font-medium">Document is currently being analyzed with Ollama.</p>
              )}
            </div>
          ) : (
            <div className="space-y-1 flex-1 overflow-y-auto sa-scroll pr-1">
              {topics.map((t) => {
                const isSelected = selectedTopic?.id === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSelectedTopic(t);
                      setActiveDiscussion(null);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between group ${
                      isSelected ? "shadow-xs font-semibold" : "hover:bg-[var(--surface-subtle)]"
                    }`}
                    style={{ 
                      background: isSelected ? "var(--ink-btn)" : "transparent",
                      color: isSelected ? "var(--ink-btn-text)" : "var(--text)" 
                    }}
                  >
                    <span className="truncate">{t.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MAIN STUDY AREA
          ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header: Back button & Document Title */}
        <div className="flex md:hidden items-center justify-between gap-2 mb-2.5">
          <button 
            onClick={() => go("documents")} 
            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] transition-colors py-1"
          >
            <ArrowLeft size={14} /> Back to Docs
          </button>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs font-semibold truncate max-w-[170px] text-[var(--text)]" title={activeDoc?.filename || activeDoc?.name}>
              {activeDoc?.filename || activeDoc?.name}
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              {activeDoc?.status === "completed" ? "Ready" : activeDoc?.status}
            </span>
          </div>
        </div>

        {/* Mobile Topic Switcher Ribbon (Compact horizontal scroll instead of giant box) */}
        {!activeDiscussion && topics.length > 0 && (
          <div className="md:hidden space-y-1 mb-2.5">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[11px] font-semibold text-[var(--muted)] flex items-center gap-1">
                <BookOpen size={12} /> Select Topic:
              </span>
              {selectedTopic && (
                <span className="text-[10px] text-[var(--accent-ink)] font-semibold truncate max-w-[180px]">
                  {selectedTopic.name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap sa-scroll py-1 -mx-1 px-1">
              {topics.map((t) => {
                const isSelected = selectedTopic?.id === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSelectedTopic(t);
                      setActiveDiscussion(null);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                      isSelected
                        ? "bg-[var(--accent)] text-[#1A1408] shadow-xs"
                        : "bg-[var(--surface-subtle)] text-[var(--muted)] hover:text-[var(--text)] border border-[var(--line)]"
                    }`}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {selectedTopic ? (
          activeDiscussion ? (
            /* Active Discussion View inside Document Study */
            <div className="flex flex-col md:flex-row h-full gap-4 min-h-0">
              <div className="flex-1 flex flex-col h-full min-h-0">
                <DiscussionRoom 
                  discussion={activeDiscussion} 
                  topic={selectedTopic} 
                  accessToken={accessToken} 
                  onBack={() => setActiveDiscussion(null)} 
                />
              </div>
              <div className="hidden lg:flex lg:w-80 flex-col h-full overflow-hidden shrink-0">
                <div className="sa-card flex-1 overflow-hidden p-3 flex flex-col">
                  <h3 className="sa-serif font-semibold text-xs mb-2 text-[var(--muted)] uppercase tracking-wider">
                    Topic Flashcards
                  </h3>
                  <div className="flex-1 overflow-hidden">
                    <Flashcards topic={selectedTopic} accessToken={accessToken} showToast={showToast} go={go} compact={true} />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Standard Tabs: Flashcards or Group Discussions */
            <div className="flex flex-col flex-1 min-h-0">
              {/* Tab Switcher Segmented Control */}
              <div 
                role="tablist"
                aria-label="Study modes"
                className="flex items-center p-1 rounded-xl border gap-1 bg-[var(--surface-subtle)] mb-3 w-fit"
                style={{ borderColor: "var(--line)" }}
              >
                <button 
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "flashcards"}
                  onClick={() => setActiveTab("flashcards")} 
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                    activeTab === "flashcards" 
                      ? "bg-[var(--surface)] text-[var(--text)] shadow-xs" 
                      : "text-[var(--muted)] hover:text-[var(--text)]"
                  }`}
                >
                  <Layers size={13} />
                  <span>Revision Flashcards</span>
                </button>
                <button 
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "discussions"}
                  onClick={() => setActiveTab("discussions")} 
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                    activeTab === "discussions" 
                      ? "bg-[var(--surface)] text-[var(--text)] shadow-xs" 
                      : "text-[var(--muted)] hover:text-[var(--text)]"
                  }`}
                >
                  <MessageSquare size={13} />
                  <span>Group Discussions</span>
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1">
                {activeTab === "flashcards" && (
                  <Flashcards 
                    topic={selectedTopic} 
                    accessToken={accessToken} 
                    showToast={showToast}
                    go={go}
                  />
                )}
                {activeTab === "discussions" && (
                  <GroupDiscussions 
                    topic={selectedTopic} 
                    accessToken={accessToken} 
                    onOpenDiscussion={setActiveDiscussion} 
                  />
                )}
              </div>
            </div>
          )
        ) : (
          <div className="sa-card p-10 sm:p-14 text-center rounded-2xl border flex flex-col items-center justify-center my-auto" style={{ borderColor: "var(--line)" }}>
            <div 
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}
            >
              <BookOpen size={28} />
            </div>
            <h4 className="sa-serif font-bold text-base text-[var(--text)] mb-1">Select a Topic to Revise</h4>
            <p className="text-xs text-[var(--muted)] max-w-sm leading-relaxed">
              Choose any topic from the list to start active recall flashcards and spaced repetition.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default DocumentStudy;
