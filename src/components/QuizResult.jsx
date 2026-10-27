import React, { useEffect, useState } from "react";
import { CheckCircle, XCircle, RotateCcw, Lightbulb, ArrowLeft, LayoutDashboard, Award, Clock } from "lucide-react";
import { FormattedText } from "./MathRenderer";
import { getQuizAttemptResult, getQuiz } from "../services/api";

export default function QuizResult({ go, result, accessToken, showToast, setConfig }) {
  const [data, setData] = useState(null);
  const [reloading, setReloading] = useState(false);
  
  useEffect(() => {
    if (!result?.attemptId) {
      go("quiz-setup");
      return;
    }
    
    getQuizAttemptResult(result.attemptId, accessToken)
      .then(d => setData(d))
      .catch(e => showToast("Failed to load results. They are not yet processed."));
  }, [result, accessToken, go, showToast]);

  const handleAttemptAgain = async () => {
    const quizId = data?.quiz_id || result?.quizId;
    if (!quizId) {
      go("quiz-setup");
      return;
    }
    setReloading(true);
    try {
      const quiz = await getQuiz(quizId, accessToken);
      if (setConfig) {
        setConfig(prev => ({ ...(prev || {}), generatedQuiz: quiz }));
      }
      go("quiz-run");
    } catch (err) {
      showToast("Failed to reload quiz. Please retry from the Quiz Dashboard.");
      go("quiz-setup");
    } finally {
      setReloading(false);
    }
  };

  if (!data) return <div className="p-8 text-center text-sm" style={{ color: "var(--muted)" }}>Evaluating results... Please wait.</div>;

  const scorePct = data.total_marks > 0 && data.score !== null
    ? Math.round((data.score / data.total_marks) * 100)
    : null;

  const formatTime = (secs) => {
    if (!secs && secs !== 0) return "--";
    const m = Math.floor(secs / 60);
    const s = Math.round(secs % 60);
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  };

  return (
    <div className="sa-fade-in max-w-2xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => go("quiz-setup")}
          className="sa-btn-outline px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5"
        >
          <ArrowLeft size={13} /> Back to Quizzes
        </button>
        <span className="text-xs uppercase tracking-wider font-semibold text-[var(--muted)]">
          {data.quiz_title || "Quiz Evaluation"}
        </span>
      </div>

      <div className="text-center mt-2 mb-6">
        <h2 className="sa-serif text-3xl font-bold mb-2">Quiz Completed!</h2>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Review your answers and performance below. You can attempt this quiz again anytime.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="sa-card p-5 flex flex-col items-center justify-center text-center">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold">{data.score !== null ? data.score : "--"}</span>
            {data.total_marks > 0 && (
              <span className="text-sm font-medium" style={{ color: "var(--muted)" }}>/{data.total_marks}</span>
            )}
          </div>
          <div className="text-xs font-semibold uppercase tracking-wide mt-1" style={{ color: "var(--muted)" }}>Score</div>
          {scorePct !== null && (
            <span 
              className="text-xs font-semibold mt-1.5 px-2.5 py-0.5 rounded-full"
              style={{
                background: scorePct >= 70 ? "var(--success-soft)" : scorePct >= 40 ? "var(--accent-soft)" : "var(--danger-soft)",
                color: scorePct >= 70 ? "var(--success)" : scorePct >= 40 ? "var(--accent-ink)" : "var(--danger)"
              }}
            >
              {scorePct}%
            </span>
          )}
        </div>

        <div className="sa-card p-5 flex flex-col items-center justify-center text-center">
          <div className="text-3xl font-bold">{formatTime(data.time_taken)}</div>
          <div className="text-xs font-semibold uppercase tracking-wide mt-1" style={{ color: "var(--muted)" }}>Time Taken</div>
          <span className="text-xs mt-1.5" style={{ color: "var(--muted)" }}>Duration</span>
        </div>

        <div className="sa-card p-5 col-span-2 md:col-span-1 flex flex-col items-center justify-center text-center">
          <div className="text-3xl font-bold">{data.answers ? data.answers.length : 0}</div>
          <div className="text-xs font-semibold uppercase tracking-wide mt-1" style={{ color: "var(--muted)" }}>Questions</div>
          <span className="text-xs mt-1.5" style={{ color: "var(--muted)" }}>Total Evaluated</span>
        </div>
      </div>

      <div className="sa-card sa-card-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-base">Question Breakdown</h3>
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            {data.answers?.filter(a => a.awarded_marks > 0).length || 0} / {data.answers?.length || 0} Correct
          </span>
        </div>

        <div className="space-y-4">
          {data.answers && data.answers.map((ans, i) => {
            const isCorrect = ans.awarded_marks > 0;
            const chosenKey = ans.selected_options?.selected || (typeof ans.student_answer === "string" ? ans.student_answer : null);
            return (
              <div
                key={ans.question_id || i}
                className="p-4 rounded-xl border flex flex-col gap-2.5 transition-colors"
                style={{
                  background: isCorrect ? "rgba(16, 185, 129, 0.04)" : "var(--surface-subtle)",
                  borderColor: isCorrect ? "rgba(16, 185, 129, 0.3)" : "var(--line)"
                }}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-2">
                    {isCorrect ? (
                      <CheckCircle size={16} className="text-emerald-600 flex-shrink-0" />
                    ) : (
                      <XCircle size={16} className="text-rose-500 flex-shrink-0" />
                    )}
                    <span className="text-sm font-semibold">Question {i + 1}</span>
                  </div>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded"
                    style={{
                      background: isCorrect ? "var(--success-soft)" : "var(--chip-bg)",
                      color: isCorrect ? "var(--success)" : "var(--muted)"
                    }}
                  >
                    {ans.awarded_marks !== null ? `${ans.awarded_marks} / ${ans.marks || 1} marks` : "Evaluating..."}
                  </span>
                </div>

                {ans.question_text && (
                  <div className="text-sm font-medium text-[var(--ink)]">
                    <FormattedText text={ans.question_text} />
                  </div>
                )}

                {/* Option display for MCQ */}
                {ans.public_options && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs mt-1">
                    {Object.entries(ans.public_options).map(([optKey, optVal]) => {
                      const isSelected = chosenKey === optKey;
                      const isCorrectOpt = ans.correct_option === optKey;
                      let borderCol = "var(--line)";
                      let bgCol = "transparent";
                      let textCol = "var(--text)";

                      if (isCorrectOpt) {
                        borderCol = "rgba(16, 185, 129, 0.6)";
                        bgCol = "rgba(16, 185, 129, 0.1)";
                        textCol = "rgb(6, 95, 70)";
                      } else if (isSelected && !isCorrect) {
                        borderCol = "rgba(239, 68, 68, 0.6)";
                        bgCol = "rgba(239, 68, 68, 0.08)";
                        textCol = "rgb(153, 27, 27)";
                      }

                      return (
                        <div
                          key={optKey}
                          className="px-2.5 py-1.5 rounded-lg border flex items-center gap-2"
                          style={{ borderColor: borderCol, background: bgCol, color: textCol }}
                        >
                          <span className="font-bold">{optKey}.</span>
                          <span className="truncate">{optVal}</span>
                          {isCorrectOpt && <span className="ml-auto text-[10px] font-bold text-emerald-600">Correct</span>}
                          {isSelected && !isCorrectOpt && <span className="ml-auto text-[10px] font-bold text-rose-500">Your Choice</span>}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Non MCQ answer */}
                {!ans.public_options && ans.student_answer && (
                  ans.question_type === 'coding' ? (
                    <div className="text-xs p-3 rounded-lg bg-[#18181b] text-[#e4e4e7] font-mono whitespace-pre-wrap overflow-x-auto border border-[#27272a] shadow-inner">
                      <div className="text-[10px] text-[#a1a1aa] font-semibold uppercase tracking-wider mb-1.5">Submitted Code:</div>
                      {typeof ans.student_answer === 'object' ? JSON.stringify(ans.student_answer, null, 2) : ans.student_answer}
                    </div>
                  ) : (
                    <div className="text-xs p-2.5 rounded bg-black/5 dark:bg-white/5" style={{ color: "var(--muted)" }}>
                      <span className="font-semibold text-[var(--ink)]">Your Answer: </span>
                      <FormattedText text={typeof ans.student_answer === 'object' ? JSON.stringify(ans.student_answer) : ans.student_answer} inline />
                    </div>
                  )
                )}

                {/* Explanation */}
                {ans.explanation && (
                  <div className="text-xs p-2.5 rounded-lg flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 mt-1">
                    <Lightbulb size={14} className="flex-shrink-0 mt-0.5 text-amber-600" />
                    <div>
                      <span className="font-semibold">Explanation: </span>
                      <span>{ans.explanation}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 justify-center pt-2">
        <button
          type="button"
          onClick={handleAttemptAgain}
          disabled={reloading}
          className="sa-btn-accent px-6 py-2.5 text-sm font-semibold flex items-center gap-2 shadow-xs"
        >
          <RotateCcw size={15} className={reloading ? "animate-spin" : ""} />
          <span>{reloading ? "Preparing Quiz..." : "Attempt Again"}</span>
        </button>
        <button
          type="button"
          onClick={() => go("quiz-setup")}
          className="sa-btn-primary px-5 py-2.5 text-sm font-semibold flex items-center gap-2 shadow-xs"
        >
          <ArrowLeft size={15} />
          <span>Back to Quizzes</span>
        </button>
        <button
          type="button"
          onClick={() => go("dashboard")}
          className="sa-btn-outline px-5 py-2.5 text-sm font-semibold flex items-center gap-2"
        >
          <LayoutDashboard size={15} />
          <span>Dashboard</span>
        </button>
      </div>
    </div>
  );
}
