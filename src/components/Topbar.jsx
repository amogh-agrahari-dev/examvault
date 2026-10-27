import React, { useState, useEffect, useRef } from "react";
import { 
  Menu, 
  Search, 
  Bell, 
  User, 
  X, 
  Loader2, 
  Users, 
  MessageSquare, 
  FileText, 
  BookOpen, 
  ArrowRight,
  ExternalLink,
  Award
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "../context/AuthContext";
import { globalSearch } from "../services/api";

function Topbar({ 
  title, 
  subtitle, 
  onMenuClick, 
  go, 
  selectDoc, 
  setSelectedNoteId, 
  onOpenProfile, 
  accessToken 
}) {
  const [accountOpen, setAccountOpen] = useState(false);
  const [notifsOpen, setNotifsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSearchVisible, setMobileSearchVisible] = useState(false);

  const { user, logout } = useAuth();
  const initials = user?.full_name?.slice(0, 2).toUpperCase() || "EV";

  const searchContainerRef = useRef(null);
  const searchInputRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const accountMenuRef = useRef(null);
  const notifsMenuRef = useRef(null);

  // Global keyboard shortcut: Cmd+K / Ctrl+K and Escape dismiss
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
      } else if (e.key === "Escape") {
        setSearchOpen(false);
        setMobileSearchVisible(false);
        setAccountOpen(false);
        setNotifsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Click outside listener to dismiss search dropdown, account menu, and notifs
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target)) {
        setAccountOpen(false);
      }
      if (notifsMenuRef.current && !notifsMenuRef.current.contains(e.target)) {
        setNotifsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search trigger
  const handleQueryChange = (val) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setSearchOpen(true);
    setIsSearching(true);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const data = await globalSearch(val.trim(), accessToken);
        setSearchResults(data);
      } catch (err) {
        console.error("Global search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 280);
  };

  const handleSelectUser = (targetUserId) => {
    setSearchOpen(false);
    setMobileSearchVisible(false);
    setSearchQuery("");
    if (onOpenProfile) {
      onOpenProfile(targetUserId);
    } else if (go) {
      go("profile", { userId: targetUserId });
    }
  };

  const handleSelectDiscussion = (disc) => {
    setSearchOpen(false);
    setMobileSearchVisible(false);
    setSearchQuery("");
    if (go) {
      go("group-discussions", { discussionId: disc.id });
    }
  };

  const handleSelectDoc = (doc) => {
    setSearchOpen(false);
    setMobileSearchVisible(false);
    setSearchQuery("");
    if (selectDoc) selectDoc(doc);
    if (go) go("document-study");
  };

  const handleSelectNote = (note) => {
    setSearchOpen(false);
    setMobileSearchVisible(false);
    setSearchQuery("");
    if (setSelectedNoteId) setSelectedNoteId(note.id);
    if (go) go("note-editor");
  };

  const hasAnyResults = searchResults && (
    (searchResults.users?.length || 0) > 0 ||
    (searchResults.discussions?.length || 0) > 0 ||
    (searchResults.documents?.length || 0) > 0 ||
    (searchResults.notes?.length || 0) > 0
  );

  return (
    <div className="sa-card border-x-0 border-t-0 px-4 md:px-8 py-3.5 flex items-center justify-between flex-shrink-0 relative z-30" style={{ borderRadius: 0 }}>
      {/* Title / Mobile Menu */}
      <div className="flex items-center gap-3 min-w-0">
        <button className="md:hidden sa-btn-outline p-2" onClick={onMenuClick}>
          <Menu size={18} />
        </button>
        <div className="min-w-0">
          <h1 className="sa-serif text-lg md:text-xl font-semibold truncate text-[var(--text)]">{title}</h1>
          {subtitle && <p className="text-xs md:text-sm truncate text-[var(--muted)]">{subtitle}</p>}
        </div>
      </div>

      {/* Center / Right: Global Search & Controls */}
      <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
        
        {/* Mobile Search Toggle Button */}
        <button
          className="md:hidden sa-btn-outline p-2"
          onClick={() => {
            setMobileSearchVisible(prev => !prev);
            setTimeout(() => searchInputRef.current?.focus(), 100);
          }}
          title="Search ExamVault"
        >
          <Search size={16} />
        </button>

        {/* Global Search Container */}
        <div 
          ref={searchContainerRef} 
          className={`
            ${mobileSearchVisible 
              ? 'absolute left-2 right-2 top-2 p-2 bg-[var(--surface)] shadow-2xl rounded-2xl border z-50 flex flex-col' 
              : 'hidden md:flex relative'
            }
          `}
          style={mobileSearchVisible ? { borderColor: "var(--line)" } : undefined}
        >
          <div 
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all focus-within:ring-2 focus-within:ring-[var(--accent)]/40"
            style={{ 
              background: "var(--input-bg)", 
              borderColor: "var(--line)", 
              width: mobileSearchVisible ? "100%" : 290 
            }}
          >
            {isSearching ? (
              <Loader2 size={15} className="animate-spin text-[var(--accent)] shrink-0" />
            ) : (
              <Search size={15} color="var(--muted)" className="shrink-0" />
            )}

            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleQueryChange(e.target.value)}
              onFocus={() => { if (searchQuery.trim()) setSearchOpen(true); }}
              placeholder="Search users, topics, notes..."
              className="bg-transparent text-sm outline-none w-full text-[var(--text)] placeholder-[var(--muted)]"
            />

            {searchQuery ? (
              <button 
                onClick={() => { setSearchQuery(""); setSearchResults(null); setSearchOpen(false); }}
                className="text-[var(--muted)] hover:text-[var(--text)] p-0.5"
              >
                <X size={14} />
              </button>
            ) : (
              <kbd 
                className="hidden lg:inline-block text-[10px] font-sans px-1.5 py-0.5 rounded border text-[var(--muted)]"
                style={{ borderColor: "var(--line)", background: "var(--surface)" }}
              >
                ⌘K
              </kbd>
            )}

            {mobileSearchVisible && (
              <button
                onClick={() => setMobileSearchVisible(false)}
                className="text-xs text-[var(--muted)] hover:text-[var(--text)] ml-1 font-semibold"
              >
                Done
              </button>
            )}
          </div>

          {/* Search Results Dropdown Overlay */}
          {searchOpen && searchQuery.trim() && (
            <div 
              className="absolute left-0 top-full mt-2 w-full md:w-[460px] max-h-[460px] overflow-y-auto sa-scroll sa-card rounded-2xl shadow-2xl border p-2 z-50 sa-fade-in divide-y"
              style={{ borderColor: "var(--line)" }}
            >
              {isSearching && !searchResults && (
                <div className="py-8 text-center text-xs text-[var(--muted)] flex items-center justify-center gap-2">
                  <Loader2 size={14} className="animate-spin text-[var(--accent)]" />
                  Searching across ExamVault...
                </div>
              )}

              {!isSearching && searchResults && !hasAnyResults && (
                <div className="py-8 text-center text-xs text-[var(--muted)]">
                  No scholars, discussions, or study materials matching "{searchQuery}".
                </div>
              )}

              {/* 1. Users / Scholars Section */}
              {searchResults?.users?.length > 0 && (
                <div className="py-2 first:pt-0">
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--accent)] flex items-center gap-1.5">
                    <Users size={12} />
                    Scholars & Peers ({searchResults.users.length})
                  </div>
                  <div className="space-y-1">
                    {searchResults.users.map((u) => (
                      <div
                        key={u.id}
                        onClick={() => handleSelectUser(u.id)}
                        className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[var(--surface-hover)] cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-xs flex-shrink-0"
                            style={{ background: "linear-gradient(135deg, var(--accent) 0%, #D97706 100%)" }}
                          >
                            {u.full_name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold truncate text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
                              {u.full_name}
                            </div>
                            <div className="text-[11px] text-[var(--muted)] flex items-center gap-2">
                              <span className="capitalize">{u.role}</span>
                              <span>•</span>
                              <span className="text-[var(--accent)] font-medium">{u.reputation_credits} Credits</span>
                            </div>
                          </div>
                        </div>

                        <span className="text-xs text-[var(--muted)] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          View profile <ArrowRight size={12} />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Discussions Section */}
              {searchResults?.discussions?.length > 0 && (
                <div className="py-2">
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--accent)] flex items-center gap-1.5">
                    <MessageSquare size={12} />
                    Discussions & Study Rooms ({searchResults.discussions.length})
                  </div>
                  <div className="space-y-1">
                    {searchResults.discussions.map((d) => (
                      <div
                        key={d.id}
                        onClick={() => handleSelectDiscussion(d)}
                        className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[var(--surface-hover)] cursor-pointer transition-colors group"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="text-sm font-semibold truncate text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
                            {d.title}
                          </div>
                          <div className="text-[11px] text-[var(--muted)] flex items-center gap-2 mt-0.5">
                            {d.topic_name && <span className="truncate max-w-[180px]">{d.topic_name}</span>}
                            <span>•</span>
                            <span>{d.member_count} members</span>
                          </div>
                        </div>
                        <span className="text-xs text-[var(--muted)] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          Join room <ArrowRight size={12} />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Documents Section */}
              {searchResults?.documents?.length > 0 && (
                <div className="py-2">
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--accent)] flex items-center gap-1.5">
                    <BookOpen size={12} />
                    Study Documents ({searchResults.documents.length})
                  </div>
                  <div className="space-y-1">
                    {searchResults.documents.map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => handleSelectDoc(doc)}
                        className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[var(--surface-hover)] cursor-pointer transition-colors group"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="text-sm font-semibold truncate text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
                            {doc.filename}
                          </div>
                          <div className="text-[11px] text-[var(--muted)] mt-0.5">
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-[var(--surface-subtle)] border border-[var(--line)]">
                              {doc.document_type}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs text-[var(--muted)] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          Study <ArrowRight size={12} />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Notes Section */}
              {searchResults?.notes?.length > 0 && (
                <div className="py-2">
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--accent)] flex items-center gap-1.5">
                    <FileText size={12} />
                    Notes ({searchResults.notes.length})
                  </div>
                  <div className="space-y-1">
                    {searchResults.notes.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleSelectNote(n)}
                        className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[var(--surface-hover)] cursor-pointer transition-colors group"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="text-sm font-semibold truncate text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
                            {n.title}
                          </div>
                          {n.content_preview && (
                            <div className="text-[11px] text-[var(--muted)] truncate mt-0.5">
                              {n.content_preview}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-[var(--muted)] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          Open note <ArrowRight size={12} />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications Popover */}
        <div className="relative" ref={notifsMenuRef}>
          <button 
            type="button"
            onClick={() => setNotifsOpen((prev) => !prev)}
            className="sa-btn-outline p-2 relative" 
            title="Notifications" 
            aria-label="Notifications"
            aria-expanded={notifsOpen}
          >
            <Bell size={16} />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} />
          </button>

          {notifsOpen && (
            <div 
              role="dialog"
              aria-label="Notifications"
              className="absolute right-0 top-11 z-50 w-72 sm:w-80 sa-card p-3 shadow-2xl sa-fade-in border rounded-2xl" 
              style={{ borderColor: "var(--line)" }}
            >
              <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: "var(--line)" }}>
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">Notifications</span>
                <span className="text-[10px] font-semibold text-[var(--accent)] px-2 py-0.5 rounded-full" style={{ background: "var(--accent-soft)" }}>
                  {user?.reputation_credits ?? 0} Credits
                </span>
              </div>
              <div className="py-3 text-left space-y-2 text-xs">
                <div className="p-2 rounded-xl bg-[var(--surface-subtle)] flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: "var(--accent)" }} />
                  <div>
                    <div className="font-semibold text-[var(--text)]">Welcome to ExamVault</div>
                    <div className="text-[11px] text-[var(--muted)] mt-0.5">
                      Upload your course notes, generate quizzes, and start active study sessions.
                    </div>
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t text-center" style={{ borderColor: "var(--line)" }}>
                <button
                  type="button"
                  onClick={() => setNotifsOpen(false)}
                  className="text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] py-1"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Account Menu */}
        <div className="relative" ref={accountMenuRef}>
          <button 
            type="button"
            onClick={() => setAccountOpen((open) => !open)} 
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-xs transition-transform hover:scale-105" 
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }} 
            aria-label="Open account menu" 
            aria-expanded={accountOpen}
          >
            {user ? <span className="text-xs">{initials}</span> : <User size={14} />}
          </button>

          {accountOpen && (
            <div 
              role="menu"
              className="absolute right-0 top-11 z-50 w-56 sa-card p-2 shadow-2xl sa-fade-in border rounded-2xl" 
              style={{ borderColor: "var(--line)" }}
            >
              <div className="px-3 py-2.5 border-b mb-1" style={{ borderColor: "var(--line)" }}>
                <div className="text-sm font-bold truncate text-[var(--text)]">{user?.full_name || "Account"}</div>
                <div className="text-xs truncate text-[var(--muted)]">{user?.email}</div>
                <div className="text-xs mt-1.5 flex items-center gap-1 font-semibold text-[var(--accent)]">
                  <Award size={13} />
                  {user?.reputation_credits ?? 0} Vault Credits
                </div>
              </div>

              {/* View My Profile */}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setAccountOpen(false);
                  if (onOpenProfile) onOpenProfile(user?.id);
                  else if (go) go("profile", { userId: user?.id });
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold hover:bg-[var(--surface-subtle)] flex items-center justify-between text-[var(--text)] transition-colors"
              >
                <span>View My Profile</span>
                <ExternalLink size={12} className="text-[var(--muted)]" />
              </button>

              <button 
                type="button"
                role="menuitem"
                onClick={logout} 
                className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold hover:bg-[var(--surface-subtle)] transition-colors" 
                style={{ color: "var(--danger)" }}
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Topbar;
