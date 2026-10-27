import React, { useState } from "react";
import { 
  ShieldCheck, MessageSquare, Award, Flame, FileText, 
  Trophy, Crown, Zap, Code, Star, Lock, CheckCircle2, 
  HelpCircle, Sparkles, ChevronDown, ChevronUp, Info
} from "lucide-react";

export const SCHOLAR_BADGES = [
  {
    id: "verified_scholar",
    name: "Verified Scholar",
    category: "Milestone",
    icon: ShieldCheck,
    color: "from-blue-500 to-indigo-600",
    glowColor: "rgba(59, 130, 246, 0.4)",
    description: "Officially registered and recognized scholar in the ExamVault academic network.",
    unlockRequirement: "Earn at least 10 reputation credits.",
    isUnlocked: (p) => (p?.reputation_credits ?? 0) >= 10,
    getProgress: (p) => {
      const current = p?.reputation_credits ?? 0;
      const target = 10;
      return { current, target, unit: "credits", percent: Math.min(100, Math.round((current / target) * 100)) };
    }
  },
  {
    id: "community_collaborator",
    name: "Community Collaborator",
    category: "Community",
    icon: MessageSquare,
    color: "from-amber-400 to-orange-500",
    glowColor: "rgba(245, 158, 11, 0.4)",
    description: "Actively engaged in academic peer study and joined discussion rooms.",
    unlockRequirement: "Join at least 1 group discussion room.",
    isUnlocked: (p) => (p?.discussions_joined ?? 0) >= 1,
    getProgress: (p) => {
      const current = p?.discussions_joined ?? 0;
      const target = 1;
      return { current, target, unit: "discussions", percent: Math.min(100, Math.round((current / target) * 100)) };
    }
  },
  {
    id: "quiz_explorer",
    name: "Quiz Explorer",
    category: "Academic",
    icon: Award,
    color: "from-emerald-400 to-teal-600",
    glowColor: "rgba(16, 185, 129, 0.4)",
    description: "Demonstrated dedication to active recall and curriculum self-assessment.",
    unlockRequirement: "Attempt and submit at least 3 graded quizzes.",
    isUnlocked: (p) => (p?.quizzes_taken ?? 0) >= 3,
    getProgress: (p) => {
      const current = p?.quizzes_taken ?? 0;
      const target = 3;
      return { current, target, unit: "quizzes", percent: Math.min(100, Math.round((current / target) * 100)) };
    }
  },
  {
    id: "active_conversationalist",
    name: "Active Conversationalist",
    category: "Community",
    icon: Flame,
    color: "from-rose-500 to-red-600",
    glowColor: "rgba(239, 68, 68, 0.4)",
    description: "A prominent contributor to peer threads and scholarly discourse.",
    unlockRequirement: "Post at least 10 messages across community discussions.",
    isUnlocked: (p) => (p?.messages_sent ?? 0) >= 10,
    getProgress: (p) => {
      const current = p?.messages_sent ?? 0;
      const target = 10;
      return { current, target, unit: "messages", percent: Math.min(100, Math.round((current / target) * 100)) };
    }
  },
  {
    id: "curriculum_analyst",
    name: "Curriculum Analyst",
    category: "Curriculum",
    icon: FileText,
    color: "from-purple-500 to-indigo-600",
    glowColor: "rgba(139, 92, 246, 0.4)",
    description: "Has processed and structured university course materials into topics.",
    unlockRequirement: "Generate and study at least 1 structured course topic from vault documents.",
    isUnlocked: (p) => (p?.topics_count ?? 0) >= 1,
    getProgress: (p) => {
      const current = p?.topics_count ?? 0;
      const target = 1;
      return { current, target, unit: "topics", percent: Math.min(100, Math.round((current / target) * 100)) };
    }
  },
  {
    id: "quiz_master",
    name: "Quiz Master",
    category: "Mastery",
    icon: Trophy,
    color: "from-yellow-400 to-amber-600",
    glowColor: "rgba(234, 179, 8, 0.5)",
    description: "Maintains top academic performance across multiple examination rounds.",
    unlockRequirement: "Take at least 5 quizzes and maintain an average score of 80% or higher.",
    isUnlocked: (p) => (p?.quizzes_taken ?? 0) >= 5 && (p?.avg_quiz_score ?? 0) >= 80,
    getProgress: (p) => {
      const qTaken = p?.quizzes_taken ?? 0;
      const avg = p?.avg_quiz_score ?? 0;
      const scoreProgress = Math.min(100, Math.round((avg / 80) * 50));
      const countProgress = Math.min(100, Math.round((qTaken / 5) * 50));
      return { 
        current: `${qTaken}/5 tests (Avg: ${Math.round(avg)}%)`, 
        target: "5 tests @ 80%+", 
        unit: "", 
        percent: Math.min(100, scoreProgress + countProgress) 
      };
    }
  },
  {
    id: "credit_tycoon",
    name: "Credit Tycoon",
    category: "Prestige",
    icon: Crown,
    color: "from-amber-300 via-yellow-500 to-amber-700",
    glowColor: "rgba(245, 158, 11, 0.5)",
    description: "Among the highest-earning academic contributors in the vault ecosystem.",
    unlockRequirement: "Reach 50 reputation credits earned across all activities.",
    isUnlocked: (p) => (p?.reputation_credits ?? 0) >= 50,
    getProgress: (p) => {
      const current = p?.reputation_credits ?? 0;
      const target = 50;
      return { current, target, unit: "credits", percent: Math.min(100, Math.round((current / target) * 100)) };
    }
  },
  {
    id: "century_scholar",
    name: "Century Scholar",
    category: "Prestige",
    icon: Sparkles,
    color: "from-fuchsia-500 via-pink-600 to-purple-700",
    glowColor: "rgba(217, 70, 239, 0.5)",
    description: "Elite Hall-of-Fame scholar with triple-digit reputation.",
    unlockRequirement: "Accumulate 100 reputation credits to enter the permanent Hall of Fame.",
    isUnlocked: (p) => (p?.reputation_credits ?? 0) >= 100,
    getProgress: (p) => {
      const current = p?.reputation_credits ?? 0;
      const target = 100;
      return { current, target, unit: "credits", percent: Math.min(100, Math.round((current / target) * 100)) };
    }
  },
];

