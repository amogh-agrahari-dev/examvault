import React, { useState, useEffect, useMemo } from "react";
import {
  Sparkles, Loader, Play, RotateCcw, CheckCircle2, Clock, FileText,
  Trash2, Search, Plus, Award, BarChart3, HelpCircle, Layers,
  ChevronRight, Calendar, ArrowRight, Eye, RefreshCw
} from "lucide-react";
import { Badge, ProgressBar, EmptyState } from "./UI";
import {
  getDocuments, getDocumentTopics, generateQuiz,
  getQuizzes, getQuiz, deleteQuiz
} from "../services/api";

function QuizSetup({ go, config, setConfig, accessToken, showToast }) {
  const [tab, setTab] = useState("quizzes"); // "quizzes" | "generate"
  
  // Quizzes list state
  const [quizzes, setQuizzes] = useState([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);
  const [launchingId, setLaunchingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Generator form state
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [topics, setTopics] = useState([]);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Load quizzes
  const loadUserQuizzes = async () => {
    if (!accessToken) return;
    setLoadingQuizzes(true);
    try {
      const data = await getQuizzes(accessToken);
      const list = Array.isArray(data) ? data : [];
      setQuizzes(list);
      // If user has quizzes, stay on "quizzes", otherwise if 0, switch to "generate"
      if (list.length === 0) {
        setTab("generate");
      }
    } catch (err) {
      console.warn("Failed to load quizzes", err);
    } finally {
      setLoadingQuizzes(false);
    }
  };

  useEffect(() => {
    loadUserQuizzes();
  }, [accessToken]);

  // Load documents for generator
  useEffect(() => {
    if (!accessToken) return;
    getDocuments(accessToken)
      .then((res) => {
        const docs = res.documents || [];
        setDocuments(docs);
        if (docs.length > 0) {
          setSelectedDoc(docs[0].id);
          const baseName = docs[0].filename.replace(/\.[^/.]+$/, "");
          setCustomTitle(`${baseName} Practice Quiz`);
        }
        setLoadingDocs(false);
      })
      .catch(() => {
        setLoadingDocs(false);
      });
  }, [accessToken]);

  // Load topics when selected doc changes
  useEffect(() => {
    if (!selectedDoc || !accessToken) return;
    getDocumentTopics(selectedDoc, accessToken)
      .then((res) => {
        const topList = res.topics || [];
        setTopics(topList);
        setSelectedTopics(topList.map(t => t.id)); // select all by default
      })
      .catch(() => {
        setTopics([]);
        setSelectedTopics([]);
      });

    const currentDoc = documents.find(d => d.id === selectedDoc);
    if (currentDoc) {
      const baseName = currentDoc.filename.replace(/\.[^/.]+$/, "");
      setCustomTitle(`${baseName} Practice Quiz`);
    }
  }, [selectedDoc, accessToken, documents]);

  // Launch / retake a quiz
  const handleAttemptQuiz = async (quiz) => {
    if (!quiz?.id) return;
    setLaunchingId(quiz.id);
    try {
      const fullQuiz = await getQuiz(quiz.id, accessToken);
      setConfig(prev => ({ ...(prev || {}), generatedQuiz: fullQuiz }));
      go("quiz-run");
    } catch (err) {
      showToast("Failed to load quiz questions. Please try again.");
    } finally {
      setLaunchingId(null);
    }
  };

  // Delete a quiz
  const handleDeleteQuiz = async (quizId, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this quiz? All past attempt records will be removed.")) {
      return;
    }
    setDeletingId(quizId);
    try {
      await deleteQuiz(quizId, accessToken);
      setQuizzes(prev => prev.filter(q => q.id !== quizId));
      showToast("Quiz deleted successfully");
    } catch (err) {
      showToast("Failed to delete quiz");
    } finally {
      setDeletingId(null);
    }
  };

  // Generate a new quiz
  const handleGenerate = async () => {
    if (selectedTopics.length === 0) {
      showToast("Please select at least one topic");
      return;
    }
    setGenerating(true);
    try {
      const payload = {
        title: customTitle.trim() || "Generated Quiz",
        selected_documents: [selectedDoc],
        selected_topics: selectedTopics,
        question_count: config.count || 10,
        difficulty: (config.difficulty || "medium").toLowerCase(),
        question_types: [(config.qtype || "mcq").toLowerCase()],
        duration: (config.count || 10) * 2
      };
      const quiz = await generateQuiz(payload, accessToken);
      setConfig(prev => ({ ...(prev || {}), generatedQuiz: quiz }));
      go("quiz-run");
    } catch (err) {
      showToast(err.message || "Failed to generate quiz");
    } finally {
      setGenerating(false);
    }
  };

  const toggleTopic = (id) => {
    if (selectedTopics.includes(id)) {
      setSelectedTopics(selectedTopics.filter(t => t !== id));
    } else {
      setSelectedTopics([...selectedTopics, id]);
    }
  };

  const selectAllTopics = () => setSelectedTopics(topics.map(t => t.id));
  const deselectAllTopics = () => setSelectedTopics([]);

  // Filtered quizzes
  const filteredQuizzes = useMemo(() => {
    return quizzes.filter(q => {
      // Search
      const qTitle = (q.title || "").toLowerCase();
      const docs = (q.document_names || []).join(" ").toLowerCase();
      const tops = (q.topic_names || []).join(" ").toLowerCase();
      const term = searchQuery.toLowerCase().trim();
      if (term && !qTitle.includes(term) && !docs.includes(term) && !tops.includes(term)) {
        return false;
      }
      // Difficulty
      if (difficultyFilter !== "all") {
        const diff = (q.difficulty || "medium").toLowerCase();
        if (diff !== difficultyFilter.toLowerCase()) return false;
      }
      // Status
      if (statusFilter === "attempted") {
        if (!q.has_been_attempted || q.completed_attempts_count === 0) return false;
      } else if (statusFilter === "unattempted") {
        if (q.completed_attempts_count > 0) return false;
      }
      return true;
    });
  }, [quizzes, searchQuery, difficultyFilter, statusFilter]);

  // Overall statistics
  const stats = useMemo(() => {
    const total = quizzes.length;
    const attemptedCount = quizzes.reduce((acc, q) => acc + (q.completed_attempts_count || 0), 0);
    const scoredQuizzes = quizzes.filter(q => q.best_score !== null && q.best_score !== undefined && q.total_marks > 0);
    const avgScorePct = scoredQuizzes.length > 0
      ? Math.round(scoredQuizzes.reduce((acc, q) => acc + ((q.best_score / q.total_marks) * 100), 0) / scoredQuizzes.length)
      : null;
    return { total, attemptedCount, avgScorePct };
  }, [quizzes]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="sa-fade-in max-w-6xl mx-auto space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="sa-serif text-2xl sm:text-3xl font-bold text-[var(--text)]">Practice Quizzes</h2>
          <p className="text-xs sm:text-sm mt-1 text-[var(--muted)]">
            Review past scores, retake generated quizzes, or assemble new tests from your study materials.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="p-1 rounded-xl border flex items-center gap-1" style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
            <button
              type="button"
              onClick={() => setTab("quizzes")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                tab === "quizzes"
                  ? "bg-[var(--ink)] text-white dark:bg-amber-400 dark:text-black shadow-xs"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              <Layers size={13} />
              <span>My Quizzes ({quizzes.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setTab("generate")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                tab === "generate"
                  ? "bg-[var(--ink)] text-white dark:bg-amber-400 dark:text-black shadow-xs"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              <Plus size={13} />
              <span>Generate Quiz</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: MY QUIZZES */}
      {tab === "quizzes" && (
        <div className="space-y-6">
          {/* Performance Overview Banner */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="sa-card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent-soft)" }}>
                <Layers size={18} color="var(--accent)" />
              </div>
              <div>
                <div className="text-xs uppercase font-semibold" style={{ color: "var(--muted)" }}>Quizzes In Vault</div>
                <div className="sa-serif text-2xl font-bold">{stats.total}</div>
              </div>
            </div>

            <div className="sa-card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--info-soft)" }}>
                <CheckCircle2 size={18} color="var(--info)" />
              </div>
              <div>
                <div className="text-xs uppercase font-semibold" style={{ color: "var(--muted)" }}>Attempts Taken</div>
                <div className="sa-serif text-2xl font-bold">{stats.attemptedCount}</div>
              </div>
            </div>

            <div className="sa-card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--success-soft)" }}>
                <Award size={18} color="var(--success)" />
              </div>
              <div>
                <div className="text-xs uppercase font-semibold" style={{ color: "var(--muted)" }}>Avg Score</div>
                <div className="sa-serif text-2xl font-bold">{stats.avgScorePct !== null ? `${stats.avgScorePct}%` : "--"}</div>
              </div>
            </div>

            <div className="sa-card p-4 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase font-semibold" style={{ color: "var(--muted)" }}>New Practice</div>
                <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>Need a fresh test?</div>
              </div>
              <button
                onClick={() => setTab("generate")}
                className="sa-btn-accent px-3 py-1.5 text-xs font-semibold flex items-center gap-1"
              >
                <Plus size={13} /> Create
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }} />
              <input
                type="text"
                placeholder="Search by quiz title, document, or topic..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border outline-none"
                style={{ background: "var(--surface)", borderColor: "var(--line)", color: "var(--text)" }}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="px-2.5 py-2 rounded-xl text-xs border outline-none font-medium"
                style={{ background: "var(--surface)", borderColor: "var(--line)", color: "var(--text)" }}
              >
                <option value="all">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-2 rounded-xl text-xs border outline-none font-medium"
                style={{ background: "var(--surface)", borderColor: "var(--line)", color: "var(--text)" }}
              >
                <option value="all">All Statuses</option>
                <option value="attempted">Attempted</option>
                <option value="unattempted">Ready to Attempt</option>
              </select>

              <button
                onClick={loadUserQuizzes}
                disabled={loadingQuizzes}
                className="p-2 rounded-xl border hover:bg-[var(--surface-subtle)] text-[var(--muted)]"
                title="Refresh quizzes"
              >
                <RefreshCw size={14} className={loadingQuizzes ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {/* Loading state */}
          {loadingQuizzes && (
            <div className="p-12 text-center text-sm" style={{ color: "var(--muted)" }}>
              <Loader size={20} className="animate-spin mx-auto mb-2" />
              Loading your saved quizzes...
            </div>
          )}

          {/* Empty state: No quizzes at all */}
          {!loadingQuizzes && quizzes.length === 0 && (
            <div className="sa-card sa-card-lg p-12 text-center max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "var(--chip-bg)" }}>
                <HelpCircle size={26} color="var(--accent)" />
              </div>
              <h3 className="sa-serif text-xl font-semibold mb-2">No quizzes generated yet</h3>
              <p className="text-xs mb-6 leading-relaxed" style={{ color: "var(--muted)" }}>
                Quizzes generated from your uploaded notes and materials will always be saved here. You can take them, review past results, and re-attempt them anytime.
              </p>
              <button
                onClick={() => setTab("generate")}
                className="sa-btn-accent px-5 py-2.5 text-xs font-semibold inline-flex items-center gap-2"
              >
                <Sparkles size={14} /> Generate Your First Quiz
              </button>
            </div>
          )}

          {/* Empty state: Filter returned nothing */}
          {!loadingQuizzes && quizzes.length > 0 && filteredQuizzes.length === 0 && (
            <div className="sa-card p-8 text-center">
              <p className="text-sm font-medium mb-2">No quizzes match your filters</p>
              <button
                onClick={() => { setSearchQuery(""); setDifficultyFilter("all"); setStatusFilter("all"); }}
                className="sa-btn-outline px-3 py-1.5 text-xs font-medium"
              >
                Clear Filters
              </button>
            </div>
          )}

          {/* Grid of Quizzes */}
          {!loadingQuizzes && filteredQuizzes.length > 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredQuizzes.map((q) => {
                const isLaunching = launchingId === q.id;
                const isDeleting = deletingId === q.id;
                const hasAttempts = q.completed_attempts_count > 0;
                const scorePercentage = (hasAttempts && q.best_score !== null && q.total_marks > 0)
                  ? Math.round((q.best_score / q.total_marks) * 100)
                  : null;

                const diffTone = q.difficulty?.toLowerCase() === "easy" ? "info"
                  : q.difficulty?.toLowerCase() === "hard" ? "danger" : "accent";

                return (
                  <div
                    key={q.id}
                    className="sa-card p-5 flex flex-col justify-between hover:shadow-md transition-all group relative border"
                    style={{ borderColor: "var(--line)" }}
                  >
                    <div>
                      {/* Top Badges & Delete */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge tone={diffTone}>
                            {(q.difficulty || "Medium").toUpperCase()}
                          </Badge>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--chip-bg)", color: "var(--chip-text)" }}>
                            {q.question_count} Questions
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--chip-bg)", color: "var(--chip-text)" }}>
                            {q.duration} mins
                          </span>
                        </div>
                        <button
                          onClick={(e) => handleDeleteQuiz(q.id, e)}
                          disabled={isDeleting}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[var(--muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-opacity"
                          title="Delete quiz"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Title */}
                      <h3 className="font-semibold text-base mb-1.5 line-clamp-2 leading-snug">
                        {q.title || "Generated Quiz"}
                      </h3>

                      {/* Source Document Tag */}
                      {q.document_names && q.document_names.length > 0 && (
                        <div className="flex items-center gap-1 text-xs mb-2 text-[var(--muted)]">
                          <FileText size={12} className="flex-shrink-0" />
                          <span className="truncate max-w-[240px]">{q.document_names[0]}</span>
                        </div>
                      )}

                      {/* Topics pills */}
                      {q.topic_names && q.topic_names.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {q.topic_names.slice(0, 3).map((tName, i) => (
                            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full border border-dashed truncate max-w-[130px]" style={{ borderColor: "var(--line)", color: "var(--muted)" }}>
                              {tName}
                            </span>
                          ))}
                          {q.topic_names.length > 3 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full text-[var(--muted)]">
                              +{q.topic_names.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Attempt Summary & Actions Footer */}
                    <div className="pt-3 border-t mt-3" style={{ borderColor: "var(--line)" }}>
                      {/* Score / Status Banner */}
                      <div className="p-2.5 rounded-xl mb-3 flex items-center justify-between text-xs" style={{ background: "var(--surface-subtle)" }}>
                        {hasAttempts ? (
                          <>
                            <div>
                              <span className="text-[11px] font-semibold" style={{ color: "var(--muted)" }}>Best Score: </span>
                              <span className="font-bold text-sm">
                                {q.best_score} <span className="text-xs font-normal" style={{ color: "var(--muted)" }}>/{q.total_marks}</span>
                              </span>
                              {scorePercentage !== null && (
                                <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.2 rounded ${scorePercentage >= 70 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : scorePercentage >= 40 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
                                  {scorePercentage}%
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-medium" style={{ color: "var(--muted)" }}>
                              {q.completed_attempts_count} {q.completed_attempts_count === 1 ? "attempt" : "attempts"}
                            </span>
                          </>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[var(--muted)]">
                            <Clock size={12} />
                            <span>Not attempted yet</span>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAttemptQuiz(q)}
                          disabled={isLaunching}
                          className="sa-btn-accent flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5"
                        >
                          {isLaunching ? (
                            <Loader size={13} className="animate-spin" />
                          ) : hasAttempts ? (
                            <RotateCcw size={13} />
                          ) : (
                            <Play size={13} />
                          )}
                          {isLaunching ? "Preparing..." : hasAttempts ? "Attempt Again" : "Start Quiz"}
                        </button>

                        {hasAttempts && q.latest_attempt?.id && (
                          <button
                            onClick={() => go("quiz-result", { attemptId: q.latest_attempt.id })}
                            className="sa-btn-outline px-3 py-2 text-xs font-medium flex items-center gap-1"
                            title="View last attempt results"
                          >
                            <Eye size={13} />
                            Review
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: GENERATE NEW QUIZ */}
      {tab === "generate" && (
        <div className="max-w-xl mx-auto">
          <div className="sa-card sa-card-lg p-6 space-y-5">
            <div>
              <h3 className="sa-serif text-xl font-semibold mb-1">Generate AI Quiz</h3>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Create a customized, AI-tailored quiz from your uploaded study materials.
              </p>
            </div>

            {/* Document Source */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
                Document Source
              </label>
              <select
                value={selectedDoc}
                onChange={(e) => setSelectedDoc(e.target.value)}
                className="w-full mt-1.5 px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text)" }}
              >
                {documents.length === 0 && <option value="">No documents found</option>}
                {documents.map((d) => <option key={d.id} value={d.id}>{d.filename}</option>)}
              </select>
            </div>

            {/* Quiz Title */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
                Quiz Title
              </label>
              <input
                type="text"
                placeholder="e.g. Computer Networks Practice Quiz"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full mt-1.5 px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text)" }}
              />
            </div>

            {/* Topics Selection */}
            {topics.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
                    Select Topics ({selectedTopics.length}/{topics.length})
                  </label>
                  <div className="flex gap-2 text-xs">
                    <button onClick={selectAllTopics} className="hover:underline text-[var(--accent)] font-medium">All</button>
                    <span style={{ color: "var(--line)" }}>•</span>
                    <button onClick={deselectAllTopics} className="hover:underline" style={{ color: "var(--muted)" }}>None</button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-1 max-h-36 overflow-y-auto p-1 rounded-lg border" style={{ borderColor: "var(--line)" }}>
                  {topics.map(t => {
                    const isSelected = selectedTopics.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleTopic(t.id)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                          isSelected
                            ? 'border-[var(--ink)] bg-[var(--ink)] text-white dark:bg-amber-400 dark:text-black dark:border-amber-400'
                            : 'border-[var(--line)] text-[var(--muted)] hover:border-[var(--muted)]'
                        }`}
                      >
                        {t.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Difficulty */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>Difficulty</label>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                {["Easy", "Medium", "Hard"].map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setConfig({ ...config, difficulty: diff })}
                    className="py-2 rounded-lg text-sm font-medium sa-option-card"
                    style={config.difficulty === diff ? { borderColor: "var(--ink)", background: "var(--surface-subtle)" } : {}}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            {/* Number of Questions */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>Number of questions</label>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                {[5, 10, 20].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setConfig({ ...config, count: n })}
                    className="py-2 rounded-lg text-sm font-medium sa-option-card"
                    style={config.count === n ? { borderColor: "var(--ink)", background: "var(--surface-subtle)" } : {}}
                  >
                    {n} questions
                  </button>
                ))}
              </div>
            </div>

            {/* Question Type */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>Question type</label>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                {["MCQ", "Short_Answer", "Coding"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setConfig({ ...config, qtype: t })}
                    className="py-2 rounded-lg text-xs font-medium sa-option-card"
                    style={config.qtype === t ? { borderColor: "var(--ink)", background: "var(--surface-subtle)" } : {}}
                  >
                    {t.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleGenerate}
              disabled={generating || documents.length === 0}
              className="sa-btn-accent w-full py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {generating ? <Loader size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {generating ? "Generating with Llama 3.1..." : "Generate Quiz & Start"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuizSetup;
