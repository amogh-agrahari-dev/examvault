import React, { useState, useRef } from "react";
import { FileUp, FileText, CheckCircle2, AlertCircle, ArrowRight, RefreshCw, UploadCloud } from "lucide-react";
import { ProgressBar } from "./UI";
import { uploadStudyDocument } from "../services/api";
import { formatFileSize } from "../utils/formatters";

function UploadPage({ go, showToast, accessToken, uploadParams }) {
  const [stage, setStage] = useState("idle"); // idle, processing, done, failed
  const [statusText, setStatusText] = useState("");
  const [fileData, setFileData] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef(null);

  const processFile = async (file) => {
    if (!file) return;

    setFileData(file);
    setStage("processing");
    setErrorMessage("");
    setStatusText("Uploading and parsing document contents...");

    try {
      await uploadStudyDocument(file, accessToken, uploadParams);
      setStatusText("Generating curriculum topics and initial flashcards...");
      setTimeout(() => setStage("done"), 1200);
    } catch (err) {
      setStage("failed");
      const msg = err.message || "Failed to process the uploaded document.";
      setErrorMessage(msg);
      showToast(msg);
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  return (
    <div className="sa-fade-in max-w-2xl mx-auto py-4 sm:py-8">
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="sa-serif text-2xl sm:text-3xl font-bold text-[var(--text)]">Upload Study Material</h2>
        <p className="text-xs sm:text-sm mt-1.5 text-[var(--muted)] max-w-md mx-auto">
          Upload syllabi, lecture slides, presentations, or handwritten notes for automated topic indexing and quiz generation.
        </p>
      </div>

      {stage === "idle" && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`sa-card sa-card-lg p-8 sm:p-14 flex flex-col items-center justify-center text-center cursor-pointer transition-all border-2 border-dashed ${
            isDragging 
              ? "border-[var(--accent)] bg-[var(--accent-soft)]/20 scale-[1.01]" 
              : "hover:border-[var(--accent)] hover:bg-[var(--surface-subtle)]"
          }`}
          style={{ borderColor: isDragging ? "var(--accent)" : "var(--border-dashed)" }}
          aria-label="Upload document dropzone. Click to browse files or drag and drop here."
        >
          <input 
            ref={fileInputRef} 
            type="file" 
            className="hidden" 
            onChange={handleFileInputChange}
            accept=".pdf,.docx,.pptx,.txt,.png,.jpg,.jpeg"
          />
          <div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-105" 
            style={{ background: "var(--accent-soft)" }}
          >
            <UploadCloud size={28} color="var(--accent-ink)" />
          </div>
          <p className="font-semibold text-base sm:text-lg mb-1 text-[var(--text)]">
            {isDragging ? "Drop your file to begin upload" : "Drag & drop study files here"}
          </p>
          <p className="text-xs sm:text-sm mb-4 text-[var(--muted)]">or select a file from your computer</p>
          <button 
            type="button" 
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} 
            className="sa-btn-primary px-5 py-2.5 text-xs sm:text-sm font-semibold shadow-xs"
          >
            Browse Files
          </button>
          <p className="text-[11px] mt-6 text-[var(--muted)]">
            Supported formats: PDF, DOCX, PPTX, TXT, PNG, JPG (up to 50 MB)
          </p>
        </div>
      )}

      {(stage === "processing" || stage === "failed") && (
        <div className="sa-card sa-card-lg p-6 sm:p-8">
          <div className="flex items-center gap-3.5 mb-6">
            <div 
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" 
              style={{ background: "var(--chip-bg)" }}
            >
              <FileText size={20} className="text-[var(--accent)]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate text-[var(--text)]">{fileData?.name}</div>
              <div className="text-xs text-[var(--muted)] mt-0.5">{formatFileSize(fileData?.size)}</div>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3">
              {stage === "processing" ? (
                <div 
                  className="w-4 h-4 rounded-full border-2 shrink-0 animate-spin" 
                  style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} 
                />
              ) : null}
              {stage === "failed" ? (
                <AlertCircle size={18} className="text-rose-500 shrink-0" />
              ) : null}
              <span className="text-sm font-medium text-[var(--text)]">
                {stage === "failed" ? (errorMessage || "Upload could not be completed.") : statusText}
              </span>
            </div>
          </div>

          {stage === "processing" && <ProgressBar value={100} tone="accent" height={6} />}
          
          {stage === "failed" && (
            <div className="mt-5 flex gap-2.5">
              <button 
                type="button"
                onClick={() => setStage("idle")} 
                className="sa-btn-outline px-4 py-2 text-xs sm:text-sm font-semibold flex items-center gap-1.5"
              >
                <RefreshCw size={14} />
                <span>Try Another File</span>
              </button>
              <button
                type="button"
                onClick={() => go("documents")}
                className="sa-btn-outline px-4 py-2 text-xs sm:text-sm font-semibold"
              >
                Go to Documents
              </button>
            </div>
          )}
        </div>
      )}

      {stage === "done" && (
        <div className="sa-card sa-card-lg p-6 sm:p-10 text-center">
          <div 
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" 
            style={{ background: "var(--success-soft)" }}
          >
            <CheckCircle2 size={28} color="var(--success)" />
          </div>
          <h3 className="sa-serif text-xl sm:text-2xl font-bold mb-2 text-[var(--text)]">Upload Complete</h3>
          <p className="text-xs sm:text-sm mb-6 text-[var(--muted)] max-w-sm mx-auto leading-relaxed">
            Your document has been parsed and is now indexing syllabus topics, generating flashcards, and extracting key concepts.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button 
              type="button"
              onClick={() => go("documents")} 
              className="sa-btn-primary px-5 py-2.5 text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-xs"
            >
              <span>View In My Documents</span>
              <ArrowRight size={14} />
            </button>
            <button 
              type="button"
              onClick={() => setStage("idle")} 
              className="sa-btn-outline px-4 py-2.5 text-xs sm:text-sm font-semibold"
            >
              Upload Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default UploadPage;
