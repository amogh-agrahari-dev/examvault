import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Plus, FolderLock, FileText, 
  Trash2, X, Sparkles, TrendingUp, ArrowRight,
  GraduationCap, RefreshCw
} from 'lucide-react';
import { request } from '../services/api';

const SubjectsDashboard = ({ go, selectSubject, accessToken, showToast }) => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSubject, setNewSubject] = useState({ name: '', description: '' });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const data = await request('/subjects', { headers: { Authorization: `Bearer ${accessToken}` } });
      setSubjects(Array.isArray(data) ? data : []);
    } catch (e) {
      showToast("Failed to fetch subjects");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e?.preventDefault();
    if (!newSubject.name.trim()) {
      showToast("Please enter a subject name");
      return;
    }
    setIsCreating(true);
    try {
      await request('/subjects', { 
        method: 'POST', 
        body: JSON.stringify(newSubject), 
        headers: { Authorization: `Bearer ${accessToken}` } 
      });
      setIsModalOpen(false);
      setNewSubject({ name: '', description: '' });
      fetchSubjects();
      showToast("Subject created successfully!");
    } catch (e) {
      showToast("Failed to create subject");
      console.error(e);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id, e) => {
    e?.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this subject?")) return;
    try {
      await request(`/subjects/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } });
      fetchSubjects();
      showToast("Subject deleted!");
    } catch (e) {
      showToast("Failed to delete subject");
      console.error(e);
    }
  };

  const totalNotes = subjects.reduce((acc, s) => acc + (s.document_count || 0), 0);
  const totalPapers = subjects.reduce((acc, s) => acc + (s.past_paper_count || 0), 0);

  return (
    <div className="sa-fade-in space-y-6 max-w-6xl mx-auto pb-12">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span 
              className="text-xs font-semibold px-2.5 py-0.5 rounded-md inline-flex items-center gap-1.5"
              style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}
            >
              <TrendingUp size={13} />
              Examination Curriculum & Blueprints
            </span>
          </div>
          <h1 className="sa-serif text-2xl sm:text-3xl font-semibold text-[var(--text)]">
            Subjects & Exam Predictor
          </h1>
          <p className="text-xs sm:text-sm text-[var(--muted)] mt-1 max-w-2xl leading-relaxed">
            Organize academic courses, maintain isolated previous year paper archives, and synthesize pattern-grounded university exam predictions.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap w-full sm:w-auto">
          <button 
            onClick={() => go("predict-paper")}
            className="sa-btn-outline flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl shadow-xs"
          >
            <Sparkles size={14} className="text-amber-500" />
            <span>Open Paper Predictor</span>
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="sa-btn-primary flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl shadow-xs"
          >
            <Plus size={15} />
            <span>Create Subject</span>
          </button>
        </div>
      </div>

      {/* Overview Metric Ribbon */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <div 
          className="sa-card p-3 sm:p-4 rounded-xl border flex items-center gap-3"
          style={{ background: "var(--surface)", borderColor: "var(--line)" }}
        >
          <div 
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}
          >
            <BookOpen size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Courses
            </div>
            <div className="text-base sm:text-lg font-bold text-[var(--text)]">
              {subjects.length}
            </div>
          </div>
        </div>

        <div 
          className="sa-card p-3 sm:p-4 rounded-xl border flex items-center gap-3"
          style={{ background: "var(--surface)", borderColor: "var(--line)" }}
        >
          <div 
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}
          >
            <FolderLock size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Past Papers
            </div>
            <div className="text-base sm:text-lg font-bold text-[var(--text)]">
              {totalPapers}
            </div>
          </div>
        </div>

        <div 
          className="sa-card p-3 sm:p-4 rounded-xl border flex items-center gap-3"
          style={{ background: "var(--surface)", borderColor: "var(--line)" }}
        >
          <div 
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}
          >
            <FileText size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Study Notes
            </div>
            <div className="text-base sm:text-lg font-bold text-[var(--text)]">
              {totalNotes}
            </div>
          </div>
        </div>
      </div>

      {/* Subjects Grid or Empty State */}
      {loading ? (
        <div className="sa-card p-12 text-center rounded-2xl border" style={{ borderColor: "var(--line)" }}>
          <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-amber-500" />
          <p className="text-xs sm:text-sm text-[var(--muted)]">Loading academic subjects & curriculum...</p>
        </div>
      ) : subjects.length === 0 ? (
        <div 
          className="sa-card p-10 sm:p-14 text-center rounded-2xl border-2 border-dashed flex flex-col items-center justify-center"
          style={{ borderColor: "var(--border-dashed)", background: "var(--surface)" }}
        >
          <div 
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}
          >
            <GraduationCap size={28} />
          </div>
          <h3 className="sa-serif text-lg font-semibold text-[var(--text)] mb-1">
            No Academic Subjects Added Yet
          </h3>
          <p className="text-xs sm:text-sm text-[var(--muted)] max-w-md mb-6 leading-relaxed">
            Create your university courses to organize past exam papers, lecture notes, and run targeted paper predictions.
          </p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="sa-btn-primary px-5 py-2.5 text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs"
          >
            <Plus size={15} />
            <span>Create First Subject</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {subjects.map((s) => (
            <div 
              key={s.id} 
              className="sa-card p-5 sm:p-6 rounded-2xl border flex flex-col justify-between hover:shadow-md transition-all group cursor-pointer"
              style={{ background: "var(--surface)", borderColor: "var(--line)" }}
              onClick={() => { 
                selectSubject(s.id); 
                go("predict-paper", { subjectId: s.id }); 
              }}
            >
              <div>
                {/* Top Badge & Subject Icon */}
                <div className="flex items-center justify-between mb-3.5">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}
                  >
                    <BookOpen size={18} />
                  </div>
                  <span 
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
                    style={{ background: "var(--surface-subtle)", color: "var(--muted)", border: "1px solid var(--line)" }}
                  >
                    Academic Course
                  </span>
                </div>

                {/* Subject Title & Description */}
                <h3 className="text-base sm:text-lg font-semibold text-[var(--text)] mb-1.5 group-hover:text-[var(--accent)] transition-colors">
                  {s.name}
                </h3>
                <p className="text-xs text-[var(--muted)] line-clamp-2 leading-relaxed mb-4 min-h-[32px]">
                  {s.description || "No description provided for this academic course."}
                </p>

                {/* Counter Badges */}
                <div 
                  className="flex items-center justify-between text-xs py-2.5 px-3 rounded-xl mb-4"
                  style={{ background: "var(--surface-subtle)", border: "1px solid var(--line)" }}
                >
                  <span className="inline-flex items-center gap-1.5 font-medium text-[var(--text)]">
                    <FolderLock size={13} className="text-amber-500" />
                    <span>{s.past_paper_count || 0} Past Papers</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium text-[var(--muted)]">
                    <FileText size={13} />
                    <span>{s.document_count || 0} Notes</span>
                  </span>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="pt-2 border-t flex items-center gap-2" style={{ borderColor: "var(--line)" }}>
                <button 
                  className="sa-btn-primary flex-1 text-xs py-2 px-3 font-semibold rounded-lg flex items-center justify-center gap-1.5"
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    selectSubject(s.id); 
                    go("predict-paper", { subjectId: s.id, openUpload: true }); 
                  }}
                  title="Upload past paper and generate predicted exam"
                >
                  <Sparkles size={13} />
                  <span>Predict Paper</span>
                </button>
                <button 
                  className="sa-btn-outline text-xs py-2 px-2.5 font-medium rounded-lg flex items-center justify-center gap-1"
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    go("upload", { subject_id: s.id, type: "NOTES" }); 
                  }}
                  title="Upload lecture notes"
                >
                  <FileText size={13} />
                  <span>Notes</span>
                </button>
                <button 
                  className="sa-btn-outline p-2 text-[var(--muted)] hover:text-red-500 hover:border-red-500 rounded-lg transition-colors shrink-0"
                  onClick={(e) => handleDelete(s.id, e)}
                  title="Delete subject"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Subject Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div 
            className="sa-card w-full max-w-md p-6 rounded-2xl border shadow-2xl space-y-4"
            style={{ background: "var(--surface)", borderColor: "var(--line)" }}
          >
            <div className="flex items-start justify-between pb-3 border-b" style={{ borderColor: "var(--line)" }}>
              <div>
                <h2 className="sa-serif text-lg font-bold text-[var(--text)] flex items-center gap-2">
                  <BookOpen size={18} className="text-amber-500" />
                  Create Academic Subject
                </h2>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  Define a new course module to group past papers and notes.
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-subtle)] transition-colors"
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs font-semibold block mb-1 text-[var(--text)]">
                  Subject / Course Name *
                </label>
                <input 
                  type="text"
                  required
                  className="sa-input w-full p-2.5 text-xs rounded-xl border font-medium"
                  placeholder="e.g. Computer Networks & Security" 
                  value={newSubject.name} 
                  onChange={e => setNewSubject({ ...newSubject, name: e.target.value })} 
                />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1 text-[var(--text)]">
                  Course Description / Syllabus Scope
                </label>
                <textarea 
                  rows={3}
                  className="sa-input w-full p-2.5 text-xs rounded-xl border font-medium resize-none leading-relaxed"
                  placeholder="e.g. SPPU 2019 Pattern TE IT Semester 5 curriculum covering routing algorithms, transport layer protocols..." 
                  value={newSubject.description} 
                  onChange={e => setNewSubject({ ...newSubject, description: e.target.value })} 
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: "var(--line)" }}>
                <button 
                  type="button"
                  className="sa-btn-outline px-4 py-2 text-xs font-medium rounded-xl"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isCreating}
                  className="sa-btn-primary px-5 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs"
                >
                  {isCreating ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={14} />
                      Create Subject
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectsDashboard;
