import React, { useState, useEffect } from "react";
import { Users, Lock, Unlock, Plus, Search, LogIn, Clock, X, Loader2 } from "lucide-react";
import { 
  getTopicDiscussions, 
  createDiscussion, 
  joinDiscussion, 
  requestJoinDiscussion 
} from "../services/api";
import { Toast } from "./UI";
import { FormattedText } from "./MathRenderer";

export default function GroupDiscussions({ topic, accessToken, onOpenDiscussion }) {
  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("PUBLIC");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchDiscussions = async () => {
    if (!topic?.id) return;
    setLoading(true);
    try {
      const data = await getTopicDiscussions(topic.id, accessToken);
      setDiscussions(data || []);
    } catch (err) {
      setToast(err.message || "Failed to load discussions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscussions();
  }, [topic?.id]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsSubmitting(true);
    try {
      const newDisc = await createDiscussion({
        title,
        description,
        visibility,
        topic_id: topic.id
      }, accessToken);
      setDiscussions([newDisc, ...discussions]);
      setShowCreate(false);
      setTitle("");
      setDescription("");
      onOpenDiscussion(newDisc);
    } catch (err) {
      setToast(err.message || "Failed to create discussion");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoin = async (d) => {
    try {
      if (d.visibility === "PUBLIC") {
        await joinDiscussion(d.id, accessToken);
        setToast("Joined discussion!");
        fetchDiscussions();
        onOpenDiscussion({ ...d, is_member: true });
      } else {
        await requestJoinDiscussion(d.id, accessToken);
        setToast("Join request sent to admin.");
      }
    } catch (err) {
      setToast(err.message || "Action failed");
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-sm" style={{ color: "var(--muted)" }}>Loading discussions...</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="sa-serif font-semibold text-lg">Group Discussions</h3>
          <p className="text-xs" style={{ color: "var(--muted)" }}>Collaborate with others on {topic?.name}</p>
        </div>
        <button 
          onClick={() => setShowCreate(true)}
          className="sa-btn-accent px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5"
        >
          <Plus size={14} /> New Discussion
        </button>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {showCreate && (
        <div className="sa-card p-4 mb-4">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold text-sm">Create New Discussion</h4>
            <button onClick={() => setShowCreate(false)}><X size={14} style={{ color: "var(--muted)" }} /></button>
          </div>
          <form onSubmit={handleCreate} className="flex flex-col gap-3">
            <input 
              type="text" 
              placeholder="Discussion Title (e.g. Doubts on Deadlocks)" 
              className="sa-input text-sm w-full" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              required 
            />
            <textarea 
              placeholder="Optional description" 
              className="sa-input text-sm w-full h-16 resize-none" 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
            />
            <div className="flex items-center gap-4 text-sm mt-1">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="visibility" value="PUBLIC" checked={visibility === "PUBLIC"} onChange={() => setVisibility("PUBLIC")} />
                <Unlock size={14} style={{ color: "var(--accent)" }} /> Public
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="visibility" value="PRIVATE" checked={visibility === "PRIVATE"} onChange={() => setVisibility("PRIVATE")} />
                <Lock size={14} style={{ color: "var(--muted)" }} /> Private
              </label>
            </div>
            <button type="submit" disabled={isSubmitting} className="sa-btn-primary w-full py-2 text-xs mt-1">
              {isSubmitting ? "Creating..." : "Create Discussion"}
            </button>
          </form>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {discussions.length === 0 ? (
          <div className="p-8 text-center sa-card flex flex-col items-center justify-center border-dashed">
            <Users size={32} className="mb-2 opacity-50" style={{ color: "var(--muted)" }} />
            <p className="text-sm font-medium">No discussions yet</p>
            <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>Be the first to create one!</p>
          </div>
        ) : (
          discussions.map(d => (
            <div key={d.id} className="sa-card p-4 flex justify-between items-center hover:opacity-90 transition-opacity">
              <div className="flex flex-col gap-1 overflow-hidden">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm truncate">
                    <FormattedText text={d.title} inline />
                  </h4>
                  {d.visibility === "PRIVATE" ? <Lock size={12} style={{ color: "var(--muted)" }} /> : <Unlock size={12} style={{ color: "var(--accent)" }} />}
                </div>
                {d.description && (
                  <div className="text-xs truncate" style={{ color: "var(--muted)" }}>
                    <FormattedText text={d.description} inline />
                  </div>
                )}
                <div className="flex items-center gap-3 text-xs mt-1 font-medium" style={{ color: "var(--muted)" }}>
                  <span className="flex items-center gap-1"><Users size={12} /> {d.member_count} members</span>
                  <span>Created {new Date(d.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              
              <div className="flex-shrink-0 ml-3 flex gap-2">
                <button onClick={() => onOpenDiscussion(d)} className="sa-btn-secondary px-3 py-1.5 text-xs font-semibold">
                  {d.is_member ? "Open" : "View"}
                </button>
                {!d.is_member && (
                  <button onClick={() => handleJoin(d)} className="sa-btn-primary px-3 py-1.5 text-xs font-semibold flex items-center gap-1">
                    {d.visibility === "PRIVATE" ? "Request Access" : "Join"}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
