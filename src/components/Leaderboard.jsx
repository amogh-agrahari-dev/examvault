import React, { useState, useEffect } from "react";
import { 
  Trophy, Medal, Award, Search, RefreshCw, ChevronRight, 
  HelpCircle, BookOpen, MessageSquare, FileText, Flame, X
} from "lucide-react";
import { getLeaderboard } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Leaderboard({ go, accessToken, onOpenProfile }) {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [filterScope, setFilterScope] = useState("all"); // "all", "top10", "top25"
  const [refreshing, setRefreshing] = useState(false);

  async function fetchLeaderboard() {
    try {
      setLoading(true);
      setError(null);
      const data = await getLeaderboard(accessToken, 50);
      setLeaderboard(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Leaderboard fetch error:", err);
      setError("Unable to load leaderboard at this moment.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchLeaderboard();
  }, [accessToken]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLeaderboard();
  };

  // Filter by search query
  let filteredUsers = leaderboard.filter((u) => 
    u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  // Apply scope filter
  if (filterScope === "top10") {
    filteredUsers = filteredUsers.slice(0, 10);
  } else if (filterScope === "top25") {
    filteredUsers = filteredUsers.slice(0, 25);
  }

  const topThree = leaderboard.slice(0, 3);
  const currentUserEntry = leaderboard.find((u) => u.is_current_user || u.id === user?.id);

  const handleUserClick = (userId) => {
    if (onOpenProfile) {
      onOpenProfile(userId);
    } else if (go) {
      go("profile", { userId });
    }
  };

  return (
    <div className="sa-fade-in space-y-5 sm:space-y-6 max-w-5xl mx-auto pb-12">
      {/* =========================================================================
          Editorial Header & Current Standing Snapshot
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span 
              className="text-xs font-semibold px-2.5 py-0.5 rounded-md inline-flex items-center gap-1.5"
              style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}
            >
              <Trophy size={13} />
              Academic Standing
            </span>
          </div>
          <h1 className="sa-serif text-2xl sm:text-3xl font-semibold text-[var(--text)]">
            Scholar Leaderboard
          </h1>
          <p className="text-xs sm:text-sm text-[var(--muted)] mt-1 max-w-xl leading-relaxed">
            Recognizing active students and peer contributors across ExamVault by earned Vault Credits.
          </p>
        </div>

        {/* Current User Standing Card */}
        {currentUserEntry && (
          <div 
            onClick={() => handleUserClick(currentUserEntry.id)}
            className="sa-card p-3 sm:p-4 flex items-center justify-between gap-3 sm:gap-4 shrink-0 shadow-xs cursor-pointer hover:border-[var(--accent)] transition-colors self-start sm:self-auto w-full sm:w-auto"
            title="Click to view your public profile"
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
                style={{ background: "var(--ink)", color: "var(--text-contrast)" }}
              >
                #{currentUserEntry.rank}
              </div>
              <div>
                <div className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">
                  Your Standing
                </div>
                <div className="text-xs sm:text-sm font-semibold text-[var(--text)]">
                  Rank #{currentUserEntry.rank} <span className="font-normal text-[var(--muted)]">of {leaderboard.length}</span>
                </div>
              </div>
            </div>

            <div 
              className="px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shrink-0"
              style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}
            >
              <Award size={14} />
              <span>{currentUserEntry.reputation_credits} Credits</span>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          Top 3 Podium (Mobile-Optimized 3-Column Display & Desktop View)
          ========================================================================= */}
      {!loading && topThree.length >= 3 && (
        <div className="pt-1">
          {/* Mobile & Desktop Unified Grid: #2 on left, #1 in center, #3 on right */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end">
            
            {/* Rank 2 (Silver) */}
            <div 
              onClick={() => handleUserClick(topThree[1].id)}
              className="sa-card p-2.5 sm:p-5 flex flex-col items-center text-center justify-between min-h-[170px] sm:min-h-[220px] cursor-pointer hover:border-slate-400 dark:hover:border-slate-500 transition-all hover:scale-[1.01] active:scale-[0.98] group relative"
              style={{ background: "var(--surface)" }}
            >
              {/* Rank Marker */}
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 flex items-center justify-center font-bold text-[11px] sm:text-xs shadow-xs mb-1.5 sm:mb-2">
                #2
              </div>

              {/* Avatar */}
              <div 
                className="w-11 h-11 sm:w-16 sm:h-16 rounded-full flex items-center justify-center font-bold text-xs sm:text-base text-white shadow-xs mb-1.5 sm:mb-2 flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #64748B 0%, #334155 100%)" }}
              >
                {topThree[1].full_name.slice(0, 2).toUpperCase()}
              </div>

              {/* Scholar Name */}
              <div className="w-full min-w-0">
                <h4 className="font-semibold text-xs sm:text-sm text-[var(--text)] truncate group-hover:text-[var(--accent)] transition-colors">
                  {topThree[1].full_name}
                </h4>
                <p className="text-[10px] sm:text-xs text-[var(--muted)] capitalize truncate hidden sm:block">
                  {topThree[1].role}
                </p>
              </div>

              {/* Credits & Stats */}
              <div className="mt-2 w-full flex flex-col items-center">
                <span className="px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 inline-flex items-center gap-1 border border-slate-200 dark:border-slate-700">
                  <Medal size={11} className="hidden sm:inline" />
                  <span>{topThree[1].reputation_credits}</span>
                  <span className="hidden sm:inline">Credits</span>
                </span>
                <span className="text-[10px] text-[var(--muted)] mt-1 hidden md:block">
                  {topThree[1].quizzes_taken} quizzes passed
                </span>
              </div>
            </div>

            {/* Rank 1 (Gold - Center & Elevated) */}
            <div 
              onClick={() => handleUserClick(topThree[0].id)}
              className="sa-card p-3 sm:p-6 flex flex-col items-center text-center justify-between min-h-[195px] sm:min-h-[250px] cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] group relative shadow-md"
              style={{ 
                borderColor: "var(--accent)", 
                background: "var(--surface)"
              }}
            >
              {/* Gold Crown / Champion Tag */}
              <div 
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-black text-xs shadow-xs mb-1.5 sm:mb-2"
                style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
              >
                #1
              </div>

              {/* Avatar */}
              <div 
                className="w-13 h-13 sm:w-20 sm:h-20 rounded-full flex items-center justify-center font-black text-sm sm:text-xl text-white shadow-md ring-2 ring-[var(--accent)]/40 mb-1.5 sm:mb-2 flex-shrink-0"
                style={{ background: "linear-gradient(135deg, var(--accent) 0%, #D97706 100%)" }}
              >
                {topThree[0].full_name.slice(0, 2).toUpperCase()}
              </div>

              {/* Scholar Name */}
              <div className="w-full min-w-0">
                <h4 className="font-bold text-xs sm:text-base text-[var(--text)] truncate group-hover:text-[var(--accent)] transition-colors">
                  {topThree[0].full_name}
                </h4>
                <p className="text-[10px] sm:text-xs text-[var(--muted)] capitalize truncate hidden sm:block">
                  {topThree[0].role}
                </p>
              </div>

              {/* Credits & Stats */}
              <div className="mt-2 w-full flex flex-col items-center">
                <span 
                  className="px-2.5 py-0.5 sm:px-3.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold inline-flex items-center gap-1 border"
                  style={{ 
                    background: "var(--accent-soft)", 
                    color: "var(--accent-ink)",
                    borderColor: "rgba(232, 163, 61, 0.4)"
                  }}
                >
                  <Trophy size={11} className="hidden sm:inline" />
                  <span>{topThree[0].reputation_credits}</span>
                  <span className="hidden sm:inline">Credits</span>
                </span>
                <span className="text-[10px] text-[var(--muted)] mt-1 hidden md:block">
                  {topThree[0].quizzes_taken} quizzes passed
                </span>
              </div>
            </div>

            {/* Rank 3 (Bronze) */}
            <div 
              onClick={() => handleUserClick(topThree[2].id)}
              className="sa-card p-2.5 sm:p-5 flex flex-col items-center text-center justify-between min-h-[160px] sm:min-h-[210px] cursor-pointer hover:border-amber-700 transition-all hover:scale-[1.01] active:scale-[0.98] group relative"
              style={{ background: "var(--surface)" }}
            >
              {/* Rank Marker */}
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-amber-700/20 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold text-[11px] sm:text-xs shadow-xs mb-1.5 sm:mb-2">
                #3
              </div>

              {/* Avatar */}
              <div 
                className="w-11 h-11 sm:w-16 sm:h-16 rounded-full flex items-center justify-center font-bold text-xs sm:text-base text-white shadow-xs mb-1.5 sm:mb-2 flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #B45309 0%, #78350F 100%)" }}
              >
                {topThree[2].full_name.slice(0, 2).toUpperCase()}
              </div>

              {/* Scholar Name */}
              <div className="w-full min-w-0">
                <h4 className="font-semibold text-xs sm:text-sm text-[var(--text)] truncate group-hover:text-[var(--accent)] transition-colors">
                  {topThree[2].full_name}
                </h4>
                <p className="text-[10px] sm:text-xs text-[var(--muted)] capitalize truncate hidden sm:block">
                  {topThree[2].role}
                </p>
              </div>

              {/* Credits & Stats */}
              <div className="mt-2 w-full flex flex-col items-center">
                <span className="px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-amber-700/10 text-amber-700 dark:text-amber-400 inline-flex items-center gap-1 border border-amber-700/20">
                  <Medal size={11} className="hidden sm:inline" />
                  <span>{topThree[2].reputation_credits}</span>
                  <span className="hidden sm:inline">Credits</span>
                </span>
                <span className="text-[10px] text-[var(--muted)] mt-1 hidden md:block">
                  {topThree[2].quizzes_taken} quizzes passed
                </span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          Rankings Table Container
          ========================================================================= */}
      <div className="sa-card overflow-hidden">
        {/* Controls Toolbar: Search & Scope Filter */}
        <div 
          className="p-3 sm:p-4 border-b flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3"
          style={{ borderColor: "var(--line)" }}
        >
          {/* Search Input */}
          <div 
            className="flex items-center gap-2 px-3 py-1.5 sm:py-2 rounded-xl border flex-1"
            style={{ background: "var(--input-bg)", borderColor: "var(--line)" }}
          >
            <Search size={14} className="text-[var(--muted)] shrink-0" />
            <input
              type="text"
              placeholder="Search scholar by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-xs sm:text-sm outline-none text-[var(--text)] placeholder-[var(--muted)]"
            />
            {search && (
              <button 
                onClick={() => setSearch("")}
                className="text-[var(--muted)] hover:text-[var(--text)] p-0.5"
                title="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Scope Filters & Refresh */}
          <div className="flex items-center justify-between sm:justify-end gap-2">
            <div className="flex items-center p-1 rounded-xl border" style={{ borderColor: "var(--line)", background: "var(--surface-subtle)" }}>
              <button
                onClick={() => setFilterScope("all")}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                  filterScope === "all"
                    ? "bg-[var(--surface)] text-[var(--text)] shadow-xs font-semibold"
                    : "text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                All ({leaderboard.length})
              </button>
              <button
                onClick={() => setFilterScope("top10")}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                  filterScope === "top10"
                    ? "bg-[var(--surface)] text-[var(--text)] shadow-xs font-semibold"
                    : "text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                Top 10
              </button>
              <button
                onClick={() => setFilterScope("top25")}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                  filterScope === "top25"
                    ? "bg-[var(--surface)] text-[var(--text)] shadow-xs font-semibold"
                    : "text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                Top 25
              </button>
            </div>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="sa-btn-outline p-2 sm:px-3 sm:py-1.5 text-xs font-medium flex items-center gap-1.5 shrink-0"
              title="Refresh Rankings"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Loading / Error States */}
        {loading ? (
          <div className="py-16 text-center text-xs text-[var(--muted)]">
            <div className="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin mx-auto mb-3" />
            Loading Scholar Rankings...
          </div>
        ) : error ? (
          <div className="py-14 text-center text-xs text-red-500">
            {error}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-14 text-center text-xs text-[var(--muted)]">
            No scholars match your query.
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--line)" }}>
            {filteredUsers.map((item) => {
              const isTopThree = item.rank <= 3;
              const isCurrentUser = item.is_current_user || item.id === user?.id;

              return (
                <div
                  key={item.id}
                  onClick={() => handleUserClick(item.id)}
                  className={`p-3 sm:p-4 flex items-center justify-between gap-2.5 sm:gap-4 transition-colors hover:bg-[var(--surface-subtle)] active:bg-[var(--surface-hover)] cursor-pointer group ${
                    isCurrentUser ? "bg-amber-500/5 font-medium" : ""
                  }`}
                >
                  {/* Left: Rank, Avatar, Scholar Identity */}
                  <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                    {/* Rank Indicator */}
                    <div 
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        item.rank === 1
                          ? "bg-amber-400 text-amber-950 font-black"
                          : item.rank === 2
                          ? "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                          : item.rank === 3
                          ? "bg-amber-700/20 text-amber-700 dark:text-amber-400"
                          : "text-[var(--muted)] bg-[var(--surface-subtle)] border border-[var(--line)]"
                      }`}
                    >
                      {item.rank}
                    </div>

                    {/* Scholar Avatar */}
                    <div 
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-xs"
                      style={{ 
                        background: isTopThree 
                          ? "linear-gradient(135deg, var(--accent) 0%, #D97706 100%)" 
                          : "var(--ink)" 
                      }}
                    >
                      {item.full_name?.slice(0, 2).toUpperCase() || "EV"}
                    </div>

                    {/* Name & Academic Subtitle */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-xs sm:text-sm text-[var(--text)] truncate group-hover:text-[var(--accent)] transition-colors max-w-[130px] sm:max-w-xs">
                          {item.full_name}
                        </span>
                        {isCurrentUser && (
                          <span 
                            className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded-md shrink-0"
                            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
                          >
                            You
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-[11px] text-[var(--muted)] mt-0.5">
                        <span className="capitalize">{item.role}</span>
                        <span>•</span>
                        <span>{item.quizzes_taken} Quizzes</span>
                        <span className="hidden md:inline">• Joined {item.joined_at}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Credits & Profile Tap Affordance */}
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <span 
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 border"
                      style={{ 
                        background: isTopThree ? "var(--accent-soft)" : "var(--surface-subtle)", 
                        color: isTopThree ? "var(--accent-ink)" : "var(--text)",
                        borderColor: isTopThree ? "rgba(232, 163, 61, 0.3)" : "var(--line)"
                      }}
                    >
                      <Award size={13} className="text-[var(--accent)]" />
                      <span className="font-bold">{item.reputation_credits}</span>
                      <span className="hidden sm:inline">Credits</span>
                    </span>

                    <ChevronRight size={14} className="text-[var(--muted)] group-hover:text-[var(--text)] group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =========================================================================
          Academic Guide: How Vault Credits Are Earned
          ========================================================================= */}
      <div className="sa-card p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2">
          <HelpCircle size={15} className="text-[var(--accent)]" />
          <h3 className="sa-serif font-semibold text-sm sm:text-base text-[var(--text)]">
            How Vault Credits Are Earned
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
          <div 
            className="p-3 rounded-xl border space-y-1"
            style={{ background: "var(--surface-subtle)", borderColor: "var(--line)" }}
          >
            <div className="flex items-center gap-1.5 font-semibold text-[var(--text)]">
              <BookOpen size={13} className="text-[var(--accent)]" />
              <span>Graded Quizzes</span>
            </div>
            <p className="text-[var(--muted)] leading-relaxed">
              Earn +5 to +20 credits each time you complete a topic quiz with a score ≥ 60%.
            </p>
          </div>

          <div 
            className="p-3 rounded-xl border space-y-1"
            style={{ background: "var(--surface-subtle)", borderColor: "var(--line)" }}
          >
            <div className="flex items-center gap-1.5 font-semibold text-[var(--text)]">
              <MessageSquare size={13} className="text-[var(--accent)]" />
              <span>Study Discussions</span>
            </div>
            <p className="text-[var(--muted)] leading-relaxed">
              Answer peer questions, share formulas, and actively contribute to course channels.
            </p>
          </div>

          <div 
            className="p-3 rounded-xl border space-y-1"
            style={{ background: "var(--surface-subtle)", borderColor: "var(--line)" }}
          >
            <div className="flex items-center gap-1.5 font-semibold text-[var(--text)]">
              <FileText size={13} className="text-[var(--accent)]" />
              <span>Revision Notes</span>
            </div>
            <p className="text-[var(--muted)] leading-relaxed">
              Synthesize lecture materials, create revision flowcharts, and compile study outlines.
            </p>
          </div>

          <div 
            className="p-3 rounded-xl border space-y-1"
            style={{ background: "var(--surface-subtle)", borderColor: "var(--line)" }}
          >
            <div className="flex items-center gap-1.5 font-semibold text-[var(--text)]">
              <Flame size={13} className="text-rose-500" />
              <span>Daily Consistency</span>
            </div>
            <p className="text-[var(--muted)] leading-relaxed">
              Maintain study streaks and reach full topic curriculum coverage across your subjects.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
