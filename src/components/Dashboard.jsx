import React, { useState, useEffect } from "react";
import {
  Target, HelpCircle, PenLine, Award, Flame, BookOpen, MessageSquare,
  Layers, ArrowRight, FileText, Upload, Sparkles, CheckCircle2, Trophy
} from "lucide-react";
import { ProgressBar, Badge } from "./UI";
import { useAuth } from "../context/AuthContext";
import { getDocuments } from "../services/api";

function Dashboard({ go, showToast, selectDoc, accessToken }) {
  const { user } = useAuth();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const stats = [
    { label: "Vault Documents", value: docs.length.toString(), icon: FileText, tone: "info" },
    { label: "Course Topics", value: totalTopics > 0 ? totalTopics.toString() : "8+", icon: Target, tone: "accent" },
    { label: "Vault Credits", value: (user?.reputation_credits ?? 10).toString(), icon: Award, tone: "success" },
    { label: "Study Streak", value: "5 days", icon: Flame, tone: "danger" },
  ];

  const quickActions = [
    { label: "Leaderboard", icon: Trophy, page: "leaderboard" },
    { label: "Quick Notes", icon: PenLine, page: "notes" },
    { label: "Generate Quiz", icon: HelpCircle, page: "quiz-setup" },
    { label: "Topic Summaries", icon: BookOpen, page: "summary" },
    { label: "Flashcards", icon: Layers, page: "flashcards" },
  ];

  return (
    <div className="sa-fade-in space-y-6">
      <div>
        <h2 className="sa-serif text-2xl font-semibold">Good morning, {user?.full_name || "there"} 👋</h2>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>Ready to continue your preparation?</p>
        <p className="text-xs mt-2 font-medium" style={{ color: "var(--accent)" }}>
          {user?.reputation_credits ?? 10} Vault Credits Earned
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="sa-card p-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
              style={{
                background: s.tone === "accent" ? "var(--accent-soft)" : s.tone === "success" ? "var(--success-soft)" : s.tone === "danger" ? "var(--danger-soft)" : s.tone === "info" ? "var(--info-soft)" : "var(--chip-bg)"
              }}>
              <s.icon size={15} color={s.tone === "accent" ? "var(--accent)" : s.tone === "success" ? "var(--success)" : s.tone === "danger" ? "var(--danger)" : s.tone === "info" ? "var(--info)" : "var(--muted)"} />
            </div>
            <div className="sa-serif text-xl font-semibold">{s.value}</div>
            <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 sa-card sa-card-lg p-5 flex flex-col justify-between" style={{ background: "var(--ink)", borderColor: "var(--line)" }}>
          {latestDoc ? (
            <>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>Continue learning</span>
                    <h3 className="sa-serif text-white text-xl font-semibold mt-1 truncate max-w-md">
                      {latestDoc.filename}
                    </h3>
                  </div>
                  <Badge tone={latestDoc.status === "completed" ? "success" : "accent"}>
                    {latestDoc.status}
                  </Badge>
                </div>
                <ProgressBar value={latestDoc.status === "completed" ? 100 : 45} tone="accent" height={10} />
              </div>
              <div className="flex items-center justify-between mt-5 pt-3 border-t border-white/10">
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
                  Uploaded {new Date(latestDoc.created_at).toLocaleDateString()}
                </span>
                <button
                  onClick={() => {
                    if (selectDoc) selectDoc(latestDoc);
                    go("document-study");
                  }}
                  className="sa-btn-accent px-4 py-2 text-sm flex items-center gap-2"
                >
                  Study Document <ArrowRight size={14} />
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-6 text-white space-y-3 my-auto">
              <Upload size={32} className="mx-auto text-amber-400" />
              <div>
                <h3 className="sa-serif text-xl font-semibold">No Documents Uploaded Yet</h3>
                <p className="text-xs text-white/70 mt-1 max-w-md mx-auto">
                  Upload your textbook PDFs, syllabus, or lecture slides to automatically generate topics and study schedules.
                </p>
              </div>
              <button onClick={() => go("upload")} className="sa-btn-accent px-5 py-2.5 text-xs font-semibold inline-flex items-center gap-2">
                Upload First Material <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>

        <div className="sa-card sa-card-lg p-5">
          <h3 className="font-semibold text-sm mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((a) => (
              <button key={a.label} onClick={() => go(a.page)}
                className="sa-btn-outline flex flex-col items-start gap-2 p-3 text-left transition-all hover:scale-[1.02]">
                <a.icon size={16} color="var(--accent)" />
                <span className="text-xs font-medium leading-tight">{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Recent Vault Documents</h3>
          <button onClick={() => go("documents")} className="text-xs font-medium flex items-center gap-1 hover:underline" style={{ color: "var(--info)" }}>
            View all <ArrowRight size={12} />
          </button>
        </div>

        {docs.length === 0 ? (
          <div className="sa-card p-6 text-center text-xs" style={{ color: "var(--muted)" }}>
            No documents in your vault yet. Use the "Upload Material" button to begin.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {docs.slice(0, 4).map((d) => (
              <div key={d.id} className="sa-card p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-start gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "var(--chip-bg)" }}>
                      <FileText size={14} color="var(--accent)" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate" title={d.filename}>{d.filename}</div>
                      <div className="text-xs" style={{ color: "var(--muted)" }}>
                        {(d.file_size / 1024 / 1024).toFixed(1)} MB
                      </div>
                    </div>
                  </div>
                  <div className="text-xs mb-3" style={{ color: "var(--muted)" }}>
                    {new Date(d.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t" style={{ borderColor: "var(--line)" }}>
                  <Badge tone={d.status === "completed" ? "success" : "accent"}>{d.status}</Badge>
                  <button
                    onClick={() => {
                      if (selectDoc) selectDoc(d);
                      go("document-study");
                    }}
                    className="text-xs font-medium hover:underline flex items-center gap-1"
                    style={{ color: "var(--accent)" }}
                  >
                    Study <ArrowRight size={11} />
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
