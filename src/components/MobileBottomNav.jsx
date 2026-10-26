import React from "react";
import { LayoutDashboard, BookOpen, PenLine, MessageSquare, Trophy } from "lucide-react";

export default function MobileBottomNav({ page, setPage }) {
  const items = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "documents", label: "Docs", icon: BookOpen },
    { id: "notes", label: "Notes", icon: PenLine },
    { id: "group-discussions", label: "Chats", icon: MessageSquare },
    { id: "leaderboard", label: "Ranks", icon: Trophy },
  ];

  const getIsActive = (itemId) => {
    if (itemId === "dashboard" && page === "dashboard") return true;
    if (itemId === "documents" && (page === "documents" || page === "document-study" || page === "upload" || page === "analysis")) return true;
    if (itemId === "notes" && (page === "notes" || page === "note-editor")) return true;
    if (itemId === "group-discussions" && (page === "group-discussions" || page === "chat")) return true;
    if (itemId === "leaderboard" && page === "leaderboard") return true;
    return false;
  };

  return (
    <nav 
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--surface)]/92 backdrop-blur-xl border-t border-[var(--line)] shadow-2xl pb-[env(safe-area-inset-bottom,0px)]"
      style={{
        boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.08)",
      }}
    >
      <div className="grid grid-cols-5 h-14 max-w-md mx-auto items-center px-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = getIsActive(item.id);

          return (
            <button
              key={item.id}
              onClick={() => {
                setPage(item.id);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 select-none relative ${
                isActive 
                  ? "text-[var(--accent)] font-semibold" 
                  : "text-[var(--muted)] hover:text-[var(--text)] active:scale-95"
              }`}
            >
              {/* Active pill background effect */}
              {isActive && (
                <span 
                  className="absolute inset-x-2 inset-y-1 rounded-xl -z-10 animate-in fade-in zoom-in-95 duration-200"
                  style={{ background: "rgba(232, 163, 61, 0.12)" }}
                />
              )}

              <Icon 
                size={18} 
                strokeWidth={isActive ? 2.4 : 1.8} 
                className={`transition-transform ${isActive ? "scale-105" : ""}`}
              />
              <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[56px] leading-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
