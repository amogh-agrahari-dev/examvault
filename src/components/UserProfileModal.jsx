import React, { useEffect, useState } from "react";
import { 
  X, 
  Award, 
  BookOpen, 
  MessageSquare, 
  CheckCircle2, 
  Calendar, 
  ShieldCheck, 
  Sparkles, 
  TrendingUp, 
  FileText,
  UserCheck,
  Flame,
  Star
} from "lucide-react";
import { getUserProfile } from "../services/api";
import BadgesGrid from "./BadgesGrid";

export default function UserProfileModal({ userId, onClose, accessToken, onOpenDiscussion }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && onClose) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!userId) return;
    let isMounted = true;
    setLoading(true);
    setError(null);

    getUserProfile(userId, accessToken)
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
  }, [userId, accessToken]);

  if (!userId) return null;

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
        month: "short",
        year: "numeric",
      })
    : "Recently";

  // Calculate learning level based on reputation and quiz stats
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
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-sm sa-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-profile-modal-title"
    >
      <div 
        className="sa-card w-full max-w-xl max-h-[92vh] overflow-y-auto sa-scroll rounded-2xl shadow-2xl relative border animate-scale-up"
        style={{ borderColor: "var(--line)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner with gradient & close button */}
        <div 
          className="h-28 sm:h-32 w-full relative p-3 sm:p-4 flex justify-between items-start"
          style={{
            background: "linear-gradient(135deg, var(--ink) 0%, #1e293b 50%, #0f172a 100%)",
            borderTopLeftRadius: "1rem",
            borderTopRightRadius: "1rem"
          }}
        >
          <div className="flex items-center gap-2">
            <span 
              className="px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 backdrop-blur-xs"
              style={{ background: levelInfo.bg, color: levelInfo.color, border: `1px solid ${levelInfo.border}` }}
            >
              <Sparkles size={12} />
              {levelInfo.title} • Lvl {levelInfo.level}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
            title="Close"
            aria-label="Close user profile"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Container */}
        <div className="px-4 sm:px-6 pb-5 sm:pb-6 pt-0 relative">
          {/* Avatar and credits header row */}
          <div className="flex items-end justify-between -mt-10 sm:-mt-12 mb-3">
            <div 
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 flex items-center justify-center text-xl sm:text-2xl font-bold shadow-lg flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, var(--accent) 0%, #D97706 100%)",
                color: "#FFFFFF",
                borderColor: "var(--surface)",
              }}
            >
              {initials}
            </div>

            <div 
              className="px-3 py-1.5 rounded-xl border flex items-center gap-2 shadow-xs"
              style={{ background: "var(--accent-soft)", borderColor: "rgba(232, 163, 61, 0.3)" }}
            >
              <Award size={16} className="text-[var(--accent)]" />
              <span className="text-xs font-bold" style={{ color: "var(--accent-ink)" }}>
                {profile?.reputation_credits ?? 0} Credits
              </span>
            </div>
          </div>

          {/* Scholar Details - Always completely on the card surface with perfect contrast */}
          <div className="mb-5">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 id="user-profile-modal-title" className="sa-serif text-xl sm:text-2xl font-bold text-[var(--text)]">
                {loading ? "Loading..." : profile?.full_name}
              </h2>
              <span 
                className="text-[11px] uppercase tracking-wider font-bold px-2 py-0.5 rounded"
                style={{ background: "var(--surface-subtle)", color: "var(--muted)", border: "1px solid var(--line)" }}
              >
                {profile?.role || "Student"}
              </span>
            </div>
            <p className="text-xs flex items-center gap-1 text-[var(--muted)] mt-1">
              <Calendar size={12} /> Member since {formattedDate}
            </p>
          </div>

          {loading ? (
            <div className="py-16 text-center">
              <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-[var(--muted)]">Fetching public scholar dossier...</p>
            </div>
          ) : error ? (
            <div className="py-10 text-center text-sm" style={{ color: "var(--danger)" }}>
              {error}
            </div>
          ) : profile ? (
            <div className="space-y-5">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div 
                  className="p-3.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all hover:scale-[1.02]"
                  style={{ background: "var(--surface-subtle)", borderColor: "var(--line)" }}
                >
                  <BookOpen size={18} className="text-blue-500 mb-1" />
                  <span className="text-lg font-bold text-[var(--text)]">{profile.documents_count}</span>
                  <span className="text-[11px] text-[var(--muted)]">Documents</span>
                </div>

                <div 
                  className="p-3.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all hover:scale-[1.02]"
                  style={{ background: "var(--surface-subtle)", borderColor: "var(--line)" }}
                >
                  <TrendingUp size={18} className="text-emerald-500 mb-1" />
                  <span className="text-lg font-bold text-[var(--text)]">{profile.quizzes_taken}</span>
                  <span className="text-[11px] text-[var(--muted)]">Quizzes Taken</span>
                </div>

                <div 
                  className="p-3.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all hover:scale-[1.02]"
                  style={{ background: "var(--surface-subtle)", borderColor: "var(--line)" }}
                >
                  <MessageSquare size={18} className="text-amber-500 mb-1" />
                  <span className="text-lg font-bold text-[var(--text)]">{profile.discussions_joined}</span>
                  <span className="text-[11px] text-[var(--muted)]">Discussions</span>
                </div>

                <div 
                  className="p-3.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all hover:scale-[1.02]"
                  style={{ background: "var(--surface-subtle)", borderColor: "var(--line)" }}
                >
                  <Flame size={18} className="text-purple-500 mb-1" />
                  <span className="text-lg font-bold text-[var(--text)]">{profile.messages_sent}</span>
                  <span className="text-[11px] text-[var(--muted)]">Messages Sent</span>
                </div>
              </div>

              {/* Quiz Performance Card */}
              <div 
                className="p-4 rounded-xl border"
                style={{ background: "var(--surface)", borderColor: "var(--line)" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <span className="text-sm font-semibold text-[var(--text)]">Academic Evaluation Score</span>
                  </div>
                  <span className="text-xs font-bold text-[var(--accent)]">
                    {profile.avg_quiz_score !== null ? `${profile.avg_quiz_score}% Avg` : "No scores yet"}
                  </span>
                </div>
                {profile.avg_quiz_score !== null ? (
                  <div>
                    <div className="w-full h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(profile.avg_quiz_score, 100)}%`,
                          background: profile.avg_quiz_score >= 80 ? "var(--success)" : profile.avg_quiz_score >= 50 ? "var(--accent)" : "var(--danger)"
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-[var(--muted)] mt-1.5">
                      <span>Evaluated over {profile.quizzes_taken} completed quiz sessions</span>
                      <span>Target: 85%+</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--muted)]">This scholar has not submitted any quizzes yet.</p>
                )}
              </div>

              {/* Scholar Badges */}
              <div 
                className="p-4 rounded-xl border"
                style={{ background: "var(--surface)", borderColor: "var(--line)" }}
              >
                <BadgesGrid profile={profile} compact={true} />
              </div>

              {/* Quick Actions */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t" style={{ borderColor: "var(--line)" }}>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-sm font-medium border transition-colors hover:bg-[var(--surface-subtle)]"
                  style={{ borderColor: "var(--line)", color: "var(--text)" }}
                >
                  Done
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
