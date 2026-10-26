import React, { useState, useEffect } from "react";
import { Users, Lock, Unlock, Search, MoreVertical, MessageCircle } from "lucide-react";
import { getAllDiscussions, joinDiscussion, requestJoinDiscussion } from "../services/api";
import DiscussionRoom from "./DiscussionRoom";
import { FormattedText } from "./MathRenderer";

export default function GlobalDiscussions({ accessToken, showToast, initialDiscussionId }) {
  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeDiscussion, setActiveDiscussion] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadDiscussions = async () => {
    try {
      setLoading(true);
      const data = await getAllDiscussions(accessToken);
      setDiscussions(data);
      if (initialDiscussionId && Array.isArray(data)) {
        const found = data.find(d => d.id === initialDiscussionId);
        if (found) setActiveDiscussion(found);
      }
    } catch (err) {
      console.error(err);
      showToast?.("Failed to load discussions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDiscussions();
  }, [accessToken, initialDiscussionId]);

  const handleJoin = async (d) => {
    try {
      if (d.visibility === "PUBLIC") {
        await joinDiscussion(d.id, accessToken);
        showToast?.("Joined discussion!");
        loadDiscussions();
        setActiveDiscussion({...d, is_member: true});
      } else {
        await requestJoinDiscussion(d.id, accessToken);
        showToast?.("Join request sent!");
      }
    } catch (err) {
      console.error(err);
      showToast?.(err.message || "Failed to join");
    }
  };

  const filteredDiscussions = discussions.filter(d => 
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    d.topic_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-row bg-[var(--surface-subtle)] overflow-hidden relative w-full">
      {/* Sidebar - Chat List */}
      <div className={`${activeDiscussion ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-[350px] lg:w-[400px] border-r border-[var(--line)] bg-[var(--surface)] h-full z-10 shadow-sm`}>
        {/* Header */}
        <div className="h-16 bg-[var(--surface-subtle)] flex items-center justify-between px-4 py-2 border-b border-[var(--line)] shrink-0">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-[var(--info-soft)] flex items-center justify-center text-[var(--info)]">
               <Users size={20} />
             </div>
             <h2 className="font-semibold text-[var(--text)]">Chats</h2>
          </div>
          <button className="text-[var(--muted)] hover:text-[var(--text)]">
             <MoreVertical size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="p-2 border-b border-[var(--line)] bg-[var(--surface)] shrink-0">
           <div className="bg-[var(--surface-subtle)] rounded-lg flex items-center px-3 py-1.5 gap-2">
             <Search size={18} className="text-[var(--muted)]" />
             <input 
               type="text" 
               placeholder="Search or start new chat" 
               className="bg-transparent border-none outline-none text-sm w-full h-8 text-[var(--text)]"
               value={searchQuery}
               onChange={e => setSearchQuery(e.target.value)}
             />
           </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto sa-scroll bg-[var(--surface)] pb-20 md:pb-0">
          {loading ? (
             <div className="text-center p-8 text-[var(--muted)] text-sm">Loading chats...</div>
          ) : filteredDiscussions.length === 0 ? (
             <div className="p-8 text-center flex flex-col items-center opacity-50 mt-10">
               <MessageCircle size={32} className="mb-3" />
               <p className="text-sm font-medium">No chats found</p>
             </div>
          ) : (
             <div className="flex flex-col">
               {filteredDiscussions.map(d => {
                 const isActive = activeDiscussion?.id === d.id;
                 return (
                   <div 
                     key={d.id} 
                     onClick={() => d.is_member ? setActiveDiscussion(d) : null}
                     className={`flex items-center p-3 cursor-pointer hover:bg-[var(--surface-hover)] transition-colors border-b border-[var(--line-subtle)] ${isActive ? 'bg-[var(--surface-subtle)]' : ''}`}
                   >
                      <div className="w-12 h-12 rounded-full bg-[var(--info-soft)] flex flex-shrink-0 items-center justify-center text-[var(--info)] mr-3">
                        {d.visibility === "PRIVATE" ? <Lock size={18} /> : <Users size={18} />}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex justify-between items-center mb-0.5">
                           <h4 className="font-medium text-[15px] text-[var(--text)] truncate">
                             <FormattedText text={d.title} inline />
                           </h4>
                           <span className="text-xs text-[var(--muted)]">{new Date(d.created_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
                        </div>
                        <div className="flex justify-between items-center">
                           <div className="text-[13px] text-[var(--muted)] truncate">
                             <FormattedText text={d.topic_name} inline /> • {d.member_count} members
                           </div>
                           {!d.is_member && (
                             <button onClick={(e) => { e.stopPropagation(); handleJoin(d); }} className="text-xs font-semibold text-[var(--info)] bg-[var(--info-soft)] px-2 py-0.5 rounded-full hover:bg-[var(--info-soft)] dark:hover:bg-blue-900/50">
                               Join
                             </button>
                           )}
                        </div>
                      </div>
                   </div>
                 );
               })}
             </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`${!activeDiscussion ? 'hidden md:flex' : 'flex'} flex-col flex-1 h-full bg-[var(--paper)] relative w-full`}>
        {activeDiscussion ? (
          <DiscussionRoom 
            key={activeDiscussion.id}
            discussion={activeDiscussion} 
            topic={{ id: activeDiscussion.topic_id, name: activeDiscussion.topic_name }}
            accessToken={accessToken} 

            onBack={() => {
              setActiveDiscussion(null);
              loadDiscussions(); 
            }} 
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-[var(--paper)]">
             <div className="w-64 h-64 mb-8 opacity-20">
               {/* Dummy graphic placeholder */}
               <MessageCircle size={256} className="text-[var(--muted)]" />
             </div>
             <h2 className="text-2xl font-light text-[var(--text)] mb-2">ExamVault Web</h2>
             <p className="text-sm text-[var(--muted)]">Select a group discussion to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}
