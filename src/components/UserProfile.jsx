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

              {/* Two Column Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Academic Performance */}
                <div 
                  className="p-6 rounded-2xl border"
                  style={{ background: "var(--surface)", borderColor: "var(--line)" }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 size={18} className="text-emerald-500" />
                      <h3 className="font-bold text-base text-[var(--text)]">Academic Evaluation</h3>
                    </div>
                    <span className="text-sm font-bold text-[var(--accent)]">
                      {profile.avg_quiz_score !== null ? `${profile.avg_quiz_score}% Average` : "Pending"}
                    </span>
                  </div>

                  {profile.avg_quiz_score !== null ? (
                    <div className="space-y-3">
                      <div className="w-full h-3 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                        <div 
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.min(profile.avg_quiz_score, 100)}%`,
                            background: profile.avg_quiz_score >= 80 ? "var(--success)" : profile.avg_quiz_score >= 50 ? "var(--accent)" : "var(--danger)"
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-[var(--muted)]">
                        <span>Calculated across {profile.quizzes_taken} graded exams</span>
                        <span>Standard passmark: 50%</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--muted)]">
                      No examination results recorded yet for this scholar.
                    </p>
                  )}
                </div>

                {/* Badges and Merits */}
                <div 
                  className="p-6 rounded-2xl border"
                  style={{ background: "var(--surface)", borderColor: "var(--line)" }}
                >
                  <BadgesGrid profile={profile} />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
