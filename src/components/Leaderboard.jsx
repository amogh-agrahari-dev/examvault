import React, { useState, useEffect } from "react";
import { 
  Trophy, Crown, Award, Medal, Flame, Star, Sparkles, 
  Search, ShieldCheck, ArrowUpRight, HelpCircle, User, 
  ChevronRight, RefreshCw, Layers
} from "lucide-react";
import { getLeaderboard } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Leaderboard({ go, accessToken, onOpenProfile }) {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
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

  const filteredUsers = leaderboard.filter((u) => 
    u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const topThree = leaderboard.slice(0, 3);
  const currentUserEntry = leaderboard.find((u) => u.is_current_user || u.id === user?.id);

  return (
    <div className="sa-fade-in space-y-6 max-w-5xl mx-auto pb-12">
      {/* Hero Banner */}
      <div 
        className="p-6 md:p-8 rounded-3xl border relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
        style={{ 
          background: "linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(59, 130, 246, 0.04) 100%), var(--surface)",
          borderColor: "var(--line)"
        }}
      >
        <div className="relative z-10 max-w-xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-2 rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/20 inline-flex items-center justify-center">
              <Trophy size={20} strokeWidth={2.5} />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-500">
              ExamVault Global Ranking
            </span>
          </div>
          <h2 className="sa-serif text-2xl md:text-3xl font-bold text-[var(--text)]">
            Scholar Leaderboard
          </h2>
          <p className="text-sm text-[var(--muted)] mt-1.5 leading-relaxed">
            Recognizing top students and peer collaborators. Earn Vault Credits by completing quizzes, contributing to discussions, and maintaining study streaks.
          </p>
        </div>

        {/* Current User Snapshot Card */}
        {currentUserEntry ? (
          <div 
            className="w-full md:w-auto p-4 rounded-2xl border bg-[var(--surface-subtle)] flex items-center justify-between md:flex-col md:items-end gap-3 shrink-0 shadow-sm"
            style={{ borderColor: "var(--line)" }}
          >
            <div className="text-left md:text-right">
              <div className="text-[11px] font-semibold uppercase text-[var(--muted)]">Your Standing</div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl font-black text-[var(--accent)]">
                  #{currentUserEntry.rank}
                </span>
                <span className="text-xs text-[var(--muted)]">of {leaderboard.length} scholars</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 inline-flex items-center gap-1.5">
                <Award size={13} /> {currentUserEntry.reputation_credits} Credits
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Top 3 Podium (Only displayed when at least 3 users exist) */}
      {!loading && topThree.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          {/* Rank 2 (Silver) */}
          <div 
            onClick={() => onOpenProfile ? onOpenProfile(topThree[1].id) : go("profile")}
            className="p-5 rounded-2xl border bg-[var(--surface)] hover:border-slate-400 dark:hover:border-slate-500 transition-all hover:scale-[1.01] cursor-pointer flex flex-col items-center text-center relative order-2 md:order-1 group"
            style={{ borderColor: "var(--line)" }}
          >
            <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-100 flex items-center justify-center font-bold text-xs shadow-xs mb-3">
              #2
            </div>
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-slate-300 to-slate-500 text-slate-900 font-extrabold text-lg flex items-center justify-center shadow-md mb-2">
              {topThree[1].full_name.slice(0, 2).toUpperCase()}
            </div>
            <h4 className="font-bold text-base text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
              {topThree[1].full_name}
            </h4>
            <span className="text-xs text-[var(--muted)] capitalize">{topThree[1].role}</span>
            <div className="mt-3 px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5">
              <Medal size={13} /> {topThree[1].reputation_credits} Credits
            </div>
            <span className="text-[11px] text-[var(--muted)] mt-2">
              {topThree[1].quizzes_taken} quizzes passed
            </span>
          </div>

          {/* Rank 1 (Gold - Center & Elevated) */}
          <div 
            onClick={() => onOpenProfile ? onOpenProfile(topThree[0].id) : go("profile")}
            className="p-6 rounded-2xl border-2 bg-[var(--surface)] hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer flex flex-col items-center text-center relative order-1 md:order-2 group shadow-lg"
            style={{ 
              borderColor: "rgba(245, 158, 11, 0.6)",
              background: "linear-gradient(180deg, rgba(245, 158, 11, 0.05) 0%, var(--surface) 100%)"
            }}
          >
            <div className="absolute -top-3.5 px-3 py-0.5 rounded-full bg-amber-500 text-amber-950 font-black text-xs uppercase tracking-wider flex items-center gap-1 shadow-md">
              <Crown size={12} strokeWidth={3} /> Champion
            </div>
            <div className="w-9 h-9 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center font-black text-sm shadow-md mb-3 mt-1">
              #1
            </div>
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-400 to-amber-500 text-amber-950 font-black text-2xl flex items-center justify-center shadow-lg ring-4 ring-amber-400/30 mb-2">
              {topThree[0].full_name.slice(0, 2).toUpperCase()}
            </div>
            <h4 className="font-extrabold text-lg text-[var(--text)] group-hover:text-amber-500 transition-colors">
              {topThree[0].full_name}
            </h4>
            <span className="text-xs text-[var(--muted)] capitalize">{topThree[0].role}</span>
            <div className="mt-3 px-4 py-1.5 rounded-full bg-amber-500/15 text-amber-500 text-sm font-extrabold flex items-center gap-1.5 border border-amber-500/30">
              <Sparkles size={14} /> {topThree[0].reputation_credits} Credits
            </div>
            <span className="text-[11px] text-[var(--muted)] mt-2">
              {topThree[0].quizzes_taken} quizzes passed
            </span>
          </div>

          {/* Rank 3 (Bronze) */}
          <div 
            onClick={() => onOpenProfile ? onOpenProfile(topThree[2].id) : go("profile")}
            className="p-5 rounded-2xl border bg-[var(--surface)] hover:border-amber-700 transition-all hover:scale-[1.01] cursor-pointer flex flex-col items-center text-center relative order-3 md:order-3 group"
            style={{ borderColor: "var(--line)" }}
          >
            <div className="w-8 h-8 rounded-full bg-amber-700/30 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs shadow-xs mb-3">
              #3
            </div>
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-600 to-amber-800 text-amber-100 font-extrabold text-lg flex items-center justify-center shadow-md mb-2">
              {topThree[2].full_name.slice(0, 2).toUpperCase()}
            </div>
            <h4 className="font-bold text-base text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
              {topThree[2].full_name}
            </h4>
            <span className="text-xs text-[var(--muted)] capitalize">{topThree[2].role}</span>
            <div className="mt-3 px-3 py-1 rounded-full bg-amber-700/10 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center gap-1.5">
              <Medal size={13} /> {topThree[2].reputation_credits} Credits
            </div>
            <span className="text-[11px] text-[var(--muted)] mt-2">
              {topThree[2].quizzes_taken} quizzes passed
            </span>
          </div>
        </div>
      )}

      {/* Main Table / Scholar Rankings List */}
      <div 
        className="rounded-3xl border overflow-hidden bg-[var(--surface)]"
        style={{ borderColor: "var(--line)" }}
      >
        {/* Table Controls (Search & Refresh) */}
        <div className="p-4 border-b flex flex-wrap items-center justify-between gap-3" style={{ borderColor: "var(--line)" }}>
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              type="text"
              placeholder="Search scholar by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-[var(--surface-subtle)] border outline-none text-[var(--text)] placeholder-[var(--muted)] transition-all focus:border-[var(--accent)]"
              style={{ borderColor: "var(--line)" }}
            />
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3 py-2 rounded-xl border text-xs font-medium text-[var(--muted)] hover:text-[var(--text)] transition-colors flex items-center gap-1.5"
            style={{ borderColor: "var(--line)" }}
            title="Refresh Rankings"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Loading / Error States */}
        {loading ? (
          <div className="py-16 text-center text-xs text-[var(--muted)]">
            <div className="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin mx-auto mb-3" />
            Loading Scholar Rankings...
          </div>
        ) : error ? (
          <div className="py-16 text-center text-xs text-red-500">
            {error}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center text-xs text-[var(--muted)]">
            No scholars match your search query.
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--line)" }}>
            {filteredUsers.map((item) => {
              const isTopThree = item.rank <= 3;
              const isCurrentUser = item.is_current_user || item.id === user?.id;

              return (
                <div
                  key={item.id}
                  onClick={() => onOpenProfile ? onOpenProfile(item.id) : go("profile")}
                  className={`p-4 flex items-center justify-between gap-4 transition-all hover:bg-[var(--surface-subtle)] cursor-pointer group ${
                    isCurrentUser ? "bg-amber-500/5 font-medium" : ""
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Rank Badge */}
                    <div 
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        item.rank === 1
                          ? "bg-amber-400 text-amber-950 shadow-xs"
                          : item.rank === 2
                          ? "bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                          : item.rank === 3
                          ? "bg-amber-700/30 text-amber-600 dark:text-amber-400"
                          : "text-[var(--muted)] bg-[var(--surface-subtle)] border border-[var(--line)]"
                      }`}
                    >
                      {item.rank}
                    </div>

                    {/* Avatar Initials */}
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-xs"
                      style={{ 
                        background: isTopThree 
                          ? "linear-gradient(135deg, var(--accent) 0%, #D97706 100%)" 
                          : "linear-gradient(135deg, #475569 0%, #1E293B 100%)" 
                      }}
                    >
                      {item.full_name?.slice(0, 2).toUpperCase() || "EV"}
                    </div>

                    {/* Scholar Name & Role */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-[var(--text)] truncate group-hover:text-[var(--accent)] transition-colors">
                          {item.full_name}
                        </span>
                        {isCurrentUser && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--accent)] text-[var(--accent-ink)] shrink-0">
                            You
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[var(--muted)] mt-0.5">
                        <span className="capitalize">{item.role}</span>
                        <span>•</span>
                        <span>Joined {item.joined_at}</span>
                        <span>•</span>
                        <span>{item.quizzes_taken} Quizzes</span>
                      </div>
                    </div>
                  </div>

                  {/* Right side: Credits Count & View Profile */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 inline-flex items-center gap-1.5">
                      <Award size={13} /> {item.reputation_credits} Credits
                    </span>
                    <span className="text-xs text-[var(--muted)] group-hover:text-[var(--text)] group-hover:translate-x-0.5 transition-all hidden sm:inline-flex items-center gap-1">
                      View Profile <ChevronRight size={14} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Educational Guide: How to Earn Credits */}
      <div 
        className="p-6 rounded-3xl border bg-[var(--surface-subtle)] space-y-3"
        style={{ borderColor: "var(--line)" }}
      >
        <div className="flex items-center gap-2">
          <HelpCircle size={16} className="text-amber-500" />
          <h4 className="font-bold text-sm text-[var(--text)]">How to Climb the Leaderboard</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-[var(--surface)] border border-[var(--line)] space-y-1">
            <span className="font-bold text-amber-500">Graded Quizzes</span>
            <p className="text-[var(--muted)] leading-relaxed">
              Earn +5 to +20 credits each time you complete a quiz with score ≥ 60%.
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-[var(--surface)] border border-[var(--line)] space-y-1">
            <span className="font-bold text-amber-500">Peer Discussions</span>
            <p className="text-[var(--muted)] leading-relaxed">
              Post answers and engage in group study channels to earn +5 community credits.
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-[var(--surface)] border border-[var(--line)] space-y-1">
            <span className="font-bold text-amber-500">AI Claim Verification</span>
            <p className="text-[var(--muted)] leading-relaxed">
              Verify claims and validate peer equations to receive up to +10 merits.
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-[var(--surface)] border border-[var(--line)] space-y-1">
            <span className="font-bold text-amber-500">Study Milestones</span>
            <p className="text-[var(--muted)] leading-relaxed">
              Achieve 100% curriculum topic coverage and earn bonus milestone packs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
