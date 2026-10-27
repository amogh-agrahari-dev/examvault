import React, { useState, useEffect, useCallback } from "react";
import { 
  Upload, Search, FileText, Trash2, AlertCircle, 
  RotateCw, RefreshCw, Sparkles, BookOpen, X 
} from "lucide-react";
import { Badge, ProgressBar, EmptyState } from "./UI";
import { getDocuments, deleteDocument, reprocessDocument } from "../services/api";
import { formatFileSize, formatDate } from "../utils/formatters";

function Documents({ go, showToast, selectDoc, accessToken }) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [reprocessingId, setReprocessingId] = useState(null);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDocuments = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await getDocuments(accessToken);
      setDocs(res.documents || []);
    } catch (err) {
      if (!isSilent) showToast(err.message || "Failed to load documents.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, showToast]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Poll for in-progress documents
  useEffect(() => {
    const hasProcessing = docs.some(d => d.status && (d.status.toLowerCase().includes("processing") || d.status.toLowerCase().includes("chunk")));
    if (!hasProcessing) return;

    const interval = setInterval(async () => {
      try {
        const res = await getDocuments(accessToken);
        setDocs(res.documents || []);
      } catch (e) {
        console.error("Failed to poll documents", e);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [docs, accessToken]);

  const handleDelete = async (docId) => {
    setDeletingId(docId);
    try {
      await deleteDocument(docId, accessToken);
      setDocs((prev) => prev.filter((x) => x.id !== docId));
      setConfirmDelete(null);
      showToast("Document deleted successfully");
    } catch (err) {
      showToast(err.message || "Failed to delete document");
    } finally {
      setDeletingId(null);
    }
  };

  const handleReprocess = async (docId) => {
    setReprocessingId(docId);
    try {
      await reprocessDocument(docId, accessToken);
      setDocs((prev) =>
        prev.map((x) => (x.id === docId ? { ...x, status: "processing" } : x))
      );
      showToast("Document reprocessing started");
    } catch (err) {
      showToast(err.message || "Failed to restart processing");
    } finally {
      setReprocessingId(null);
    }
  };

  const filtered = docs.filter((d) =>
    (d.filename || d.name || "").toLowerCase().includes(search.toLowerCase()) &&
    (filterType === "All" || (d.mime_type && d.mime_type.toLowerCase().includes(filterType.toLowerCase())))
  );

  return (
    <div className="sa-fade-in space-y-4 sm:space-y-5 pb-8">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="sa-serif text-2xl sm:text-3xl font-semibold text-[var(--text)]">
            My Documents
          </h2>
          <p className="text-xs sm:text-sm mt-0.5 text-[var(--muted)]">
            {docs.length} documents · study and manage uploaded curriculum materials
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button 
            onClick={() => loadDocuments(true)} 
            disabled={refreshing || loading}
            className="sa-btn-outline px-3 py-2 text-xs sm:text-sm flex items-center justify-center gap-1.5 flex-1 sm:flex-initial"
            title="Refresh list"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
          
          <button 
            onClick={() => go("upload")} 
            className="sa-btn-accent px-4 py-2 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 flex-1 sm:flex-initial shadow-xs"
          >
            <Upload size={14} /> 
            <span>Upload New</span>
          </button>
        </div>
      </div>

      {/* Search & Format Filter Ribbon */}
      <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
        {/* Search Input */}
        <div 
          className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 border transition-all focus-within:border-[var(--accent)]" 
          style={{ background: "var(--input-bg)", borderColor: "var(--line)" }}
        >
          <Search size={15} color="var(--muted)" className="shrink-0" />
          <input 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder="Search documents by name..." 
            className="bg-transparent text-xs sm:text-sm outline-none w-full text-[var(--text)] placeholder-[var(--muted)]" 
          />
          {search && (
            <button 
              onClick={() => setSearch("")} 
              className="text-[var(--muted)] hover:text-[var(--text)] p-0.5"
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter Type Pills */}
        <div 
          className="flex items-center p-1 rounded-xl border self-start sm:self-auto" 
          style={{ background: "var(--surface-subtle)", borderColor: "var(--line)" }}
        >
          {["All", "PDF", "DOCX"].map((t) => (
            <button 
              key={t} 
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                filterType === t 
                  ? "bg-[var(--surface)] text-[var(--text)] shadow-xs" 
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Grid / States */}
      {loading ? (
        <div className="py-16 text-center text-xs sm:text-sm text-[var(--muted)]">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin mx-auto mb-3" />
          Loading your document vault...
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState 
          icon={FileText} 
          title="No documents found" 
          description={search ? `No materials matching "${search}".` : "Upload course syllabi, lecture slides, or past papers to get started."}
          action={
            <button onClick={() => go("upload")} className="sa-btn-accent px-4 py-2 text-xs sm:text-sm font-semibold flex items-center gap-1.5">
              <Upload size={14} /> Upload Study Material
            </button>
          } 
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filtered.map((d) => {
            const isCompleted = d.status === "completed";
            const isFailed = d.status === "failed";
            const isProcessing = !isCompleted && !isFailed;
            const badgeTone = isCompleted ? "success" : isFailed ? "danger" : "info";

            return (
              <div 
                key={d.id} 
                className="sa-card p-3.5 sm:p-4 flex flex-col justify-between relative hover:border-[var(--muted)] transition-colors"
              >
                <div>
                  {/* File Header */}
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div 
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" 
                        style={{ background: "var(--chip-bg)" }}
                      >
                        <FileText size={17} className="text-[var(--accent)]" />
                      </div>
                      <div className="min-w-0">
                        <div 
                          className="text-xs sm:text-sm font-semibold text-[var(--text)] truncate max-w-[200px] sm:max-w-[220px]" 
                          title={d.filename || d.name}
                        >
                          {d.filename || d.name}
                        </div>
                        <div className="text-[11px] text-[var(--muted)] mt-0.5">
                          {formatFileSize(d.file_size)}
                        </div>
                      </div>
                    </div>

                    <button 
                      type="button"
                      onClick={() => setConfirmDelete(d.id)} 
                      className="p-1.5 rounded-lg text-[var(--muted)] hover:text-red-500 hover:bg-red-500/10 flex-shrink-0 transition-colors" 
                      title="Delete document"
                      aria-label={`Delete ${d.filename || d.name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* Status & Date */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <Badge tone={badgeTone}>
                      {isProcessing && <span className="inline-block w-2 h-2 rounded-full bg-current mr-1 animate-pulse" />}
                      {d.status}
                    </Badge>
                    <span className="text-[11px] text-[var(--muted)]">
                      {formatDate(d.created_at)}
                    </span>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-[var(--line-subtle)]">
                  {isCompleted ? (
                    <>
                      <button 
                        onClick={() => { selectDoc(d); go("document-study"); }} 
                        className="sa-btn-primary text-xs py-2 font-semibold flex items-center justify-center gap-1.5 active:scale-98"
                      >
                        <BookOpen size={13} />
                        <span>Study Topics</span>
                      </button>
                      <button 
                        onClick={() => { go("predict-paper", { importDoc: d }); }} 
                        className="sa-btn-outline text-xs py-2 font-semibold flex items-center justify-center gap-1.5 active:scale-98"
                        title="Generate examination blueprint and predicted paper"
                      >
                        <Sparkles size={13} className="text-amber-500" /> 
                        <span>Predict Paper</span>
                      </button>
                    </>
                  ) : isFailed ? (
                    <button 
                      onClick={() => handleReprocess(d.id)}
                      disabled={reprocessingId === d.id}
                      className="sa-btn-outline col-span-2 text-xs py-2 font-semibold flex items-center justify-center gap-1.5"
                    >
                      <RotateCw size={13} className={reprocessingId === d.id ? "animate-spin" : ""} />
                      <span>{reprocessingId === d.id ? "Retrying..." : "Retry Processing"}</span>
                    </button>
                  ) : (
                    <div 
                      className="col-span-2 flex items-center justify-center py-2 text-xs font-medium rounded-lg border border-dashed" 
                      style={{ borderColor: "var(--line)", color: "var(--muted)" }}
                    >
                      <span className="animate-pulse">Analyzing document...</span>
                    </div>
                  )}
                </div>

                {/* Inline Delete Confirmation Dialog */}
                {confirmDelete === d.id && (
                  <div 
                    className="absolute inset-0 rounded-[14px] flex flex-col items-center justify-center gap-2.5 p-4 text-center z-10 animate-fade-in" 
                    style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
                  >
                    <AlertCircle size={22} className="text-rose-500" />
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-[var(--text)] truncate max-w-[220px]">
                        Delete "{d.filename}"?
                      </p>
                      <p className="text-[11px] text-[var(--muted)] mt-0.5">
                        Removes all generated flashcards and topic discussions.
                      </p>
                    </div>
                    <div className="flex gap-2 mt-1">
                      <button 
                        onClick={() => setConfirmDelete(null)} 
                        disabled={deletingId === d.id}
                        className="sa-btn-outline text-xs px-3 py-1.5 font-medium"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => handleDelete(d.id)}
                        disabled={deletingId === d.id}
                        className="text-xs px-3.5 py-1.5 rounded-lg font-bold text-white flex items-center gap-1 shadow-xs"
                        style={{ background: "var(--danger)" }}
                      >
                        {deletingId === d.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Documents;
