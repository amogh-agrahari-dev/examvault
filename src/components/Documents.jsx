import React, { useState, useEffect, useCallback } from "react";
import { Upload, Search, FileText, Trash2, AlertCircle, RotateCw, RefreshCw, Sparkles } from "lucide-react";
import { Badge, ProgressBar, EmptyState } from "./UI";
import { getDocuments, deleteDocument, reprocessDocument } from "../services/api";

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
    (filterType === "All" || (d.mime_type && d.mime_type.includes(filterType.toLowerCase())))
  );

  return (
    <div className="sa-fade-in space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="sa-serif text-2xl font-semibold">My Documents</h2>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>{docs.length} documents · manage and study your uploaded material</p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <button 
            onClick={() => loadDocuments(true)} 
            disabled={refreshing || loading}
            className="sa-btn-outline px-3 py-2.5 text-sm flex items-center gap-1.5"
            title="Refresh list"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button onClick={() => go("upload")} className="sa-btn-accent px-4 py-2.5 text-sm flex items-center gap-2">
            <Upload size={15} /> Upload New
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg flex-1 border" style={{ background: "var(--input-bg)", borderColor: "var(--line)" }}>
          <Search size={15} color="var(--muted)" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search your documents..." className="bg-transparent text-sm outline-none w-full" style={{ color: "var(--text)" }} />
        </div>
        <div className="flex items-center gap-1 sa-card px-1 py-1">
          {["All", "PDF", "DOCX"].map((t) => (
            <button key={t} onClick={() => setFilterType(t)}
              className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
              style={{ background: filterType === t ? "var(--ink-btn)" : "transparent", color: filterType === t ? "var(--ink-btn-text)" : "var(--text)" }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-sm" style={{ color: "var(--muted)" }}>Loading documents...</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={FileText} title="No documents found" description="Try a different search term or upload new study material."
          action={<button onClick={() => go("upload")} className="sa-btn-accent px-4 py-2 text-sm">Upload Study Material</button>} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((d) => {
            const isCompleted = d.status === "completed";
            const isFailed = d.status === "failed";
            const isProcessing = !isCompleted && !isFailed;
            const badgeTone = isCompleted ? "success" : isFailed ? "danger" : "info";

            return (
              <div key={d.id} className="sa-card p-4 flex flex-col relative">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-2 min-w-0">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "var(--chip-bg)" }}>
                      <FileText size={16} color="var(--accent)" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate" title={d.filename || d.name}>{d.filename || d.name}</div>
                      <div className="text-xs" style={{ color: "var(--muted)" }}>{(d.file_size / 1024 / 1024).toFixed(2)} MB</div>
                    </div>
                  </div>
                  <button onClick={() => setConfirmDelete(d.id)} className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 flex-shrink-0" title="Delete document">
                    <Trash2 size={14} color="var(--muted)" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <Badge tone={badgeTone}>
                    {isProcessing && <span className="inline-block w-2 h-2 rounded-full bg-current mr-1 animate-pulse" />}
                    {d.status}
                  </Badge>
                  <span className="text-xs" style={{ color: "var(--muted)" }}>{new Date(d.created_at).toLocaleDateString()}</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-auto">
                  {isCompleted ? (
                    <>
                      <button 
                        onClick={() => { selectDoc(d); go("document-study"); }} 
                        className="sa-btn-primary text-xs py-2 font-medium"
                      >
                        Study Topics
                      </button>
                      <button 
                        onClick={() => { go("predict-paper", { importDoc: d }); }} 
                        className="sa-btn-outline text-xs py-2 font-medium flex items-center justify-center gap-1.5"
                        title="Use as resource to generate predicted examination paper"
                      >
                        <Sparkles size={13} className="text-amber-500" /> Predict Paper
                      </button>
                    </>
                  ) : isFailed ? (
                    <button 
                      onClick={() => handleReprocess(d.id)}
                      disabled={reprocessingId === d.id}
                      className="sa-btn-outline text-xs py-2 font-medium flex items-center justify-center gap-1.5"
                    >
                      <RotateCw size={13} className={reprocessingId === d.id ? "animate-spin" : ""} />
                      {reprocessingId === d.id ? "Retrying..." : "Retry Processing"}
                    </button>
                  ) : (
                    <div className="flex items-center justify-center py-2 text-xs font-medium rounded-lg border border-dashed" style={{ borderColor: "var(--line)", color: "var(--muted)" }}>
                      <span className="animate-pulse">Processing document...</span>
                    </div>
                  )}
                </div>

                {confirmDelete === d.id && (
                  <div className="absolute inset-0 rounded-[14px] flex flex-col items-center justify-center gap-3 p-4 text-center z-10" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
                    <AlertCircle size={20} color="var(--danger)" />
                    <p className="text-sm font-medium">Delete "{d.filename}"?</p>
                    <p className="text-xs" style={{ color: "var(--muted)" }}>This will remove all associated flashcards and chat context.</p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setConfirmDelete(null)} 
                        disabled={deletingId === d.id}
                        className="sa-btn-outline text-xs px-3 py-1.5"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => handleDelete(d.id)}
                        disabled={deletingId === d.id}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium text-white flex items-center gap-1"
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
