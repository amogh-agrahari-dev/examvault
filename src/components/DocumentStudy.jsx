import React, { useState, useEffect } from "react";
import { ArrowLeft, BookOpen, FileText, Upload } from "lucide-react";
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
  
  // New states for Discussions
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
    <div className="sa-fade-in flex flex-col md:flex-row gap-6 min-h-[calc(100vh-130px)] md:h-[calc(100vh-100px)]">
      {/* Sidebar for Topics (hidden when active discussion is open on small screens) */}
      <div className={`w-full md:w-64 flex-col gap-4 ${activeDiscussion ? "hidden md:flex" : "flex"}`}>
        <button onClick={() => go("documents")} className="flex items-center gap-2 text-sm font-medium hover:opacity-70 transition-opacity" style={{ color: "var(--text)" }}>
          <ArrowLeft size={16} /> Back to Documents
        </button>

        <div className="sa-card p-4 flex-1 flex flex-col overflow-hidden max-h-56 md:max-h-none">
          <div className="mb-4">
            <h3 className="sa-serif font-semibold text-base truncate" title={activeDoc?.filename || activeDoc?.name}>
              {activeDoc?.filename || activeDoc?.name}
            </h3>
            <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
              {activeDoc?.status === "completed" ? "Generated Topics" : activeDoc?.status || "Processing..."}
            </p>
          </div>
          
          {loading ? (
            <div className="text-sm" style={{ color: "var(--muted)" }}>Loading topics from Neon...</div>
          ) : topics.length === 0 ? (
            <div className="text-sm space-y-2" style={{ color: "var(--muted)" }}>
              <p>No topics generated yet.</p>
              {activeDoc?.status !== "completed" && (
                <p className="text-xs text-amber-500">Document is currently being analyzed with Ollama.</p>
              )}
            </div>
          ) : (
            <div className="space-y-1 flex-1 overflow-y-auto sa-scroll pr-1">
              {topics.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTopic(t)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between group`}
                  style={{ 
                    background: selectedTopic?.id === t.id ? "var(--ink-btn)" : "transparent",
                    color: selectedTopic?.id === t.id ? "var(--ink-btn-text)" : "var(--text)" 
                  }}
                >
                  <span className="truncate">{t.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Study Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedTopic ? (
          activeDiscussion ? (
            <div className="flex flex-col md:flex-row h-full gap-4 overflow-hidden">
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                <DiscussionRoom 
                  discussion={activeDiscussion} 
                  topic={selectedTopic} 
                  accessToken={accessToken} 
                  onBack={() => setActiveDiscussion(null)} 
                />
              </div>
              <div className="w-full md:w-80 flex flex-col h-[50vh] md:h-full overflow-hidden">
                <div className="sa-card flex-1 overflow-hidden p-2">
                   <h3 className="sa-serif font-semibold text-sm mb-2 px-2 pt-2">Topic Resources</h3>
                   <div className="h-full overflow-hidden">
                     <Flashcards topic={selectedTopic} accessToken={accessToken} showToast={showToast} go={go} compact={true} />
                   </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="flex items-center gap-4 border-b mb-4" style={{ borderColor: "var(--line)" }}>
                <button 
                  onClick={() => setActiveTab("flashcards")} 
                  className={`pb-2 px-2 text-sm font-semibold transition-colors ${activeTab === "flashcards" ? "border-b-2" : "opacity-50"}`}
                  style={{ borderColor: activeTab === "flashcards" ? "var(--text)" : "transparent" }}
                >
                  Flashcards
                </button>
                <button 
                  onClick={() => setActiveTab("discussions")} 
                  className={`pb-2 px-2 text-sm font-semibold transition-colors ${activeTab === "discussions" ? "border-b-2" : "opacity-50"}`}
                  style={{ borderColor: activeTab === "discussions" ? "var(--text)" : "transparent" }}
                >
                  Group Discussions
                </button>
              </div>

              <div className="flex-1 overflow-y-auto sa-scroll pr-2 pb-4">
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
          <div className="sa-card p-12 text-center flex flex-col items-center justify-center">
             <BookOpen size={32} color="var(--muted)" className="mb-4" />
             <h4 className="font-semibold text-sm mb-1">Select a Topic to Revise</h4>
             <p className="text-xs" style={{ color: "var(--muted)" }}>
               Choose any topic from the sidebar to start active recall flashcards.
             </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default DocumentStudy;
