import React from "react";
import { GraduationCap, ChevronLeft, ChevronRight } from "lucide-react";
import { NAV_ITEMS } from "../data/mockData";
import { useAuth } from "../context/AuthContext";

function Sidebar({ page, setPage, collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const { user } = useAuth();
  const initials = user?.full_name?.slice(0, 2).toUpperCase() || "EV";
  const content = (
    <div className="sa-sidebar h-full flex flex-col" style={{ width: collapsed ? 72 : 240 }}>
      <div className="flex items-center gap-2 px-4 py-5" style={{ minHeight: 64 }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(232,163,61,0.15)" }}>
          <GraduationCap size={18} color="var(--accent)" />
        </div>
        {!collapsed && <span className="sa-serif text-white text-base font-semibold">ExamVault</span>}
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto sa-scroll">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => { setPage(item.id); setMobileOpen(false); }}
            className={`sa-nav-item w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium ${page === item.id ? "active" : ""}`}
            title={collapsed ? item.label : undefined}
          >
            <item.icon size={18} className="flex-shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="p-3 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="sa-nav-item w-full hidden md:flex items-center gap-2 px-3 py-2 text-xs font-medium mb-2"
        >
          {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /> Collapse</>}
        </button>
        <div 
          onClick={() => { setPage("profile"); if (setMobileOpen) setMobileOpen(false); }}
          className="flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer hover:bg-white/10 transition-colors group" 
          style={{ background: "rgba(255,255,255,0.05)" }}
          title="View your public profile"
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform" style={{ background: "var(--accent)" }}>
            <span className="text-xs font-bold" style={{ color: "var(--accent-ink)" }}>{initials}</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-white text-xs font-medium truncate group-hover:text-[var(--accent)] transition-colors">{user?.full_name || "ExamVault student"}</div>
              <div className="text-xs truncate" style={{ color: "#9BA4BE" }}>{user?.reputation_credits ?? 0} Vault Credits</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="hidden md:block flex-shrink-0 transition-all duration-200" style={{ width: collapsed ? 72 : 240 }}>
        {content}
      </div>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full z-50">{content}</div>
        </div>
      )}
    </>
  );
}


export default Sidebar;
