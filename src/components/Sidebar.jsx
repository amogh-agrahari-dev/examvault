import React from "react";
import { GraduationCap, ChevronLeft, ChevronRight, X } from "lucide-react";
import { NAV_ITEMS } from "../data/mockData";
import { useAuth } from "../context/AuthContext";

function Sidebar({ page, setPage, collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const { user } = useAuth();
  const initials = user?.full_name?.slice(0, 2).toUpperCase() || "EV";

  const renderNav = (isMobile = false) => (
    <div 
      className="sa-sidebar h-full flex flex-col shadow-2xl md:shadow-none" 
      style={{ width: isMobile ? 280 : collapsed ? 72 : 240 }}
    >
      <div className="flex items-center justify-between px-4 py-5" style={{ minHeight: 64 }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(232,163,61,0.15)" }}>
            <GraduationCap size={18} color="var(--accent)" />
          </div>
          {(isMobile || !collapsed) && <span className="sa-serif text-white text-base font-semibold">ExamVault</span>}
        </div>
        {isMobile && (
          <button 
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto sa-scroll">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => { setPage(item.id); setMobileOpen(false); }}
            className={`sa-nav-item w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium ${page === item.id ? "active" : ""}`}
            title={!isMobile && collapsed ? item.label : undefined}
          >
            <item.icon size={18} className="flex-shrink-0" />
            {(isMobile || !collapsed) && <span className="truncate">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="p-3 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="sa-nav-item w-full hidden md:flex items-center gap-2 px-3 py-2 text-xs font-medium mb-2"
          >
            {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /> Collapse</>}
          </button>
        )}
        <div 
          onClick={() => { setPage("profile"); if (setMobileOpen) setMobileOpen(false); }}
          className="flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer hover:bg-white/10 transition-colors group" 
          style={{ background: "rgba(255,255,255,0.05)" }}
          title="View your public profile"
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform" style={{ background: "var(--accent)" }}>
            <span className="text-xs font-bold" style={{ color: "var(--accent-ink)" }}>{initials}</span>
          </div>
          {(isMobile || !collapsed) && (
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
        {renderNav(false)}
      </div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in" 
            onClick={() => setMobileOpen(false)} 
          />
          <div className="relative z-10 animate-in slide-in-from-left duration-200 h-full">
            {renderNav(true)}
          </div>
        </div>
      )}
    </>
  );
}

export default Sidebar;
