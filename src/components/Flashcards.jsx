import React, { useState, useEffect } from "react";
import { Check, RotateCcw, ArrowLeft, ArrowRight, Layers, FileText, Upload, ZoomIn, X, Image as ImageIcon } from "lucide-react";
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
            // Fetch topics from first completed doc
            const tRes = await getDocumentTopics(completedDocs[0].id, accessToken);
            const topList = tRes.topics || [];
            setAvailableTopics(topList);
            if (topList.length > 0) {
              setActiveTopic(topList[0]);
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

  if (loading) {
    return (
      <div className="sa-fade-in text-center py-12">
        <div className="text-sm" style={{ color: "var(--muted)" }}>Loading flashcards from Neon DB...</div>
      </div>
    );
  }

  if (!activeTopic || flashcards.length === 0) {
    return (
      <div className="sa-fade-in max-w-xl mx-auto py-8">
        <EmptyState
          icon={Layers}
          title="No Flashcards Found"
          description="Upload a study document to automatically generate AI-extracted revision flashcards with Ollama."
          action={
            <button onClick={() => go && go("upload")} className="sa-btn-accent px-5 py-2.5 text-xs font-semibold flex items-center gap-1.5">
              <Upload size={14} /> Upload Study Material
            </button>
          }
        />
      </div>
    );
  }

  const card = flashcards[index % flashcards.length];
  const cardImageUrl = card.image_url ? (card.image_url.startsWith("http") ? card.image_url : `${backendHost}${card.image_url}`) : null;

  const next = () => { setFlipped(false); setTimeout(() => setIndex((i) => (i + 1) % flashcards.length), 150); };
  const prev = () => { setFlipped(false); setTimeout(() => setIndex((i) => (i - 1 + flashcards.length) % flashcards.length), 150); };

  return (
    <div className={`sa-fade-in ${compact ? "w-full" : "max-w-xl mx-auto"} flex flex-col h-full`}>
      {!compact && (
        <>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h2 className="sa-serif text-2xl font-semibold">{activeTopic?.name}</h2>
              <span className="text-xs" style={{ color: "var(--muted)" }}>Interactive Spaced Repetition</span>
            </div>
            <Badge tone="info">{index + 1} / {flashcards.length} cards</Badge>
          </div>
          <ProgressBar value={((index + 1) / flashcards.length) * 100} tone="accent" height={6} />
        </>
      )}

      {compact && (
         <div className="flex justify-between items-center mb-2 px-1">
            <span className="text-xs font-semibold">{index + 1} / {flashcards.length}</span>
            <ProgressBar value={((index + 1) / flashcards.length) * 100} tone="accent" height={4} className="w-1/2" />
         </div>
      )}

      <div 
        className={`sa-flip-card flex-1 ${compact ? "" : "mt-6"}`} 
        style={{ 
          height: compact ? (cardImageUrl ? 360 : "100%") : (cardImageUrl ? 400 : 280), 
          minHeight: cardImageUrl ? 320 : 200 
        }}
      >
        <div className={`sa-flip-inner ${flipped ? "flipped" : ""}`} onClick={() => setFlipped(!flipped)}>
          {/* Question Side */}
          <div className={`sa-flip-face sa-card ${compact ? "p-4" : "sa-card-lg p-6"} cursor-pointer flex flex-col justify-center items-center`} style={{ background: "var(--ink)" }}>
            <div className="text-center w-full flex flex-col items-center">
              <Badge tone="accent">Question</Badge>

              {/* Embedded Diagram / Figure */}
              {cardImageUrl && (
                <div 
                  className="my-3 relative group rounded-lg overflow-hidden border border-white/20 bg-black/40 p-1 cursor-zoom-in max-w-full"
                  onClick={(e) => { e.stopPropagation(); setPreviewImage(cardImageUrl); }}
                  title="Click to view full diagram"
                >
                  <img 
                    src={cardImageUrl} 
                    alt="Study Diagram" 
                    className="max-h-36 max-w-full object-contain rounded transition-transform group-hover:scale-105"
                  />
                  <div className="absolute bottom-1 right-1 bg-black/75 text-white px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 opacity-80 group-hover:opacity-100">
                    <ZoomIn size={11} /> Zoom
                  </div>
                </div>
              )}

              <div className={`sa-serif text-white font-medium ${compact ? "text-sm mt-1" : "text-lg mt-2"} leading-relaxed`}>
                <FormattedText text={card.question} />
              </div>
              <p className={`text-[10px] ${compact ? "mt-2" : "mt-4"}`} style={{ color: "#9BA4BE" }}>Tap to reveal answer</p>
            </div>
          </div>

          {/* Answer Side */}
          <div className={`sa-flip-face sa-flip-back sa-card ${compact ? "p-4" : "sa-card-lg p-6"} cursor-pointer flex flex-col justify-center items-center`}>
            <div className="text-center overflow-y-auto w-full h-full custom-scrollbar flex flex-col items-center">
              <Badge tone="success">Answer</Badge>

              {cardImageUrl && (
                <div 
                  className="my-2.5 relative group rounded-lg overflow-hidden border border-black/10 dark:border-white/10 bg-black/5 p-1 cursor-zoom-in max-w-full"
                  onClick={(e) => { e.stopPropagation(); setPreviewImage(cardImageUrl); }}
                  title="Click to view full diagram"
                >
                  <img 
                    src={cardImageUrl} 
                    alt="Study Diagram" 
                    className="max-h-28 max-w-full object-contain rounded transition-transform group-hover:scale-105"
                  />
                </div>
              )}

              <div className={`${compact ? "text-xs mt-2" : "text-sm mt-3"} leading-relaxed`}>
                <FormattedText text={card.answer} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`flex items-center justify-between ${compact ? "mt-3" : "mt-6"}`}>
        <button onClick={prev} className={`sa-btn-outline ${compact ? "px-2 py-1 text-xs" : "px-4 py-2 text-sm"} font-medium flex items-center gap-1`}><ArrowLeft size={12} /> Prev</button>
        <button onClick={() => setFlipped(!flipped)} className={`sa-btn-outline ${compact ? "px-3 py-1 text-xs" : "px-4 py-2 text-sm"} font-medium`}>Flip</button>
        <button onClick={next} className={`sa-btn-outline ${compact ? "px-2 py-1 text-xs" : "px-4 py-2 text-sm"} font-medium flex items-center gap-1`}>Next <ArrowRight size={12} /></button>
      </div>

      {!compact && (
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button onClick={() => { setKnown(known + 1); if (showToast) showToast("Marked as mastered"); next(); }} className="sa-btn-primary py-2.5 text-sm font-medium flex items-center justify-center gap-2">
            <Check size={15} /> I Know This
          </button>
          <button onClick={() => { if (showToast) showToast("Added to review pile"); next(); }} className="sa-btn-outline py-2.5 text-sm font-medium flex items-center justify-center gap-2">
            <RotateCcw size={15} /> Review Again
          </button>
        </div>
      )}

      {/* Full Resolution Diagram Lightbox Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] bg-[var(--surface)] rounded-2xl p-4 shadow-2xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-3 mb-2 border-b" style={{ borderColor: "var(--line)" }}>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ImageIcon size={16} color="var(--accent)" />
                <span>Extracted Diagram / Figure</span>
              </div>
              <button 
                onClick={() => setPreviewImage(null)} 
                className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-auto max-h-[75vh] flex items-center justify-center p-2">
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
