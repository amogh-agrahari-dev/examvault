import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Plus, Search, PenLine, Trash2, Edit2, Calendar, BookOpen,
  Image as ImageIcon, Grid, List as ListIcon, X, AlertCircle,
  ArrowRight, Sparkles, Filter, SlidersHorizontal, Clock, ArrowUpRight,
  Pin, Star, Folder, FolderOpen, PanelLeft, PanelLeftClose, ChevronDown,
  Check, MoreVertical, FileText, Maximize2, Minimize2, ExternalLink,
  Layers, RefreshCw, Download
} from "lucide-react";
import { getNotes, getNote, createNote, deleteNote, renameNote, request, getNoteImageUrl } from "../services/api";
import { exportNoteToPdf } from "../services/pdfExport";
import { SkeletonCard, EmptyState, Badge } from "./UI";

export default function NotesDashboard({ go, showToast, accessToken, onOpenNote }) {
  const [notes, setNotes] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [activeFolderFilter, setActiveFolderFilter] = useState("all"); // 'all', 'pinned', 'diagrams', 'recent', or subject id
  const [sortBy, setSortBy] = useState("updated_desc"); // updated_desc, title_asc, updated_asc
  const [viewMode, setViewMode] = useState(() => localStorage.getItem("examvault_notes_view_mode") || "grid"); // grid, list
  const [sidebarOpen, setSidebarOpen] = useState(() => localStorage.getItem("examvault_notes_sidebar_open") !== "false");
  const [isMaximized, setIsMaximized] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Pinned notes stored in localStorage
  const [pinnedNoteIds, setPinnedNoteIds] = useState(() => {
    try {
      const saved = localStorage.getItem("examvault_pinned_notes");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Rename modal state
  const [renameTarget, setRenameTarget] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const searchInputRef = useRef(null);

  // Save preferences
  useEffect(() => {
    localStorage.setItem("examvault_notes_view_mode", viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem("examvault_notes_sidebar_open", String(sidebarOpen));
  }, [sidebarOpen]);

  useEffect(() => {
    localStorage.setItem("examvault_pinned_notes", JSON.stringify(pinnedNoteIds));
  }, [pinnedNoteIds]);

  // Fetch notes & subjects
  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [notesData, subjectsData] = await Promise.all([
        getNotes(accessToken),
        request("/subjects", { headers: { Authorization: `Bearer ${accessToken}` } }).catch(() => [])
      ]);
      setNotes(notesData || []);
      setSubjects(subjectsData || []);
    } catch (err) {
      console.error("Failed to load notes dashboard:", err);
      setError("Unable to load your notes. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [accessToken]);

  // Global macOS Keyboard Shortcuts (⌘N to new note, ⌘F to search, Esc to dismiss)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // ⌘N or Ctrl+N -> New Note
      if ((e.metaKey || e.ctrlKey) && (e.key === "n" || e.key === "N")) {
        e.preventDefault();
        handleCreateNote();
      }
      // ⌘F or Ctrl+F -> Focus Search
      if ((e.metaKey || e.ctrlKey) && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // Esc -> Clear search or close modals
      if (e.key === "Escape") {
        if (renameTarget) setRenameTarget(null);
        else if (deleteTarget) setDeleteTarget(null);
        else if (search) setSearch("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [renameTarget, deleteTarget, search, isCreating, selectedSubject]);

  // Toggle pinned note
  const togglePinNote = (noteId, e) => {
    if (e) e.stopPropagation();
    setPinnedNoteIds((prev) => {
      const isPinned = prev.includes(noteId);
      const updated = isPinned ? prev.filter((id) => id !== noteId) : [noteId, ...prev];
      if (showToast) showToast(isPinned ? "Note unpinned" : "Note pinned to top 📌");
      return updated;
    });
  };

  // Handle instant note creation
  const handleCreateNote = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const initialSubjectId = selectedSubject ? selectedSubject : null;
      const initialNote = await createNote(
        {
          title: "Untitled Revision Note",
          subject_id: initialSubjectId,
          content: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: []
              }
            ]
          },
          content_text: "",
        },
        accessToken
      );
      if (initialNote && initialNote.id) {
        if (showToast) showToast("New note created!");
        onOpenNote(initialNote.id);
      }
    } catch (err) {
      console.error("Failed to create note:", err);
      if (showToast) showToast("Failed to create note. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  // Handle rename submission
  const handleRenameSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!renameTarget || !newTitle.trim()) return;
    setIsRenaming(true);
    try {
      const updated = await renameNote(renameTarget.id, newTitle.trim(), accessToken);
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? { ...n, title: updated.title } : n)));
      if (showToast) showToast("Note renamed");
      setRenameTarget(null);
    } catch (err) {
      console.error("Rename failed:", err);
      if (showToast) showToast("Failed to rename note");
    } finally {
      setIsRenaming(false);
    }
  };

  // Handle delete submission
  const handleDeleteSubmit = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteNote(deleteTarget.id, accessToken);
      setNotes((prev) => prev.filter((n) => n.id !== deleteTarget.id));
      setPinnedNoteIds((prev) => prev.filter((id) => id !== deleteTarget.id));
      if (showToast) showToast("Note moved to Trash");
      setDeleteTarget(null);
    } catch (err) {
      console.error("Delete failed:", err);
      if (showToast) showToast("Failed to delete note");
    } finally {
      setIsDeleting(false);
    }
  };

  // Quick PDF Export directly from dashboard
  const handleExportPdfFromDashboard = async (noteItem, e) => {
    if (e) e.stopPropagation();
    const safeTitle = noteItem.title || "Revision Note";
    if (showToast) showToast(`Exporting "${safeTitle}" to PDF...`);
    try {
      // Fetch full note details if available
      const fullNote = await getNote(noteItem.id, accessToken).catch(() => noteItem);
      const tempDiv = document.createElement("div");
      tempDiv.className = "examvault-pdf-document";
      tempDiv.style.padding = "24px";
      tempDiv.style.background = "#ffffff";
      tempDiv.style.color = "#1c2130";
      tempDiv.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

      const subjectName = fullNote.subject_name || noteItem.subject_name;
      const topicName = fullNote.topic_name || noteItem.topic_name;
      const bodyText = fullNote.content_text || noteItem.content_text || "No text written yet.";

      tempDiv.innerHTML = `
        <div style="border-bottom: 2px solid #e8a33d; padding-bottom: 12px; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-weight: 800; font-size: 10pt; color: #e8a33d; letter-spacing: 0.5px;">EXAMVAULT REVISION NOTES</span>
            <span style="font-size: 9pt; color: #6b7280;">${new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
          </div>
          <h1 style="font-size: 22pt; font-weight: 800; color: #14213d; margin: 4px 0 8px 0; line-height: 1.2;">
            ${safeTitle}
          </h1>
          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 6px;">
            ${subjectName ? `<span style="font-size: 9pt; font-weight: 600; background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 999px;">${subjectName}</span>` : ""}
            ${topicName ? `<span style="font-size: 9pt; font-weight: 600; background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 999px;">${topicName}</span>` : ""}
          </div>
        </div>
        ${fullNote.thumbnail_url ? `<div style="margin-bottom: 18px;"><img src="${getNoteImageUrl(fullNote.thumbnail_url, accessToken)}" style="max-width: 100%; border-radius: 8px; border: 1px solid #e7e4da;" /></div>` : ""}
        <div style="font-size: 11pt; line-height: 1.65; white-space: pre-wrap;">
          ${bodyText}
        </div>
      `;

      await exportNoteToPdf(safeTitle, tempDiv);
      if (showToast) showToast("PDF downloaded! 📄");
    } catch (err) {
      console.error("Dashboard PDF export failed:", err);
      if (showToast) showToast("Failed to export PDF");
    }
  };

  // Counts
  const counts = useMemo(() => {
    const total = notes.length;
    const pinned = notes.filter((n) => pinnedNoteIds.includes(n.id)).length;
    const diagrams = notes.filter((n) => !!n.thumbnail_url).length;
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recent = notes.filter((n) => new Date(n.updated_at).getTime() >= sevenDaysAgo).length;
    return { total, pinned, diagrams, recent };
  }, [notes, pinnedNoteIds]);

  // Filter and sort notes
  const filteredNotes = useMemo(() => {
    return notes
      .filter((n) => {
        // Smart folder filter
        if (activeFolderFilter === "pinned" && !pinnedNoteIds.includes(n.id)) {
          return false;
        }
        if (activeFolderFilter === "diagrams" && !n.thumbnail_url) {
          return false;
        }
        if (activeFolderFilter === "recent") {
          const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          if (new Date(n.updated_at).getTime() < sevenDaysAgo) return false;
        }
        // Subject filter
        if (selectedSubject && n.subject_id !== selectedSubject) {
          return false;
        }
        // Search query
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          const matchTitle = (n.title || "").toLowerCase().includes(q);
          const matchContent = (n.content_text || "").toLowerCase().includes(q);
          const matchSubject = (n.subject_name || "").toLowerCase().includes(q);
          return matchTitle || matchContent || matchSubject;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "title_asc") {
          return (a.title || "").localeCompare(b.title || "");
        }
        if (sortBy === "updated_asc") {
          return new Date(a.updated_at) - new Date(b.updated_at);
        }
        return new Date(b.updated_at) - new Date(a.updated_at);
      });
  }, [notes, search, selectedSubject, activeFolderFilter, pinnedNoteIds, sortBy]);

  // Split into pinned and unpinned (when viewing 'all' or no explicit pinned filter)
  const { pinnedGroup, unpinnedGroup } = useMemo(() => {
    if (activeFolderFilter === "pinned") {
      return { pinnedGroup: filteredNotes, unpinnedGroup: [] };
    }
    const pinned = [];
    const unpinned = [];
    filteredNotes.forEach((n) => {
      if (pinnedNoteIds.includes(n.id)) {
        pinned.push(n);
      } else {
        unpinned.push(n);
      }
    });
    return { pinnedGroup: pinned, unpinnedGroup: unpinned };
  }, [filteredNotes, pinnedNoteIds, activeFolderFilter]);

  // Format date macOS style
  const formatDate = (isoString) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      const now = new Date();
      const diffMs = now - d;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  return (
    <div className="sa-fade-in space-y-6">
      {/* =========================================================================
          ExamVault Page Header (Seamless Website Integration)
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="sa-serif text-2xl font-semibold">Quick Revision Notes</h2>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            {counts.total} notes · Clean, distraction-free study notes with runnable C++ & visual diagrams
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* Segmented View Switcher (Mac-inspired clean pill, ExamVault themed) */}
          <div className="flex items-center p-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] shadow-2xs">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === "grid"
                  ? "bg-[var(--ink-btn)] text-[var(--ink-btn-text)] shadow-xs font-semibold"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
              title="Gallery View"
            >
              <Grid size={13} />
              <span className="hidden md:inline">Gallery</span>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === "list"
                  ? "bg-[var(--ink-btn)] text-[var(--ink-btn-text)] shadow-xs font-semibold"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
              title="List View"
            >
              <ListIcon size={13} />
              <span className="hidden md:inline">List</span>
            </button>
          </div>

          {/* ExamVault Primary Action Button: New Note */}
          <button
            id="btn-create-note-header"
            onClick={handleCreateNote}
            disabled={isCreating}
            className="sa-btn-accent px-4 py-2 text-sm flex items-center gap-2 shadow-sm active:scale-98 transition-all disabled:opacity-50"
            title="Create a new note (⌘N)"
          >
            <PenLine size={15} />
            <span>{isCreating ? "Creating..." : "New Note"}</span>
            <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] rounded bg-black/15 font-mono">
              ⌘N
            </kbd>
          </button>
        </div>
      </div>

      {/* =========================================================================
          Workspace Card: Folder Sidebar + Notes Workspace
          ========================================================================= */}
      <div className="sa-card overflow-hidden flex flex-col md:flex-row min-h-[640px] border border-[var(--line)]">
        
        {/* Left Pane: Minimalist Folder & Subject Navigation Sidebar */}
        {sidebarOpen && (
          <aside className="w-full md:w-60 lg:w-64 flex-shrink-0 flex flex-col justify-between p-3 select-none border-b md:border-b-0 md:border-r border-[var(--line)] bg-[var(--surface-subtle)]/40 transition-all duration-200">
            <div className="space-y-4 overflow-y-auto sa-scroll pr-1">
              {/* Section 1: Quick Access / Smart Folders */}
              <div>
                <div className="text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase px-2 mb-1.5 opacity-80">
                  Quick Access
                </div>
                <div className="space-y-1">
                  {/* All Notes */}
                  <div
                    onClick={() => {
                      setActiveFolderFilter("all");
                      setSelectedSubject("");
                    }}
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                      activeFolderFilter === "all" && !selectedSubject
                        ? "bg-[var(--accent-soft)] text-[var(--accent)] font-semibold shadow-2xs"
                        : "text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                  >
                    <FileText size={15} className={activeFolderFilter === "all" && !selectedSubject ? "text-[var(--accent)]" : "text-[var(--muted)]"} />
                    <span className="flex-1 truncate">All Notes</span>
                    <span className="text-[11px] opacity-75 font-mono">{counts.total}</span>
                  </div>

                  {/* Pinned Notes */}
                  <div
                    onClick={() => {
                      setActiveFolderFilter("pinned");
                      setSelectedSubject("");
                    }}
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                      activeFolderFilter === "pinned"
                        ? "bg-[var(--accent-soft)] text-[var(--accent)] font-semibold shadow-2xs"
                        : "text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                  >
                    <Pin size={15} className={activeFolderFilter === "pinned" ? "text-[var(--accent)] fill-[var(--accent)]" : "text-amber-500"} />
                    <span className="flex-1 truncate">Pinned</span>
                    <span className="text-[11px] opacity-75 font-mono">{counts.pinned}</span>
                  </div>

                  {/* With Diagrams */}
                  <div
                    onClick={() => {
                      setActiveFolderFilter("diagrams");
                      setSelectedSubject("");
                    }}
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                      activeFolderFilter === "diagrams"
                        ? "bg-[var(--accent-soft)] text-[var(--accent)] font-semibold shadow-2xs"
                        : "text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                  >
                    <ImageIcon size={15} className={activeFolderFilter === "diagrams" ? "text-[var(--accent)]" : "text-emerald-500"} />
                    <span className="flex-1 truncate">With Diagrams</span>
                    <span className="text-[11px] opacity-75 font-mono">{counts.diagrams}</span>
                  </div>

                  {/* Recent Revisions */}
                  <div
                    onClick={() => {
                      setActiveFolderFilter("recent");
                      setSelectedSubject("");
                    }}
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                      activeFolderFilter === "recent"
                        ? "bg-[var(--accent-soft)] text-[var(--accent)] font-semibold shadow-2xs"
                        : "text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                  >
                    <Clock size={15} className={activeFolderFilter === "recent" ? "text-[var(--accent)]" : "text-purple-500"} />
                    <span className="flex-1 truncate">Recent (7d)</span>
                    <span className="text-[11px] opacity-75 font-mono">{counts.recent}</span>
                  </div>
                </div>
              </div>

              {/* Section 2: Vault Subjects (Folders) */}
              <div>
                <div className="flex items-center justify-between px-2 mb-1.5">
                  <span className="text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase opacity-80">
                    Subjects ({subjects.length})
                  </span>
                </div>
                <div className="space-y-1">
                  {subjects.length === 0 ? (
                    <div className="px-2 py-3 text-xs text-[var(--muted)] italic text-center">
                      No subjects configured
                    </div>
                  ) : (
                    subjects.map((sub) => {
                      const count = notes.filter((n) => n.subject_id === sub.id).length;
                      const isSelected = selectedSubject === sub.id;
                      return (
                        <div
                          key={sub.id}
                          onClick={() => {
                            setSelectedSubject(isSelected ? "" : sub.id);
                            setActiveFolderFilter("subject");
                          }}
                          className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-[var(--accent-soft)] text-[var(--accent)] font-semibold shadow-2xs"
                              : "text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/5"
                          }`}
                        >
                          {isSelected ? (
                            <FolderOpen size={15} className="text-[var(--accent)]" />
                          ) : (
                            <Folder size={15} className="text-amber-500/80" />
                          )}
                          <span className="flex-1 truncate">{sub.name}</span>
                          <span className="text-[11px] opacity-75 font-mono">{count}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar Footer Info */}
            <div className="pt-3 border-t border-[var(--line)] text-[11px] text-[var(--muted)] flex items-center justify-between px-1">
              <span className="truncate">Vault Notes Engine</span>
              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Synced
              </span>
            </div>
          </aside>
        )}

        {/* Right Pane: Main Notes Content Workspace */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[var(--surface)]">
          
          {/* Top Search & Filter Bar */}
          <div className="p-3.5 sm:px-5 border-b border-[var(--line)] bg-[var(--surface)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Sidebar toggle + Search Field */}
            <div className="flex items-center gap-2.5 flex-1 max-w-lg">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className={`p-2 rounded-lg border border-[var(--line)] transition-all ${
                  sidebarOpen
                    ? "bg-[var(--chip-bg)] text-[var(--text)]"
                    : "text-[var(--muted)] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--text)]"
                }`}
                title={sidebarOpen ? "Hide Folder Sidebar" : "Show Folder Sidebar"}
              >
                {sidebarOpen ? <PanelLeftClose size={15} /> : <PanelLeft size={15} />}
              </button>

              <div className="relative flex-1">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--muted)]"
                />
                <input
                  ref={searchInputRef}
                  id="input-search-notes"
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search titles, formulas, content..."
                  className="w-full h-9 pl-9 pr-14 text-xs bg-[var(--input-bg)] text-[var(--text)] placeholder-[var(--muted)] rounded-lg border border-[var(--line)] focus:border-[var(--accent)] outline-none transition-all"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {search ? (
                    <button
                      onClick={() => setSearch("")}
                      className="p-1 rounded text-[var(--muted)] hover:text-[var(--text)] text-xs"
                      title="Clear"
                    >
                      <X size={12} />
                    </button>
                  ) : (
                    <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] rounded bg-[var(--chip-bg)] text-[var(--muted)] font-mono">
                      ⌘F
                    </kbd>
                  )}
                </div>
              </div>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 self-end sm:self-center">
              <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                <SlidersHorizontal size={13} />
                <span className="hidden md:inline">Sort:</span>
              </div>
              <select
                id="select-sort-notes"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-9 px-3 text-xs font-medium bg-[var(--input-bg)] text-[var(--text)] rounded-lg border border-[var(--line)] outline-none cursor-pointer transition-colors"
              >
                <option value="updated_desc">Date Modified (Newest)</option>
                <option value="title_asc">Name (A → Z)</option>
                <option value="updated_asc">Date Modified (Oldest)</option>
              </select>
            </div>
          </div>

          {/* Active Filters Tag Pills (if any active) */}
          {(selectedSubject || activeFolderFilter !== "all" || search) && (
            <div className="px-5 py-2 bg-[var(--surface-subtle)]/50 border-b border-[var(--line)] flex items-center gap-2 text-xs flex-wrap">
              <span className="text-[11px] text-[var(--muted)] font-semibold uppercase tracking-wider">
                Active Filter:
              </span>
              {activeFolderFilter !== "all" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] font-medium border border-[var(--accent)]/20">
                  <span>Filter: {activeFolderFilter}</span>
                  <button onClick={() => setActiveFolderFilter("all")} className="hover:opacity-75">
                    <X size={11} />
                  </button>
                </span>
              )}
              {selectedSubject && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium border border-amber-500/20">
                  <span>Folder: {subjects.find((s) => s.id === selectedSubject)?.name || "Subject"}</span>
                  <button onClick={() => setSelectedSubject("")} className="hover:opacity-75">
                    <X size={11} />
                  </button>
                </span>
              )}
              {search && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--chip-bg)] text-[var(--text)] font-medium border border-[var(--line)]">
                  <span>"{search}"</span>
                  <button onClick={() => setSearch("")} className="hover:opacity-75">
                    <X size={11} />
                  </button>
                </span>
              )}
              <button
                onClick={() => {
                  setSelectedSubject("");
                  setActiveFolderFilter("all");
                  setSearch("");
                }}
                className="text-[11px] underline text-[var(--muted)] hover:text-[var(--text)] ml-1"
              >
                Reset all
              </button>
            </div>
          )}

          {/* Notes Viewport (Scrollable Canvas) */}
          <div className="flex-1 overflow-y-auto sa-scroll p-4 sm:p-6 space-y-6">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : error ? (
              <div className="sa-card max-w-md mx-auto p-8 text-center my-12 border border-red-500/20">
                <AlertCircle size={36} className="text-[var(--danger)] mx-auto mb-3" />
                <h3 className="font-bold text-base mb-1 text-[var(--text)]">Failed to load notes</h3>
                <p className="text-xs mb-5 text-[var(--muted)]">{error}</p>
                <button
                  onClick={fetchDashboardData}
                  className="sa-btn-accent px-4 py-2 text-xs font-semibold rounded-lg shadow-sm"
                >
                  Try Again
                </button>
              </div>
            ) : notes.length === 0 ? (
              /* Empty State */
              <div className="my-16 max-w-md mx-auto text-center p-8 rounded-2xl border-2 border-dashed border-[var(--line)] bg-[var(--surface)]">
                <EmptyState
                  icon={PenLine}
                  title="No Quick Notes in Vault"
                  description="Create your first revision note to jot down formulas, key takeaways, and embed interactive flowchart diagrams."
                  action={
                    <button
                      id="btn-create-first-note"
                      onClick={handleCreateNote}
                      disabled={isCreating}
                      className="mt-3 sa-btn-accent px-4 py-2 text-xs font-semibold rounded-lg shadow-md flex items-center gap-1.5 mx-auto active:scale-98 transition-all"
                    >
                      <Plus size={14} />
                      <span>{isCreating ? "Creating..." : "Create Note (⌘N)"}</span>
                    </button>
                  }
                />
              </div>
            ) : filteredNotes.length === 0 ? (
              /* Zero Search Results */
              <div className="my-16 text-center max-w-sm mx-auto p-6 bg-[var(--surface)] rounded-2xl border border-[var(--line)]">
                <Search size={32} className="mx-auto mb-2.5 text-[var(--muted)] opacity-60" />
                <h4 className="font-semibold text-sm mb-1 text-[var(--text)]">No Matching Notes</h4>
                <p className="text-xs text-[var(--muted)] mb-4">
                  Try different keywords or clear your active folder filter.
                </p>
                <button
                  onClick={() => {
                    setSearch("");
                    setSelectedSubject("");
                    setActiveFolderFilter("all");
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg sa-btn-outline transition-colors"
                >
                  Clear Filter
                </button>
              </div>
            ) : viewMode === "grid" ? (
              /* Gallery (Grid View) */
              <div className="space-y-6">
                {/* 1. Pinned Section */}
                {pinnedGroup.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-[var(--muted)] uppercase tracking-wider px-1">
                      <Pin size={13} className="text-amber-500" />
                      <span>Pinned Notes ({pinnedGroup.length})</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {pinnedGroup.map((note) => (
                        <NoteGalleryCard
                          key={note.id}
                          note={note}
                          isPinned={true}
                          accessToken={accessToken}
                          onOpen={() => onOpenNote(note.id)}
                          onTogglePin={(e) => togglePinNote(note.id, e)}
                          onRename={(e) => {
                            e.stopPropagation();
                            setRenameTarget(note);
                            setNewTitle(note.title);
                          }}
                          onDelete={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(note);
                          }}
                          onExportPdf={(e) => handleExportPdfFromDashboard(note, e)}
                          formatDate={formatDate}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Unpinned Notes Section */}
                {unpinnedGroup.length > 0 && (
                  <div className="space-y-3">
                    {pinnedGroup.length > 0 && (
                      <div className="flex items-center gap-2 text-xs font-bold text-[var(--muted)] uppercase tracking-wider px-1 pt-2">
                        <FileText size={13} className="text-[var(--accent)]" />
                        <span>Notes ({unpinnedGroup.length})</span>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {unpinnedGroup.map((note) => (
                        <NoteGalleryCard
                          key={note.id}
                          note={note}
                          isPinned={false}
                          accessToken={accessToken}
                          onOpen={() => onOpenNote(note.id)}
                          onTogglePin={(e) => togglePinNote(note.id, e)}
                          onRename={(e) => {
                            e.stopPropagation();
                            setRenameTarget(note);
                            setNewTitle(note.title);
                          }}
                          onDelete={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(note);
                          }}
                          onExportPdf={(e) => handleExportPdfFromDashboard(note, e)}
                          formatDate={formatDate}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* List View */
              <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] overflow-hidden shadow-xs divide-y divide-[var(--line)]">
                {/* Table Column Headers */}
                <div className="grid grid-cols-12 px-4 py-2.5 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider bg-[var(--chip-bg)]">
                  <div className="col-span-6 sm:col-span-5">Name</div>
                  <div className="col-span-3 sm:col-span-3 hidden sm:block">Folder</div>
                  <div className="col-span-4 sm:col-span-3 text-right sm:text-left">Modified</div>
                  <div className="col-span-2 sm:col-span-1 text-right">Actions</div>
                </div>

                {filteredNotes.map((note) => {
                  const isPinned = pinnedNoteIds.includes(note.id);
                  return (
                    <div
                      key={note.id}
                      onClick={() => onOpenNote(note.id)}
                      className="grid grid-cols-12 px-4 py-3 items-center hover:bg-[var(--accent-soft)]/20 cursor-pointer transition-colors group text-xs"
                    >
                      {/* Name & Snippet */}
                      <div className="col-span-6 sm:col-span-5 flex items-center gap-2.5 min-w-0 pr-2">
                        <button
                          onClick={(e) => togglePinNote(note.id, e)}
                          className={`p-1 rounded hover:bg-black/8 dark:hover:bg-white/10 transition-colors ${
                            isPinned ? "text-amber-500" : "text-gray-300 dark:text-gray-600 group-hover:text-gray-400"
                          }`}
                          title={isPinned ? "Unpin" : "Pin to top"}
                        >
                          <Pin size={13} className={isPinned ? "fill-amber-500" : ""} />
                        </button>

                        {note.thumbnail_url ? (
                          <div className="w-8 h-8 rounded-md overflow-hidden bg-black/5 dark:bg-white/5 border border-[var(--line)] flex-shrink-0">
                            <img
                              src={getNoteImageUrl(note.thumbnail_url, accessToken)}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-md bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center flex-shrink-0 border border-[var(--accent)]/20">
                            <PenLine size={14} />
                          </div>
                        )}

                        <div className="min-w-0">
                          <h4 className="font-semibold text-[13px] text-[var(--text)] group-hover:text-[var(--accent)] truncate transition-colors">
                            {note.title || "Untitled Note"}
                          </h4>
                          <p className="text-[11px] text-[var(--muted)] truncate">
                            {note.content_text || <span className="italic opacity-60">Empty note</span>}
                          </p>
                        </div>
                      </div>

                      {/* Folder / Subject */}
                      <div className="col-span-3 sm:col-span-3 hidden sm:flex items-center gap-1.5 min-w-0">
                        {note.subject_name ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 truncate">
                            {note.subject_name}
                          </span>
                        ) : (
                          <span className="text-[11px] text-[var(--muted)]">General</span>
                        )}
                      </div>

                      {/* Modified Date */}
                      <div className="col-span-4 sm:col-span-3 text-right sm:text-left text-[11px] text-[var(--muted)]">
                        {formatDate(note.updated_at)}
                      </div>

                      {/* Row Actions */}
                      <div
                        className="col-span-2 sm:col-span-1 flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => handleExportPdfFromDashboard(note, e)}
                          className="p-1.5 rounded hover:bg-black/6 dark:hover:bg-white/10 text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
                          title="Export to PDF"
                        >
                          <Download size={13} />
                        </button>
                        <button
                          onClick={() => {
                            setRenameTarget(note);
                            setNewTitle(note.title);
                          }}
                          className="p-1.5 rounded hover:bg-black/6 dark:hover:bg-white/10 text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                          title="Rename"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(note)}
                          className="p-1.5 rounded hover:bg-red-500/10 text-[var(--muted)] hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom Status Bar */}
          <div className="h-9 px-4 border-t border-[var(--line)] bg-[var(--surface)] text-[11px] text-[var(--muted)] flex items-center justify-between select-none">
            <div className="flex items-center gap-3">
              <span>{filteredNotes.length} {filteredNotes.length === 1 ? "note" : "notes"}</span>
              {pinnedGroup.length > 0 && <span>· {pinnedGroup.length} pinned</span>}
              {counts.diagrams > 0 && <span>· {counts.diagrams} with diagrams</span>}
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 rounded bg-[var(--chip-bg)] font-mono text-[9px]">
                ⌘N New
              </kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-[var(--chip-bg)] font-mono text-[9px]">
                ⌘F Search
              </kbd>
            </div>
          </div>
        </main>
      </div>

      {/* =========================================================================
          Rename Note Modal (Clean ExamVault Dialog)
          ========================================================================= */}
      {renameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="sa-card max-w-sm w-full p-5 space-y-4 animate-scale-up border-[var(--line)] shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center flex-shrink-0">
                <Edit2 size={20} />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-[var(--text)]">Rename Note</h3>
                <p className="text-xs text-[var(--muted)]">
                  Enter a new title for this revision note.
                </p>
              </div>
            </div>

            <form onSubmit={handleRenameSubmit} className="space-y-3">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Note title..."
                autoFocus
                className="w-full h-9 px-3 text-xs bg-[var(--input-bg)] border border-[var(--line)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] rounded-lg outline-none text-[var(--text)] transition-all"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRenameTarget(null)}
                  className="sa-btn-outline px-3.5 py-1.5 text-xs rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRenaming || !newTitle.trim()}
                  className="sa-btn-accent px-4 py-1.5 text-xs font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50"
                >
                  {isRenaming ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          Delete Note Modal (Caution Dialog)
          ========================================================================= */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="sa-card max-w-sm w-full p-5 space-y-4 animate-scale-up border-[var(--line)] shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0">
                <Trash2 size={20} />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-[var(--text)]">Delete Note?</h3>
                <p className="text-xs text-[var(--muted)]">
                  Are you sure you want to delete <span className="font-semibold text-[var(--text)]">"{deleteTarget.title}"</span>? This will permanently remove its diagrams and revision content.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="sa-btn-outline px-3.5 py-1.5 text-xs rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={isDeleting}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[var(--danger)] hover:brightness-105 text-white shadow-sm transition-all disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Note Gallery Card Component (ExamVault Card with Clean Apple Precision)
// =============================================================================
function NoteGalleryCard({
  note,
  isPinned,
  accessToken,
  onOpen,
  onTogglePin,
  onRename,
  onDelete,
  onExportPdf,
  formatDate
}) {
  return (
    <div
      onClick={onOpen}
      className="sa-card flex flex-col justify-between overflow-hidden cursor-pointer group relative select-none hover:border-[var(--accent)] hover:shadow-md transition-all"
    >
      <div>
        {/* Card Header Preview Area */}
        {note.thumbnail_url ? (
          <div className="relative w-full h-36 bg-black/5 dark:bg-white/5 border-b border-[var(--line)] overflow-hidden flex items-center justify-center">
            <img
              src={getNoteImageUrl(note.thumbnail_url, accessToken)}
              alt="Diagram preview"
              className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-300"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-50" />
            <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-black/75 text-white backdrop-blur-xs flex items-center gap-1 shadow-xs">
              <ImageIcon size={10} /> Diagram
            </span>
          </div>
        ) : (
          /* Subtle ExamVault accent header strip */
          <div className="h-1.5 w-full bg-gradient-to-r from-[var(--accent)]/50 via-[var(--accent)] to-[var(--accent)]/50 opacity-70 group-hover:opacity-100 transition-opacity" />
        )}

        {/* Card Body */}
        <div className="p-3.5 space-y-2">
          {/* Top row: Subject Badge & Timestamp */}
          <div className="flex items-center justify-between gap-1.5 text-[11px]">
            <div className="flex items-center gap-1 min-w-0">
              {note.subject_name ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 truncate max-w-[120px]">
                  {note.subject_name}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--chip-bg)] text-[var(--muted)]">
                  General
                </span>
              )}
            </div>
            <span className="text-[10px] text-[var(--muted)] flex-shrink-0 font-medium">
              {formatDate(note.updated_at)}
            </span>
          </div>

          {/* Title */}
          <h4 className="font-semibold text-sm text-[var(--text)] group-hover:text-[var(--accent)] transition-colors line-clamp-1 leading-snug">
            {note.title || "Untitled Note"}
          </h4>

          {/* Body Snippet */}
          <p className="text-[11px] text-[var(--muted)] leading-relaxed line-clamp-3">
            {note.content_text ? (
              note.content_text
            ) : (
              <span className="italic opacity-60">No text written yet. Click to write notes.</span>
            )}
          </p>
        </div>
      </div>

      {/* Card Footer: Pin Indicator & Actions */}
      <div
        className="px-3.5 py-2 border-t border-[var(--line)] flex items-center justify-between bg-[var(--chip-bg)]/40 mt-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onTogglePin}
          className={`p-1 rounded hover:bg-black/6 dark:hover:bg-white/10 transition-colors ${
            isPinned ? "text-amber-500" : "text-gray-300 dark:text-gray-600 hover:text-amber-500"
          }`}
          title={isPinned ? "Unpin" : "Pin Note to Top"}
        >
          <Pin size={13} className={isPinned ? "fill-amber-500" : ""} />
        </button>

        {/* Action icons */}
        <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
          {onExportPdf && (
            <button
              onClick={onExportPdf}
              className="p-1 rounded hover:bg-black/6 dark:hover:bg-white/10 text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
              title="Export as PDF"
            >
              <Download size={12} />
            </button>
          )}
          <button
            onClick={onRename}
            className="p-1 rounded hover:bg-black/6 dark:hover:bg-white/10 text-[var(--muted)] hover:text-[var(--text)] transition-colors"
            title="Rename"
          >
            <Edit2 size={12} />
          </button>
          <button
            onClick={onDelete}
            className="p-1 rounded hover:bg-red-500/10 text-[var(--muted)] hover:text-red-500 transition-colors"
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
          <button
            onClick={onOpen}
            className="p-1 rounded hover:bg-[var(--accent-soft)] text-[var(--muted)] hover:text-[var(--accent)] transition-colors ml-0.5"
            title="Open Editor"
          >
            <ArrowUpRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
