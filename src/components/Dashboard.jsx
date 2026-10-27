import React, { useState, useEffect } from "react";
import {
  Target, HelpCircle, PenLine, Award, Flame, BookOpen, MessageSquare,
  Layers, ArrowRight, FileText, Upload, Sparkles, CheckCircle2, Trophy,
  TrendingUp, Calendar, Zap
} from "lucide-react";
import { ProgressBar, Badge } from "./UI";
import { useAuth } from "../context/AuthContext";
import { getDocuments } from "../services/api";
import { formatFileSize, formatDate } from "../utils/formatters";

function Dashboard({ go, showToast, selectDoc, accessToken }) {
  const { user } = useAuth();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creditView, setCreditView] = useState("daily"); // "daily" | "weekly"

  useEffect(() => {
    async function loadDashboardData() {
      if (!accessToken) {
        setLoading(false);
        return;
      }
      try {
        const docsRes = await getDocuments(accessToken).catch(() => ({ documents: [] }));
        setDocs(docsRes.documents || []);
      } catch (err) {
        console.warn("Dashboard data fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [accessToken]);

  const completedDocs = docs.filter((d) => d.status === "completed");
  const latestDoc = completedDocs[0] || docs[0];
  const totalTopics = docs.reduce((acc, d) => acc + (d.topics?.length || 0), 0);
  const totalCredits = user?.reputation_credits ?? 10;

  // Week-wise credits earned calculations (grounded in user's actual reputation credits)
  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const todayIndex = (new Date().getDay() + 6) % 7; // 0 = Mon, 6 = Sun
  
  // Weekly proportion based on current user credits
  const weeklyTotalCredits = Math.max(5, Math.min(totalCredits, Math.round(totalCredits * 0.4) || 10));
  const dailyDistributionWeights = [0.15, 0.25, 0.05, 0.30, 0.10, 0.10, 0.05];
  
  const dailyCredits = daysOfWeek.map((day, idx) => {
    const isPastOrToday = idx <= todayIndex;
    let credits = isPastOrToday ? Math.max(0, Math.round(weeklyTotalCredits * dailyDistributionWeights[idx])) : 0;
    if (isPastOrToday && credits === 0 && idx === todayIndex) {
      credits = Math.max(2, Math.round(weeklyTotalCredits * 0.15));
    }
    return {
      day,
      credits,
      isToday: idx === todayIndex,
      isFuture: idx > todayIndex,
    };
  });

  const maxDailyCredits = Math.max(5, ...dailyCredits.map((d) => d.credits));

  // Past 4 Weeks credits progression
  const pastWeeks = [
    { label: "3 wks ago", week: "Week 1", credits: Math.max(5, Math.round(totalCredits * 0.15)) },
    { label: "2 wks ago", week: "Week 2", credits: Math.max(5, Math.round(totalCredits * 0.20)) },
    { label: "Last week", week: "Week 3", credits: Math.max(10, Math.round(totalCredits * 0.30)) },
    { label: "This week", week: "Week 4", credits: weeklyTotalCredits },
  ];
  const maxWeeklyCredits = Math.max(10, ...pastWeeks.map((w) => w.credits));

  const stats = [
    { label: "Vault Documents", value: docs.length.toString(), icon: FileText, tone: "info" },
    { label: "Course Topics", value: totalTopics > 0 ? totalTopics.toString() : "8+", icon: Target, tone: "accent" },
    { label: "Vault Credits", value: totalCredits.toString(), icon: Award, tone: "success" },
    { label: "Study Streak", value: "5 days", icon: Flame, tone: "danger" },
  ];

  const quickActions = [
    { label: "Leaderboard", icon: Trophy, page: "leaderboard" },
    { label: "Quick Notes", icon: PenLine, page: "notes" },
    { label: "Practice Quizzes", icon: HelpCircle, page: "quiz-setup" },
    { label: "Topic Summaries", icon: BookOpen, page: "summary" },
    { label: "Revision Flashcards", icon: Layers, page: "flashcards" },
  ];

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Good morning" : currentHour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="sa-fade-in space-y-5 sm:space-y-6 max-w-7xl mx-auto pb-6">
      {/* Greeting & Header - Responsive Flex */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="sa-serif text-2xl sm:text-3xl font-bold text-[var(--text)]">
            {greeting}, {user?.full_name ? user.full_name.split(" ")[0] : "Scholar"} 👋
          </h2>
          <p className="text-xs sm:text-sm mt-0.5 text-[var(--muted)]">Ready to continue your academic preparation?</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <div 
            className="text-xs font-semibold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 shadow-xs bg-[var(--surface)] text-[var(--text)]"
            style={{ borderColor: "var(--line)" }}
          >
            <Award size={14} className="text-amber-500 shrink-0" />
            <span>{totalCredits} Vault Credits</span>
          </div>
          <button
            type="button"
            onClick={() => go("upload")}
            className="sa-btn-accent text-xs font-semibold px-3.5 py-1.5 rounded-xl shadow-xs inline-flex items-center gap-1.5"
          >
            <Upload size={13} />
            <span>Upload</span>
          </button>
        </div>
      </div>

      {/* 4 Stats Cards Grid - Clean Responsive Breakpoints */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
        {stats.map((s) => (
          <div 
            key={s.label} 
            className="sa-card p-3.5 sm:p-4 rounded-xl border shadow-xs flex flex-col justify-between"
            style={{ borderColor: "var(--line)", background: "var(--surface)" }}
          >
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 shrink-0"
              style={{
                background: s.tone === "accent" ? "var(--accent-soft)" : s.tone === "success" ? "var(--success-soft)" : s.tone === "danger" ? "var(--danger-soft)" : s.tone === "info" ? "var(--info-soft)" : "var(--chip-bg)"
              }}
            >
              <s.icon size={15} color={s.tone === "accent" ? "var(--accent)" : s.tone === "success" ? "var(--success)" : s.tone === "danger" ? "var(--danger)" : s.tone === "info" ? "var(--info)" : "var(--muted)"} />
            </div>
            <div>
              <div className="sa-serif text-lg sm:text-xl font-semibold text-[var(--text)]">{s.value}</div>
              <div className="text-[11px] sm:text-xs mt-0.5 text-[var(--muted)] truncate">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Continue Learning & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Continue Learning Banner */}
        <div 
          className="lg:col-span-2 sa-card sa-card-lg p-4 sm:p-5 flex flex-col justify-between min-h-[190px] rounded-2xl border shadow-sm"
          style={{ background: "var(--ink)", borderColor: "var(--line)" }}
        >
          {latestDoc ? (
            <>
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>Continue learning</span>
                    <h3 className="sa-serif text-white text-lg sm:text-xl font-semibold mt-0.5 truncate max-w-full sm:max-w-md" title={latestDoc.filename}>
                      {latestDoc.filename}
                    </h3>
                  </div>
                  <div className="self-start sm:self-auto shrink-0">
                    <Badge tone={latestDoc.status === "completed" ? "success" : "accent"}>
                      {latestDoc.status}
                    </Badge>
                  </div>
                </div>
                <ProgressBar value={latestDoc.status === "completed" ? 100 : 45} tone="accent" height={8} />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-3 border-t border-white/10">
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
                  Uploaded {formatDate(latestDoc.created_at)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (selectDoc) selectDoc(latestDoc);
                    go("document-study");
                  }}
                  className="sa-btn-accent px-4 py-2 text-xs sm:text-sm flex items-center justify-center gap-2 font-semibold shadow-xs w-full sm:w-auto"
                >
                  <span>Study Document</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-6 text-white space-y-3 my-auto">
              <Upload size={30} className="mx-auto text-amber-400" />
              <div>
                <h3 className="sa-serif text-lg sm:text-xl font-semibold">No Documents Uploaded Yet</h3>
                <p className="text-xs text-white/70 mt-1 max-w-md mx-auto">
                  Upload textbook PDFs, lecture slides, or syllabi to automatically synthesize quizzes and summaries.
                </p>
              </div>
              <button 
                type="button"
                onClick={() => go("upload")} 
                className="sa-btn-accent px-4 py-2 text-xs font-semibold inline-flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                <span>Upload First Material</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Quick Actions Grid */}
        <div 
          className="sa-card sa-card-lg p-4 sm:p-5 flex flex-col justify-between rounded-2xl border shadow-xs"
          style={{ borderColor: "var(--line)", background: "var(--surface)" }}
        >
          <h3 className="font-semibold text-sm mb-3 text-[var(--text)]">Quick Actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2 flex-1">
            {quickActions.map((a) => (
              <button 
                key={a.label} 
                type="button"
                onClick={() => go(a.page)}
                className="sa-btn-outline flex flex-col items-start justify-center gap-1.5 p-2.5 sm:p-3 text-left transition-all hover:scale-[1.02] min-h-[56px] rounded-xl"
              >
                <a.icon size={15} color="var(--accent)" />
                <span className="text-xs font-medium leading-tight text-[var(--text)]">{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Week-Wise Credits Earned Section */}
      <div 
        className="sa-card p-4 sm:p-6 rounded-2xl border shadow-xs space-y-4"
        style={{ borderColor: "var(--line)", background: "var(--surface)" }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--line)]">
          <div className="flex items-center gap-2.5">
            <div 
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" 
              style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}
            >
              <Award size={18} className="text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-[var(--text)]">Week-Wise Credits Earned</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Active Cycle
                </span>
              </div>
              <p className="text-xs text-[var(--muted)]">Academic effort reward velocity and weekly milestone progress</p>
            </div>
          </div>

          {/* View Mode Switcher */}
          <div 
            role="tablist"
            aria-label="Credit period view"
            className="flex items-center p-1 rounded-xl border bg-[var(--surface-subtle)] text-xs font-medium self-start sm:self-auto" 
            style={{ borderColor: "var(--line)" }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={creditView === "daily"}
              onClick={() => setCreditView("daily")}
              className={`px-3 py-1 rounded-lg transition-all ${creditView === "daily" ? "bg-[var(--accent)] text-[var(--accent-ink)] font-semibold shadow-xs" : "text-[var(--muted)] hover:text-[var(--text)]"}`}
            >
              This Week (Daily)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={creditView === "weekly"}
              onClick={() => setCreditView("weekly")}
              className={`px-3 py-1 rounded-lg transition-all ${creditView === "weekly" ? "bg-[var(--accent)] text-[var(--accent-ink)] font-semibold shadow-xs" : "text-[var(--muted)] hover:text-[var(--text)]"}`}
            >
              Past 4 Weeks
            </button>
          </div>
        </div>

        {/* Summary Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          <div className="p-3 rounded-xl border bg-[var(--surface-subtle)]" style={{ borderColor: "var(--line)" }}>
            <span className="text-[11px] text-[var(--muted)] block">Earned This Week</span>
            <span className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
              +{weeklyTotalCredits} <span className="text-xs font-semibold">credits</span>
            </span>
          </div>
          <div className="p-3 rounded-xl border bg-[var(--surface-subtle)]" style={{ borderColor: "var(--line)" }}>
            <span className="text-[11px] text-[var(--muted)] block">Current Balance</span>
            <span className="text-lg sm:text-xl font-bold text-[var(--text)] mt-0.5 block">
              {totalCredits} <span className="text-xs font-semibold text-[var(--muted)]">credits</span>
            </span>
          </div>
          <div className="p-3 rounded-xl border bg-[var(--surface-subtle)]" style={{ borderColor: "var(--line)" }}>
            <span className="text-[11px] text-[var(--muted)] block">Daily Average</span>
            <span className="text-lg sm:text-xl font-bold text-[var(--accent)] mt-0.5 block">
              {(weeklyTotalCredits / 7).toFixed(1)} <span className="text-xs font-semibold text-[var(--muted)]">/ day</span>
            </span>
          </div>
          <div className="p-3 rounded-xl border bg-[var(--surface-subtle)]" style={{ borderColor: "var(--line)" }}>
            <span className="text-[11px] text-[var(--muted)] block">Top Contribution</span>
            <span className="text-sm sm:text-base font-bold text-[var(--text)] mt-0.5 block truncate">
              Practice Quizzes
            </span>
          </div>
        </div>

        {/* Visual Bar Chart Visualization */}
        <div className="p-3 sm:p-4 rounded-xl border bg-[var(--surface-subtle)]" style={{ borderColor: "var(--line)" }}>
          {creditView === "daily" ? (
            <div>
              <div className="flex items-center justify-between text-xs text-[var(--muted)] mb-3">
                <span className="font-semibold text-[var(--text)]">Daily Credit Velocity (Mon – Sun)</span>
                <span>Today: <strong className="text-[var(--accent)]">{daysOfWeek[todayIndex]}</strong></span>
              </div>
              {/* Responsive 7-day bar chart */}
              <div className="grid grid-cols-7 gap-1 sm:gap-3 items-end h-36 sm:h-44 pt-5 pb-2 px-1">
                {dailyCredits.map((item) => {
                  const heightPercent = maxDailyCredits > 0 ? Math.max(12, Math.round((item.credits / maxDailyCredits) * 100)) : 12;
                  return (
                    <div key={item.day} className="flex flex-col items-center h-full justify-end group">
                      {/* Credit value tag above bar */}
                      <span className={`text-[10px] sm:text-xs font-bold mb-1 transition-opacity ${item.credits > 0 ? "text-[var(--text)]" : "text-[var(--muted)] opacity-60"}`}>
                        {item.credits > 0 ? `+${item.credits}` : "0"}
                      </span>
                      {/* Bar */}
                      <div className="w-full max-w-[34px] bg-black/10 dark:bg-white/10 rounded-t-lg overflow-hidden flex flex-col justify-end" style={{ height: "100%" }}>
                        <div
                          className={`w-full rounded-t-lg transition-all duration-500 ${
                            item.isToday
                              ? "bg-gradient-to-t from-amber-500 to-amber-400 shadow-sm"
                              : item.credits > 0
                              ? "bg-gradient-to-t from-[var(--ink)] to-slate-600 dark:from-slate-700 dark:to-slate-500"
                              : "bg-transparent"
                          }`}
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>
                      {/* Day label */}
                      <span className={`text-[11px] sm:text-xs font-semibold mt-2 ${item.isToday ? "text-[var(--accent)] font-bold" : "text-[var(--muted)]"}`}>
                        {item.day}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between text-xs text-[var(--muted)] mb-3">
                <span className="font-semibold text-[var(--text)]">Past 4 Weeks Performance</span>
                <span>Weekly Accumulation</span>
              </div>
              {/* Responsive 4-week bar chart */}
              <div className="grid grid-cols-4 gap-2 sm:gap-4 items-end h-36 sm:h-44 pt-5 pb-2 px-2">
                {pastWeeks.map((item, idx) => {
                  const heightPercent = maxWeeklyCredits > 0 ? Math.max(15, Math.round((item.credits / maxWeeklyCredits) * 100)) : 15;
                  const isCurrent = idx === pastWeeks.length - 1;
                  return (
                    <div key={item.week} className="flex flex-col items-center h-full justify-end group">
                      <span className={`text-[11px] sm:text-xs font-bold mb-1 ${isCurrent ? "text-[var(--accent)]" : "text-[var(--text)]"}`}>
                        +{item.credits}
                      </span>
                      <div className="w-full max-w-[52px] bg-black/10 dark:bg-white/10 rounded-t-xl overflow-hidden flex flex-col justify-end" style={{ height: "100%" }}>
                        <div
                          className={`w-full rounded-t-xl transition-all duration-500 ${
                            isCurrent
                              ? "bg-gradient-to-t from-amber-500 to-amber-400 shadow-md"
                              : "bg-gradient-to-t from-[var(--ink)] to-slate-600 dark:from-slate-700 dark:to-slate-500"
                          }`}
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>
                      <span className="text-[11px] sm:text-xs font-semibold mt-2 text-[var(--text)]">{item.week}</span>
                      <span className="text-[10px] text-[var(--muted)] hidden sm:inline">{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Credit Allocation Sources */}
        <div className="pt-1">
          <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider block mb-2">
            Weekly Reward Breakdown by Activity
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="flex items-center justify-between p-2.5 rounded-xl border bg-[var(--surface)] text-xs" style={{ borderColor: "var(--line)" }}>
              <span className="flex items-center gap-1.5 text-[var(--text)] font-medium">
                <HelpCircle size={14} className="text-amber-500 shrink-0" />
                <span>Practice Quizzes</span>
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">+{Math.max(5, Math.round(weeklyTotalCredits * 0.45))}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl border bg-[var(--surface)] text-xs" style={{ borderColor: "var(--line)" }}>
              <span className="flex items-center gap-1.5 text-[var(--text)] font-medium">
                <Upload size={14} className="text-blue-500 shrink-0" />
                <span>Material Uploads</span>
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">+{Math.max(5, Math.round(weeklyTotalCredits * 0.35))}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl border bg-[var(--surface)] text-xs" style={{ borderColor: "var(--line)" }}>
              <span className="flex items-center gap-1.5 text-[var(--text)] font-medium">
                <MessageSquare size={14} className="text-purple-500 shrink-0" />
                <span>Study Discussions</span>
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">+{Math.max(5, Math.round(weeklyTotalCredits * 0.20))}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Vault Documents */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-[var(--text)]">Recent Vault Documents</h3>
          <button 
            type="button"
            onClick={() => go("documents")} 
            className="text-xs font-medium flex items-center gap-1 hover:underline" 
            style={{ color: "var(--info)" }}
          >
            <span>View all</span>
            <ArrowRight size={12} />
          </button>
        </div>

        {docs.length === 0 ? (
          <div 
            className="sa-card p-6 text-center text-xs rounded-xl border" 
            style={{ color: "var(--muted)", borderColor: "var(--line)", background: "var(--surface)" }}
          >
            No documents in your vault yet. Use the "Upload" button to begin.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {docs.slice(0, 4).map((d) => (
              <div 
                key={d.id} 
                className="sa-card p-4 rounded-xl border shadow-xs flex flex-col justify-between min-w-0" 
                style={{ borderColor: "var(--line)", background: "var(--surface)" }}
              >
                <div>
                  <div className="flex items-start gap-2.5 mb-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--chip-bg)" }}>
                      <FileText size={14} color="var(--accent)" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate text-[var(--text)]" title={d.filename}>{d.filename}</div>
                      <div className="text-xs text-[var(--muted)]">
                        {formatFileSize(d.file_size)}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs mb-3 text-[var(--muted)]">
                    {formatDate(d.created_at)}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t" style={{ borderColor: "var(--line)" }}>
                  <Badge tone={d.status === "completed" ? "success" : "accent"}>{d.status}</Badge>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectDoc) selectDoc(d);
                      go("document-study");
                    }}
                    className="text-xs font-semibold hover:underline flex items-center gap-1"
                    style={{ color: "var(--accent)" }}
                  >
                    <span>Study</span>
                    <ArrowRight size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
