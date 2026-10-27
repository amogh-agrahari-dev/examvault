import React, { useState, useEffect } from "react";
import { Clock, Flag, ArrowLeft, ArrowRight, X } from "lucide-react";
import { Badge } from "./UI";
import CodingWorkspace from "./CodingWorkspace";
import { FormattedText } from "./MathRenderer";
import { startQuizAttempt, saveQuizAnswer, submitQuizAttempt, getQuiz, API_BASE_URL } from "../services/api";

function QuizRun({ go, config, onFinish, fullScreenTitle, accessToken, showToast }) {
  const generatedQuiz = config?.generatedQuiz;
  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState(generatedQuiz?.questions || []);
  const [current, setCurrent] = useState(0);
  
  const [answers, setAnswers] = useState({});
  const [marked, setMarked] = useState({});
  const [seconds, setSeconds] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!generatedQuiz || !generatedQuiz.id) {
      go("quiz-setup");
      return;
    }

    let isMounted = true;
    async function initQuiz() {
      try {
        let qs = generatedQuiz.questions;
        if (!qs || qs.length === 0) {
          const fetched = await getQuiz(generatedQuiz.id, accessToken);
          qs = fetched.questions || [];
          if (isMounted) setQuestions(qs);
        } else {
          if (isMounted) setQuestions(qs);
        }

        const att = await startQuizAttempt(generatedQuiz.id, accessToken);
        if (!isMounted) return;
        setAttempt(att);
        const expiry = new Date(att.expiry_timestamp).getTime();
        const now = new Date().getTime();
        const diff = Math.max(0, Math.floor((expiry - now) / 1000));
        setSeconds(diff > 0 ? diff : (generatedQuiz.duration || 20) * 60);
        setLoading(false);
      } catch (err) {
        if (!isMounted) return;
        showToast("Failed to start quiz attempt");
        go("quiz-setup");
      }
    }

    initQuiz();
    return () => { isMounted = false; };
  }, [generatedQuiz?.id, accessToken]);

  useEffect(() => {
    if (seconds <= 0 || loading) return;
    const t = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [seconds > 0, loading]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const q = questions[current];

  // Debounced auto-save
  useEffect(() => {
    if (!q || !attempt) return;
    const qid = q.id;
    const timer = setTimeout(() => {
      saveQuizAnswer(attempt.id, qid, {
        student_answer: typeof answers[qid] === 'string' && q.question_type !== 'coding' ? answers[qid] : undefined,
        selected_options: q.question_type === 'mcq' ? { selected: answers[qid] } : undefined,
        submitted_code: q.question_type === 'coding' ? answers[qid] : undefined,
        programming_language: q.question_type === 'coding' ? 'python' : undefined,
        review_flag: marked[qid] || false
      }, accessToken).catch(e => console.error("Autosave failed", e));
    }, 1000);
    return () => clearTimeout(timer);
  }, [answers[q?.id], marked[q?.id], q?.id, attempt?.id, accessToken, q?.question_type]);

  const setAnswer = (val) => setAnswers({ ...answers, [q.id]: val });
  const toggleMark = () => setMarked({ ...marked, [q.id]: !marked[q.id] });

  const submit = async () => {
    if (!attempt) return;
    try {
      await submitQuizAttempt(attempt.id, accessToken);
      onFinish({ attemptId: attempt.id, quizId: generatedQuiz?.id, quiz: generatedQuiz });
    } catch(e) {
      showToast("Failed to submit quiz");
    }
  };

  const status = (i) => {
    const qid = questions[i].id;
    if (i === current) return "current";
    if (marked[qid]) return "marked";
    if (answers[qid] !== undefined) return "answered";
    return "unattempted";
  };
  const statusStyle = {
    current: { background: "var(--accent)", color: "var(--accent-ink)" },
    answered: { background: "var(--success)", color: "#fff" },
    marked: { background: "var(--accent-soft)", color: "var(--accent-ink)" },
    unattempted: { background: "var(--chip-bg)", color: "var(--text)" },
  };

  if (loading) return <div className="p-12 text-center text-sm" style={{ color: "var(--muted)" }}>Starting your attempt...</div>;

  if (!q) {
    return (
      <div className="sa-card p-12 text-center max-w-lg mx-auto sa-fade-in">
        <h3 className="sa-serif text-xl font-bold mb-2 text-[var(--text)]">No Questions Found</h3>
        <p className="text-sm mb-5 text-[var(--muted)]">This quiz does not contain any questions to display.</p>
        <button 
          type="button" 
          onClick={() => go("quiz-setup")} 
          className="sa-btn-primary px-4 py-2 text-sm font-semibold"
        >
          Return to Quizzes
        </button>
      </div>
    );
  }

  return (
    <div className="sa-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Exit this quiz attempt and return to Quiz Dashboard? Your answers will be saved.")) {
                go("quiz-setup");
              }
            }}
            className="p-1.5 rounded-lg border hover:bg-[var(--surface-subtle)] text-[var(--muted)]"
            title="Exit to Quiz Dashboard"
            aria-label="Exit quiz attempt"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="sa-serif text-xl font-semibold text-[var(--text)]">{fullScreenTitle || generatedQuiz?.title || "Quiz"}</h2>
            <p className="text-xs mt-0.5 text-[var(--muted)]">Question {current + 1} of {questions.length}</p>
          </div>
        </div>
        <div 
          className="flex items-center gap-2 px-3 py-2 rounded-lg border" 
          style={{ 
            background: seconds < 60 ? "var(--danger-soft)" : "var(--chip-bg)",
            borderColor: seconds < 60 ? "var(--danger)" : "var(--line)"
          }}
        >
          <Clock size={15} color={seconds < 60 ? "var(--danger)" : "var(--text)"} />
          <span className="text-sm font-mono font-semibold" style={{ color: seconds < 60 ? "var(--danger)" : "var(--text)" }}>{mm}:{ss}</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_260px] gap-5">
        <div className="sa-card sa-card-lg p-3.5 sm:p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Badge tone="info">{q.question_type?.toUpperCase() || "QUESTION"}</Badge>
            <Badge tone="accent">{q.difficulty?.toUpperCase() || "MEDIUM"}</Badge>
            {marked[q.id] && <Badge tone="accent"><Flag size={11} /> Marked</Badge>}
          </div>
          <div className="text-base font-medium leading-relaxed mb-6 text-[var(--text)]">
            <FormattedText text={q.question_text} />
          </div>
          
          <div className="flex-1 space-y-2.5" role="radiogroup" aria-label="Question options">
            {q.question_type === 'mcq' && q.public_options && Object.entries(q.public_options).map(([key, val]) => {
              const isSelected = answers[q.id] === key;
              return (
                <button 
                  key={key} 
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setAnswer(key)}
                  className={`sa-option-card w-full text-left px-4 py-3 flex items-center gap-3 text-sm transition-all ${isSelected ? "selected" : ""}`}
                >
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-colors"
                    style={{ 
                      border: `1.5px solid ${isSelected ? "var(--accent)" : "var(--line)"}`, 
                      background: isSelected ? "var(--accent)" : "transparent", 
                      color: isSelected ? "var(--accent-ink)" : "var(--muted)" 
                    }}
                  >
                    {key}
                  </div>
                  <span className="flex-1 text-[var(--text)]">
                    <FormattedText text={val} inline />
                  </span>
                </button>
              );
            })}

            {q.question_type === 'short_answer' && (
              <textarea 
                className="w-full h-32 p-3 rounded-lg text-sm outline-none resize-none bg-[var(--input-bg)] text-[var(--text)] border border-[var(--line)] focus:border-[var(--accent)]"
                placeholder="Write your answer here..."
                value={answers[q.id] || ""}
                onChange={(e) => setAnswer(e.target.value)}
              />
            )}

            {q.question_type === 'coding' && (
              <CodingWorkspace 
                question={q} 
                value={answers[q.id] || ""} 
                onChange={setAnswer} 
                onRun={async (code, customInput) => {
                  const res = await fetch(`${API_BASE_URL}/quiz/code/run`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
                    body: JSON.stringify({ question_id: q.id, code, language: "python", stdin: customInput || "" })
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.detail || "Execution failed.");
                  return data;
                }}
              />
            )}
          </div>

          <div className="flex items-center justify-between mt-8 flex-wrap gap-2">
            <button disabled={current === 0} onClick={() => setCurrent(current - 1)}
              className="sa-btn-outline px-4 py-2 text-sm font-medium flex items-center gap-1.5 disabled:opacity-40">
              <ArrowLeft size={14} /> Previous
            </button>
            <button onClick={toggleMark} className="sa-btn-outline px-4 py-2 text-sm font-medium flex items-center gap-1.5">
              <Flag size={14} /> {marked[q.id] ? "Unmark" : "Mark for Review"}
            </button>
            {current === questions.length - 1 ? (
              <button onClick={submit} className="sa-btn-accent px-5 py-2 text-sm font-medium">Submit</button>
            ) : (
              <button onClick={() => setCurrent(current + 1)} className="sa-btn-primary px-4 py-2 text-sm font-medium flex items-center gap-1.5">
                Next <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="sa-card sa-card-lg p-4 h-fit">
          <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--muted)" }}>Question Palette</div>
          <div className="grid grid-cols-5 gap-2 mb-4">
            {questions.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)} className="w-full aspect-square rounded-lg text-xs font-semibold flex items-center justify-center"
                style={statusStyle[status(i)]}>
                {i + 1}
              </button>
            ))}
          </div>
          <div className="space-y-1.5 text-xs">
            {[["Answered", "var(--success)"], ["Marked", "var(--accent)"], ["Current", "var(--ink)"], ["Not attempted", "#EFEDE6"]].map(([label, color]) => (
              <div key={label} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ background: color, border: label === "Not attempted" ? "1px solid #D8D5C9" : "none" }} />
                <span style={{ color: "var(--muted)" }}>{label}</span>
              </div>
            ))}
          </div>
          <button onClick={submit} className="sa-btn-primary w-full mt-4 py-2 text-sm font-medium">Submit Quiz</button>
        </div>
      </div>
    </div>
  );
}

export default QuizRun;
