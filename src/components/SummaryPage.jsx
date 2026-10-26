import React, { useState, useEffect } from "react";
import { 
  Zap, BookOpen, Upload, FileText, CheckCircle2, 
  Circle, ChevronRight, ChevronDown, Loader, Sparkles, Download, ArrowLeft
} from "lucide-react";
import { 
  getDocuments, discoverSummaryTopics, generateSummaryJob, 
  getSummaryJobStatus, getSummaries, getSummary 
} from "../services/api";
import { EmptyState, ProgressBar, Badge } from "./UI";
import MathRenderer, { LatexBlock, FormattedText } from "./MathRenderer";

function SummaryPage({ go, accessToken, showToast }) {
  const [view, setView] = useState("list"); // list, generator, reading
  
  // List state
  const [summaries, setSummaries] = useState([]);
  const [loadingSummaries, setLoadingSummaries] = useState(true);
  
  // Reading state
  const [activeSummary, setActiveSummary] = useState(null);

  // Generator state
  const [docs, setDocs] = useState([]);
  const [selectedDocIds, setSelectedDocIds] = useState(new Set());
  const [discovering, setDiscovering] = useState(false);
  const [discoveredTree, setDiscoveredTree] = useState(null);
  const [selectedTopics, setSelectedTopics] = useState(new Set());
  const [jobId, setJobId] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [jobStatus, setJobStatus] = useState(null);
  
  // ETA states
  const [jobStartTime, setJobStartTime] = useState(null);
  const [estimatedTimeLeft, setEstimatedTimeLeft] = useState(null);

  // On mount, check if there's an active job in local storage
  useEffect(() => {
    const savedJobId = localStorage.getItem("activeSummaryJobId");
    const savedStartTime = localStorage.getItem("activeSummaryJobStartTime");
    if (savedJobId) {
      setJobId(savedJobId);
      setGenerating(true);
      if (savedStartTime) setJobStartTime(parseInt(savedStartTime, 10));
      setView("generator");
    }
  }, []);

  // Fetch summaries on mount or view change
  useEffect(() => {
    if (view === "list" && accessToken) {
      setLoadingSummaries(true);
      getSummaries(accessToken)
        .then(res => setSummaries(res.summaries || []))
        .catch(err => console.warn(err))
        .finally(() => setLoadingSummaries(false));
    }
  }, [view, accessToken]);

  // Load docs for generator
  useEffect(() => {
    if (view === "generator" && accessToken) {
      getDocuments(accessToken).then(res => {
        setDocs((res.documents || []).filter(d => d.status === "completed"));
      });
    }
  }, [view, accessToken]);

  // Poll job status
  useEffect(() => {
    let interval;
    if (generating && jobId) {
      interval = setInterval(() => {
        getSummaryJobStatus(jobId, accessToken)
          .then(res => {
            setJobStatus(res);
            
            // ETA Calculation
            if (res.progress > 0 && res.status !== "completed" && jobStartTime) {
              const elapsedMs = Date.now() - jobStartTime;
              const progressFraction = res.progress / 100;
              const totalEstMs = elapsedMs / progressFraction;
              const remainingMs = totalEstMs - elapsedMs;
              
              if (remainingMs > 0) {
                const remainingMinutes = Math.floor(remainingMs / 60000);
                const remainingSeconds = Math.floor((remainingMs % 60000) / 1000);
                if (remainingMinutes > 0) {
                  setEstimatedTimeLeft(`~${remainingMinutes}m ${remainingSeconds}s remaining`);
                } else {
                  setEstimatedTimeLeft(`~${remainingSeconds}s remaining`);
                }
              } else {
                setEstimatedTimeLeft("Almost done...");
              }
            }

            if (res.status === "completed") {
              setGenerating(false);
              setEstimatedTimeLeft(null);
              localStorage.removeItem("activeSummaryJobId");
              localStorage.removeItem("activeSummaryJobStartTime");
              showToast("Summaries generated successfully!", "success");
              setView("list");
            } else if (res.status === "failed") {
              setGenerating(false);
              setEstimatedTimeLeft(null);
              localStorage.removeItem("activeSummaryJobId");
              localStorage.removeItem("activeSummaryJobStartTime");
              showToast("Generation failed: " + (res.error_details || "Unknown error"), "error");
            }
          })
          .catch(err => {
            console.warn(err);
            setGenerating(false);
          });
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [generating, jobId, accessToken, showToast, jobStartTime]);

  const toggleDoc = (id) => {
    const next = new Set(selectedDocIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedDocIds(next);
  };

  const toggleTopic = (topicName) => {
    const next = new Set(selectedTopics);
    if (next.has(topicName)) next.delete(topicName);
    else next.add(topicName);
    setSelectedTopics(next);
  };

  const handleDiscover = async () => {
    if (selectedDocIds.size === 0) return;
    setDiscovering(true);
    try {
      const res = await discoverSummaryTopics({ document_ids: Array.from(selectedDocIds) }, accessToken);
      setJobId(res.job_id);
      setDiscoveredTree(res.discovered_topics);
      
      // Auto-select all discovered topics
      const allNames = new Set();
      (res.discovered_topics.tree || []).forEach(t => allNames.add(t.name));
      setSelectedTopics(allNames);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setDiscovering(false);
    }
  };

  const handleGenerate = async () => {
    if (selectedTopics.size === 0 || !jobId) return;
    const startTime = Date.now();
    setGenerating(true);
    setJobStartTime(startTime);
    setEstimatedTimeLeft("Calculating ETA...");
    
    localStorage.setItem("activeSummaryJobId", jobId);
    localStorage.setItem("activeSummaryJobStartTime", startTime.toString());
    
    // Filter tree to only selected
    const filteredTree = (discoveredTree.tree || []).filter(t => selectedTopics.has(t.name));
    
    try {
      await generateSummaryJob(jobId, { selected_topics: { tree: filteredTree } }, accessToken);
    } catch (err) {
      showToast(err.message, "error");
      setGenerating(false);
      setEstimatedTimeLeft(null);
    }
  };

  const handleExport = () => {
    if (!activeSummary) return;
    const content = activeSummary.content || {};
    let md = `# ${activeSummary.topic_name}\n\n`;
    if (content.overview) md += `## Overview\n${content.overview}\n\n`;
    if (content.prerequisites && content.prerequisites.length > 0) {
      md += `## Prerequisites\n${content.prerequisites.map(p => `- ${p}`).join("\n")}\n\n`;
    }
    if (content.core_concepts) {
      md += `## Core Concepts\n`;
      content.core_concepts.forEach(c => {
        md += `### ${c.heading}\n${c.explanation}\n\n`;
      });
    }
    if (content.formulas && content.formulas.length > 0) {
      md += `## Formulas\n`;
      content.formulas.forEach(f => {
        md += `**Equation**: $$ ${f.equation_latex} $$\n**Variables**: ${f.variables}\n**Explanation**: ${f.explanation}\n\n`;
      });
    }
    if (content.algorithms_processes) md += `## Processes\n${content.algorithms_processes}\n\n`;
    if (content.examples && content.examples.length > 0) {
      md += `## Worked Examples\n`;
      content.examples.forEach((ex, i) => {
        md += `### Example ${i+1}\n**Problem**: ${ex.problem}\n**Solution**: ${ex.solution}\n\n`;
      });
    }
    if (content.revision_sheet && content.revision_sheet.length > 0) {
      md += `## Quick Revision Sheet\n${content.revision_sheet.map(r => `- ${r}`).join("\n")}\n\n`;
    }

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeSummary.topic_name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_summary.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderReadingView = () => {
    if (!activeSummary) return null;
    const content = activeSummary.content || {};
    
    return (
      <div className="sa-fade-in max-w-4xl mx-auto pb-12">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setView("list")} className="flex items-center gap-1.5 text-xs font-semibold hover:underline" style={{ color: "var(--muted)" }}>
            <ArrowLeft size={14} /> Back to Summaries
          </button>
          <button onClick={handleExport} className="sa-btn-outline px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5">
            <Download size={14} /> Export MD
          </button>
        </div>
        
        <div className="sa-card p-4 sm:p-8 md:p-10">
          <div className="mb-8 border-b pb-6" style={{ borderColor: "var(--line)" }}>
            <h1 className="sa-serif text-3xl font-bold mb-2">{activeSummary.topic_name}</h1>
            <div className="flex items-center gap-2 text-xs" style={{ color: "var(--muted)" }}>
              <span>Generated with {activeSummary.generation_model || "Gemma 2 9B"}</span>
              <span>•</span>
              <span>{new Date(activeSummary.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          
          {content.overview && (
            <div className="mb-8">
              <h3 className="text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: "var(--accent)" }}>
                <Zap size={16} /> Overview
              </h3>
              <div className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
                <MathRenderer content={content.overview} />
              </div>
            </div>
          )}
          
          {content.prerequisites && content.prerequisites.length > 0 && (
            <div className="mb-8 p-4 rounded-xl border" style={{ background: "var(--surface-subtle)", borderColor: "var(--line)" }}>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text)" }}>Prerequisites</h3>
              <ul className="list-disc pl-5 text-sm space-y-1" style={{ color: "var(--muted)" }}>
                {content.prerequisites.map((p, i) => (
                  <li key={i}>
                    <FormattedText text={p} inline />
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {content.core_concepts && content.core_concepts.map((concept, i) => (
            <div key={i} className="mb-8">
              <h3 className="text-lg font-bold mb-2">
                <FormattedText text={concept.heading} inline />
              </h3>
              <div className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
                <MathRenderer content={concept.explanation} />
              </div>
            </div>
          ))}
          
          {content.formulas && content.formulas.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-bold uppercase tracking-wider mb-4 border-b pb-2" style={{ borderColor: "var(--line)", color: "var(--text)" }}>
                Formulas & Derivations
              </h3>
              <div className="space-y-4">
                {content.formulas.map((f, i) => (
                  <div key={i} className="p-5 rounded-xl border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "var(--line)" }}>
                    <LatexBlock formula={f.equation_latex} />
                    <div className="text-xs space-y-1.5 mt-2">
                      <p>
                        <strong>Variables:</strong> <FormattedText text={f.variables} inline />
                      </p>
                      <div style={{ color: "var(--muted)" }}>
                        <FormattedText text={f.explanation} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {content.algorithms_processes && (
            <div className="mb-8">
              <h3 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text)" }}>Processes / Algorithms</h3>
              <div className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
                <MathRenderer content={content.algorithms_processes} />
              </div>
            </div>
          )}
          
          {content.examples && content.examples.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text)" }}>Worked Examples</h3>
              {content.examples.map((ex, i) => (
                <div key={i} className="mb-4 border rounded-xl overflow-hidden" style={{ borderColor: "var(--line)" }}>
                  <div className="p-3 border-b text-sm font-medium" style={{ background: "var(--surface-subtle)", borderColor: "var(--line)" }}>
                    <FormattedText text={ex.problem} />
                  </div>
                  <div className="p-4 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                    <MathRenderer content={ex.solution} />
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {content.revision_sheet && content.revision_sheet.length > 0 && (
            <div className="mt-12 p-6 rounded-xl border" style={{ background: "rgba(232, 163, 61, 0.05)", borderColor: "var(--accent-soft)" }}>
              <h3 className="text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: "var(--accent)" }}>
                <CheckCircle2 size={16} /> Quick Revision Sheet
              </h3>
              <ul className="list-disc pl-5 text-sm space-y-2">
                {content.revision_sheet.map((item, i) => (
                  <li key={i}>
                    <FormattedText text={item} inline />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderGeneratorView = () => {
    return (
      <div className="sa-fade-in max-w-3xl mx-auto py-6">
        <button onClick={() => setView("list")} className="flex items-center gap-1.5 text-xs font-semibold mb-6 hover:underline" style={{ color: "var(--muted)" }}>
          <ArrowLeft size={14} /> Back to Summaries
        </button>
        
        <h2 className="sa-serif text-2xl font-semibold mb-2">Generate Topic Summaries</h2>
        <p className="text-sm mb-8" style={{ color: "var(--muted)" }}>
          Select documents to automatically extract the syllabus structure and generate comprehensive, exam-oriented study notes using Gemma 2.
        </p>
        
        {!discoveredTree && !generating && (
          <div className="sa-card p-6 mb-6">
            <h3 className="font-semibold text-sm mb-4">1. Select Source Documents</h3>
            {docs.length === 0 ? (
              <div className="text-xs p-4 text-center border rounded-lg" style={{ borderColor: "var(--line)", color: "var(--muted)" }}>
                No processed documents available. Please upload and wait for processing to finish.
              </div>
            ) : (
              <div className="space-y-2 mb-6 max-h-60 overflow-y-auto sa-scroll">
                {docs.map(doc => (
                  <div key={doc.id} onClick={() => toggleDoc(doc.id)} className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors" style={{ borderColor: selectedDocIds.has(doc.id) ? "var(--accent)" : "var(--line)", background: selectedDocIds.has(doc.id) ? "var(--accent-soft)" : "transparent" }}>
                    {selectedDocIds.has(doc.id) ? <CheckCircle2 size={16} color="var(--accent)" /> : <Circle size={16} color="var(--muted)" />}
                    <FileText size={16} color="var(--muted)" />
                    <span className="text-sm font-medium">{doc.filename}</span>
                  </div>
                ))}
              </div>
            )}
            
            <button 
              onClick={handleDiscover} 
              disabled={selectedDocIds.size === 0 || discovering} 
              className="sa-btn-accent w-full py-2.5 text-sm flex items-center justify-center gap-2"
            >
              {discovering ? <Loader size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {discovering ? "Discovering Topics..." : "Discover Topics"}
            </button>
          </div>
        )}
        
        {discoveredTree && !generating && (
          <div className="sa-card p-6 mb-6 sa-fade-in">
            <h3 className="font-semibold text-sm mb-4 flex justify-between items-center">
              <span>2. Select Topics to Summarize</span>
              <span className="text-xs font-normal px-2 py-1 rounded-md" style={{ background: "var(--surface-subtle)" }}>
                {selectedTopics.size} / {(discoveredTree.tree || []).length} selected
              </span>
            </h3>
            
            <div className="space-y-2 mb-6">
              {(discoveredTree.tree || []).map((t, idx) => (
                <div key={idx} className="border rounded-lg p-3" style={{ borderColor: selectedTopics.has(t.name) ? "var(--accent)" : "var(--line)" }}>
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleTopic(t.name)}>
                    {selectedTopics.has(t.name) ? <CheckCircle2 size={16} color="var(--accent)" /> : <Circle size={16} color="var(--muted)" />}
                    <div className="font-semibold text-sm flex-1">{t.name}</div>
                  </div>
                  {t.subtopics && t.subtopics.length > 0 && (
                    <div className="ml-7 mt-2 pl-2 border-l border-white/10 space-y-1">
                      {t.subtopics.map((sub, sidx) => (
                        <div key={sidx} className="text-xs" style={{ color: "var(--muted)" }}>• {sub}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <button 
              onClick={handleGenerate} 
              disabled={selectedTopics.size === 0} 
              className="sa-btn-accent w-full py-2.5 text-sm flex items-center justify-center gap-2"
            >
              <Zap size={16} /> Generate {selectedTopics.size} Summaries
            </button>
          </div>
        )}
        
        {generating && (
          <div className="sa-card p-10 text-center sa-fade-in space-y-6">
            <Loader size={40} className="animate-spin mx-auto text-amber-400" />
            <div>
              <h3 className="sa-serif text-xl font-bold mb-2">Generating Engineering Notes</h3>
              <p className="text-sm" style={{ color: "var(--muted)" }}>{jobStatus?.current_stage || "Synthesizing source evidence..."}</p>
            </div>
            <div className="space-y-2">
              <ProgressBar value={jobStatus?.progress || 0} tone="accent" height={12} />
              <div className="flex justify-between items-center text-xs font-mono" style={{ color: "var(--accent)" }}>
                <span>{jobStatus?.progress || 0}% Complete</span>
                <span>{estimatedTimeLeft}</span>
              </div>
            </div>
            <p className="text-xs mt-4" style={{ color: "var(--muted)" }}>This may take several minutes depending on your hardware. You can safely navigate away.</p>
          </div>
        )}
      </div>
    );
  };

  const renderListView = () => {
    if (loadingSummaries) {
      return <div className="text-center py-12 text-sm text-muted">Loading your summaries...</div>;
    }
    
    return (
      <div className="sa-fade-in max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div>
            <h2 className="sa-serif text-2xl font-semibold">AI Topic Summaries</h2>
            <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>Comprehensive, exam-oriented study notes generated from your documents.</p>
          </div>
          <button onClick={() => {
            setDiscoveredTree(null);
            setJobId(null);
            setView("generator");
          }} className="sa-btn-accent px-4 py-2 text-sm font-semibold flex items-center gap-2">
            <Sparkles size={14} /> New Summary
          </button>
        </div>
        
        {summaries.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No Summaries Yet"
            description="Extract syllabus topics and generate detailed study notes for your engineering exams."
            action={
              <button onClick={() => setView("generator")} className="sa-btn-outline px-4 py-2 mt-4 text-xs font-semibold">
                Start Generation Workflow
              </button>
            }
          />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {summaries.map(summary => (
              <div key={summary.id} className="sa-card p-5 flex flex-col justify-between hover:scale-[1.01] transition-transform cursor-pointer" onClick={() => {
                setActiveSummary(summary);
                setView("reading");
              }}>
                <div>
                  <h3 className="font-semibold text-lg mb-2 leading-tight">
                    <FormattedText text={summary.topic_name} inline />
                  </h3>
                  <div className="text-xs line-clamp-3 mb-4" style={{ color: "var(--muted)" }}>
                    <FormattedText text={summary.content?.overview || "Study guide containing core concepts, formulas, and examples."} inline />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-auto pt-4 border-t" style={{ borderColor: "var(--line)" }}>
                  <Badge tone="accent">Gemma 2 9B</Badge>
                  <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>
                    {new Date(summary.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto sa-scroll pb-10">
      {view === "list" && renderListView()}
      {view === "generator" && renderGeneratorView()}
      {view === "reading" && renderReadingView()}
    </div>
  );
}

export default SummaryPage;
