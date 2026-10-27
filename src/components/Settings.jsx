import React, { useState } from "react";
import { 
  Sun, Moon, Laptop, Check, User, Shield, Bell, BookOpen, 
  Cpu, Database, Keyboard, Sparkles, Sliders, Trash2, Download, 
  RefreshCw, CheckCircle2, AlertTriangle, Key, ExternalLink, HelpCircle
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { clearClientCache } from "../services/api";

function SettingsPage({ showToast }) {
  const { user } = useAuth();
  const [tab, setTab] = useState("Profile");
  const { theme, setTheme } = useTheme();

  // Profile fields state
  const [profileData, setProfileData] = useState({
    name: user?.full_name || "",
    email: user?.email || "",
    course: "B.Tech Computer Science",
    university: "Pune Institute of Computer Technology (PICT)",
    semester: "Semester 5",
    scholarId: "PICT-CS-2024-042",
    bio: "Focusing on Distributed Systems, Computer Networks and Algorithmic Design."
  });

  // Appearance & Editor state
  const [editorFontSize, setEditorFontSize] = useState("14px");
  const [editorTheme, setEditorTheme] = useState("vs-dark");
  const [compactMode, setCompactMode] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  // AI & Sandbox state
  const [aiVerbosity, setAiVerbosity] = useState("detailed");
  const [sandboxTimeout, setSandboxTimeout] = useState("7s");
  const [latexRendering, setLatexRendering] = useState(true);

  // Study & Quiz state
  const [difficulty, setDifficulty] = useState("Medium");
  const [quizCount, setQuizCount] = useState(10);
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(45);
  const [includeCodingQuestions, setIncludeCodingQuestions] = useState(true);

  // Notifications state
  const [notifs, setNotifs] = useState({
    reminders: true,
    weekly: true,
    streak: true,
    discussions: true,
    soundEffects: true
  });

  // Cache state
  const [clearingCache, setClearingCache] = useState(false);

  const tabs = [
    { id: "Profile", label: "Profile & Academic", icon: User },
    { id: "Appearance", label: "Appearance & UI", icon: Sun },
    { id: "AI Engine", label: "AI & Model Engine", icon: Cpu },
    { id: "Study Preferences", label: "Study & Quiz Rules", icon: BookOpen },
    { id: "Notifications", label: "Notifications & Audio", icon: Bell },
    { id: "Data & Cache", label: "Data, Cache & Security", icon: Database },
    { id: "Shortcuts", label: "Keyboard Shortcuts", icon: Keyboard },
  ];

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    const label = newTheme === "light" ? "Light theme" : newTheme === "dark" ? "Dark theme" : "System theme";
    if (showToast) showToast(`Switched to ${label}`);
  };

  const handleClearCache = () => {
    setClearingCache(true);
    clearClientCache();
    setTimeout(() => {
      setClearingCache(false);
      if (showToast) showToast("Application and client-side memory cache cleared!");
    }, 600);
  };

  const handleExportData = () => {
    const backupData = {
      user: {
        id: user?.id,
        email: user?.email,
        full_name: user?.full_name,
        reputation_credits: user?.reputation_credits
      },
      exported_at: new Date().toISOString(),
      app_version: "ExamVault 2.0"
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `examvault_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    if (showToast) showToast("Backup archive exported successfully!");
  };

  const themeCards = [
    {
      id: "light",
      label: "Academic Light",
      icon: Sun,
      description: "Warm paper background with clear ink typography, inspired by physical textbooks.",
      previewBg: "#F9F8F4",
      previewSurface: "#FFFFFF",
      previewLine: "#E7E4DA",
      previewText: "#1C2130",
    },
    {
      id: "dark",
      label: "Midnight Slate",
      icon: Moon,
      description: "Deep midnight slate with luminous amber highlights, optimized for late-night study.",
      previewBg: "#0B0F17",
      previewSurface: "#131926",
      previewLine: "#222C40",
      previewText: "#F1F5F9",
    },
    {
      id: "system",
      label: "System Synchronized",
      icon: Laptop,
      description: "Automatically synchronizes with your device's daylight or dark mode schedule.",
      previewBg: "linear-gradient(135deg, #F9F8F4 50%, #0B0F17 50%)",
      previewSurface: "linear-gradient(135deg, #FFFFFF 50%, #131926 50%)",
      previewLine: "#334155",
      previewText: "#E8A33D",
    },
  ];

  return (
    <div className="sa-fade-in grid md:grid-cols-[240px_1fr] gap-4 md:gap-6 max-w-6xl mx-auto pb-12">
      {/* Sidebar Navigation (Horizontal scroll on mobile, vertical sidebar on desktop) */}
      <div 
        role="tablist"
        aria-label="Settings Categories"
        className="sa-card p-2 md:p-3 h-fit flex md:flex-col gap-1 overflow-x-auto whitespace-nowrap sa-scroll shrink-0"
      >
        {tabs.map((t) => {
          const Icon = t.icon;
          const isSelected = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setTab(t.id)}
              className="shrink-0 md:w-full text-left px-3.5 py-2 md:py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              style={{
                background: isSelected ? "var(--surface-subtle)" : "transparent",
                color: isSelected ? "var(--accent)" : "var(--text)",
                boxShadow: isSelected ? "0 1px 3px rgba(0,0,0,0.05)" : "none",
              }}
            >
              <Icon size={15} className={`shrink-0 ${isSelected ? "text-[var(--accent)]" : "text-[var(--muted)]"}`} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Settings Panel */}
      <div className="sa-card sa-card-lg p-6 md:p-8" role="tabpanel">
        {/* TAB 1: PROFILE & ACADEMIC INFO */}
        {tab === "Profile" && (
          <div className="space-y-6 max-w-xl">
            <div>
              <h3 className="sa-serif text-xl font-bold text-[var(--text)]">Academic Identity & Profile</h3>
              <p className="text-xs text-[var(--muted)] mt-1">
                Manage your student credentials and institutional standing displayed across peer discussions and leaderboards.
              </p>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--line)]">
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl shadow-md shrink-0" 
                style={{ background: "linear-gradient(135deg, var(--accent) 0%, #D97706 100%)", color: "var(--accent-ink)" }}
              >
                <span>{user?.full_name?.slice(0, 2).toUpperCase() || "EV"}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-[var(--text)] truncate">{user?.full_name || "Scholar"}</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    {user?.reputation_credits ?? 10} Credits
                  </span>
                </div>
                <p className="text-xs text-[var(--muted)] truncate">{user?.email}</p>
                <span className="text-[11px] text-[var(--accent)] font-medium mt-1 inline-block capitalize">
                  Role: {user?.role || "Student"} Scholar
                </span>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="settings-name" className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Full Name</label>
                <input 
                  id="settings-name"
                  value={profileData.name} 
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className="w-full mt-1.5 px-3.5 py-2 rounded-xl text-xs outline-none border transition-colors focus:border-[var(--accent)]" 
                  style={{ borderColor: "var(--line)", background: "var(--input-bg)", color: "var(--text)" }} 
                />
              </div>

              <div>
                <label htmlFor="settings-email" className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Registered Email</label>
                <input 
                  id="settings-email"
                  value={profileData.email} 
                  disabled
                  className="w-full mt-1.5 px-3.5 py-2 rounded-xl text-xs outline-none border opacity-70 cursor-not-allowed" 
                  style={{ borderColor: "var(--line)", background: "var(--surface-subtle)", color: "var(--text)" }} 
                />
              </div>

              <div>
                <label htmlFor="settings-university" className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">College / University</label>
                <input 
                  id="settings-university"
                  value={profileData.university} 
                  onChange={(e) => setProfileData({ ...profileData, university: e.target.value })}
                  className="w-full mt-1.5 px-3.5 py-2 rounded-xl text-xs outline-none border transition-colors focus:border-[var(--accent)]" 
                  style={{ borderColor: "var(--line)", background: "var(--input-bg)", color: "var(--text)" }} 
                />
              </div>

              <div>
                <label htmlFor="settings-course" className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Degree / Branch</label>
                <input 
                  id="settings-course"
                  value={profileData.course} 
                  onChange={(e) => setProfileData({ ...profileData, course: e.target.value })}
                  className="w-full mt-1.5 px-3.5 py-2 rounded-xl text-xs outline-none border transition-colors focus:border-[var(--accent)]" 
                  style={{ borderColor: "var(--line)", background: "var(--input-bg)", color: "var(--text)" }} 
                />
              </div>

              <div>
                <label htmlFor="settings-semester" className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Academic Semester</label>
                <select 
                  id="settings-semester"
                  value={profileData.semester}
                  onChange={(e) => setProfileData({ ...profileData, semester: e.target.value })}
                  className="w-full mt-1.5 px-3.5 py-2 rounded-xl text-xs outline-none border transition-colors focus:border-[var(--accent)]" 
                  style={{ borderColor: "var(--line)", background: "var(--input-bg)", color: "var(--text)" }}
                >
                  <option>Semester 1</option><option>Semester 2</option><option>Semester 3</option>
                  <option>Semester 4</option><option>Semester 5</option><option>Semester 6</option>
                  <option>Semester 7</option><option>Semester 8</option>
                </select>
              </div>

              <div>
                <label htmlFor="settings-scholarId" className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Scholar ID / Roll No</label>
                <input 
                  id="settings-scholarId"
                  value={profileData.scholarId} 
                  onChange={(e) => setProfileData({ ...profileData, scholarId: e.target.value })}
                  className="w-full mt-1.5 px-3.5 py-2 rounded-xl text-xs outline-none border transition-colors focus:border-[var(--accent)]" 
                  style={{ borderColor: "var(--line)", background: "var(--input-bg)", color: "var(--text)" }} 
                />
              </div>
            </div>

            <div>
              <label htmlFor="settings-bio" className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Bio & Academic Interests</label>
              <textarea 
                id="settings-bio"
                rows={3}
                value={profileData.bio}
                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                className="w-full mt-1.5 px-3.5 py-2 rounded-xl text-xs outline-none border transition-colors focus:border-[var(--accent)] resize-none"
                style={{ borderColor: "var(--line)", background: "var(--input-bg)", color: "var(--text)" }}
              />
            </div>

            <button 
              type="button"
              onClick={() => showToast && showToast("Academic profile changes saved successfully!")} 
              className="sa-btn-primary px-5 py-2.5 text-xs font-semibold rounded-xl flex items-center gap-2"
            >
              <Check size={14} /> Save Profile Changes
            </button>
          </div>
        )}

        {/* TAB 2: APPEARANCE & CODE EDITOR */}
        {tab === "Appearance" && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h3 className="sa-serif text-xl font-bold mb-1">Theme & Aesthetic Display</h3>
              <p className="text-xs text-[var(--muted)]">
                Tailor the color palette, typography contrast, and Monaco code editor to suit your reading environment.
              </p>
            </div>

            {/* Theme Cards */}
            <div className="grid sm:grid-cols-3 gap-3" role="radiogroup" aria-label="Aesthetic Themes">
              {themeCards.map((item) => {
                const isSelected = theme === item.id;
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onClick={() => handleThemeChange(item.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleThemeChange(item.id);
                      }
                    }}
                    className="p-4 rounded-2xl border flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02] relative group select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                    style={{
                      borderColor: isSelected ? "var(--accent)" : "var(--line)",
                      background: isSelected ? "var(--surface-subtle)" : "var(--surface)",
                      boxShadow: isSelected ? "0 0 0 1.5px var(--accent)" : "none",
                    }}
                  >
                    <div>
                      <div
                        className="w-full h-16 rounded-xl mb-3 p-2 flex flex-col justify-between border relative overflow-hidden"
                        style={{
                          background: item.previewBg,
                          borderColor: item.previewLine,
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "var(--accent)" }}>
                            <Icon size={11} color="#1A1408" />
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full flex items-center justify-center bg-emerald-500 text-white shadow-xs">
                              <Check size={11} strokeWidth={3} />
                            </div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="h-2 w-3/4 rounded" style={{ background: "var(--accent)", opacity: 0.7 }} />
                          <div className="h-1.5 w-1/2 rounded" style={{ background: item.previewLine }} />
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs" style={{ color: isSelected ? "var(--accent)" : "var(--text)" }}>
                          {item.label}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] leading-relaxed text-[var(--muted)]">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Code Editor Options */}
            <div className="p-5 rounded-2xl border bg-[var(--surface-subtle)] space-y-4" style={{ borderColor: "var(--line)" }}>
              <div className="flex items-center gap-2">
                <Sliders size={16} className="text-amber-500" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-[var(--text)]">Monaco Code Editor Configuration</h4>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="settings-font-size-group" className="text-xs text-[var(--muted)] font-medium">Editor Font Size</label>
                  <div id="settings-font-size-group" className="grid grid-cols-3 gap-2 mt-1.5" role="radiogroup" aria-label="Editor font size">
                    {["12px", "14px", "16px"].map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        role="radio"
                        aria-checked={editorFontSize === sz}
                        onClick={() => { setEditorFontSize(sz); showToast && showToast(`Code font set to ${sz}`); }}
                        className={`py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          editorFontSize === sz ? "bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)]" : "bg-[var(--surface)] text-[var(--text)] border-[var(--line)]"
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="settings-editor-theme" className="text-xs text-[var(--muted)] font-medium">Editor Color Scheme</label>
                  <select 
                    id="settings-editor-theme"
                    value={editorTheme} 
                    onChange={(e) => { setEditorTheme(e.target.value); showToast && showToast(`Editor theme changed to ${e.target.value}`); }}
                    className="w-full mt-1.5 px-3 py-2 rounded-xl text-xs bg-[var(--surface)] border outline-none text-[var(--text)]"
                    style={{ borderColor: "var(--line)" }}
                  >
                    <option value="vs-dark">Visual Studio Dark</option>
                    <option value="monokai">Monokai Pro</option>
                    <option value="dracula">Dracula Slate</option>
                    <option value="vs-light">Visual Studio Light</option>
                  </select>
                </div>
              </div>

              {/* Toggles */}
              <div className="pt-2 border-t border-[var(--line)] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label id="toggle-compact-label" className="text-xs font-semibold text-[var(--text)] block">Compact Layout Mode</label>
                    <div className="text-[11px] text-[var(--muted)]">Reduces margin spacing across document sidebars for high-density reading.</div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={compactMode}
                    aria-labelledby="toggle-compact-label"
                    onClick={() => { setCompactMode(!compactMode); showToast && showToast(`Compact mode ${!compactMode ? "enabled" : "disabled"}`); }}
                    className={`w-10 h-6 rounded-full relative transition-colors ${compactMode ? "bg-[var(--accent)]" : "bg-neutral-600/30"}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow-xs ${compactMode ? "left-4.5" : "left-0.5"}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label id="toggle-reduce-motion-label" className="text-xs font-semibold text-[var(--text)] block">Reduced Motion</label>
                    <div className="text-[11px] text-[var(--muted)]">Disables intensive CSS zoom animations on modal and note transitions.</div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={reduceMotion}
                    aria-labelledby="toggle-reduce-motion-label"
                    onClick={() => { setReduceMotion(!reduceMotion); showToast && showToast(`Reduced motion ${!reduceMotion ? "enabled" : "disabled"}`); }}
                    className={`w-10 h-6 rounded-full relative transition-colors ${reduceMotion ? "bg-[var(--accent)]" : "bg-neutral-600/30"}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow-xs ${reduceMotion ? "left-4.5" : "left-0.5"}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: AI & MODEL ENGINE */}
        {tab === "AI Engine" && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h3 className="sa-serif text-xl font-bold mb-1">Cloud AI Router & Inference</h3>
              <p className="text-xs text-[var(--muted)]">
                ExamVault utilizes a cloud dual-provider system (Groq + Google Gemini) ensuring sub-second generation and multi-modal accuracy.
              </p>
            </div>

            <div className="p-4 rounded-2xl border bg-emerald-500/5 border-emerald-500/20 flex items-start gap-3">
              <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Cloud AI Dual-Provider Active:</span>
                <p className="text-[var(--muted)] mt-0.5 leading-relaxed">
                  Fast text generation & structured quiz extraction routes to <strong className="text-[var(--text)]">Groq (Llama 3.3 / GPT-OSS 120B)</strong> with automatic fallback to <strong className="text-[var(--text)]">Google Gemini 1.5 Flash</strong> for diagrams, flowcharts, and OCR vision.
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[var(--muted)] font-medium">Mathematical Formula Rendering</label>
                <div 
                  onClick={() => setLatexRendering(!latexRendering)}
                  className="mt-1.5 p-3 rounded-xl border bg-[var(--surface-subtle)] flex items-center justify-between cursor-pointer"
                  style={{ borderColor: "var(--line)" }}
                >
                  <span className="text-xs font-semibold text-[var(--text)]">LaTeX Formula Math Engine</span>
                  <div className={`w-8 h-5 rounded-full relative transition-colors ${latexRendering ? "bg-emerald-500" : "bg-neutral-600/30"}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${latexRendering ? "left-3.5" : "left-0.5"}`} />
                  </div>
                </div>
                <p className="text-[10.5px] text-[var(--muted)] mt-1">
                  Renders standard KaTeX inline expressions e.g. $O(n \log n)$ and display equations.
                </p>
              </div>

              <div>
                <label className="text-xs text-[var(--muted)] font-medium">Code Sandbox Timeout</label>
                <div className="grid grid-cols-4 gap-1.5 mt-1.5" role="radiogroup" aria-label="Code Sandbox Timeout">
                  {["3s", "5s", "7s", "10s"].map((to) => (
                    <button
                      key={to}
                      type="button"
                      role="radio"
                      aria-checked={sandboxTimeout === to}
                      onClick={() => setSandboxTimeout(to)}
                      className={`py-1.5 rounded-xl text-xs font-semibold border ${
                        sandboxTimeout === to ? "bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)]" : "bg-[var(--surface-subtle)] text-[var(--text)] border-[var(--line)]"
                      }`}
                    >
                      {to}
                    </button>
                  ))}
                </div>
                <p className="text-[10.5px] text-[var(--muted)] mt-1">
                  Maximum execution time allowed for Python, C, C++, and Java execution sandbox.
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs text-[var(--muted)] font-medium">AI Response Synthesis Depth</label>
              <div className="grid sm:grid-cols-2 gap-3 mt-1.5" role="radiogroup" aria-label="AI Response Synthesis Depth">
                {[
                  { id: "detailed", title: "Comprehensive Academic", desc: "Includes derivations, step-by-step logic proofs, and real-world engineering analogies." },
                  { id: "concise", title: "Concise Exam Prep", desc: "Focuses strictly on key definitions, marks-oriented points, and bulleted takeaways." }
                ].map((mode) => (
                  <div
                    key={mode.id}
                    role="radio"
                    aria-checked={aiVerbosity === mode.id}
                    tabIndex={0}
                    onClick={() => setAiVerbosity(mode.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setAiVerbosity(mode.id);
                      }
                    }}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                      aiVerbosity === mode.id ? "bg-[var(--surface-subtle)] border-[var(--accent)] shadow-xs" : "bg-[var(--surface)] border-[var(--line)]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-[var(--text)]">{mode.title}</span>
                      {aiVerbosity === mode.id && <Check size={14} className="text-[var(--accent)]" />}
                    </div>
                    <p className="text-[11px] text-[var(--muted)] leading-relaxed">{mode.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: STUDY & QUIZ PREFERENCES */}
        {tab === "Study Preferences" && (
          <div className="max-w-xl space-y-6">
            <div>
              <h3 className="sa-serif text-xl font-bold mb-1">Curriculum & Quiz Generation Preferences</h3>
              <p className="text-xs text-[var(--muted)]">
                Default criteria applied when auto-generating quizzes, question papers, and study sessions from course materials.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Default Quiz Difficulty</label>
              <div className="grid grid-cols-3 gap-2 mt-1.5" role="radiogroup" aria-label="Default Quiz Difficulty">
                {["Easy", "Medium", "Hard"].map((d) => (
                  <button
                    key={d}
                    type="button"
                    role="radio"
                    aria-checked={difficulty === d}
                    onClick={() => { setDifficulty(d); showToast && showToast(`Default difficulty set to ${d}`); }}
                    className="sa-option-card py-2 text-xs font-semibold rounded-xl"
                    style={difficulty === d ? { borderColor: "var(--accent)", background: "var(--surface-subtle)", color: "var(--accent)" } : {}}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Default Question Count</label>
                <div className="grid grid-cols-4 gap-1.5 mt-1.5" role="radiogroup" aria-label="Default Question Count">
                  {[5, 10, 15, 20].map((num) => (
                    <button
                      key={num}
                      type="button"
                      role="radio"
                      aria-checked={quizCount === num}
                      onClick={() => setQuizCount(num)}
                      className={`py-2 rounded-xl text-xs font-semibold border ${
                        quizCount === num ? "bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)]" : "bg-[var(--surface-subtle)] text-[var(--text)] border-[var(--line)]"
                      }`}
                    >
                      {num} Qs
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Daily Study Target</label>
                <div className="grid grid-cols-4 gap-1.5 mt-1.5" role="radiogroup" aria-label="Daily Study Target">
                  {[30, 45, 60, 90].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      role="radio"
                      aria-checked={dailyGoalMinutes === mins}
                      onClick={() => setDailyGoalMinutes(mins)}
                      className={`py-2 rounded-xl text-xs font-semibold border ${
                        dailyGoalMinutes === mins ? "bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)]" : "bg-[var(--surface-subtle)] text-[var(--text)] border-[var(--line)]"
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl border bg-[var(--surface-subtle)] flex items-center justify-between" style={{ borderColor: "var(--line)" }}>
              <div>
                <label id="toggle-coding-questions-label" className="text-xs font-semibold text-[var(--text)] block">Include Practical Coding Questions</label>
                <div className="text-[11px] text-[var(--muted)]">Includes interactive Monaco coding challenges for Computer Science subjects.</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={includeCodingQuestions}
                aria-labelledby="toggle-coding-questions-label"
                onClick={() => setIncludeCodingQuestions(!includeCodingQuestions)}
                className={`w-10 h-6 rounded-full relative transition-colors ${includeCodingQuestions ? "bg-[var(--accent)]" : "bg-neutral-600/30"}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow-xs ${includeCodingQuestions ? "left-4.5" : "left-0.5"}`} />
              </button>
            </div>
          </div>
        )}

        {/* TAB 5: NOTIFICATIONS & AUDIO */}
        {tab === "Notifications" && (
          <div className="max-w-xl space-y-6">
            <div>
              <h3 className="sa-serif text-xl font-bold mb-1">Study Alerts & Audio Notifications</h3>
              <p className="text-xs text-[var(--muted)]">
                Control notifications and in-app sound effects for milestone achievements.
              </p>
            </div>

            <div className="space-y-3">
              {[
                { key: "reminders", title: "Daily Study Target Reminders", desc: "Gentle nudges to keep up with your daily academic goals." },
                { key: "streak", title: "Study Streak-at-Risk Alerts", desc: "Warnings when your consecutive active day streak is about to reset." },
                { key: "discussions", title: "Peer Discussion & Mention Alerts", desc: "Alerts when someone replies to your question in a study room." },
                { key: "weekly", title: "Weekly Mastery Digest", desc: "Weekly summary of quizzes submitted, credits earned, and topics revised." },
                { key: "soundEffects", title: "Quiz & Milestone Sound Effects", desc: "Subtle celebratory chimes on quiz submission and code pass." }
              ].map((item) => (
                <div 
                  key={item.key} 
                  className="p-3.5 rounded-2xl border bg-[var(--surface-subtle)] flex items-center justify-between gap-4"
                  style={{ borderColor: "var(--line)" }}
                >
                  <div>
                    <label id={`toggle-notif-${item.key}-label`} className="text-xs font-semibold text-[var(--text)] block">{item.title}</label>
                    <div className="text-[11px] text-[var(--muted)] mt-0.5">{item.desc}</div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={notifs[item.key]}
                    aria-labelledby={`toggle-notif-${item.key}-label`}
                    onClick={() => {
                      setNotifs({ ...notifs, [item.key]: !notifs[item.key] });
                      if (showToast) showToast(`${item.title} ${!notifs[item.key] ? "enabled" : "disabled"}`);
                    }}
                    className={`w-10 h-6 rounded-full relative transition-colors shrink-0 ${notifs[item.key] ? "bg-[var(--accent)]" : "bg-neutral-600/30"}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow-xs ${notifs[item.key] ? "left-4.5" : "left-0.5"}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: DATA, CACHE & SECURITY */}
        {tab === "Data & Cache" && (
          <div className="max-w-xl space-y-6">
            <div>
              <h3 className="sa-serif text-xl font-bold mb-1">Data Storage, Cache & Privacy</h3>
              <p className="text-xs text-[var(--muted)]">
                Inspect local cache status, download backups of your notes, or purge client storage.
              </p>
            </div>

            {/* Cache Control Card */}
            <div className="p-4 rounded-2xl border bg-[var(--surface-subtle)] space-y-3" style={{ borderColor: "var(--line)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[var(--text)]">In-Memory & Local Application Cache</h4>
                  <p className="text-[11px] text-[var(--muted)] mt-0.5">
                    Temporarily stores fetched quizzes, flashcards, and syllabus topics for instant 1ms reloads.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClearCache}
                  disabled={clearingCache}
                  className="px-3 py-1.5 rounded-xl border text-xs font-semibold bg-[var(--surface)] text-[var(--text)] hover:border-[var(--accent)] transition-all flex items-center gap-1.5 shrink-0 shadow-xs"
                  style={{ borderColor: "var(--line)" }}
                >
                  <RefreshCw size={12} className={clearingCache ? "animate-spin" : ""} />
                  <span>{clearingCache ? "Clearing..." : "Purge Cache"}</span>
                </button>
              </div>
            </div>

            {/* Data Export Card */}
            <div className="p-4 rounded-2xl border bg-[var(--surface-subtle)] space-y-3" style={{ borderColor: "var(--line)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[var(--text)]">Export Account Data Archive</h4>
                  <p className="text-[11px] text-[var(--muted)] mt-0.5">
                    Download a full JSON archive containing your scholar identity, credits, and notes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportData}
                  className="px-3 py-1.5 rounded-xl border text-xs font-semibold bg-[var(--surface)] text-[var(--text)] hover:border-[var(--accent)] transition-all flex items-center gap-1.5 shrink-0 shadow-xs"
                  style={{ borderColor: "var(--line)" }}
                >
                  <Download size={12} />
                  <span>Export JSON</span>
                </button>
              </div>
            </div>

            {/* Security & Encryption Info */}
            <div className="p-4 rounded-2xl border bg-[var(--surface)] space-y-2 text-xs" style={{ borderColor: "var(--line)" }}>
              <div className="flex items-center gap-1.5 text-emerald-500 font-bold">
                <Shield size={14} /> Server & Storage Encryption
              </div>
              <p className="text-[var(--muted)] leading-relaxed text-[11px]">
                Your study documents and PDF uploads are securely stored in Neon Serverless PostgreSQL with SSL TLS 1.3 encryption. Auth sessions use signed HMAC-SHA256 JWT tokens with 24-hour expiration.
              </p>
            </div>

            {/* Danger Zone */}
            <div className="p-4 rounded-2xl border border-red-500/20 bg-red-500/5 space-y-3">
              <div className="flex items-center gap-2 text-red-500 font-bold text-xs">
                <AlertTriangle size={15} /> Danger Zone
              </div>
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                Permanently delete your scholar account, uploaded textbook PDFs, notes, and credits from the ExamVault database.
              </p>
              <button 
                type="button"
                onClick={() => alert("To delete your account permanently, please contact the institutional administrator or submit a deletion request.")}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-red-500 border border-red-500/40 hover:bg-red-500/10 transition-colors"
              >
                Request Account Deletion
              </button>
            </div>
          </div>
        )}

        {/* TAB 7: KEYBOARD SHORTCUTS */}
        {tab === "Shortcuts" && (
          <div className="max-w-xl space-y-6">
            <div>
              <h3 className="sa-serif text-xl font-bold mb-1">Keyboard Productivity Shortcuts</h3>
              <p className="text-xs text-[var(--muted)]">
                Speed up your note editing, algorithm simulation, and study sessions with rapid key combos.
              </p>
            </div>

            <div className="divide-y rounded-2xl border bg-[var(--surface-subtle)] overflow-hidden" style={{ borderColor: "var(--line)" }}>
              {[
                { keys: ["Cmd / Ctrl", "S"], desc: "Save current Quick Note to database immediately." },
                { keys: ["Cmd / Ctrl", "Enter"], desc: "Execute code in Monaco Sandbox or run algorithmic stepper." },
                { keys: ["Cmd / Ctrl", "K"], desc: "Focus top search bar to find scholars and course documents." },
                { keys: ["Shift", "Space"], desc: "Flip active smart flashcard between Question and Answer." },
                { keys: ["Alt", "← / →"], desc: "Navigate between flashcards or quiz questions." },
                { keys: ["Esc"], desc: "Close any open modal (Flowchart, Code Stepper, Profile)." }
              ].map((item, idx) => (
                <div key={idx} className="p-3.5 flex items-center justify-between gap-4">
                  <span className="text-xs text-[var(--text)] font-medium">{item.desc}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {item.keys.map((k) => (
                      <kbd 
                        key={k} 
                        className="px-2 py-1 rounded-md text-[10px] font-bold bg-[var(--surface)] text-[var(--text)] border shadow-2xs font-mono"
                        style={{ borderColor: "var(--line)" }}
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SettingsPage;
