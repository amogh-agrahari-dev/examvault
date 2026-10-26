import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  Upload,
  Sparkles,
  Calendar,
  Clock,
  Award,
  ChevronDown,
  ChevronUp,
  Printer,
  Copy,
  Check,
  Trash2,
  Eye,
  FileCheck2,
  FolderLock,
  ArrowLeft,
  RefreshCw,
  SlidersHorizontal,
  Layers,
  HelpCircle,
  FileUp,
  BookOpen,
  Search,
  CheckCircle2,
  X,
  ShieldCheck,
  Download
} from "lucide-react";
import {
  uploadPastPaper,
  importPastPaperFromDocument,
  getDocuments,
  getPastPapers,
  deletePastPaper,
  predictPaperFromPastPaper,
  getPredictedPapers,
  getPredictedPaper,
  deletePredictedPaper,
  request
} from "../services/api";
import { FormattedText } from "./MathRenderer";

export default function PredictedPaperGenerator({
  go,
  subjectId,
  uploadParams,
  accessToken,
  showToast
}) {
  const [activeTab, setActiveTab] = useState("papers"); // "papers" | "viewer" | "history"
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjectId || "");
  const [pastPapers, setPastPapers] = useState([]);
  const [predictedHistory, setPredictedHistory] = useState([]);
  const [loadingPapers, setLoadingPapers] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Upload modal / resource picker state
  const [isUploadOpen, setIsUploadOpen] = useState(Boolean(uploadParams?.openUpload || uploadParams?.importDoc));
  const [modalMode, setModalMode] = useState(uploadParams?.importDoc ? "documents" : "upload"); // "upload" | "documents"
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadYear, setUploadYear] = useState(new Date().getFullYear() - 1);
  const [uploadExamType, setUploadExamType] = useState("End-Sem");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Main filebase document selection state
  const [mainDocs, setMainDocs] = useState([]);
  const [loadingMainDocs, setLoadingMainDocs] = useState(false);
  const [selectedMainDocId, setSelectedMainDocId] = useState(uploadParams?.importDoc?.id || null);
  const [mainDocSearch, setMainDocSearch] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  // Predict configuration & state
  const [predictModalPaper, setPredictModalPaper] = useState(null);
  const [predictConfig, setPredictConfig] = useState({
    target_year: new Date().getFullYear(),
    total_marks: 70,
    difficulty: "medium",
    subject_name: ""
  });
  const [isPredicting, setIsPredicting] = useState(false);

  // Active predicted paper in viewer
  const [currentPrediction, setCurrentPrediction] = useState(null);
  const [expandedAnswers, setExpandedAnswers] = useState({});
  const [copiedText, setCopiedText] = useState(false);

  // Inspect raw extracted text modal
  const [inspectPaper, setInspectPaper] = useState(null);

  // Initial loads
  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    fetchPastPapers();
    fetchPredictedHistory();
  }, [selectedSubjectId]);

  const fetchSubjects = async () => {
    try {
      const data = await request("/subjects", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setSubjects(Array.isArray(data) ? data : []);
      if (subjectId && !selectedSubjectId) {
        setSelectedSubjectId(subjectId);
      }
    } catch (e) {
      console.error("Failed to load subjects:", e);
    }
  };

  const fetchPastPapers = async () => {
    setLoadingPapers(true);
    try {
      const res = await getPastPapers(accessToken, selectedSubjectId || null);
      setPastPapers(res.past_papers || []);
    } catch (err) {
      console.error("Failed to load past papers", err);
    } finally {
      setLoadingPapers(false);
    }
  };

  const fetchPredictedHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await getPredictedPapers(accessToken, {
        subject_id: selectedSubjectId || null
      });
      setPredictedHistory(res.predicted_papers || []);
    } catch (err) {
      console.error("Failed to load prediction history", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchMainDocs = async () => {
    setLoadingMainDocs(true);
    try {
      const res = await getDocuments(accessToken);
      setMainDocs(res.documents || []);
    } catch (e) {
      console.error("Failed to load main filebase documents:", e);
    } finally {
      setLoadingMainDocs(false);
    }
  };

  useEffect(() => {
    if (uploadParams?.importDoc) {
      setSelectedMainDocId(uploadParams.importDoc.id);
      setModalMode("documents");
      setIsUploadOpen(true);
      fetchMainDocs();
    }
  }, [uploadParams]);

  // Handle selecting a file from the main filebase as prediction resource
  const handleImportDocument = async (e) => {
    e?.preventDefault();
    if (!selectedMainDocId) {
      showToast("Please choose a file from your main documents");
      return;
    }
    setIsImporting(true);
    try {
      const imported = await importPastPaperFromDocument(selectedMainDocId, accessToken, {
        year: uploadYear,
        exam_type: uploadExamType
      });
      showToast(`Document "${imported.filename}" selected as exam paper resource!`);
      setIsUploadOpen(false);
      setSelectedMainDocId(null);
      await fetchPastPapers();

      // Immediately offer to predict from this newly selected resource
      openPredictModal({
        id: imported.id,
        filename: imported.filename,
        year: imported.year,
        subject_id: imported.subject_id
      });
    } catch (err) {
      showToast(err.message || "Failed to select document as exam resource");
    } finally {
      setIsImporting(false);
    }
  };

  // Handle uploading past paper
  const handleUploadSubmit = async (e) => {
    e?.preventDefault();
    if (!uploadFile) {
      showToast("Please choose a past paper document (PDF, TXT, DOCX)");
      return;
    }

    setIsUploading(true);
    try {
      const created = await uploadPastPaper(uploadFile, accessToken, {
        subject_id: selectedSubjectId || null,
        year: uploadYear,
        exam_type: uploadExamType
      });
      showToast(`Past paper "${created.filename}" archived successfully!`);
      setIsUploadOpen(false);
      setUploadFile(null);
      fetchPastPapers();

      // Automatically offer to predict from the freshly uploaded paper
      openPredictModal({
        id: created.id,
        filename: created.filename,
        year: created.year,
        subject_id: created.subject_id
      });
    } catch (err) {
      showToast(err.message || "Failed to upload past paper");
    } finally {
      setIsUploading(false);
    }
  };

  // Delete past paper
  const handleDeletePaper = async (paperId, e) => {
    e?.stopPropagation();
    if (!window.confirm("Remove this previous paper from your isolated exam archive?")) return;
    try {
      await deletePastPaper(paperId, accessToken);
      showToast("Past paper removed from archive");
      setPastPapers((prev) => prev.filter((p) => p.id !== paperId));
    } catch (err) {
      showToast(err.message || "Failed to delete past paper");
    }
  };

  // Open predict modal
  const openPredictModal = (paper) => {
    setPredictModalPaper(paper);
    const subObj = subjects.find((s) => s.id === (paper.subject_id || selectedSubjectId));
    setPredictConfig({
      target_year: paper.year ? paper.year + 1 : new Date().getFullYear(),
      total_marks: 70,
      difficulty: "medium",
      subject_name: subObj ? subObj.name : ""
    });
  };

  // Run paper prediction
  const handleGeneratePrediction = async () => {
    if (!predictModalPaper) return;
    setIsPredicting(true);
    try {
      const prediction = await predictPaperFromPastPaper(
        predictModalPaper.id,
        accessToken,
        predictConfig
      );
      setCurrentPrediction(prediction);
      setPredictModalPaper(null);
      setActiveTab("viewer");
      showToast("Predicted Examination Paper synthesized successfully!");
      fetchPredictedHistory();
    } catch (err) {
      showToast(err.message || "Failed to synthesize predicted exam paper");
    } finally {
      setIsPredicting(false);
    }
  };

  // Load a previously predicted paper from history
  const handleLoadPredictedPaper = async (predId) => {
    try {
      const paper = await getPredictedPaper(predId, accessToken);
      setCurrentPrediction(paper);
      setActiveTab("viewer");
    } catch (err) {
      showToast(err.message || "Failed to load predicted paper");
    }
  };

  // Delete a predicted paper from history
  const handleDeletePredicted = async (predId, e) => {
    e?.stopPropagation();
    if (!window.confirm("Delete this predicted paper?")) return;
    try {
      await deletePredictedPaper(predId, accessToken);
      showToast("Predicted paper deleted");
      setPredictedHistory((prev) => prev.filter((p) => p.id !== predId));
      if (currentPrediction?.id === predId) {
        setCurrentPrediction(null);
        setActiveTab("papers");
      }
    } catch (err) {
      showToast(err.message || "Failed to delete predicted paper");
    }
  };

  // Copy full examination text
  const handleCopyPaper = () => {
    if (!currentPrediction) return;
    let fullText = `${currentPrediction.exam_title || "EXAMINATION PAPER"}\n`;
    fullText += `Subject: ${currentPrediction.subject_name || "Course"}\n`;
    fullText += `Duration: ${currentPrediction.duration_minutes || 180} Minutes | Total Marks: ${currentPrediction.total_marks || 70}\n\n`;
    fullText += "INSTRUCTIONS:\n";
    (currentPrediction.general_instructions || []).forEach((inst) => {
      fullText += `${inst}\n`;
    });
    fullText += "\n========================================\n\n";

    (currentPrediction.sections || []).forEach((sec) => {
      fullText += `${sec.section_name} - ${sec.description || ""}\n\n`;
      (sec.questions || []).forEach((q) => {
        fullText += `--- ${q.question_number} ---\n`;
        (q.sub_questions || []).forEach((sub) => {
          fullText += `(${sub.sub_id}) ${sub.text} [${sub.marks} Marks]\n`;
        });
        if (q.or_question) {
          fullText += `\n[OR]\n`;
          fullText += `--- ${q.or_question.question_number} ---\n`;
          (q.or_question.sub_questions || []).forEach((sub) => {
            fullText += `(${sub.sub_id}) ${sub.text} [${sub.marks} Marks]\n`;
          });
        }
        fullText += "\n";
      });
      fullText += "\n";
    });

    navigator.clipboard?.writeText(fullText);
    setCopiedText(true);
    showToast("Full examination paper copied to clipboard!");
    setTimeout(() => setCopiedText(false), 2000);
  };

  // Print paper
  const handlePrintPaper = () => {
    window.print();
  };

  const toggleAnswer = (key) => {
    setExpandedAnswers((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="sa-fade-in space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <button
              onClick={() => go("subjects")}
              className="text-xs flex items-center gap-1 font-medium hover:underline text-[var(--muted)] hover:text-[var(--text)] transition-colors"
            >
              <ArrowLeft size={13} />
              <span>Subjects</span>
            </button>
            <span className="text-[var(--muted)]">/</span>
            <span 
              className="text-xs font-semibold px-2.5 py-0.5 rounded-md inline-flex items-center gap-1.5"
              style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}
            >
              <Sparkles size={13} />
              AI Examination Blueprint
            </span>
          </div>
          <h1 className="sa-serif text-2xl sm:text-3xl font-semibold text-[var(--text)]">
            Exam Paper Predictor
          </h1>
          <p className="text-xs sm:text-sm text-[var(--muted)] mt-1 max-w-2xl leading-relaxed">
            Independent, pattern-grounded university question paper predictions synthesized strictly from uploaded previous year examination papers.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto self-start sm:self-auto">
          {/* Subject Filter Dropdown */}
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="sa-input text-xs px-3 py-2 rounded-xl border font-medium cursor-pointer w-full sm:w-auto"
            style={{ minWidth: 150 }}
          >
            <option value="">All Subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setModalMode("documents");
              setIsUploadOpen(true);
              fetchMainDocs();
            }}
            className="sa-btn-outline flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl shadow-xs"
          >
            <FileText size={14} className="text-amber-500" />
            <span>From Documents</span>
          </button>

          <button
            onClick={() => {
              setModalMode("upload");
              setIsUploadOpen(true);
            }}
            className="sa-btn-primary flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl shadow-xs"
          >
            <Upload size={14} />
            <span>Upload Past Paper</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs - Modern Segmented Control Container */}
      <div 
        className="flex items-center p-1 rounded-xl border gap-1 bg-[var(--surface-subtle)] overflow-x-auto whitespace-nowrap sa-scroll flex-nowrap no-print"
        style={{ borderColor: "var(--line)" }}
      >
        <button
          onClick={() => setActiveTab("papers")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${
            activeTab === "papers"
              ? "bg-[var(--surface)] text-[var(--text)] font-semibold shadow-xs"
              : "text-[var(--muted)] hover:text-[var(--text)]"
          }`}
        >
          <FolderLock size={15} />
          <span>Past Papers Archive ({pastPapers.length})</span>
        </button>

        {currentPrediction && (
          <button
            onClick={() => setActiveTab("viewer")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${
              activeTab === "viewer"
                ? "bg-[var(--surface)] text-[var(--text)] font-semibold shadow-xs"
                : "text-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            <FileCheck2 size={15} />
            <span>Predicted Paper Viewer</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${
            activeTab === "history"
              ? "bg-[var(--surface)] text-[var(--text)] font-semibold shadow-xs"
              : "text-[var(--muted)] hover:text-[var(--text)]"
          }`}
        >
          <Clock size={15} />
          <span>Prediction History ({predictedHistory.length})</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: PAST PAPERS ARCHIVE (ISOLATED FILEBASE) */}
      {/* ============================================================ */}
      {activeTab === "papers" && (
        <div className="space-y-6">
          {/* Filebase Isolation Guarantee Card */}
          <div
            className="p-4 rounded-xl border flex items-start gap-3.5"
            style={{
              background: "var(--surface-subtle)",
              borderColor: "var(--line)"
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}
            >
              <ShieldCheck size={20} />
            </div>
            <div className="text-xs leading-relaxed space-y-1">
              <span className="font-semibold text-sm block text-[var(--text)]">
                Dedicated Isolated Exam Paper Filebase
              </span>
              <p className="text-[var(--muted)]">
                Past examination papers uploaded here are strictly stored in an isolated archive and are{" "}
                <strong className="text-[var(--text)] font-semibold">never merged with your main study notes</strong>.
                When predicting an upcoming paper, the AI examines{" "}
                <strong className="text-[var(--text)] font-semibold">only the uploaded previous paper</strong> and its
                inherent patterns — without relying on external topics or database notes.
              </p>
            </div>
          </div>

          {/* Past Papers List / Grid */}
          {loadingPapers ? (
            <div className="sa-card p-12 text-center text-sm rounded-xl border" style={{ borderColor: "var(--line)", color: "var(--muted)" }}>
              <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-amber-500" />
              <span>Loading isolated past papers archive...</span>
            </div>
          ) : pastPapers.length === 0 ? (
            <div
              className="sa-card p-10 sm:p-14 text-center rounded-2xl border-2 border-dashed flex flex-col items-center justify-center"
              style={{ borderColor: "var(--border-dashed)", background: "var(--surface)" }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}
              >
                <FileUp size={28} />
              </div>
              <h3 className="sa-serif text-lg font-semibold text-[var(--text)] mb-1">
                No Past Examination Papers Uploaded
              </h3>
              <p className="text-xs sm:text-sm text-[var(--muted)] max-w-md mb-6 leading-relaxed">
                Upload previous question papers (PDF, scanned images, DOCX) or select an existing document from
                your library to predict the upcoming examination paper.
              </p>
              <div className="flex items-center gap-3 flex-wrap justify-center">
                <button
                  onClick={() => {
                    setModalMode("upload");
                    setIsUploadOpen(true);
                  }}
                  className="sa-btn-primary px-5 py-2.5 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs"
                >
                  <Upload size={14} />
                  <span>Upload Exam Paper</span>
                </button>
                <button
                  onClick={() => {
                    setModalMode("documents");
                    setIsUploadOpen(true);
                    fetchMainDocs();
                  }}
                  className="sa-btn-outline px-4 py-2.5 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs"
                >
                  <FileText size={14} className="text-amber-500" />
                  <span>Select From My Documents</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {pastPapers.map((paper) => {
                const subObj = subjects.find((s) => s.id === paper.subject_id);
                return (
                  <div
                    key={paper.id}
                    className="sa-card p-5 rounded-2xl border flex flex-col justify-between hover:shadow-md transition-all group"
                    style={{
                      background: "var(--surface)",
                      borderColor: "var(--line)"
                    }}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span
                          className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold tracking-wide"
                          style={{
                            background: "var(--accent-soft)",
                            color: "var(--accent-ink)"
                          }}
                        >
                          {paper.year ? `Year ${paper.year}` : "Previous Year"}
                        </span>
                        <span
                          className="px-2.5 py-0.5 rounded-md text-[11px] font-medium"
                          style={{
                            background: "var(--surface-subtle)",
                            color: "var(--muted)",
                            border: "1px solid var(--line)"
                          }}
                        >
                          {paper.exam_type || "End-Sem"}
                        </span>
                      </div>

                      {/* Paper Title */}
                      <div className="flex items-start gap-2.5 mb-2">
                        <FileText size={18} className="text-amber-500 shrink-0 mt-0.5" />
                        <h4 className="font-semibold text-sm text-[var(--text)] line-clamp-2">
                          {paper.filename}
                        </h4>
                      </div>

                      {/* Subject Name if linked */}
                      {subObj && (
                        <div className="text-xs mb-2.5 font-medium text-[var(--muted)]">
                          Subject: <span className="text-[var(--text)] font-semibold">{subObj.name}</span>
                        </div>
                      )}

                      {/* Text Snippet Preview */}
                      {paper.text_preview && (
                        <p
                          className="text-xs line-clamp-3 p-2.5 rounded-xl mb-4 font-mono leading-relaxed"
                          style={{
                            background: "var(--surface-subtle)",
                            color: "var(--muted)",
                            border: "1px solid var(--line)"
                          }}
                        >
                          {paper.text_preview}
                        </p>
                      )}
                    </div>

                    {/* Metadata & Actions */}
                    <div>
                      <div
                        className="flex items-center justify-between text-[11px] pt-3 border-t mb-3.5"
                        style={{
                          borderColor: "var(--line)",
                          color: "var(--muted)"
                        }}
                      >
                        <span>
                          {paper.file_size ? `${(paper.file_size / 1024).toFixed(0)} KB` : "Document"}
                        </span>
                        <span className="font-medium text-[var(--text)]">{paper.prediction_count || 0} Predictions</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openPredictModal(paper)}
                          className="sa-btn-primary flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <Sparkles size={13} />
                          <span>Predict Paper</span>
                        </button>
                        <button
                          onClick={() => setInspectPaper(paper)}
                          title="Inspect Extracted Text"
                          className="sa-btn-outline p-2 rounded-lg"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={(e) => handleDeletePaper(paper.id, e)}
                          title="Delete from archive"
                          className="sa-btn-outline p-2 rounded-lg hover:border-red-500 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: AUTHENTIC UNIVERSITY EXAM PAPER VIEWER */}
      {/* ============================================================ */}
      {activeTab === "viewer" && currentPrediction && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div
            className="sa-card p-3.5 sm:p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 no-print"
            style={{ background: "var(--surface)", borderColor: "var(--line)" }}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-xs sm:text-sm text-[var(--text)]">Exam Blueprint:</span>
              <span
                className="px-2.5 py-0.5 rounded-md text-xs font-medium"
                style={{ background: "var(--surface-subtle)", color: "var(--muted)", border: "1px solid var(--line)" }}
              >
                Target Year: {currentPrediction.target_year || 2025}
              </span>
              <span
                className="px-2.5 py-0.5 rounded-md text-xs font-semibold"
                style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}
              >
                Max Marks: {currentPrediction.total_marks || 70}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              <button
                onClick={handlePrintPaper}
                className="sa-btn-outline flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg"
              >
                <Printer size={14} />
                <span>Print / PDF</span>
              </button>
              <button
                onClick={handleCopyPaper}
                className="sa-btn-outline flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg"
              >
                {copiedText ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                <span>{copiedText ? "Copied" : "Copy Paper"}</span>
              </button>
              <button
                onClick={() => {
                  const blob = new Blob([JSON.stringify(currentPrediction, null, 2)], {
                    type: "application/json"
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `predicted_paper_${currentPrediction.target_year || 2025}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="sa-btn-outline flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg"
              >
                <Download size={14} />
                <span>Export JSON</span>
              </button>
            </div>
          </div>

          {/* Prediction Synthesis Rationale (No print) */}
          {currentPrediction.summary_analysis && (
            <div
              className="p-4 rounded-xl border text-xs leading-relaxed no-print"
              style={{
                background: "var(--surface-subtle)",
                borderColor: "var(--line)"
              }}
            >
              <span className="font-semibold text-xs mb-1 flex items-center gap-1.5" style={{ color: "var(--accent-ink)" }}>
                <Sparkles size={14} />
                <span>Pattern Rationale & Syllabus Synthesis Scope:</span>
              </span>
              <p className="text-[var(--muted)] leading-relaxed mt-1">{currentPrediction.summary_analysis}</p>
            </div>
          )}

          {/* Genuine University Examination Paper Container */}
          <div
            className="exam-paper-container sa-card p-3.5 sm:p-6 md:p-10 rounded-2xl border shadow-sm space-y-6 sm:space-y-8"
            style={{
              background: "var(--surface)",
              borderColor: "var(--line)",
              fontFamily: "'Newsreader', 'Times New Roman', serif"
            }}
          >
            {/* Official Exam Paper Header */}
            <div className="border-b-2 pb-6 text-center space-y-2" style={{ borderColor: "var(--text)" }}>
              <div className="uppercase tracking-widest text-xs font-sans font-bold text-[var(--muted)]">
                Examination Board & University Assessment
              </div>
              <h2 className="text-xl md:text-2xl font-bold uppercase tracking-wide text-[var(--text)]">
                {currentPrediction.exam_title || `Examination Paper — ${currentPrediction.target_year || 2025}`}
              </h2>
              <div className="text-base md:text-lg font-semibold font-sans uppercase" style={{ color: "var(--accent-ink)" }}>
                {currentPrediction.subject_name || "Academic Subject"}
              </div>

              {/* Time & Marks Metadata Row */}
              <div
                className="flex justify-between items-center text-xs md:text-sm font-sans font-semibold pt-3 px-2 border-t text-[var(--text)]"
                style={{ borderColor: "var(--line)" }}
              >
                <span>[Time Allowed: {Math.floor((currentPrediction.duration_minutes || 180) / 60)} Hours]</span>
                <span>[Total Sections: {(currentPrediction.sections || []).length}]</span>
                <span>[Maximum Marks: {currentPrediction.total_marks || 70}]</span>
              </div>
            </div>

            {/* Instructions to Candidates */}
            <div
              className="p-4 rounded-xl text-xs md:text-sm font-sans space-y-1.5 border"
              style={{ background: "var(--surface-subtle)", borderColor: "var(--line)" }}
            >
              <span className="font-bold tracking-wide uppercase block mb-1 text-[var(--text)]">
                Instructions to the Candidates:
              </span>
              {(currentPrediction.general_instructions && currentPrediction.general_instructions.length > 0
                ? currentPrediction.general_instructions
                : [
                    "1. Answer Q.1 or Q.2, Q.3 or Q.4, Q.5 or Q.6, Q.7 or Q.8.",
                    "2. Neat diagrams must be drawn wherever necessary.",
                    "3. Figures to the right indicate full marks.",
                    "4. Assume suitable data, if necessary.",
                    "5. Use of non-programmable scientific calculator is permitted."
                  ]
              ).map((inst, idx) => (
                <div key={idx} className="leading-snug text-xs text-[var(--muted)]">
                  {inst}
                </div>
              ))}
            </div>

            {/* Sections & Questions */}
            <div className="space-y-10">
              {(currentPrediction.sections || []).map((sec, sIdx) => (
                <div key={sIdx} className="space-y-6">
                  {/* Section Title Banner */}
                  <div className="border-b pb-2 text-center" style={{ borderColor: "var(--line)" }}>
                    <h3 className="font-sans font-bold text-base md:text-lg uppercase tracking-wider text-[var(--text)]">
                      {sec.section_name || `SECTION ${sIdx + 1}`}
                    </h3>
                    {sec.description && (
                      <p className="font-sans text-xs italic text-[var(--muted)] mt-0.5">
                        {sec.description}
                      </p>
                    )}
                  </div>

                  {/* Question Groups */}
                  <div className="space-y-8">
                    {(sec.questions || []).map((qGroup, qIdx) => {
                      const qKey = `sec_${sIdx}_q_${qIdx}`;
                      const orKey = `sec_${sIdx}_q_${qIdx}_or`;

                      return (
                        <div key={qIdx} className="space-y-6">
                          {/* Main Question */}
                          <div className="space-y-4">
                            <div className="font-sans font-bold text-sm tracking-wide text-[var(--text)]">
                              {qGroup.question_number || `Q.${qIdx * 2 + 1}`}
                            </div>

                            <div className="space-y-3.5 pl-3">
                              {(qGroup.sub_questions || []).map((sub, subIdx) => {
                                const subKey = `${qKey}_sub_${subIdx}`;
                                const isExp = expandedAnswers[subKey];

                                return (
                                  <div key={subIdx} className="space-y-2">
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="flex items-start gap-2 text-sm md:text-base leading-relaxed flex-1">
                                        <span className="font-sans font-semibold text-xs mt-0.5 text-[var(--text)]">
                                          [{sub.sub_id || String.fromCharCode(97 + subIdx)}]
                                        </span>
                                        <div className="flex-1 font-serif text-[var(--text)]">
                                          <FormattedText text={sub.text} />
                                        </div>
                                      </div>
                                      <span
                                        className="font-sans font-bold text-xs px-2.5 py-0.5 rounded-md shrink-0"
                                        style={{ background: "var(--surface-subtle)", color: "var(--text)", border: "1px solid var(--line)" }}
                                      >
                                        [{sub.marks || 7}]
                                      </span>
                                    </div>

                                    {/* Model Answer Toggle (no print) */}
                                    {(sub.model_answer || sub.marking_breakdown) && (
                                      <div className="no-print pl-6">
                                        <button
                                          onClick={() => toggleAnswer(subKey)}
                                          className="text-[11px] font-sans font-semibold flex items-center gap-1.5 hover:underline py-1"
                                          style={{ color: "var(--accent-ink)" }}
                                        >
                                          {isExp ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                          <span>{isExp ? "Hide Model Answer & Marking Scheme" : "View Model Answer & Scheme"}</span>
                                        </button>

                                        {isExp && (
                                          <div
                                            className="mt-2 p-3.5 rounded-xl border font-sans text-xs space-y-2.5 sa-fade-in"
                                            style={{
                                              background: "var(--surface-subtle)",
                                              borderColor: "var(--line)"
                                            }}
                                          >
                                            {sub.cognitive_level && (
                                              <div className="flex items-center gap-2">
                                                <span className="font-semibold text-[11px] text-[var(--muted)]">
                                                  Cognitive Domain:
                                                </span>
                                                <span
                                                  className="px-2 py-0.5 rounded-md text-[10px] font-semibold"
                                                  style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}
                                                >
                                                  {sub.cognitive_level}
                                                </span>
                                              </div>
                                            )}

                                            {sub.model_answer && (
                                              <div>
                                                <span className="font-semibold text-[11px] block text-green-600 dark:text-green-400">
                                                  Model Answer Outline:
                                                </span>
                                                <div className="whitespace-pre-wrap leading-relaxed mt-1 text-[var(--text)]">
                                                  <FormattedText text={sub.model_answer} />
                                                </div>
                                              </div>
                                            )}

                                            {sub.marking_breakdown && (
                                              <div
                                                className="pt-2 border-t text-[11px]"
                                                style={{ borderColor: "var(--line)", color: "var(--muted)" }}
                                              >
                                                <span className="font-semibold text-amber-600 dark:text-amber-400">
                                                  Marking Breakdown:
                                                </span>{" "}
                                                {sub.marking_breakdown}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* "OR" Alternative Question */}
                          {qGroup.or_question && (
                            <div className="space-y-4 pt-2">
                              <div className="relative text-center my-4">
                                <div className="absolute inset-0 flex items-center">
                                  <div className="w-full border-t" style={{ borderColor: "var(--line)" }} />
                                </div>
                                <span
                                  className="relative px-4 py-1 text-xs font-sans font-bold tracking-widest uppercase rounded-md border"
                                  style={{
                                    background: "var(--surface)",
                                    borderColor: "var(--line)",
                                    color: "var(--muted)"
                                  }}
                                >
                                  OR
                                </span>
                              </div>

                              <div className="font-sans font-bold text-sm tracking-wide text-[var(--text)]">
                                {qGroup.or_question.question_number || `Q.${qIdx * 2 + 2}`}
                              </div>

                              <div className="space-y-3.5 pl-3">
                                {(qGroup.or_question.sub_questions || []).map((sub, subIdx) => {
                                  const subKey = `${orKey}_sub_${subIdx}`;
                                  const isExp = expandedAnswers[subKey];

                                  return (
                                    <div key={subIdx} className="space-y-2">
                                      <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-2 text-sm md:text-base leading-relaxed flex-1">
                                          <span className="font-sans font-semibold text-xs mt-0.5 text-[var(--text)]">
                                            [{sub.sub_id || String.fromCharCode(97 + subIdx)}]
                                          </span>
                                          <div className="flex-1 font-serif text-[var(--text)]">
                                            <FormattedText text={sub.text} />
                                          </div>
                                        </div>
                                        <span
                                          className="font-sans font-bold text-xs px-2.5 py-0.5 rounded-md shrink-0"
                                          style={{ background: "var(--surface-subtle)", color: "var(--text)", border: "1px solid var(--line)" }}
                                        >
                                          [{sub.marks || 7}]
                                        </span>
                                      </div>

                                      {/* Model Answer Toggle (no print) */}
                                      {(sub.model_answer || sub.marking_breakdown) && (
                                        <div className="no-print pl-6">
                                          <button
                                            onClick={() => toggleAnswer(subKey)}
                                            className="text-[11px] font-sans font-semibold flex items-center gap-1.5 hover:underline py-1"
                                            style={{ color: "var(--accent-ink)" }}
                                          >
                                            {isExp ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                            <span>{isExp ? "Hide Model Answer & Marking Scheme" : "View Model Answer & Scheme"}</span>
                                          </button>

                                          {isExp && (
                                            <div
                                              className="mt-2 p-3.5 rounded-xl border font-sans text-xs space-y-2.5 sa-fade-in"
                                              style={{
                                                background: "var(--surface-subtle)",
                                                borderColor: "var(--line)"
                                              }}
                                            >
                                              {sub.cognitive_level && (
                                                <div className="flex items-center gap-2">
                                                  <span className="font-semibold text-[11px] text-[var(--muted)]">
                                                    Cognitive Domain:
                                                  </span>
                                                  <span
                                                    className="px-2 py-0.5 rounded-md text-[10px] font-semibold"
                                                    style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}
                                                  >
                                                    {sub.cognitive_level}
                                                  </span>
                                                </div>
                                              )}

                                              {sub.model_answer && (
                                                <div>
                                                  <span className="font-semibold text-[11px] block text-green-600 dark:text-green-400">
                                                    Model Answer Outline:
                                                  </span>
                                                  <div className="whitespace-pre-wrap leading-relaxed mt-1 text-[var(--text)]">
                                                    <FormattedText text={sub.model_answer} />
                                                  </div>
                                                </div>
                                              )}

                                              {sub.marking_breakdown && (
                                                <div
                                                  className="pt-2 border-t text-[11px]"
                                                  style={{ borderColor: "var(--line)", color: "var(--muted)" }}
                                                >
                                                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                                                    Marking Breakdown:
                                                  </span>{" "}
                                                  {sub.marking_breakdown}
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* End of Examination Paper Sign-off */}
            <div className="text-center pt-8 border-t font-sans text-xs font-semibold tracking-widest uppercase text-[var(--muted)]" style={{ borderColor: "var(--text)" }}>
              ✦ ✦ ✦ End of Examination Question Paper ✦ ✦ ✦
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: PREDICTION HISTORY */}
      {/* ============================================================ */}
      {activeTab === "history" && (
        <div className="space-y-4">
          {loadingHistory ? (
            <div className="sa-card p-12 text-center text-sm rounded-xl border" style={{ borderColor: "var(--line)", color: "var(--muted)" }}>
              <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-amber-500" />
              <span>Loading prediction archives...</span>
            </div>
          ) : predictedHistory.length === 0 ? (
            <div
              className="sa-card p-12 text-center rounded-2xl border flex flex-col items-center justify-center"
              style={{ background: "var(--surface)", borderColor: "var(--line)" }}
            >
              <div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}
              >
                <Award size={28} />
              </div>
              <h3 className="font-semibold text-base mb-1 text-[var(--text)]">No Saved Predicted Papers Yet</h3>
              <p className="text-xs text-[var(--muted)] max-w-sm leading-relaxed">
                When you predict an exam paper from an uploaded previous paper, it will be automatically saved here for quick revision.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {predictedHistory.map((pred) => (
                <div
                  key={pred.id}
                  onClick={() => handleLoadPredictedPaper(pred.id)}
                  className="sa-card p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:border-[var(--accent)] transition-all group"
                  style={{ background: "var(--surface)", borderColor: "var(--line)" }}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
                        {pred.title}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-md text-[11px] font-semibold"
                        style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}
                      >
                        {pred.target_year || 2025}
                      </span>
                    </div>
                    <div className="text-xs flex items-center gap-2.5 flex-wrap text-[var(--muted)]">
                      <span>Course: <strong className="text-[var(--text)] font-medium">{pred.subject_name || "General"}</strong></span>
                      <span>•</span>
                      <span>{pred.total_marks || 70} Marks</span>
                      <span>•</span>
                      <span>{pred.created_at ? new Date(pred.created_at).toLocaleDateString() : ""}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLoadPredictedPaper(pred.id);
                      }}
                      className="sa-btn-primary px-3.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs"
                    >
                      <Eye size={13} />
                      <span>Open Paper</span>
                    </button>
                    <button
                      onClick={(e) => handleDeletePredicted(pred.id, e)}
                      className="sa-btn-outline p-1.5 rounded-lg hover:border-red-500 hover:text-red-500 transition-colors"
                      title="Delete saved prediction"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: ADD EXAM RESOURCE (UPLOAD FILE OR SELECT FROM DOCUMENTS) */}
      {/* ============================================================ */}
      {isUploadOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div
            className="sa-card w-full max-w-lg max-h-[90vh] overflow-y-auto sa-scroll p-6 rounded-2xl border shadow-2xl space-y-4"
            style={{ background: "var(--surface)", borderColor: "var(--line)" }}
          >
            <div className="flex items-start justify-between pb-3 border-b" style={{ borderColor: "var(--line)" }}>
              <div>
                <h3 className="sa-serif text-lg font-bold flex items-center gap-2 text-[var(--text)]">
                  <FolderLock size={18} className="text-amber-500" />
                  <span>{modalMode === "documents" ? "Select Resource From My Documents" : "Upload Examination Paper"}</span>
                </h3>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  {modalMode === "documents"
                    ? "Select an existing file from your library to synthesize predicted questions."
                    : "Upload a past paper or scanned exam copy into the dedicated exam archive."}
                </p>
              </div>
              <button
                onClick={() => setIsUploadOpen(false)}
                className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-subtle)] transition-colors"
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div
              className="flex rounded-xl p-1 border gap-1"
              style={{ background: "var(--surface-subtle)", borderColor: "var(--line)" }}
            >
              <button
                type="button"
                onClick={() => setModalMode("upload")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  modalMode === "upload"
                    ? "bg-[var(--surface)] text-[var(--text)] shadow-xs"
                    : "text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                <Upload size={13} className={modalMode === "upload" ? "text-amber-500" : ""} />
                <span>Upload Exam File</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalMode("documents");
                  if (mainDocs.length === 0) fetchMainDocs();
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  modalMode === "documents"
                    ? "bg-[var(--surface)] text-[var(--text)] shadow-xs"
                    : "text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                <FileText size={13} className={modalMode === "documents" ? "text-amber-500" : ""} />
                <span>Choose From Documents ({mainDocs.length})</span>
              </button>
            </div>

            {modalMode === "documents" ? (
              /* ============================================================ */
              /* OPTION B: SELECT FROM MAIN FILEBASE DOCUMENTS                */
              /* ============================================================ */
              <form onSubmit={handleImportDocument} className="space-y-4">
                {/* Search Filter */}
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs"
                  style={{ background: "var(--input-bg)", borderColor: "var(--line)" }}
                >
                  <Search size={14} className="text-[var(--muted)] shrink-0" />
                  <input
                    type="text"
                    value={mainDocSearch}
                    onChange={(e) => setMainDocSearch(e.target.value)}
                    placeholder="Search documents by filename..."
                    className="bg-transparent outline-none w-full text-xs text-[var(--text)] placeholder-[var(--muted)]"
                  />
                  {mainDocSearch && (
                    <button
                      type="button"
                      onClick={() => setMainDocSearch("")}
                      className="text-[var(--muted)] hover:text-[var(--text)]"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Documents List */}
                <div
                  className="max-h-56 overflow-y-auto sa-scroll space-y-2 pr-1 rounded-xl border p-2"
                  style={{ background: "var(--surface-subtle)", borderColor: "var(--line)" }}
                >
                  {loadingMainDocs ? (
                    <div className="py-8 text-center text-xs text-[var(--muted)]">
                      <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-amber-500" />
                      Loading documents from your library...
                    </div>
                  ) : mainDocs.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[var(--muted)]">
                      <BookOpen size={20} className="mx-auto mb-2 opacity-40" />
                      No documents found in your library.
                    </div>
                  ) : (
                    mainDocs
                      .filter((d) =>
                        (d.filename || "").toLowerCase().includes(mainDocSearch.toLowerCase())
                      )
                      .map((doc) => {
                        const isSelected = selectedMainDocId === doc.id;
                        const subObj = subjects.find((s) => s.id === doc.subject_id);
                        return (
                          <div
                            key={doc.id}
                            onClick={() => setSelectedMainDocId(doc.id)}
                            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                              isSelected
                                ? "border-amber-500 shadow-xs ring-1 ring-amber-500/50"
                                : "hover:border-[var(--accent)]"
                            }`}
                            style={{
                              background: isSelected ? "var(--accent-soft)" : "var(--surface)",
                              borderColor: isSelected ? "var(--accent)" : "var(--line)"
                            }}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                style={{
                                  background: isSelected ? "var(--accent)" : "var(--surface-subtle)",
                                  color: isSelected ? "#fff" : "var(--accent-ink)"
                                }}
                              >
                                <FileText size={15} />
                              </div>
                              <div className="min-w-0">
                                <span
                                  className="font-semibold text-xs block truncate text-[var(--text)]"
                                  title={doc.filename}
                                >
                                  {doc.filename}
                                </span>
                                <div className="flex items-center gap-2 text-[11px] text-[var(--muted)]">
                                  <span>{((doc.file_size || 0) / 1024 / 1024).toFixed(2)} MB</span>
                                  {subObj && (
                                    <>
                                      <span>•</span>
                                      <span className="truncate max-w-[120px]">{subObj.name}</span>
                                    </>
                                  )}
                                  <span>•</span>
                                  <span className="capitalize">{doc.status}</span>
                                </div>
                              </div>
                            </div>

                            <div className="shrink-0">
                              {isSelected ? (
                                <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
                                  <Check size={12} strokeWidth={3} />
                                </div>
                              ) : (
                                <div
                                  className="w-5 h-5 rounded-full border-2"
                                  style={{ borderColor: "var(--line)" }}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>

                {/* Target Year & Exam Session */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold block mb-1 text-[var(--text)]">
                      Target Exam Year
                    </label>
                    <input
                      type="number"
                      min="1990"
                      max="2030"
                      value={uploadYear}
                      onChange={(e) => setUploadYear(parseInt(e.target.value) || 2026)}
                      className="sa-input w-full p-2 text-xs rounded-xl border font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1 text-[var(--text)]">
                      Exam Session / Type
                    </label>
                    <select
                      value={uploadExamType}
                      onChange={(e) => setUploadExamType(e.target.value)}
                      className="sa-input w-full p-2 text-xs rounded-xl border font-medium cursor-pointer"
                    >
                      <option value="End-Sem">End-Sem (Final)</option>
                      <option value="In-Sem">In-Sem (Midterm)</option>
                      <option value="Unit-Test">Unit Test</option>
                      <option value="Prelim">Prelim</option>
                    </select>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: "var(--line)" }}>
                  <button
                    type="button"
                    onClick={() => setIsUploadOpen(false)}
                    className="sa-btn-outline px-4 py-2 text-xs font-medium rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isImporting || !selectedMainDocId}
                    className="sa-btn-primary px-5 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs"
                  >
                    {isImporting ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Setting Resource...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={13} />
                        <span>Select & Predict Paper</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* ============================================================ */
              /* OPTION A: UPLOAD NEW EXAM PAPER FILE                          */
              /* ============================================================ */
              <form onSubmit={handleUploadSubmit} className="space-y-4">
                {/* File Dropzone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-colors flex flex-col items-center justify-center"
                  style={{
                    borderColor: uploadFile ? "var(--accent)" : "var(--border-dashed)",
                    background: uploadFile ? "var(--accent-soft)" : "var(--surface-subtle)"
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.docx,.txt,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setUploadFile(e.target.files[0]);
                      }
                    }}
                  />
                  <FileUp size={24} className="mb-2 text-amber-500" />
                  {uploadFile ? (
                    <div>
                      <span className="font-semibold text-xs block" style={{ color: "var(--accent-ink)" }}>
                        {uploadFile.name}
                      </span>
                      <span className="text-[11px] text-[var(--muted)]">
                        {(uploadFile.size / 1024 / 1024).toFixed(2)} MB • Ready to archive
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="font-semibold text-xs block text-[var(--text)]">
                        Click to choose or drag & drop past paper
                      </span>
                      <span className="text-[11px] text-[var(--muted)]">
                        Supports PDF, DOCX, TXT, or scanned image exam sheets
                      </span>
                    </div>
                  )}
                </div>

                {/* Subject selector */}
                <div>
                  <label className="text-xs font-semibold block mb-1 text-[var(--text)]">
                    Link to Subject
                  </label>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="sa-input w-full p-2.5 text-xs rounded-xl border font-medium cursor-pointer"
                  >
                    <option value="">General / Unassigned Subject</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Year & Exam Type row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold block mb-1 text-[var(--text)]">
                      Paper Year
                    </label>
                    <input
                      type="number"
                      min="1990"
                      max="2030"
                      value={uploadYear}
                      onChange={(e) => setUploadYear(parseInt(e.target.value) || 2024)}
                      className="sa-input w-full p-2 text-xs rounded-xl border font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1 text-[var(--text)]">
                      Exam Session / Type
                    </label>
                    <select
                      value={uploadExamType}
                      onChange={(e) => setUploadExamType(e.target.value)}
                      className="sa-input w-full p-2 text-xs rounded-xl border font-medium cursor-pointer"
                    >
                      <option value="End-Sem">End-Sem (Final)</option>
                      <option value="In-Sem">In-Sem (Midterm)</option>
                      <option value="Unit-Test">Unit Test</option>
                      <option value="Prelim">Prelim</option>
                    </select>
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: "var(--line)" }}>
                  <button
                    type="button"
                    onClick={() => setIsUploadOpen(false)}
                    className="sa-btn-outline px-4 py-2 text-xs font-medium rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading || !uploadFile}
                    className="sa-btn-primary px-5 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs"
                  >
                    {isUploading ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Archiving Past Paper...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={14} />
                        <span>Upload to Exam Archive</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: PREDICT CONFIGURATION & RUNNER */}
      {/* ============================================================ */}
      {predictModalPaper && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div
            className="sa-card w-full max-w-lg max-h-[90vh] overflow-y-auto sa-scroll p-6 rounded-2xl border shadow-2xl space-y-5"
            style={{ background: "var(--surface)", borderColor: "var(--line)" }}
          >
            <div className="flex items-start justify-between pb-3 border-b" style={{ borderColor: "var(--line)" }}>
              <div>
                <h3 className="sa-serif text-lg font-bold flex items-center gap-2 text-[var(--text)]">
                  <Sparkles size={18} className="text-amber-500" />
                  <span>Predict Upcoming Examination Paper</span>
                </h3>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  Source: <strong className="text-[var(--text)] font-semibold">{predictModalPaper.filename}</strong>
                </p>
              </div>
              <button
                onClick={() => setPredictModalPaper(null)}
                className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-subtle)] transition-colors"
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold block mb-1 text-[var(--text)]">
                  Subject / Course Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Computer Networks"
                  value={predictConfig.subject_name}
                  onChange={(e) =>
                    setPredictConfig({ ...predictConfig, subject_name: e.target.value })
                  }
                  className="sa-input w-full p-2.5 text-xs rounded-xl border font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold block mb-1 text-[var(--text)]">
                    Target Examination Year
                  </label>
                  <input
                    type="number"
                    min="2024"
                    max="2035"
                    value={predictConfig.target_year}
                    onChange={(e) =>
                      setPredictConfig({
                        ...predictConfig,
                        target_year: parseInt(e.target.value) || 2025
                      })
                    }
                    className="sa-input w-full p-2.5 text-xs rounded-xl border font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1 text-[var(--text)]">
                    Total Marks
                  </label>
                  <select
                    value={predictConfig.total_marks}
                    onChange={(e) =>
                      setPredictConfig({
                        ...predictConfig,
                        total_marks: parseInt(e.target.value) || 70
                      })
                    }
                    className="sa-input w-full p-2.5 text-xs rounded-xl border font-medium cursor-pointer"
                  >
                    <option value={50}>50 Marks (Midterm / In-Sem)</option>
                    <option value={70}>70 Marks (University End-Sem)</option>
                    <option value={80}>80 Marks (Full Theory)</option>
                    <option value={100}>100 Marks (Comprehensive)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1 text-[var(--text)]">
                  Exam Rigor & Focus
                </label>
                <select
                  value={predictConfig.difficulty}
                  onChange={(e) =>
                    setPredictConfig({ ...predictConfig, difficulty: e.target.value })
                  }
                  className="sa-input w-full p-2.5 text-xs rounded-xl border font-medium cursor-pointer"
                >
                  <option value="medium">Balanced Standard (60% Conceptual, 40% Applied/Derivation)</option>
                  <option value="hard">Rigorous & Analytical (High focus on derivations, architectures & edge cases)</option>
                  <option value="practical">Problem-Solving & Case Studies (Numerical and design oriented)</option>
                </select>
              </div>

              <div
                className="p-3.5 rounded-xl border text-xs leading-relaxed space-y-1"
                style={{
                  background: "var(--accent-soft)",
                  borderColor: "var(--accent)",
                  color: "var(--accent-ink)"
                }}
              >
                <span className="font-semibold block">Independent Prediction Guarantee:</span>
                <p>
                  Questions will be synthesized strictly based on the question taxonomy, weight distribution,
                  and syllabus scope manifested in this uploaded past paper.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: "var(--line)" }}>
                <button
                  type="button"
                  onClick={() => setPredictModalPaper(null)}
                  className="sa-btn-outline px-4 py-2 text-xs font-medium rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGeneratePrediction}
                  disabled={isPredicting}
                  className="sa-btn-primary px-5 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs"
                >
                  {isPredicting ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Synthesizing Predicted Paper...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} />
                      <span>Generate Predicted Paper</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: INSPECT RAW EXTRACTED PAST PAPER TEXT */}
      {/* ============================================================ */}
      {inspectPaper && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div
            className="sa-card w-full max-w-2xl max-h-[85vh] flex flex-col p-6 rounded-2xl border shadow-2xl"
            style={{ background: "var(--surface)", borderColor: "var(--line)" }}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: "var(--line)" }}>
              <div>
                <h3 className="sa-serif font-bold text-base text-[var(--text)]">Extracted Past Paper Content</h3>
                <span className="text-xs text-[var(--muted)]">
                  {inspectPaper.filename} • {inspectPaper.year || "Previous Year"}
                </span>
              </div>
              <button
                onClick={() => setInspectPaper(null)}
                className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-subtle)] transition-colors"
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            <div
              className="flex-1 overflow-y-auto sa-scroll my-4 p-4 rounded-xl font-mono text-xs whitespace-pre-wrap leading-relaxed border"
              style={{
                background: "var(--surface-subtle)",
                color: "var(--text)",
                borderColor: "var(--line)"
              }}
            >
              {inspectPaper.extracted_text || inspectPaper.text_preview || "No selectable text was extracted."}
            </div>

            <div className="flex justify-end pt-2 border-t" style={{ borderColor: "var(--line)" }}>
              <button
                onClick={() => setInspectPaper(null)}
                className="sa-btn-outline px-4 py-1.5 text-xs font-medium rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
