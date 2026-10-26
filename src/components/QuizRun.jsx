import React, { useState, useEffect } from "react";
import { Clock, Flag, ArrowLeft, ArrowRight, X } from "lucide-react";
import { Badge } from "./UI";
import CodingWorkspace from "./CodingWorkspace";
import { FormattedText } from "./MathRenderer";
import { startQuizAttempt, saveQuizAnswer, submitQuizAttempt, getQuiz } from "../services/api";

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
    current: { background: "var(--ink)", color: "#fff" },
    answered: { background: "var(--success)", color: "#fff" },
    marked: { background: "var(--accent)", color: "var(--accent-ink)" },
    unattempted: { background: "#EFEDE6", color: "var(--text)" },
  };

  if (loading) return <div className="p-8 text-center text-sm" style={{ color: "var(--muted)" }}>Starting your attempt...</div>;

  return (
    <div className="sa-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (window.confirm("Exit this quiz attempt and return to Quiz Dashboard? Your answers will be saved.")) {
                go("quiz-setup");
              }
            }}
            className="p-1.5 rounded-lg border hover:bg-[var(--surface-subtle)] text-[var(--muted)]"
            title="Exit to Quiz Dashboard"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="sa-serif text-xl font-semibold">{fullScreenTitle || generatedQuiz?.title || "Quiz"}</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>Question {current + 1} of {questions.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: seconds < 60 ? "var(--danger-soft)" : "#EFEDE6" }}>
          <Clock size={15} color={seconds < 60 ? "var(--danger)" : "var(--text)"} />
          <span className="text-sm font-mono font-semibold" style={{ color: seconds < 60 ? "var(--danger)" : "var(--text)" }}>{mm}:{ss}</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_260px] gap-5">
        <div className="sa-card sa-card-lg p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Badge tone="info">{q.question_type.toUpperCase()}</Badge>
            <Badge tone="accent">{q.difficulty.toUpperCase()}</Badge>
            {marked[q.id] && <Badge tone="accent"><Flag size={11} /> Marked</Badge>}
          </div>
          <div className="text-base font-medium leading-relaxed mb-6">
            <FormattedText text={q.question_text} />
          </div>
          
          <div className="flex-1 space-y-2.5">
            {q.question_type === 'mcq' && q.public_options && Object.entries(q.public_options).map(([key, val]) => (
              <div key={key} onClick={() => setAnswer(key)}
                className={`sa-option-card px-4 py-3 flex items-center gap-3 text-sm ${answers[q.id] === key ? "selected" : ""}`}>
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold"
                  style={{ border: "1.5px solid " + (answers[q.id] === key ? "var(--ink)" : "#CFCBBB"), background: answers[q.id] === key ? "var(--ink)" : "transparent", color: answers[q.id] === key ? "#fff" : "var(--muted)" }}>
                  {key}
                </div>
                <span className="flex-1">
                  <FormattedText text={val} inline />
                </span>
              </div>
            ))}

            {q.question_type === 'short_answer' && (
              <textarea 
                className="w-full h-32 p-3 rounded-lg text-sm outline-none resize-none"
                style={{ border: "1px solid var(--line)" }}
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
                  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1";
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
