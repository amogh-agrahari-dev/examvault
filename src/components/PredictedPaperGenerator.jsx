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
  CheckCircle2
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
      setSubjects(data || []);
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
      showToast(err.message || "Failed to load past examination papers");
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
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => go("subjects")}
              className="text-xs flex items-center gap-1 font-medium hover:underline"
              style={{ color: "var(--muted)" }}
            >
              <ArrowLeft size={14} /> Subjects Dashboard
            </button>
            <span style={{ color: "var(--muted)" }}>/</span>
            <span className="text-xs font-semibold" style={{ color: "var(--accent)" }}>
              Exam Paper Predictor
            </span>
          </div>
          <h1 className="sa-serif text-2xl md:text-3xl font-bold flex items-center gap-2.5">
            <Sparkles size={24} className="text-amber-500" />
            AI Question Paper Predictor
          </h1>
          <p className="text-xs md:text-sm mt-1" style={{ color: "var(--muted)" }}>
            Independent, pattern-grounded exam prediction derived solely from uploaded previous year papers.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {/* Subject Filter Dropdown */}
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="sa-input text-xs px-3 py-2 rounded-lg border font-medium cursor-pointer w-full sm:w-auto"
            style={{ minWidth: 140 }}
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
            className="sa-btn-outline flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg shadow-sm"
          >
            <FileText size={14} className="text-amber-500" />
            <span>From Documents</span>
          </button>

          <button
            onClick={() => {
              setModalMode("upload");
              setIsUploadOpen(true);
            }}
            className="sa-btn-primary flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg shadow-sm"
          >
            <Upload size={14} /> Upload Past Paper
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center border-b gap-2 no-print overflow-x-auto whitespace-nowrap sa-scroll flex-nowrap" style={{ borderColor: "var(--line)" }}>
        <button
          onClick={() => setActiveTab("papers")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "papers"
              ? "border-amber-500 font-semibold text-amber-600 dark:text-amber-400"
              : "border-transparent hover:border-gray-300"
          }`}
          style={{ color: activeTab === "papers" ? undefined : "var(--muted)" }}
        >
          <FolderLock size={16} /> Past Papers Archive ({pastPapers.length})
        </button>

        {currentPrediction && (
          <button
            onClick={() => setActiveTab("viewer")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "viewer"
                ? "border-amber-500 font-semibold text-amber-600 dark:text-amber-400"
                : "border-transparent hover:border-gray-300"
            }`}
            style={{ color: activeTab === "viewer" ? undefined : "var(--muted)" }}
          >
            <FileCheck2 size={16} /> Predicted Paper Viewer
          </button>
        )}

        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "history"
              ? "border-amber-500 font-semibold text-amber-600 dark:text-amber-400"
              : "border-transparent hover:border-gray-300"
          }`}
          style={{ color: activeTab === "history" ? undefined : "var(--muted)" }}
        >
          <Clock size={16} /> Prediction History ({predictedHistory.length})
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
              className="p-2.5 rounded-lg flex-shrink-0"
              style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}
            >
              <FolderLock size={20} />
            </div>
            <div className="text-xs leading-relaxed space-y-1">
              <span className="font-semibold text-sm block" style={{ color: "var(--text)" }}>
                Dedicated Isolated Exam Paper Filebase
              </span>
              <p style={{ color: "var(--muted)" }}>
                Past examination papers uploaded here are strictly stored in an isolated archive and are{" "}
                <strong style={{ color: "var(--text)" }}>never merged with your main study notes</strong>.
                When predicting an upcoming paper, the AI examines{" "}
                <strong style={{ color: "var(--text)" }}>only the uploaded previous paper</strong> and its
                inherent patterns — without relying on external topics or database notes.
              </p>
            </div>
          </div>

          {/* Past Papers List / Grid */}
          {loadingPapers ? (
            <div className="p-12 text-center text-sm" style={{ color: "var(--muted)" }}>
              <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-amber-500" />
              Loading isolated past papers archive...
            </div>
          ) : pastPapers.length === 0 ? (
            <div
              className="sa-card p-12 text-center rounded-2xl border-2 border-dashed flex flex-col items-center justify-center"
              style={{ borderColor: "var(--border-dashed)" }}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}
              >
                <FileUp size={28} />
              </div>
              <h3 className="sa-serif text-lg font-semibold mb-1">No Past Examination Papers Uploaded</h3>
              <p className="text-xs max-w-md mb-5" style={{ color: "var(--muted)" }}>
                Upload previous question papers (PDF, scanned images, DOCX) or select an existing document from
                your main library to predict the upcoming examination paper.
              </p>
              <div className="flex items-center gap-3 flex-wrap justify-center">
                <button
                  onClick={() => {
                    setModalMode("upload");
                    setIsUploadOpen(true);
                  }}
                  className="sa-btn-primary px-5 py-2.5 text-xs font-semibold rounded-lg flex items-center gap-1.5"
                >
                  <Upload size={14} /> Upload Exam Paper
                </button>
                <button
                  onClick={() => {
                    setModalMode("documents");
                    setIsUploadOpen(true);
                    fetchMainDocs();
                  }}
                  className="sa-btn-outline px-4 py-2.5 text-xs font-semibold rounded-lg flex items-center gap-1.5"
                >
                  <FileText size={14} className="text-amber-500" /> Select From My Documents
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {pastPapers.map((paper) => {
                const subObj = subjects.find((s) => s.id === paper.subject_id);
                return (
                  <div
                    key={paper.id}
                    className="sa-card p-5 rounded-xl border flex flex-col justify-between hover:shadow-md transition-all group"
                    style={{
                      background: "var(--surface)",
                      borderColor: "var(--line)"
                    }}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span
                          className="px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide"
                          style={{
                            background: "var(--accent-soft)",
                            color: "var(--accent-ink)"
                          }}
                        >
                          {paper.year ? `Year ${paper.year}` : "Previous Year"}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded text-[11px] font-medium"
                          style={{
                            background: "var(--chip-bg)",
                            color: "var(--chip-text)"
                          }}
                        >
                          {paper.exam_type || "Exam"}
                        </span>
                      </div>

                      {/* Paper Title */}
                      <div className="flex items-start gap-2.5 mb-2">
                        <FileText size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                        <h4 className="font-semibold text-sm line-clamp-2" style={{ color: "var(--text)" }}>
                          {paper.filename}
                        </h4>
                      </div>

                      {/* Subject Name if linked */}
                      {subObj && (
                        <div className="text-xs mb-2 font-medium" style={{ color: "var(--muted)" }}>
                          Subject: <span style={{ color: "var(--text)" }}>{subObj.name}</span>
                        </div>
                      )}

                      {/* Text Snippet Preview */}
                      {paper.text_preview && (
                        <p
                          className="text-xs line-clamp-3 p-2.5 rounded-lg mb-4 font-mono leading-relaxed"
                          style={{
                            background: "var(--surface-subtle)",
                            color: "var(--muted)"
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
                        <span>{paper.prediction_count} Predictions</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openPredictModal(paper)}
                          className="sa-btn-primary flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5"
                        >
                          <Sparkles size={13} /> Predict Paper
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
                          className="sa-btn-outline p-2 rounded-lg hover:border-red-500 hover:text-red-500"
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
            className="sa-card p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 no-print"
            style={{ background: "var(--surface)", borderColor: "var(--line)" }}
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">Exam Actions:</span>
              <span
                className="px-2 py-0.5 rounded text-xs font-medium"
                style={{ background: "var(--chip-bg)", color: "var(--chip-text)" }}
              >
                Target Year: {currentPrediction.target_year || 2025}
              </span>
              <span
                className="px-2 py-0.5 rounded text-xs font-medium"
                style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}
              >
                Max Marks: {currentPrediction.total_marks || 70}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrintPaper}
                className="sa-btn-outline flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg"
              >
                <Printer size={14} /> Print / Save PDF
              </button>
              <button
                onClick={handleCopyPaper}
                className="sa-btn-outline flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg"
              >
                {copiedText ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                {copiedText ? "Copied" : "Copy Paper"}
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
                className="sa-btn-outline flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg"
              >
                Export JSON
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
              <span className="font-semibold text-xs block mb-1 flex items-center gap-1.5" style={{ color: "var(--accent-ink)" }}>
                <Sparkles size={14} /> Pattern Rationale & Synthesis Scope:
              </span>
              <p style={{ color: "var(--muted)" }}>{currentPrediction.summary_analysis}</p>
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
              <div className="uppercase tracking-widest text-xs font-sans font-bold" style={{ color: "var(--muted)" }}>
                Examination Board & University Assessment
              </div>
              <h2 className="text-xl md:text-2xl font-bold uppercase tracking-wide" style={{ color: "var(--text)" }}>
                {currentPrediction.exam_title || `Examination Paper — ${currentPrediction.target_year || 2025}`}
              </h2>
              <div className="text-base md:text-lg font-semibold font-sans uppercase" style={{ color: "var(--accent-ink)" }}>
                {currentPrediction.subject_name || "Academic Subject"}
              </div>

              {/* Time & Marks Metadata Row */}
              <div
                className="flex justify-between items-center text-xs md:text-sm font-sans font-semibold pt-3 px-2 border-t"
                style={{ borderColor: "var(--line)", color: "var(--text)" }}
              >
                <span>[Time Allowed: {Math.floor((currentPrediction.duration_minutes || 180) / 60)} Hours]</span>
                <span>[Total Sections: {(currentPrediction.sections || []).length}]</span>
                <span>[Maximum Marks: {currentPrediction.total_marks || 70}]</span>
              </div>
            </div>

            {/* Instructions to Candidates */}
            <div
              className="p-4 rounded-lg text-xs md:text-sm font-sans space-y-1.5"
              style={{ background: "var(--surface-subtle)" }}
            >
              <span className="font-bold tracking-wide uppercase block mb-1">
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
                <div key={idx} className="leading-snug text-xs" style={{ color: "var(--muted)" }}>
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
                    <h3 className="font-sans font-bold text-base md:text-lg uppercase tracking-wider" style={{ color: "var(--text)" }}>
                      {sec.section_name || `SECTION ${sIdx + 1}`}
                    </h3>
                    {sec.description && (
                      <p className="font-sans text-xs italic" style={{ color: "var(--muted)" }}>
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
                            <div className="font-sans font-bold text-sm tracking-wide" style={{ color: "var(--text)" }}>
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
                                        <span className="font-sans font-semibold text-xs mt-0.5" style={{ color: "var(--text)" }}>
                                          [{sub.sub_id || String.fromCharCode(97 + subIdx)}]
                                        </span>
                                        <div className="flex-1 font-serif">
                                          <FormattedText text={sub.text} />
                                        </div>
                                      </div>
                                      <span
                                        className="font-sans font-bold text-xs px-2 py-0.5 rounded flex-shrink-0"
                                        style={{ background: "var(--chip-bg)", color: "var(--chip-text)" }}
                                      >
                                        [{sub.marks || 7}]
                                      </span>
                                    </div>

                                    {/* Model Answer Toggle (no print) */}
                                    {(sub.model_answer || sub.marking_breakdown) && (
                                      <div className="no-print pl-6">
                                        <button
                                          onClick={() => toggleAnswer(subKey)}
                                          className="text-[11px] font-sans font-semibold flex items-center gap-1 hover:underline"
                                          style={{ color: "var(--accent)" }}
                                        >
                                          {isExp ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                          {isExp ? "Hide Model Answer & Marking Scheme" : "View Model Answer & Scheme"}
                                        </button>

                                        {isExp && (
                                          <div
                                            className="mt-2 p-3.5 rounded-lg border font-sans text-xs space-y-2.5 sa-fade-in"
                                            style={{
                                              background: "var(--surface-subtle)",
                                              borderColor: "var(--line)"
                                            }}
                                          >
                                            {sub.cognitive_level && (
                                              <div className="flex items-center gap-2">
                                                <span className="font-semibold text-[11px]" style={{ color: "var(--muted)" }}>
                                                  Cognitive Domain:
                                                </span>
                                                <span
                                                  className="px-2 py-0.5 rounded text-[10px] font-semibold"
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
                                                <div className="whitespace-pre-wrap leading-relaxed mt-1" style={{ color: "var(--text)" }}>
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
                                  className="relative px-4 py-1 text-xs font-sans font-bold tracking-widest uppercase rounded border"
                                  style={{
                                    background: "var(--surface)",
                                    borderColor: "var(--line)",
                                    color: "var(--muted)"
                                  }}
                                >
                                  OR
                                </span>
                              </div>

                              <div className="font-sans font-bold text-sm tracking-wide" style={{ color: "var(--text)" }}>
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
                                          <span className="font-sans font-semibold text-xs mt-0.5" style={{ color: "var(--text)" }}>
                                            [{sub.sub_id || String.fromCharCode(97 + subIdx)}]
                                          </span>
                                          <div className="flex-1 font-serif">
                                            <FormattedText text={sub.text} />
                                          </div>
                                        </div>
                                        <span
                                          className="font-sans font-bold text-xs px-2 py-0.5 rounded flex-shrink-0"
                                          style={{ background: "var(--chip-bg)", color: "var(--chip-text)" }}
                                        >
                                          [{sub.marks || 7}]
                                        </span>
                                      </div>

                                      {/* Model Answer Toggle (no print) */}
                                      {(sub.model_answer || sub.marking_breakdown) && (
                                        <div className="no-print pl-6">
                                          <button
                                            onClick={() => toggleAnswer(subKey)}
                                            className="text-[11px] font-sans font-semibold flex items-center gap-1 hover:underline"
                                            style={{ color: "var(--accent)" }}
                                          >
                                            {isExp ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                            {isExp ? "Hide Model Answer & Marking Scheme" : "View Model Answer & Scheme"}
                                          </button>

                                          {isExp && (
                                            <div
                                              className="mt-2 p-3.5 rounded-lg border font-sans text-xs space-y-2.5 sa-fade-in"
                                              style={{
                                                background: "var(--surface-subtle)",
                                                borderColor: "var(--line)"
                                              }}
                                            >
                                              {sub.cognitive_level && (
                                                <div className="flex items-center gap-2">
                                                  <span className="font-semibold text-[11px]" style={{ color: "var(--muted)" }}>
                                                    Cognitive Domain:
                                                  </span>
                                                  <span
                                                    className="px-2 py-0.5 rounded text-[10px] font-semibold"
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
                                                  <div className="whitespace-pre-wrap leading-relaxed mt-1" style={{ color: "var(--text)" }}>
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
            <div className="text-center pt-8 border-t font-sans text-xs font-semibold tracking-widest uppercase" style={{ borderColor: "var(--text)", color: "var(--muted)" }}>
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
            <div className="p-12 text-center text-sm" style={{ color: "var(--muted)" }}>
              <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-amber-500" />
              Loading prediction archives...
            </div>
          ) : predictedHistory.length === 0 ? (
            <div
              className="sa-card p-12 text-center rounded-2xl border flex flex-col items-center justify-center"
              style={{ background: "var(--surface)", borderColor: "var(--line)" }}
            >
              <Award size={32} className="text-amber-500 mb-3" />
              <h3 className="font-semibold text-base mb-1">No Saved Predicted Papers Yet</h3>
              <p className="text-xs max-w-sm" style={{ color: "var(--muted)" }}>
                When you predict an exam paper from an uploaded previous paper, it will be automatically saved here for quick revision.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {predictedHistory.map((pred) => (
                <div
                  key={pred.id}
                  onClick={() => handleLoadPredictedPaper(pred.id)}
                  className="sa-card p-4 rounded-xl border flex items-center justify-between cursor-pointer hover:border-amber-500 transition-colors"
                  style={{ background: "var(--surface)", borderColor: "var(--line)" }}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm" style={{ color: "var(--text)" }}>
                        {pred.title}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded text-[11px] font-medium"
                        style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}
                      >
                        {pred.target_year || 2025}
                      </span>
                    </div>
                    <div className="text-xs flex items-center gap-3" style={{ color: "var(--muted)" }}>
                      <span>Course: {pred.subject_name || "General"}</span>
                      <span>•</span>
                      <span>Marks: {pred.total_marks || 70}</span>
                      <span>•</span>
                      <span>{pred.created_at ? new Date(pred.created_at).toLocaleDateString() : ""}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLoadPredictedPaper(pred.id);
                      }}
                      className="sa-btn-primary px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1"
                    >
                      <Eye size={13} /> Open Paper
                    </button>
                    <button
                      onClick={(e) => handleDeletePredicted(pred.id, e)}
                      className="sa-btn-outline p-1.5 rounded-lg hover:border-red-500 hover:text-red-500"
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
            className="sa-card w-full max-w-lg p-6 rounded-2xl border shadow-2xl space-y-4"
            style={{ background: "var(--surface)", borderColor: "var(--line)" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="sa-serif text-lg font-bold flex items-center gap-2">
                  <FolderLock size={18} className="text-amber-500" />
                  {modalMode === "documents" ? "Select Resource From My Documents" : "Upload Examination Paper"}
                </h3>
                <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                  {modalMode === "documents"
                    ? "Select an existing file from your main filebase to predict the question paper."
                    : "Upload a past paper or scanned exam copy into the dedicated exam archive."}
                </p>
              </div>
              <button
                onClick={() => setIsUploadOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div
              className="flex rounded-lg p-1 border gap-1"
              style={{ background: "var(--input-bg)", borderColor: "var(--line)" }}
            >
              <button
                type="button"
                onClick={() => setModalMode("upload")}
                className="flex-1 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-all"
                style={{
                  background: modalMode === "upload" ? "var(--surface)" : "transparent",
                  color: modalMode === "upload" ? "var(--text)" : "var(--muted)",
                  boxShadow: modalMode === "upload" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
                }}
              >
                <Upload size={13} className={modalMode === "upload" ? "text-amber-500" : ""} />
                Upload Exam File
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalMode("documents");
                  if (mainDocs.length === 0) fetchMainDocs();
                }}
                className="flex-1 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-all"
                style={{
                  background: modalMode === "documents" ? "var(--surface)" : "transparent",
                  color: modalMode === "documents" ? "var(--text)" : "var(--muted)",
                  boxShadow: modalMode === "documents" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
                }}
              >
                <FileText size={13} className={modalMode === "documents" ? "text-amber-500" : ""} />
                Choose From My Documents ({mainDocs.length})
              </button>
            </div>

            {modalMode === "documents" ? (
              /* ============================================================ */
              /* OPTION B: SELECT FROM MAIN FILEBASE DOCUMENTS                */
              /* ============================================================ */
              <form onSubmit={handleImportDocument} className="space-y-4">
                {/* Search Filter */}
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs"
                  style={{ background: "var(--input-bg)", borderColor: "var(--line)" }}
                >
                  <Search size={14} style={{ color: "var(--muted)" }} />
                  <input
                    type="text"
                    value={mainDocSearch}
                    onChange={(e) => setMainDocSearch(e.target.value)}
                    placeholder="Search documents by filename..."
                    className="bg-transparent outline-none w-full text-xs"
                    style={{ color: "var(--text)" }}
                  />
                  {mainDocSearch && (
                    <button
                      type="button"
                      onClick={() => setMainDocSearch("")}
                      className="text-gray-400 hover:text-gray-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Documents List */}
                <div
                  className="max-h-56 overflow-y-auto space-y-2 pr-1 rounded-xl border p-2"
                  style={{ background: "var(--surface-subtle)", borderColor: "var(--line)" }}
                >
                  {loadingMainDocs ? (
                    <div className="py-8 text-center text-xs" style={{ color: "var(--muted)" }}>
                      <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-amber-500" />
                      Loading documents from your main library...
                    </div>
                  ) : mainDocs.length === 0 ? (
                    <div className="py-8 text-center text-xs" style={{ color: "var(--muted)" }}>
                      <BookOpen size={20} className="mx-auto mb-2 opacity-40" />
                      No documents found in your main library.
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
                                ? "border-amber-500 shadow-sm ring-1 ring-amber-500/50"
                                : "hover:border-gray-400"
                            }`}
                            style={{
                              background: isSelected ? "var(--accent-soft)" : "var(--surface)",
                              borderColor: isSelected ? "var(--accent)" : "var(--line)"
                            }}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{
                                  background: isSelected ? "var(--accent)" : "var(--chip-bg)",
                                  color: isSelected ? "#fff" : "var(--accent-ink)"
                                }}
                              >
                                <FileText size={15} />
                              </div>
                              <div className="min-w-0">
                                <span
                                  className="font-semibold text-xs block truncate"
                                  style={{ color: "var(--text)" }}
                                  title={doc.filename}
                                >
                                  {doc.filename}
                                </span>
                                <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--muted)" }}>
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

                            <div className="flex-shrink-0">
                              {isSelected ? (
                                <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center">
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
                    <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text)" }}>
                      Target Exam Year
                    </label>
                    <input
                      type="number"
                      min="1990"
                      max="2030"
                      value={uploadYear}
                      onChange={(e) => setUploadYear(parseInt(e.target.value) || 2026)}
                      className="sa-input w-full p-2 text-xs rounded-lg border"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text)" }}>
                      Exam Session / Type
                    </label>
                    <select
                      value={uploadExamType}
                      onChange={(e) => setUploadExamType(e.target.value)}
                      className="sa-input w-full p-2 text-xs rounded-lg border font-medium"
                    >
                      <option value="End-Sem">End-Sem (Final)</option>
                      <option value="In-Sem">In-Sem (Midterm)</option>
                      <option value="Unit-Test">Unit Test</option>
                      <option value="Prelim">Prelim</option>
                    </select>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsUploadOpen(false)}
                    className="sa-btn-outline px-4 py-2 text-xs font-medium rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isImporting || !selectedMainDocId}
                    className="sa-btn-primary px-5 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5"
                  >
                    {isImporting ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        Setting Resource...
                      </>
                    ) : (
                      <>
                        <Sparkles size={13} />
                        Select & Predict Paper
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
                  className="p-6 border-2 border-dashed rounded-xl text-center cursor-pointer transition-colors flex flex-col items-center justify-center"
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
                      <span className="font-semibold text-xs block text-amber-800 dark:text-amber-200">
                        {uploadFile.name}
                      </span>
                      <span className="text-[11px]" style={{ color: "var(--muted)" }}>
                        {(uploadFile.size / 1024 / 1024).toFixed(2)} MB • Ready to archive
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="font-semibold text-xs block" style={{ color: "var(--text)" }}>
                        Click to choose or drag & drop past paper
                      </span>
                      <span className="text-[11px]" style={{ color: "var(--muted)" }}>
                        Supports PDF, DOCX, TXT, or scanned image exam sheets
                      </span>
                    </div>
                  )}
                </div>

                {/* Subject selector */}
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text)" }}>
                    Link to Subject
                  </label>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="sa-input w-full p-2 text-xs rounded-lg border font-medium"
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
                    <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text)" }}>
                      Paper Year
                    </label>
                    <input
                      type="number"
                      min="1990"
                      max="2030"
                      value={uploadYear}
                      onChange={(e) => setUploadYear(parseInt(e.target.value) || 2024)}
                      className="sa-input w-full p-2 text-xs rounded-lg border"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text)" }}>
                      Exam Session / Type
                    </label>
                    <select
                      value={uploadExamType}
                      onChange={(e) => setUploadExamType(e.target.value)}
                      className="sa-input w-full p-2 text-xs rounded-lg border font-medium"
                    >
                      <option value="End-Sem">End-Sem (Final)</option>
                      <option value="In-Sem">In-Sem (Midterm)</option>
                      <option value="Unit-Test">Unit Test</option>
                      <option value="Prelim">Prelim</option>
                    </select>
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsUploadOpen(false)}
                    className="sa-btn-outline px-4 py-2 text-xs font-medium rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading || !uploadFile}
                    className="sa-btn-primary px-5 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5"
                  >
                    {isUploading ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        Archiving Past Paper...
                      </>
                    ) : (
                      "Upload to Exam Archive"
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
            className="sa-card w-full max-w-lg p-6 rounded-2xl border shadow-2xl space-y-5"
            style={{ background: "var(--surface)", borderColor: "var(--line)" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="sa-serif text-lg font-bold flex items-center gap-2">
                  <Sparkles size={18} className="text-amber-500" />
                  Predict Upcoming Examination Paper
                </h3>
                <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                  Source: <strong style={{ color: "var(--text)" }}>{predictModalPaper.filename}</strong>
                </p>
              </div>
              <button
                onClick={() => setPredictModalPaper(null)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text)" }}>
                  Subject / Course Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Computer Networks"
                  value={predictConfig.subject_name}
                  onChange={(e) =>
                    setPredictConfig({ ...predictConfig, subject_name: e.target.value })
                  }
                  className="sa-input w-full p-2 text-xs rounded-lg border font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text)" }}>
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
                    className="sa-input w-full p-2 text-xs rounded-lg border font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text)" }}>
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
                    className="sa-input w-full p-2 text-xs rounded-lg border font-medium"
                  >
                    <option value={50}>50 Marks (Midterm / In-Sem)</option>
                    <option value={70}>70 Marks (University End-Sem)</option>
                    <option value={80}>80 Marks (Full Theory)</option>
                    <option value={100}>100 Marks (Comprehensive)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text)" }}>
                  Exam Rigor & Focus
                </label>
                <select
                  value={predictConfig.difficulty}
                  onChange={(e) =>
                    setPredictConfig({ ...predictConfig, difficulty: e.target.value })
                  }
                  className="sa-input w-full p-2 text-xs rounded-lg border font-medium"
                >
                  <option value="medium">Balanced Standard (60% Conceptual, 40% Applied/Derivation)</option>
                  <option value="hard">Rigorous & Analytical (High focus on derivations, architectures & edge cases)</option>
                  <option value="practical">Problem-Solving & Case Studies (Numerical and design oriented)</option>
                </select>
              </div>

              <div
                className="p-3.5 rounded-lg border text-xs leading-relaxed space-y-1"
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

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPredictModalPaper(null)}
                  className="sa-btn-outline px-4 py-2 text-xs font-medium rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGeneratePrediction}
                  disabled={isPredicting}
                  className="sa-btn-primary px-5 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5"
                >
                  {isPredicting ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      Synthesizing Predicted Paper...
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} />
                      Generate Predicted Paper
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
            className="sa-card w-full max-w-2xl max-h-[80vh] flex flex-col p-6 rounded-2xl border shadow-2xl"
            style={{ background: "var(--surface)", borderColor: "var(--line)" }}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: "var(--line)" }}>
              <div>
                <h3 className="font-bold text-sm">Extracted Past Paper Content</h3>
                <span className="text-xs" style={{ color: "var(--muted)" }}>
                  {inspectPaper.filename} • {inspectPaper.year || "Previous Year"}
                </span>
              </div>
              <button
                onClick={() => setInspectPaper(null)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div
              className="flex-1 overflow-y-auto sa-scroll my-4 p-4 rounded-lg font-mono text-xs whitespace-pre-wrap leading-relaxed"
              style={{
                background: "var(--surface-subtle)",
                color: "var(--text)"
              }}
            >
              {inspectPaper.extracted_text || inspectPaper.text_preview || "No selectable text was extracted."}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setInspectPaper(null)}
                className="sa-btn-outline px-4 py-1.5 text-xs font-medium rounded-lg"
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
