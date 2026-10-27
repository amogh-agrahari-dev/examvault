import React, { useEffect, useState } from "react";
import { 
  Award, 
  BookOpen, 
  MessageSquare, 
  CheckCircle2, 
  Calendar, 
  ShieldCheck, 
  Sparkles, 
  TrendingUp, 
  FileText,
  Flame,
  Star,
  ArrowLeft,
  Mail,
  UserCheck
} from "lucide-react";
import { getUserProfile } from "../services/api";
import BadgesGrid from "./BadgesGrid";

export default function UserProfile({ userId, go, accessToken, currentUserId }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const targetId = userId || currentUserId;
    if (!targetId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    getUserProfile(targetId, accessToken)
      .then((data) => {
        if (isMounted) {
          setProfile(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Failed to load user profile");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [userId, currentUserId, accessToken]);

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "EV";

  const formattedDate = profile?.joined_at
    ? new Date(profile.joined_at).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "Recently";

  const calculateLevel = (credits = 0, quizzes = 0) => {
    const points = credits + quizzes * 5;
    if (points >= 100) return { title: "Master Scholar", level: 5, color: "#DDD6FE", bg: "rgba(139, 92, 246, 0.35)", border: "rgba(196, 181, 253, 0.5)" };
    if (points >= 50) return { title: "Senior Fellow", level: 4, color: "#BAE6FD", bg: "rgba(59, 130, 246, 0.35)", border: "rgba(186, 230, 253, 0.5)" };
    if (points >= 25) return { title: "Active Scholar", level: 3, color: "#A7F3D0", bg: "rgba(16, 185, 129, 0.35)", border: "rgba(167, 243, 208, 0.5)" };
    if (points >= 10) return { title: "Apprentice", level: 2, color: "#FDE68A", bg: "rgba(245, 158, 11, 0.35)", border: "rgba(253, 230, 138, 0.5)" };
    return { title: "Novice", level: 1, color: "#E2E8F0", bg: "rgba(148, 163, 184, 0.3)", border: "rgba(226, 232, 240, 0.4)" };
  };

  const levelInfo = calculateLevel(profile?.reputation_credits, profile?.quizzes_taken);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 sa-fade-in">
      {/* Back button */}
      {go && (
        <button
          type="button"
          onClick={() => go("dashboard")}
          className="sa-btn-outline inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </button>
      )}

      {/* Main Profile Card */}
      <div 
        className="sa-card rounded-2xl overflow-hidden border shadow-lg"
        style={{ borderColor: "var(--line)" }}
      >
        {/* Banner */}
        <div 
          className="h-36 sm:h-44 w-full relative p-4 sm:p-6 flex justify-between items-start"
          style={{
            background: "linear-gradient(135deg, var(--ink) 0%, #1e293b 60%, #0f172a 100%)",
          }}
        >
          <div className="flex items-center gap-2">
            <span 
              className="px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm backdrop-blur-xs"
              style={{ background: levelInfo.bg, color: levelInfo.color, border: `1px solid ${levelInfo.border}` }}
            >
              <Sparkles size={14} />
              {levelInfo.title} • Tier {levelInfo.level}
            </span>
          </div>
        </div>

        {/* Profile Content */}
        <div className="px-4 sm:px-10 pb-6 sm:pb-8 pt-0 relative">
          {/* Avatar and Credits row */}
          <div className="flex items-end justify-between -mt-12 sm:-mt-16 mb-4">
            <div 
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl sm:rounded-3xl border-4 flex items-center justify-center text-2xl sm:text-3xl font-bold shadow-xl flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, var(--accent) 0%, #D97706 100%)",
                color: "#FFFFFF",
                borderColor: "var(--surface)",
              }}
            >
              {initials}
            </div>

            <div className="flex items-center gap-3">
              <div 
                className="px-3.5 py-2 rounded-xl border flex items-center gap-2.5 shadow-xs"
                style={{ background: "var(--accent-soft)", borderColor: "rgba(232, 163, 61, 0.3)" }}
              >
                <Award size={18} className="text-[var(--accent)]" />
                <div>
                  <div className="text-sm font-bold" style={{ color: "var(--accent-ink)" }}>
                    {profile?.reputation_credits ?? 0}
                  </div>
                  <div className="text-[10px] uppercase font-semibold text-[var(--muted)]">Vault Credits</div>
                </div>
              </div>
            </div>
          </div>

          {/* Scholar Details - Always 100% on card surface */}
          <div className="mb-6">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="sa-serif text-2xl sm:text-3xl font-bold text-[var(--text)]">
                {loading ? "Loading Scholar..." : profile?.full_name}
              </h1>
              <span 
                className="text-xs uppercase tracking-wider font-bold px-2.5 py-1 rounded-md"
                style={{ background: "var(--surface-subtle)", color: "var(--muted)", border: "1px solid var(--line)" }}
              >
                {profile?.role || "Student"}
              </span>
            </div>
            <p className="text-xs sm:text-sm flex items-center gap-1.5 text-[var(--muted)] mt-1">
              <Calendar size={14} /> Enrolled on {formattedDate}
            </p>
          </div>

          {loading ? (
            <div className="py-24 text-center">
              <div className="w-9 h-9 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-[var(--muted)]">Loading scholar dossier...</p>
            </div>
          ) : error ? (
            <div className="py-12 text-center text-sm font-medium" style={{ color: "var(--danger)" }}>
              {error}
            </div>
          ) : profile ? (
            <div className="space-y-6">
              {/* Four Stat Highlights */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
                <div 
                  className="p-3.5 sm:p-5 rounded-2xl border flex flex-col items-center justify-center text-center transition-all hover:shadow-md"
                  style={{ background: "var(--surface-subtle)", borderColor: "var(--line)" }}
                >
                  <BookOpen size={22} className="text-blue-500 mb-1.5" />
                  <span className="text-xl sm:text-2xl font-bold text-[var(--text)]">{profile.documents_count}</span>
                  <span className="text-[11px] sm:text-xs text-[var(--muted)] mt-0.5">Documents Uploaded</span>
                </div>

                <div 
                  className="p-3.5 sm:p-5 rounded-2xl border flex flex-col items-center justify-center text-center transition-all hover:shadow-md"
                  style={{ background: "var(--surface-subtle)", borderColor: "var(--line)" }}
                >
                  <TrendingUp size={22} className="text-emerald-500 mb-1.5" />
                  <span className="text-xl sm:text-2xl font-bold text-[var(--text)]">{profile.quizzes_taken}</span>
                  <span className="text-[11px] sm:text-xs text-[var(--muted)] mt-0.5">Quizzes Completed</span>
                </div>

                <div 
                  className="p-3.5 sm:p-5 rounded-2xl border flex flex-col items-center justify-center text-center transition-all hover:shadow-md"
                  style={{ background: "var(--surface-subtle)", borderColor: "var(--line)" }}
                >
                  <MessageSquare size={22} className="text-amber-500 mb-1.5" />
                  <span className="text-xl sm:text-2xl font-bold text-[var(--text)]">{profile.discussions_joined}</span>
                  <span className="text-[11px] sm:text-xs text-[var(--muted)] mt-0.5">Discussions Joined</span>
                </div>

                <div 
                  className="p-3.5 sm:p-5 rounded-2xl border flex flex-col items-center justify-center text-center transition-all hover:shadow-md"
                  style={{ background: "var(--surface-subtle)", borderColor: "var(--line)" }}
                >
                  <Flame size={22} className="text-purple-500 mb-1.5" />
                  <span className="text-xl sm:text-2xl font-bold text-[var(--text)]">{profile.messages_sent}</span>
                  <span className="text-[11px] sm:text-xs text-[var(--muted)] mt-0.5">Messages Contributed</span>
                </div>
              </div>

              {/* Academic Performance Overview - Full Width */}
              <div 
                className="p-5 sm:p-6 rounded-2xl border shadow-xs"
                style={{ background: "var(--surface)", borderColor: "var(--line)" }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[var(--line)]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>
                      <CheckCircle2 size={18} className="text-emerald-500" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-[var(--text)]">Academic Evaluation & Progress</h3>
                      <p className="text-xs text-[var(--muted)]">Calculated from submitted quizzes and formal assessments</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {profile.avg_quiz_score !== null && (
                      <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                        profile.avg_quiz_score >= 80 
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : profile.avg_quiz_score >= 50
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                          : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                      }`}>
                        {profile.avg_quiz_score >= 80 ? "Exemplary Mastery" : profile.avg_quiz_score >= 50 ? "Passing Grade" : "Needs Review"}
                      </span>
                    )}
                    <span className="text-base sm:text-lg font-bold text-[var(--accent)]">
                      {profile.avg_quiz_score !== null ? `${profile.avg_quiz_score}% Average` : "Pending"}
                    </span>
                  </div>
                </div>

                {profile.avg_quiz_score !== null ? (
                  <div className="space-y-4">
                    {/* Progress bar with markers */}
                    <div>
                      <div className="w-full h-3.5 rounded-full overflow-hidden bg-black/5 dark:bg-white/10 p-0.5 border border-[var(--line)]">
                        <div 
                          className="h-full rounded-full transition-all duration-700 shadow-xs"
                          style={{
                            width: `${Math.min(profile.avg_quiz_score, 100)}%`,
                            background: profile.avg_quiz_score >= 80 ? "var(--success)" : profile.avg_quiz_score >= 50 ? "var(--accent)" : "var(--danger)"
                          }}
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center text-xs text-[var(--muted)] mt-2 gap-1">
                        <span>Evaluated across <strong className="text-[var(--text)] font-semibold">{profile.quizzes_taken}</strong> graded exam sessions</span>
                        <span className="flex items-center gap-2">
                          <span>Passmark: <strong className="text-[var(--text)] font-semibold">50%</strong></span>
                          <span>•</span>
                          <span>Distinction: <strong className="text-[var(--text)] font-semibold">80%</strong></span>
                        </span>
                      </div>
                    </div>

                    {/* 3 Quick Performance Highlights inside the card */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                      <div className="p-3.5 rounded-xl border bg-[var(--surface-subtle)] text-center sm:text-left" style={{ borderColor: "var(--line)" }}>
                        <span className="text-[11px] font-medium text-[var(--muted)] block">Exams Attempted</span>
                        <span className="text-base font-bold text-[var(--text)] mt-0.5 block">{profile.quizzes_taken} Completed</span>
                      </div>
                      <div className="p-3.5 rounded-xl border bg-[var(--surface-subtle)] text-center sm:text-left" style={{ borderColor: "var(--line)" }}>
                        <span className="text-[11px] font-medium text-[var(--muted)] block">Curriculum Topics</span>
                        <span className="text-base font-bold text-[var(--text)] mt-0.5 block">{profile.topics_count ?? 0} Mastered</span>
                      </div>
                      <div className="p-3.5 rounded-xl border bg-[var(--surface-subtle)] text-center sm:text-left" style={{ borderColor: "var(--line)" }}>
                        <span className="text-[11px] font-medium text-[var(--muted)] block">Evaluation Status</span>
                        <span className="text-base font-bold text-[var(--text)] mt-0.5 block">
                          {profile.avg_quiz_score >= 50 ? "Satisfactory" : profile.avg_quiz_score !== null ? "Academic Probation" : "Pending Evaluation"}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-[var(--muted)]">
                    <p>No examination results recorded yet for this scholar. Complete practice quizzes to establish an evaluation benchmark.</p>
                  </div>
                )}
              </div>

              {/* Scholar Recognitions & Badges - Full Width Showcase */}
              <div 
                className="p-5 sm:p-6 rounded-2xl border shadow-xs"
                style={{ background: "var(--surface)", borderColor: "var(--line)" }}
              >
                <BadgesGrid profile={profile} />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
