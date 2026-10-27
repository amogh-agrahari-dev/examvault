import React from "react";
import {
  GraduationCap, Upload, HelpCircle, BookOpen, MessageSquare, Layers,
  Trophy, TrendingUp, ArrowRight, ShieldCheck, Zap, Sparkles, Check
} from "lucide-react";
import { Badge, ProgressBar } from "./UI";
import ThemeToggle from "./ThemeToggle";

function Landing({ onEnter }) {
  const currentYear = new Date().getFullYear();

  const features = [
    { 
      icon: HelpCircle, 
      title: "Targeted Practice Quizzes", 
      desc: "Convert any chapter into a focused practice test with multiple choice, theory, and coding assessments." 
    },
    { 
      icon: BookOpen, 
      title: "Structured Topic Summaries", 
      desc: "Extract core formulas, key theorem definitions, and structured overviews directly from uploaded notes." 
    },
    { 
      icon: MessageSquare, 
      title: "Grounded AI Study Chat", 
      desc: "Inquire about difficult concepts with answers strictly grounded in your provided lecture materials." 
    },
    { 
      icon: Layers, 
      title: "Active Recall Flashcards", 
      desc: "Reinforce high-yield exam material with spaced repetition flashcards generated from curriculum topics." 
    },
    { 
      icon: Trophy, 
      title: "Scholar Leaderboard & Merits", 
      desc: "Earn Vault Credits by completing quizzes, writing revision notes, and engaging in collaborative study." 
    },
    { 
      icon: TrendingUp, 
      title: "Examination Blueprint Predictor", 
      desc: "Analyze previous year examination papers to highlight recurring patterns and probable exam questions." 
    },
  ];

  const highlights = [
    "Grounds answers in your verified curriculum",
    "Generates interactive formulas and diagrams",
    "Works seamlessly on desktop, tablet, and mobile",
    "Includes timed quizzes with instant grading"
  ];

  return (
    <div className="sa-root min-h-screen flex flex-col">
      {/* Top Application Bar */}
      <header className="w-full border-b border-[var(--line)] bg-[var(--surface)] sticky top-0 z-40 backdrop-blur-md bg-opacity-90">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "var(--ink)" }}>
              <GraduationCap size={18} color="var(--accent)" />
            </div>
            <span className="sa-serif text-lg font-bold tracking-tight">ExamVault</span>
          </div>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <ThemeToggle />
            <button 
              type="button"
              onClick={onEnter} 
              className="sa-btn-primary text-xs sm:text-sm font-semibold px-3.5 sm:px-4 py-2 flex items-center gap-1.5 shadow-xs"
            >
              <span>Open Dashboard</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 sm:pt-14 pb-14 sm:pb-20 grid lg:grid-cols-2 gap-8 lg:gap-14 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4 border"
                 style={{ background: "var(--accent-soft)", color: "var(--accent-ink)", borderColor: "rgba(232, 163, 61, 0.3)" }}>
              <Sparkles size={13} />
              <span>Comprehensive Exam Preparation Platform</span>
            </div>
            <h1 className="sa-serif text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.12] mb-4 text-[var(--text)]">
              Turn your lecture notes into focused exam mastery.
            </h1>
            <p className="text-sm sm:text-base leading-relaxed mb-6 text-[var(--muted)] max-w-xl">
              ExamVault synthesizes your course syllabi, lecture slides, and past papers into structured practice tests, active recall flashcards, and pattern-grounded revision blueprints.
            </p>

            <div className="flex flex-wrap gap-3 mb-8">
              <button 
                type="button"
                onClick={onEnter} 
                className="sa-btn-accent px-5 py-3 text-sm font-semibold flex items-center gap-2 shadow-xs"
              >
                <Upload size={16} />
                <span>Upload Study Material</span>
              </button>
              <button 
                type="button"
                onClick={onEnter} 
                className="sa-btn-outline px-5 py-3 text-sm font-semibold"
              >
                Explore Workspace
              </button>
            </div>

            {/* Feature Checkpoints */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-[var(--text)]">
              {highlights.map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--success-soft)", color: "var(--success)" }}>
                    <Check size={11} strokeWidth={3} />
                  </div>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Hero Visual Card Preview */}
          <div className="sa-card sa-card-lg p-5 sm:p-6 shadow-xl" style={{ boxShadow: "0 20px 50px var(--shadow-color)" }}>
            <div className="rounded-xl p-4 sm:p-5" style={{ background: "var(--ink)", color: "var(--text-contrast)" }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium opacity-80">Active Study Module</span>
                <Badge tone="accent">68% Complete</Badge>
              </div>
              <div className="sa-serif text-lg sm:text-xl font-semibold mb-3 text-white">Engineering Mathematics</div>
              <ProgressBar value={68} tone="accent" height={8} />
              <div className="flex items-center justify-between text-[11px] opacity-75 mt-2.5">
                <span>Differential Equations & Transforms</span>
                <span>4 Topics Analyzed</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
              {[
                ["Quizzes", "12", HelpCircle],
                ["Avg. Score", "78%", Trophy],
                ["Study Streak", "5 Days", Zap],
                ["Questions", "145", BookOpen]
              ].map(([label, val, Icon]) => (
                <div key={label} className="rounded-xl p-3 border" style={{ background: "var(--surface-subtle)", borderColor: "var(--line)" }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-[var(--muted)]">{label}</span>
                    <Icon size={13} className="text-[var(--accent)]" />
                  </div>
                  <div className="sa-serif text-lg font-bold text-[var(--text)]">{val}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature Grid Section */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20 sm:pb-24">
          <div className="text-center max-w-xl mx-auto mb-10 sm:mb-12">
            <h2 className="sa-serif text-2xl sm:text-3xl font-bold mb-2 text-[var(--text)]">
              Everything required for confident exam preparation
            </h2>
            <p className="text-xs sm:text-sm text-[var(--muted)]">
              A cohesive environment designed for purposeful revision rather than passive reading.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {features.map((f) => (
              <div key={f.title} className="sa-card p-5 flex flex-col justify-between hover:border-[var(--muted)] transition-colors">
                <div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3.5" style={{ background: "var(--accent-soft)" }}>
                    <f.icon size={19} color="var(--accent-ink)" />
                  </div>
                  <h3 className="font-semibold text-sm sm:text-base mb-1.5 text-[var(--text)]">{f.title}</h3>
                  <p className="text-xs sm:text-sm leading-relaxed text-[var(--muted)]">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Professional Footer */}
      <footer className="w-full border-t border-[var(--line)] bg-[var(--surface)] mt-auto py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--muted)]">
          <div className="flex items-center gap-2">
            <GraduationCap size={16} className="text-[var(--accent)]" />
            <span className="font-semibold text-[var(--text)]">ExamVault</span>
            <span>—</span>
            <span>Curriculum-grounded exam preparation.</span>
          </div>

          <div className="flex items-center gap-4 flex-wrap justify-center">
            <button type="button" onClick={onEnter} className="hover:text-[var(--text)] transition-colors">
              Dashboard
            </button>
            <span>•</span>
            <button type="button" onClick={onEnter} className="hover:text-[var(--text)] transition-colors">
              Documents
            </button>
            <span>•</span>
            <button type="button" onClick={onEnter} className="hover:text-[var(--text)] transition-colors">
              Quizzes
            </button>
            <span>•</span>
            <span>© {currentYear} ExamVault</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