export default function BadgesGrid({ profile, compact = false }) {
  const [filter, setFilter] = useState("all"); // 'all', 'unlocked', 'locked'
  const [expandedBadge, setExpandedBadge] = useState(null);

  const enrichedBadges = SCHOLAR_BADGES.map((b) => {
    const unlocked = b.isUnlocked(profile);
    const progress = b.getProgress(profile);
    return { ...b, unlocked, progress };
  });

  const unlockedCount = enrichedBadges.filter((b) => b.unlocked).length;
  const lockedCount = enrichedBadges.length - unlockedCount;

  const filteredBadges = enrichedBadges.filter((b) => {
    if (filter === "unlocked") return b.unlocked;
    if (filter === "locked") return !b.unlocked;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header and Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-amber-400" />
            <h3 className="font-bold text-base text-[var(--text)]">Scholar Recognitions & Badges</h3>
          </div>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            {unlockedCount} of {enrichedBadges.length} badges unlocked ({Math.round((unlockedCount / enrichedBadges.length) * 100)}% completed)
          </p>
        </div>

        {/* Filter Pills */}
        <div 
          role="tablist"
          aria-label="Filter badges"
          className="flex items-center gap-1.5 p-1 rounded-xl border bg-[var(--surface-subtle)] text-xs font-medium" 
          style={{ borderColor: "var(--line)" }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={filter === "all"}
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg transition-all ${filter === "all" ? "bg-[var(--accent)] text-[var(--accent-ink)] font-semibold shadow-xs" : "text-[var(--muted)] hover:text-[var(--text)]"}`}
          >
            All ({enrichedBadges.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === "unlocked"}
            onClick={() => setFilter("unlocked")}
            className={`px-3 py-1.5 rounded-lg transition-all ${filter === "unlocked" ? "bg-[var(--accent)] text-[var(--accent-ink)] font-semibold shadow-xs" : "text-[var(--muted)] hover:text-[var(--text)]"}`}
          >
            Unlocked ({unlockedCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === "locked"}
            onClick={() => setFilter("locked")}
            className={`px-3 py-1.5 rounded-lg transition-all ${filter === "locked" ? "bg-[var(--accent)] text-[var(--accent-ink)] font-semibold shadow-xs" : "text-[var(--muted)] hover:text-[var(--text)]"}`}
          >
            Locked ({lockedCount})
          </button>
        </div>
      </div>

      {/* Badges Grid */}
      <div className={`grid gap-4 ${compact ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"}`}>
        {filteredBadges.map((badge) => {
          const Icon = badge.icon;
          const isExpanded = expandedBadge === badge.id;

          return (
            <div
              key={badge.id}
              onClick={() => setExpandedBadge(isExpanded ? null : badge.id)}
              className={`rounded-2xl p-4 sm:p-4.5 border transition-all cursor-pointer relative overflow-hidden group select-none flex flex-col justify-between ${
                badge.unlocked
                  ? "bg-[var(--surface)] hover:border-[var(--accent)] hover:shadow-md"
                  : "bg-[var(--surface-subtle)]/70 hover:border-[var(--line-strong)] opacity-85 hover:opacity-100"
              }`}
              style={{
                borderColor: badge.unlocked ? "var(--line)" : "var(--line)",
              }}
            >
              {/* Subtle Ambient Radial Glow for Unlocked */}
              {badge.unlocked && (
                <div 
                  className="absolute -top-10 -right-10 w-28 h-28 rounded-full pointer-events-none blur-2xl opacity-20"
                  style={{ background: badge.glowColor }}
                />
              )}

              <div>
                {/* Top Row: Visual Emblem + Lock / Unlocked Pill */}
                <div className="flex items-start justify-between gap-2.5 mb-3">
                  {/* Visual Image / Emblem Icon */}
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md relative shrink-0 transition-transform group-hover:scale-105 ${
                      badge.unlocked
                        ? `bg-gradient-to-tr ${badge.color} text-white`
                        : "bg-neutral-800/20 dark:bg-neutral-800/60 text-neutral-400 border border-neutral-700/40 grayscale"
                    }`}
                  >
                    <Icon size={24} strokeWidth={2.2} />
                    {badge.unlocked && (
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[var(--surface)] flex items-center justify-center">
                        <CheckCircle2 size={10} className="text-white" strokeWidth={3} />
                      </span>
                    )}
                  </div>

                  {/* Status Pill */}
                  {badge.unlocked ? (
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1 shrink-0">
                      <Sparkles size={11} /> Unlocked
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-neutral-500/10 text-[var(--muted)] border border-neutral-500/20 inline-flex items-center gap-1 shrink-0">
                      <Lock size={11} /> Locked
                    </span>
                  )}
                </div>

                {/* Badge Titles & Category */}
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                      {badge.category}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-[var(--text)] mt-0.5 group-hover:text-[var(--accent)] transition-colors">
                    {badge.name}
                  </h4>
                  <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed line-clamp-2">
                    {badge.description}
                  </p>
                </div>
              </div>

              {/* Bottom Section: Progress bar or Unlock Instruction */}
              <div className="mt-3 pt-3 border-t border-[var(--line)]">
                {badge.unlocked ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="shrink-0" /> Requirement Met
                      </span>
                      <span className="text-[10px] text-[var(--muted)]">Active Merit</span>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/15 text-[11px] leading-tight">
                      <div className="text-[10.5px] text-[var(--muted)]">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">Earned:</span> {badge.unlockRequirement}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[var(--muted)] font-medium">Progress</span>
                      <span className="font-semibold text-[var(--text)]">
                        {badge.progress.current} {badge.progress.unit ? `/ ${badge.progress.target} ${badge.progress.unit}` : ""} ({badge.progress.percent}%)
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
                        style={{ width: `${badge.progress.percent}%` }}
                      />
                    </div>

                    {/* How to Unlock Notice */}
                    <div className="mt-2 p-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--line)] text-[11px] leading-tight">
                      <div className="flex items-start gap-1.5 text-[var(--accent)] font-semibold mb-0.5">
                        <Info size={12} className="shrink-0 mt-0.5" />
                        <span>How to Unlock:</span>
                      </div>
                      <p className="text-[var(--text)] text-[10.5px] pl-4">
                        {badge.unlockRequirement}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
