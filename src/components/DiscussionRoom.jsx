import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Send, Search, MoreVertical, MessageSquare, CheckCircle, Bot, Users } from "lucide-react";
import MathRenderer, { FormattedText } from './MathRenderer';
import { 
  getDiscussionMessages, 
  sendDiscussionMessage, 
  verifyDiscussionClaim,
  askAIDiscussion,
  getDiscussionMembers,
  API_BASE_URL
} from "../services/api";
import { Toast } from "./UI";
import { useAuth } from "../context/AuthContext";
import UserProfileModal from "./UserProfileModal";

export default function DiscussionRoom({ discussion, topic, accessToken, onBack }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  
  const [chatMode, setChatMode] = useState("chat"); 
  const [aiLoading, setAiLoading] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [showMenu, setShowMenu] = useState(null); 
  const [membersList, setMembersList] = useState([]);
  const [selectedProfileUserId, setSelectedProfileUserId] = useState(null);
  const [participantFilter, setParticipantFilter] = useState("");
  
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const isMountedRef = useRef(true);
  const inputRef = useRef(null);

  const fetchMessages = async (isBackground = false) => {
    if (!discussion?.id || !accessToken) return;
    if (!isBackground) setLoading(true);
    try {
      const data = await getDiscussionMessages(discussion.id, accessToken);
      if (Array.isArray(data)) {
        setMessages(prev => {
          const serverIds = new Set(data.map(m => m.id));
          const pendingOptimistic = prev.filter(m => 
            (m.is_optimistic || m.id?.toString().startsWith("temp-")) && 
            !serverIds.has(m.id) &&
            !data.some(sm => sm.client_msg_id && sm.client_msg_id === m.client_msg_id)
          );
          const combined = [...data, ...pendingOptimistic];
          return combined.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        });
      }
    } catch (err) {
      if (!isBackground) {
        console.warn("Could not fetch messages", err);
      }
    } finally {
      if (!isBackground) {
        setLoading(false);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "auto" }), 50);
      }
    }
  };

  const connectWebSocket = () => {
    if (!discussion?.is_member || !discussion?.id || !accessToken || !isMountedRef.current) return;
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    const base = API_BASE_URL;
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : base.startsWith("https") ? "wss:" : "ws:";
    const wsHost = base.replace(/^https?:\/\//, "");
    const wsUrl = `${wsProtocol}//${wsHost}/discussions/${discussion.id}/ws?token=${encodeURIComponent(accessToken)}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      const startHeartbeat = () => {
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "ping" }));
          }
        }, 20000);
      };

      ws.onopen = () => {
        if (!isMountedRef.current) {
          try { ws.close(); } catch (e) {}
          return;
        }
        setIsReconnecting(false);
        reconnectAttemptsRef.current = 0;
        startHeartbeat();
        // Immediately fetch to catch any messages sent during reconnect
        fetchMessages(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "pong") return;

          if (data.type === "message.created") {
            const newMsg = data.message;
            const clientMsgId = data.client_msg_id;
            setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev;

              let replaced = false;
              const updated = prev.map(m => {
                if (!replaced && (
                  (clientMsgId && (m.client_msg_id === clientMsgId || m.id === clientMsgId)) ||
                  (m.is_optimistic && m.content === newMsg.content && m.user_id === newMsg.user_id)
                )) {
                  replaced = true;
                  return newMsg;
                }
                return m;
              });

              const next = replaced ? updated : [...updated, newMsg];
              return next.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            });
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
          } else if (data.type === "verify.result") {
            const v = data.data;
            setMessages(prev => {
              if (prev.some(m => m.id === v.id)) return prev;
              return [...prev, {
                id: v.id,
                type: "verify_result",
                claim: v.claim,
                verdict: v.verdict,
                explanation: v.explanation,
                sources: v.sources,
                user_name: v.user_name,
                created_at: v.created_at || new Date().toISOString()
              }];
            });
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
          } else if (data.type === "ask.result") {
            const a = data.data;
            setMessages(prev => {
              if (prev.some(m => m.id === a.id)) return prev;
              return [...prev, {
                id: a.id,
                type: "ask_result",
                question: a.question,
                answer: a.answer,
                sources: a.sources,
                user_name: a.user_name,
                created_at: a.created_at || new Date().toISOString()
              }];
            });
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
          }
        } catch (err) {
          console.error("WS message handling error:", err);
        }
      };

      ws.onclose = (event) => {
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        wsRef.current = null;
        if (!isMountedRef.current || event.code === 1000) return;

        setIsReconnecting(true);
        const attempts = reconnectAttemptsRef.current || 0;
        reconnectAttemptsRef.current = attempts + 1;
        const delay = Math.min(1000 * Math.pow(1.5, attempts), 5000);
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            connectWebSocket();
          }
        }, delay);
      };

      ws.onerror = (err) => {
        console.warn("WebSocket warning/error:", err);
        try { ws.close(); } catch (e) {}
      };
    } catch (err) {
      console.error("Failed to initialize WebSocket:", err);
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    if (!discussion?.id) return;
    setLoading(true);
    fetchMessages();
    connectWebSocket();

    return () => {
      isMountedRef.current = false;
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        try {
          wsRef.current.close(1000, "Component unmounted");
        } catch (e) {}
        wsRef.current = null;
      }
    };
  }, [discussion?.id, accessToken]);

  // Window Focus & Tab Visibility Sync
  useEffect(() => {
    const handleSync = () => {
      if (document.visibilityState === "visible") {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          connectWebSocket();
        }
        fetchMessages(true);
      }
    };
    document.addEventListener("visibilitychange", handleSync);
    window.addEventListener("focus", handleSync);
    return () => {
      document.removeEventListener("visibilitychange", handleSync);
      window.removeEventListener("focus", handleSync);
    };
  }, [discussion?.id, accessToken]);

  // Fallback Interval Sync: Poll every 3.5s if WS is down/reconnecting, or every 20s if connected
  useEffect(() => {
    const timer = setInterval(() => {
      if (!isMountedRef.current) return;
      const isOpen = wsRef.current?.readyState === WebSocket.OPEN;
      if (!isOpen) {
        fetchMessages(true);
        if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
          connectWebSocket();
        }
      } else {
        fetchMessages(true);
      }
    }, isReconnecting ? 3500 : 20000);

    return () => clearInterval(timer);
  }, [discussion?.id, accessToken, isReconnecting]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || aiLoading) return;
    
    if (chatMode === "chat") {
      const currentInput = input.trim();
      const clientMsgId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const tempMsg = { 
        id: clientMsgId, 
        client_msg_id: clientMsgId, 
        content: currentInput, 
        user_id: user?.id, 
        user_name: user?.full_name || "You", 
        created_at: new Date().toISOString(),
        is_optimistic: true
      };
      
      setMessages(prev => [...prev, tempMsg]);
      setInput("");
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

      let sentViaWs = false;
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify({
            type: "message.send",
            content: currentInput,
            client_msg_id: clientMsgId
          }));
          sentViaWs = true;
        } catch (err) {
          console.warn("WebSocket send failed, falling back to HTTP", err);
          sentViaWs = false;
        }
      }

      if (!sentViaWs) {
        try {
          const res = await sendDiscussionMessage(discussion.id, currentInput, accessToken, clientMsgId);
          if (res) {
            setMessages(prev => prev.map(m => (m.id === clientMsgId || m.client_msg_id === clientMsgId) ? res : m));
          }
        } catch (err) {
          setToast(err.message || "Failed to send message");
          setMessages(prev => prev.filter(m => m.id !== clientMsgId));
        }
      }
    } else if (chatMode === "verify") {
      const claim = input.trim();
      setInput("");
      setAiLoading(true);
      const tempId = `temp-verify-${Date.now()}`;
      setMessages(prev => [...prev, { id: tempId, content: `Verifying claim: "${claim}"...`, user_id: user?.id, user_name: user?.full_name || "You", created_at: new Date().toISOString(), is_ai_status: true }]);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

      try {
        const res = await verifyDiscussionClaim(discussion.id, claim, accessToken);
        setMessages(prev => prev.filter(m => m.id !== tempId));
        setMessages(prev => {
          if (prev.some(m => m.id === res.id)) return prev;
          return [...prev, {
            id: res.id,
            type: "verify_result",
            claim: res.claim,
            verdict: res.verdict,
            explanation: res.explanation,
            sources: res.sources,
            created_at: res.created_at || new Date().toISOString()
          }];
        });
      } catch (err) {
        setMessages(prev => prev.filter(m => m.id !== tempId));
        setToast(err.message || "Verification failed");
      } finally {
        setAiLoading(false);
      }
    } else if (chatMode === "ask") {
      const q = input.trim();
      setInput("");
      setAiLoading(true);
      const tempId = `temp-ask-${Date.now()}`;
      setMessages(prev => [...prev, { id: tempId, content: `Asking AI: "${q}"...`, user_id: user?.id, user_name: user?.full_name || "You", created_at: new Date().toISOString(), is_ai_status: true }]);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

      try {
        const res = await askAIDiscussion(discussion.id, q, accessToken);
        setMessages(prev => prev.filter(m => m.id !== tempId));
        setMessages(prev => {
          if (prev.some(m => m.id === res.id)) return prev;
          return [...prev, {
            id: res.id || `ask-${Date.now()}`,
            type: "ask_result",
            question: q,
            answer: res.answer,
            sources: res.sources,
            created_at: res.created_at || new Date().toISOString()
          }];
        });
      } catch (err) {
        setMessages(prev => prev.filter(m => m.id !== tempId));
        setToast(err.message || "Ask AI failed");
      } finally {
        setAiLoading(false);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleShowMembers = async () => {
    try {
      const data = await getDiscussionMembers(discussion.id, accessToken);
      setMembersList(data || []);
      setShowMenu("members");
    } catch (err) {
      setToast("Failed to fetch members");
    }
  };

  // Group messages logic
  let lastDate = null;
  let lastSender = null;

  return (
    <div className="flex flex-col h-full bg-[var(--paper)] text-[var(--text)] relative w-full overflow-hidden">
      {/* Header */}
      <div className="h-16 bg-[var(--surface-subtle)] flex items-center justify-between px-4 py-2 border-b border-[var(--line)] shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="md:hidden p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">
            <ArrowLeft size={20} />
          </button>
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 cursor-pointer" onClick={handleShowMembers}>
             <Users size={20} />
          </div>
          <div className="flex flex-col cursor-pointer" onClick={handleShowMembers}>
            <h3 className="font-semibold text-[var(--text)] leading-tight">{discussion.title}</h3>
            <p className="text-xs text-[var(--muted)] leading-tight flex items-center gap-1.5">
               {isReconnecting ? (
                 <span className="text-amber-500 flex items-center gap-1">
                   <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                   Connecting...
                 </span>
               ) : (
                 <span className="flex items-center gap-1">
                   <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                   {`${discussion.member_count} members • Topic: ${topic?.name || "General"}`}
                 </span>
               )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[var(--muted)]">
           <Search size={20} className="cursor-pointer hover:text-[var(--text)]" />
           <MoreVertical size={20} className="cursor-pointer hover:text-[var(--text)]" />
        </div>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* Chat Area */}
      <div 
         className="flex-1 overflow-y-auto px-2.5 sm:px-[5%] md:px-[10%] py-4 space-y-1 relative bg-[var(--paper)] text-[var(--text)] " 
      >
        {loading && messages.length === 0 ? (
          <div className="text-center mt-10">
            <span className="bg-[var(--surface)]/80 px-3 py-1.5 rounded-full text-xs text-[var(--muted)] shadow-sm">Loading messages...</span>
          </div>
        ) : (
          messages.map((m, i) => {
             // Date grouping
             const msgDate = m.created_at ? new Date(m.created_at) : new Date();
             const dateStr = msgDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
             const showDate = dateStr !== lastDate;
             lastDate = dateStr;

             const isMe = m.user_id === user?.id || m.id === "temp" || m.is_optimistic || m.id?.toString().startsWith("temp-");
             const showSender = !isMe && lastSender !== m.user_id;
             if (!m.is_ai_status && m.type !== "verify_result" && m.type !== "ask_result") {
                 lastSender = m.user_id;
             } else {
                 lastSender = null; // reset grouping after AI blocks
             }

             const timeStr = msgDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

             let contentNode = null;
             
             if (m.type === "verify_result") {
               const vColor = m.verdict === "SUPPORTED" ? "text-green-600" : m.verdict === "CONTRADICTED" ? "text-red-600" : "text-yellow-600";
               contentNode = (
                  <div className="bg-[var(--surface)] rounded-lg p-3 shadow-sm w-full max-w-[85%] mx-auto my-3 border-l-4" style={{ borderColor: m.verdict === "SUPPORTED" ? "#16a34a" : m.verdict === "CONTRADICTED" ? "#dc2626" : "#ca8a04" }}>
                    <div className="flex items-center gap-1.5 mb-1 text-sm font-semibold text-[var(--text)]">
                      <CheckCircle size={14} className={vColor} /> AI Verification Result
                    </div>
                    <div className="text-[13px] font-medium text-[var(--text)] italic mb-1">
                      "<FormattedText text={m.claim} inline />"
                    </div>
                    <div className="text-[13px] text-[var(--muted)] mb-2">
                      <MathRenderer content={m.explanation} />
                    </div>
                    {m.sources?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2 border-t border-[var(--line-subtle)] pt-2">
                        {m.sources.map((s, idx) => (
                           <span key={idx} className="text-[10px] bg-[var(--surface-subtle)] text-[var(--muted)] px-1.5 py-0.5 rounded">
                             {s.document_name} — Sec {s.chunk_index + 1}
                           </span>
                        ))}
                      </div>
                    )}
                  </div>
               );
             } else if (m.type === "ask_result") {
               contentNode = (
                  <div className="bg-[var(--surface)] rounded-lg p-3 shadow-sm w-full max-w-[85%] mx-auto my-3 border-l-4 border-blue-500">
                    <div className="flex items-center gap-1.5 mb-1 text-sm font-semibold text-blue-700">
                      <Bot size={14} /> AI Answer
                    </div>
                    <div className="text-[13px] font-medium text-[var(--text)] mb-2">
                      Q: <FormattedText text={m.question} inline />
                    </div>
                    <div className="text-[13px] text-[var(--text)]">
                      <MathRenderer content={m.answer} />
                    </div>
                  </div>
               );
             } else if (m.is_ai_status) {
               contentNode = (
                 <div className="flex justify-center my-2 w-full">
                   <span className="text-[11px] italic bg-[var(--surface-subtle)] text-[var(--muted)] px-2 py-1 rounded shadow-sm">
                     <FormattedText text={m.content} inline />
                   </span>
                 </div>
               );
             } else {
               contentNode = (
                 <div className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} ${showSender ? 'mt-2' : 'mt-0.5'}`}>
                   <div 
                     className={`relative max-w-[85%] md:max-w-[70%] rounded-lg px-3 pt-2 pb-1.5 flex flex-col group shadow-sm border border-[var(--line)] ${isMe ? "bg-[var(--accent-soft)]" : "bg-[var(--surface)]"}`}
                     style={{ 
                       borderTopLeftRadius: !isMe && showSender ? 0 : 8,
                       borderTopRightRadius: isMe && showSender ? 0 : 8,
                     }}
                   >
                     {showSender && !isMe && (
                       <span className="text-[11px] font-semibold text-[#c13515] leading-tight mb-0.5" style={{ color: `hsl(${m.user_name.length * 50}, 60%, 45%)` }}>
                         {m.user_name}
                       </span>
                     )}
                     
                     <div className="text-[14.2px] text-[var(--text)] leading-[19px] break-words">
                        <MathRenderer content={m.content} />
                        <span className="inline-block w-12 h-4"></span>
                     </div>
                     <div className="absolute right-2 bottom-1.5 flex items-center opacity-70">
                         <span className="text-[10px] text-[var(--muted)]">{timeStr}</span>
                     </div>

                     {/* Context menu toggle */}
                     {discussion.is_member && (
                        <button 
                          onClick={() => setShowMenu(showMenu === m.id ? null : m.id)}
                          className="absolute right-0 top-1 opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 bg-gradient-to-l from-[var(--surface)]/90"
                        >
                          <MoreVertical size={14} />
                        </button>
                     )}

                     {showMenu === m.id && (
                        <div className="absolute right-4 top-4 bg-[var(--surface)] shadow-md border border-[var(--line-subtle)] rounded py-1 z-20 w-32">
                           <button 
                             onClick={() => {
                               setChatMode("verify");
                               setInput(m.content);
                               setShowMenu(null);
                               inputRef.current?.focus();
                             }}
                             className="w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--surface-hover)] text-[var(--text)] flex items-center gap-2"
                           >
                              <CheckCircle size={12} /> Verify Claim
                           </button>
                           {/* Add more WhatsApp actions if needed */}
                        </div>
                     )}
                   </div>
                 </div>
               );
             }

             return (
               <React.Fragment key={m.id || i}>
                 {showDate && (
                    <div className="flex justify-center my-3">
                       <span className="bg-[var(--surface-subtle)] text-[var(--muted)] text-[11px] uppercase tracking-wide px-3 py-1 rounded shadow-sm">
                         {dateStr}
                       </span>
                    </div>
                 )}
                 {contentNode}
               </React.Fragment>
             );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer Area */}
      {discussion.is_member && (
        <div className="bg-[var(--surface-subtle)] px-2.5 sm:px-4 pt-2 shrink-0 border-t border-[var(--line-subtle)] pb-[calc(3.75rem+env(safe-area-inset-bottom,0px))] md:pb-2.5">
           {/* Modifiers */}
           <div className="flex items-center gap-1.5 mb-2 px-0.5 overflow-x-auto whitespace-nowrap sa-scroll flex-nowrap py-0.5">
              <button type="button" onClick={() => setChatMode("chat")} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0 ${chatMode === "chat" ? "bg-[var(--surface)] border-blue-500 text-blue-600 dark:text-blue-400 shadow-sm border" : "bg-[var(--surface)] text-[var(--muted)] shadow-sm border border-transparent hover:bg-[var(--surface-hover)]"}`}>
                <MessageSquare size={14} /> Chat
              </button>
              <button type="button" onClick={() => setChatMode("verify")} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0 ${chatMode === "verify" ? "bg-[var(--surface)] border-green-500 text-green-600 dark:text-green-400 shadow-sm border" : "bg-[var(--surface)] text-[var(--muted)] shadow-sm border border-transparent hover:bg-[var(--surface-hover)]"}`}>
                <CheckCircle size={14} /> Verify Claim
              </button>
              <button type="button" onClick={() => setChatMode("ask")} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0 ${chatMode === "ask" ? "bg-[var(--surface)] border-purple-500 text-purple-600 dark:text-purple-400 shadow-sm border" : "bg-[var(--surface)] text-[var(--muted)] shadow-sm border border-transparent hover:bg-[var(--surface-hover)]"}`}>
                <Bot size={14} /> Ask AI
              </button>
           </div>
           
           <div className="flex items-end gap-2">
              <div className="flex-1 bg-[var(--surface)] rounded-xl flex items-end shadow-sm border border-[var(--line-subtle)]">
                 <textarea 
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      chatMode === "verify" ? "Enter a claim to verify..." :
                      chatMode === "ask" ? "Ask a question about this topic..." :
                      "Type a message..."
                    }
                    disabled={aiLoading}
                    className="w-full bg-transparent border-none outline-none resize-none px-3 py-2.5 max-h-32 min-h-[40px] text-sm text-[var(--text)]"
                    rows={1}
                    style={{ height: "auto" }}
                    onInput={(e) => {
                      e.target.style.height = "auto";
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                    }}
                 />
              </div>
              <button 
                 onClick={handleSend}
                 disabled={!input.trim() || aiLoading}
                 className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--ink-btn)] text-[var(--ink-btn-text)] text-white shrink-0 hover:bg-[var(--ink-btn-hover)] disabled:opacity-50 disabled:bg-gray-300 transition-colors shadow-sm"
              >
                 <Send size={18} className="ml-0.5" />
              </button>
           </div>
        </div>
      )}
      {!discussion.is_member && (
         <div className="bg-[var(--surface-subtle)] p-4 shrink-0 text-center text-sm text-[var(--muted)] border-t border-[var(--line-subtle)] pb-[calc(3.75rem+env(safe-area-inset-bottom,0px))] md:pb-4">
            You must join the discussion to send messages.
         </div>
      )}

      {showMenu === "members" && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={() => { setShowMenu(null); setParticipantFilter(""); }}>
          <div className="w-full max-w-md h-full bg-[var(--surface)] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="h-16 bg-[var(--sidebar-bg)] text-white flex items-center px-4 gap-4">
              <button onClick={() => { setShowMenu(null); setParticipantFilter(""); }}><ArrowLeft size={20} /></button>
              <h2 className="text-lg font-semibold">Group Info & Participants</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24 md:pb-4">
              <div className="bg-[var(--surface)] p-4 rounded-xl border shadow-sm" style={{ borderColor: "var(--line)" }}>
                <h3 className="text-xl font-bold text-[var(--text)] mb-1">{discussion.title}</h3>
                <p className="text-sm text-[var(--muted)]">Group • {membersList.length} participants</p>
                {discussion.description && (
                  <p className="text-xs text-[var(--text)] mt-2 italic bg-[var(--surface-subtle)] p-2.5 rounded-lg border border-[var(--line)]">
                    {discussion.description}
                  </p>
                )}
              </div>

              {/* Search participants */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border" style={{ background: "var(--input-bg)", borderColor: "var(--line)" }}>
                <Search size={16} color="var(--muted)" />
                <input
                  type="text"
                  value={participantFilter}
                  onChange={(e) => setParticipantFilter(e.target.value)}
                  placeholder="Search participants..."
                  className="bg-transparent text-sm outline-none w-full text-[var(--text)]"
                />
                {participantFilter && (
                  <button 
                    onClick={() => setParticipantFilter("")} 
                    className="text-xs text-[var(--muted)] hover:text-[var(--text)] px-1"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Participants list */}
              <div className="bg-[var(--surface)] rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: "var(--line)" }}>
                 <div className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--accent)] border-b flex justify-between items-center" style={{ borderColor: "var(--line)" }}>
                   <span>{membersList.length} Participants</span>
                   <span className="text-[11px] lowercase text-[var(--muted)]">Click to view profile</span>
                 </div>
                 <div className="divide-y" style={{ borderColor: "var(--line-subtle)" }}>
                   {membersList
                     .filter(m => !participantFilter.trim() || (m.user_name || "").toLowerCase().includes(participantFilter.toLowerCase()))
                     .map((m, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setSelectedProfileUserId(m.user_id)}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-hover)] cursor-pointer transition-colors group"
                      >
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-xs flex-shrink-0"
                          style={{
                            background: m.user_id === user?.id 
                              ? "var(--accent)" 
                              : `hsl(${((m.user_name || "U").charCodeAt(0) * 45) % 360}, 65%, 45%)`
                          }}
                        >
                          {(m.user_name || "U").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[var(--text)] font-medium truncate group-hover:text-[var(--accent)] transition-colors">
                              {m.user_id === user?.id ? `${m.user_name} (You)` : m.user_name}
                            </span>
                            {m.role === "admin" && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-semibold">
                                Admin
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-[var(--muted)] flex items-center gap-1">
                            <span>View public profile</span>
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--accent)]">→</span>
                          </span>
                        </div>
                      </div>
                   ))}
                   {membersList.filter(m => !participantFilter.trim() || (m.user_name || "").toLowerCase().includes(participantFilter.toLowerCase())).length === 0 && (
                     <div className="p-6 text-center text-sm text-[var(--muted)]">
                       No participants matched "{participantFilter}"
                     </div>
                   )}
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Public User Profile Modal */}
      {selectedProfileUserId && (
        <UserProfileModal
          userId={selectedProfileUserId}
          onClose={() => setSelectedProfileUserId(null)}
          accessToken={accessToken}
        />
      )}
    </div>
  );
}
