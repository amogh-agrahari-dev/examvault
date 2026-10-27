import React, { useState, useEffect } from "react";
import { 
  Check, RotateCcw, ArrowLeft, ArrowRight, Layers, 
  FileText, Upload, ZoomIn, X, Image as ImageIcon, Sparkles, BookOpen 
} from "lucide-react";
import { Badge, ProgressBar, EmptyState } from "./UI";
import { FormattedText } from "./MathRenderer";
import { getTopicFlashcards, getDocuments, getDocumentTopics, API_BASE_URL } from "../services/api";

function Flashcards({ topic, accessToken, showToast, go, selectDoc, compact }) {
  const [activeTopic, setActiveTopic] = useState(topic);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const [previewImage, setPreviewImage] = useState(null);
  
  const [flashcards, setFlashcards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [availableTopics, setAvailableTopics] = useState([]);

  // Base URL for backend static/image assets
  const backendHost = API_BASE_URL.replace("/api/v1", "");

  // If topic prop changes externally
  useEffect(() => {
    if (topic) {
      setActiveTopic(topic);
    }
  }, [topic]);

  // If no topic is passed, discover available topics from user's documents in Neon
  useEffect(() => {
    async function discoverTopics() {
      if (!activeTopic && accessToken) {
        setLoading(true);
        try {
          const docRes = await getDocuments(accessToken);
          const docs = docRes.documents || [];
          const completedDocs = docs.filter((d) => d.status === "completed");

          if (completedDocs.length > 0) {
            // Collect topics across completed docs
            let allTopics = [];
            for (const doc of completedDocs.slice(0, 3)) {
              try {
                const tRes = await getDocumentTopics(doc.id, accessToken);
                if (tRes.topics && tRes.topics.length > 0) {
                  allTopics = [...allTopics, ...tRes.topics];
                }
              } catch (e) {
                console.warn("Topic fetch error for doc:", doc.id);
              }
            }

            setAvailableTopics(allTopics);
            if (allTopics.length > 0) {
              setActiveTopic(allTopics[0]);
            } else {
              setLoading(false);
            }
          } else {
            setLoading(false);
          }
        } catch (err) {
          console.warn("Could not discover topics:", err);
          setLoading(false);
        }
      }
    }
    if (!activeTopic) {
      discoverTopics();
    }
  }, [activeTopic, accessToken]);

  // Load flashcards for activeTopic
  useEffect(() => {
    async function loadFlashcards() {
      if (!activeTopic?.id) return;
      setLoading(true);
      try {
        const res = await getTopicFlashcards(activeTopic.id, accessToken);
        setFlashcards(res.flashcards || []);
        setIndex(0);
        setFlipped(false);
      } catch (err) {
        if (showToast) showToast(err.message || "Failed to load flashcards");
      } finally {
        setLoading(false);
      }
    }
    if (activeTopic?.id) {
      loadFlashcards();
    }
  }, [activeTopic, accessToken, showToast]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "Escape" && previewImage) {
        setPreviewImage(null);
        return;
      }
      if (e.key === "ArrowLeft") {
        prev();
      } else if (e.key === "ArrowRight") {
        next();
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setFlipped((f) => !f);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [flashcards.length, previewImage]);

  if (loading) {
    return (
      <div className="sa-fade-in text-center py-16">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin mx-auto mb-3" />
        <div className="text-xs sm:text-sm text-[var(--muted)]">Loading revision flashcards...</div>
      </div>
    );
  }

  if (!activeTopic || flashcards.length === 0) {
    return (
      <div className="sa-fade-in max-w-xl mx-auto py-8 px-4">
        <EmptyState
          icon={Layers}
          title="No Flashcards Found"
          description="Upload study material or select an analyzed document to automatically practice revision flashcards."
          action={
            <div className="flex gap-2">
              <button 
                onClick={() => go && go("documents")} 
                className="sa-btn-outline px-4 py-2 text-xs font-semibold"
              >
                View Documents
              </button>
              <button 
                onClick={() => go && go("upload")} 
                className="sa-btn-accent px-4 py-2 text-xs font-semibold flex items-center gap-1.5"
              >
                <Upload size={14} /> Upload Material
              </button>
            </div>
          }
        />
      </div>
    );
  }

  const card = flashcards[index % flashcards.length];
  const cardImageUrl = card.image_url 
    ? (card.image_url.startsWith("http") ? card.image_url : `${backendHost}${card.image_url}`) 
    : null;

  const next = () => { 
    setFlipped(false); 
    setTimeout(() => setIndex((i) => (i + 1) % flashcards.length), 120); 
  };
  
  const prev = () => { 
    setFlipped(false); 
    setTimeout(() => setIndex((i) => (i - 1 + flashcards.length) % flashcards.length), 120); 
  };

  const progressPercent = ((index + 1) / flashcards.length) * 100;

  return (
    <div className={`sa-fade-in ${compact ? "w-full" : "max-w-xl mx-auto"} flex flex-col h-full`}>
      {/* Header & Topic Title */}
      {!compact && (
        <div className="space-y-2 mb-3">
          {/* Topic Switcher Ribbon (when multiple topics exist) */}
          {availableTopics.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap flex-nowrap sa-scroll pb-1">
              <span className="text-[11px] font-semibold text-[var(--muted)] shrink-0 mr-1 flex items-center gap-1">
                <BookOpen size={12} /> Topics:
              </span>
              {availableTopics.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTopic(t)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0 ${
                    activeTopic?.id === t.id
                      ? "bg-[var(--accent)] text-[#1A1408] font-bold shadow-xs"
                      : "bg-[var(--surface-subtle)] text-[var(--muted)] hover:text-[var(--text)] border border-[var(--line)]"
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <h2 className="sa-serif text-xl sm:text-2xl font-bold truncate text-[var(--text)]">
                {activeTopic?.name}
              </h2>
              <span className="text-xs text-[var(--muted)]">Spaced Repetition & Revision</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {known > 0 && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {known} Mastered
                </span>
              )}
              <Badge tone="info">{index + 1} / {flashcards.length}</Badge>
            </div>
          </div>

          <ProgressBar value={progressPercent} tone="accent" height={5} />
        </div>
      )}

      {/* Compact header for embedded view */}
      {compact && (
        <div className="flex justify-between items-center mb-2 px-1">
          <span className="text-xs font-semibold text-[var(--text)]">{index + 1} / {flashcards.length}</span>
          <ProgressBar value={progressPercent} tone="accent" height={4} className="w-1/2" />
        </div>
      )}

      {/* Interactive 3D Flip Card */}
      <div 
        role="button"
        tabIndex={0}
        aria-label="Interactive Flashcard. Tap or press Space/Enter to flip."
        className="sa-flip-card w-full cursor-pointer select-none transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]" 
        style={{ 
          height: compact 
            ? (cardImageUrl ? 320 : 230) 
            : (cardImageUrl ? "clamp(290px, 44vh, 390px)" : "clamp(210px, 34vh, 310px)"), 
          minHeight: cardImageUrl ? 270 : 190 
        }}
        onClick={() => setFlipped(!flipped)}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            setFlipped(!flipped);
          }
        }}
      >
        <div className={`sa-flip-inner ${flipped ? "flipped" : ""}`}>
          {/* Question Side */}
          <div 
            className="sa-flip-face sa-card p-4 sm:p-7 flex flex-col justify-between items-center text-center shadow-md relative overflow-hidden" 
            style={{ background: "var(--ink)", borderColor: "var(--line)" }}
          >
            {/* Header pill */}
            <div className="flex items-center justify-between w-full mb-1 sm:mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Question
              </span>
              <span className="text-[11px] text-white/60 flex items-center gap-1">
                <RotateCcw size={11} /> Tap to flip
              </span>
            </div>

            {/* Embedded Diagram / Figure */}
            {cardImageUrl && (
              <div 
                className="my-1.5 sm:my-2 relative group rounded-xl overflow-hidden border border-white/20 bg-black/40 p-1 cursor-zoom-in max-w-full"
                onClick={(e) => { e.stopPropagation(); setPreviewImage(cardImageUrl); }}
                title="Click to zoom full diagram"
              >
                <img 
                  src={cardImageUrl} 
                  alt="Study Diagram" 
                  className="max-h-24 sm:max-h-36 max-w-full object-contain rounded transition-transform group-hover:scale-105"
                />
                <div className="absolute bottom-1 right-1 bg-black/80 text-white px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 opacity-80 group-hover:opacity-100">
                  <ZoomIn size={11} /> Zoom
                </div>
              </div>
            )}

            {/* Question Text */}
            <div className="my-auto py-2 text-white font-medium text-sm sm:text-base md:text-lg sa-serif leading-relaxed overflow-y-auto max-h-[150px] sm:max-h-[190px] sa-scroll w-full px-1">
              <FormattedText text={card.question} />
            </div>

            <p className="text-[10px] sm:text-[11px] text-white/50 mt-1 sm:mt-2">
              Tap card or press Space to see answer
            </p>
          </div>

          {/* Answer Side */}
          <div 
            className="sa-flip-face sa-flip-back sa-card p-4 sm:p-7 flex flex-col justify-between items-center text-center shadow-md relative overflow-hidden"
            style={{ background: "var(--surface)", borderColor: "var(--line)" }}
          >
            {/* Header pill */}
            <div className="flex items-center justify-between w-full mb-1 sm:mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                Answer
              </span>
              <span className="text-[11px] text-[var(--muted)] flex items-center gap-1">
                <RotateCcw size={11} /> Tap to flip back
              </span>
            </div>

            {/* Embedded Diagram on Answer side */}
            {cardImageUrl && (
              <div 
                className="my-1.5 sm:my-2 relative group rounded-xl overflow-hidden border border-black/10 dark:border-white/10 bg-black/5 p-1 cursor-zoom-in max-w-full"
                onClick={(e) => { e.stopPropagation(); setPreviewImage(cardImageUrl); }}
                title="Click to zoom diagram"
              >
                <img 
                  src={cardImageUrl} 
                  alt="Study Diagram" 
                  className="max-h-20 sm:max-h-32 max-w-full object-contain rounded transition-transform group-hover:scale-105"
                />
              </div>
            )}

            {/* Answer Text */}
            <div className="my-auto py-2 text-[var(--text)] text-xs sm:text-sm md:text-base leading-relaxed overflow-y-auto max-h-[150px] sm:max-h-[190px] sa-scroll w-full px-1">
              <FormattedText text={card.answer} />
            </div>

            <p className="text-[10px] sm:text-[11px] text-[var(--muted)] mt-1 sm:mt-2">
              Tap card to return to question
            </p>
          </div>
        </div>
      </div>

      {/* Row 1: Flip & Step Navigation Controls */}
      <div className={`grid grid-cols-3 gap-2 ${compact ? "mt-2.5" : "mt-2.5 sm:mt-3.5"}`}>
        <button 
          type="button"
          onClick={prev} 
          className="sa-btn-outline py-2 px-2 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1 active:scale-98"
          title="Previous Card (Left Arrow)"
        >
          <ArrowLeft size={13} /> <span>Prev</span>
        </button>

        <button 
          type="button"
          onClick={() => setFlipped(!flipped)} 
          className="sa-btn-outline py-2 px-2 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 active:scale-98 shadow-xs"
          style={{ background: "var(--surface-subtle)" }}
          title="Flip Card (Spacebar)"
        >
          <RotateCcw size={13} className="text-[var(--accent)]" /> 
          <span>Flip Card</span>
        </button>

        <button 
          type="button"
          onClick={next} 
          className="sa-btn-outline py-2 px-2 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1 active:scale-98"
          title="Next Card (Right Arrow)"
        >
          <span>Next</span> <ArrowRight size={13} />
        </button>
      </div>

      {/* Row 2: Spaced Repetition Mastery Actions */}
      {!compact && (
        <div className="grid grid-cols-2 gap-2 sm:gap-2.5 mt-2 sm:mt-2.5">
          <button 
            type="button"
            onClick={() => { if (showToast) showToast("Added to review pile"); next(); }} 
            className="sa-btn-outline py-2 sm:py-2.5 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-98 hover:border-amber-500"
          >
            <RotateCcw size={13} className="text-amber-500" /> 
            <span>Review Again</span>
          </button>

          <button 
            type="button"
            onClick={() => { setKnown(known + 1); if (showToast) showToast("Marked as mastered! +5 credits"); next(); }} 
            className="sa-btn-primary py-2 sm:py-2.5 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-98"
          >
            <Check size={14} /> 
            <span>I Know This {known > 0 ? `(${known})` : ""}</span>
          </button>
        </div>
      )}

      {/* Full Resolution Diagram Lightbox Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-3 sm:p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="flashcard-diagram-title"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[92vh] bg-[var(--surface)] rounded-2xl p-3 sm:p-4 shadow-2xl flex flex-col items-center border animate-scale-up"
            style={{ borderColor: "var(--line)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-2.5 mb-2 border-b" style={{ borderColor: "var(--line)" }}>
              <div id="flashcard-diagram-title" className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-[var(--text)]">
                <ImageIcon size={15} className="text-[var(--accent)]" />
                <span>Extracted Diagram / Figure</span>
              </div>
              <button 
                type="button"
                onClick={() => setPreviewImage(null)} 
                className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-[var(--muted)]"
                aria-label="Close diagram preview"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-auto max-h-[75vh] flex items-center justify-center p-1">
              <img 
                src={previewImage} 
                alt="Full resolution diagram" 
                className="max-h-full max-w-full object-contain rounded-lg shadow-inner" 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Flashcards;
