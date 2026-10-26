import React, { useState, useRef } from "react";
import { FileUp, FileText, CheckCircle2, Circle } from "lucide-react";
import { ProgressBar } from "./UI";
import { uploadStudyDocument } from "../services/api";

function UploadPage({ go, showToast, accessToken, uploadParams }) {
  const [stage, setStage] = useState("idle"); // idle, processing, done, failed
  const [statusText, setStatusText] = useState("");
  const [fileData, setFileData] = useState(null);
  const fileInputRef = useRef(null);

  const startProcessing = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileData(file);
    setStage("processing");
    setStatusText("Uploading and parsing document...");

    try {
      const response = await uploadStudyDocument(file, accessToken, uploadParams);
      // Backend returns document object
      setStatusText("Generating flashcards and topics...");
      // For now the backend processes async in the background.
      // We will transition to "done".
      setTimeout(() => setStage("done"), 1500);
    } catch (err) {
      setStage("failed");
      showToast(err.message || "Upload failed.");
    }
  };

  return (
    <div className="sa-fade-in max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="sa-serif text-2xl font-semibold">Upload your study material</h2>
        <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>Upload PDFs, documents, presentations or notes and let AI analyze them.</p>
      </div>

      {stage === "idle" && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="sa-card sa-card-lg p-12 flex flex-col items-center justify-center text-center cursor-pointer"
          style={{ borderStyle: "dashed", borderWidth: 2, borderColor: "#CFCBBB" }}
        >
          <input ref={fileInputRef} type="file" className="hidden" onChange={startProcessing} />
          <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: "var(--accent-soft)" }}>
            <FileUp size={22} color="var(--accent-ink)" />
          </div>
          <p className="font-medium mb-1">Drag & drop your files here</p>
          <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>or</p>
          <button onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className="sa-btn-primary px-5 py-2.5 text-sm font-medium">Browse Files</button>
          <p className="text-xs mt-6" style={{ color: "var(--muted)" }}>Supported formats: PDF, DOCX, PPTX, TXT, JPG, PNG</p>
        </div>
      )}

      {(stage === "processing" || stage === "failed") && (
        <div className="sa-card sa-card-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "#EFEDE6" }}>
              <FileText size={18} color="var(--ink)" />
            </div>
            <div>
              <div className="text-sm font-medium">{fileData?.name}</div>
              <div className="text-xs" style={{ color: "var(--muted)" }}>{fileData ? (fileData.size / 1024 / 1024).toFixed(1) : 0} MB</div>
            </div>
          </div>
          <div className="space-y-3 mb-6">
             <div className="flex items-center gap-3">
               {stage === "processing" ? <div className="w-4 h-4 rounded-full border-2 flex-shrink-0" style={{ borderColor: "var(--accent)", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} /> : null}
               {stage === "failed" ? <Circle size={16} color="var(--danger)" /> : null}
               <span className="text-sm font-medium" style={{ color: "var(--text)" }}>{statusText || (stage === "failed" ? "Failed" : "Processing...")}</span>
             </div>
          </div>
          {stage === "processing" && <ProgressBar value={100} tone="accent" height={6} />}
          {stage === "failed" && (
            <div className="mt-4">
              <button onClick={() => setStage("idle")} className="sa-btn-outline px-5 py-2.5 text-sm font-medium">Try Again</button>
            </div>
          )}
        </div>
      )}

      {stage === "done" && (
        <div className="sa-card sa-card-lg p-8 text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "var(--success-soft)" }}>
            <CheckCircle2 size={24} color="var(--success)" />
          </div>
          <h3 className="sa-serif text-xl font-semibold mb-2">Upload complete</h3>
          <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>Your document is being processed. It will appear in your documents list shortly.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => go("documents")} className="sa-btn-outline px-5 py-2.5 text-sm font-medium">View Documents</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default UploadPage;
