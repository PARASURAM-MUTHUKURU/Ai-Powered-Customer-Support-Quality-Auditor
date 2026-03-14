import React from 'react';
import { Search, MessageSquare, Phone, AlertCircle, Plus, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Audit } from '../types';
import { AuditSkeleton } from './Skeleton';
import { UsageIndicator } from './UsageIndicator';

interface CallHistorySidebarProps {
  audits: Audit[];
  selectedAudit: Audit | null;
  setSelectedAudit: (audit: Audit) => void;
  setShowNewAuditModal: (show: boolean) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  loading?: boolean;
  onDeleteAudit?: (id: number) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const CallHistorySidebar = ({
  audits,
  selectedAudit,
  setSelectedAudit,
  setShowNewAuditModal,
  collapsed,
  setCollapsed,
  loading = false,
  onDeleteAudit,
  activeTab,
  setActiveTab
}: CallHistorySidebarProps) => {
  return (
    <aside className={cn(
      "border-r border-brand-border bg-brand-surface flex flex-col transition-all duration-300 z-30",
      collapsed ? "hidden md:flex md:w-16 md:relative" : "absolute inset-0 md:relative w-full md:w-80"
    )}>
      {/* Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-brand-surface border border-brand-border rounded-full hidden md:flex items-center justify-center text-zinc-400 hover:text-white z-10 shadow-lg"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Mobile Close Button */}
      <button
        onClick={() => setCollapsed(true)}
        className="absolute right-4 top-6 md:hidden text-zinc-400 hover:text-white"
      >
        <ChevronLeft size={24} />
      </button>

      <div className={cn("p-6 space-y-6 overflow-hidden", collapsed && "opacity-0 pointer-events-none")}>
        <div className="space-y-1">
          <h2 className="text-xl font-display font-bold tracking-tight text-zinc-100">Call Audits</h2>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Audio Recording History</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
          <input
            type="text"
            placeholder="Search recordings..."
            className="w-full bg-brand-bg border border-brand-border rounded-xl py-2 pl-9 pr-4 text-xs focus:ring-1 focus:ring-brand-accent outline-none transition-all"
          />
        </div>

        <div className="flex p-1 bg-brand-bg rounded-xl border border-brand-border">
          {['All', 'Flagged', 'Critical'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all",
                activeTab === tab ? "bg-brand-accent text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className={cn("flex-1 overflow-y-auto px-3 space-y-1 pb-6", collapsed && "hidden")}>
        {loading ? (
          <>
            <AuditSkeleton />
            <AuditSkeleton />
            <AuditSkeleton />
          </>
        ) : (
          audits.map(audit => (
            <button
              key={audit.id}
              onClick={() => {
                setSelectedAudit(audit);
                if (window.innerWidth < 768) setCollapsed(true);
              }}
              className={cn(
                "w-full text-left p-4 rounded-2xl transition-all group relative border",
                selectedAudit?.id === audit.id
                  ? "bg-brand-card border-brand-border shadow-lg"
                  : "hover:bg-brand-card/50 border-transparent"
              )}
            >
              <div className="flex justify-between items-start mb-2 group-hover:pr-6 relative">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "p-1.5 rounded-lg",
                    audit.type === 'chat' ? "bg-zinc-800 text-zinc-400" : "bg-brand-red/10 text-brand-red"
                  )}>
                    {audit.type === 'chat' ? <MessageSquare size={12} /> : <Phone size={12} />}
                  </div>
                  <div>
                    <span className="font-bold text-xs block text-zinc-200">#{audit.id + 4800}</span>
                    <span className="text-[10px] text-zinc-500 font-medium">6m 14s</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-black",
                    audit.overall_score > 80 ? "bg-brand-green/10 text-brand-green" : audit.overall_score > 60 ? "bg-brand-accent/10 text-brand-accent" : "bg-brand-red/10 text-brand-red"
                  )}>
                    {audit.overall_score}%
                  </div>
                  {onDeleteAudit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const recordName = `${audit.agent_name}/#${audit.id + 4800}`;
                        const userInput = window.prompt(`Type "${recordName}" to confirm deletion:`);
                        if (userInput === recordName) {
                          onDeleteAudit(audit.id);
                        }
                      }}
                      className="absolute right-0 top-0 p-1 text-zinc-500 hover:text-brand-red opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-zinc-400 font-semibold truncate mb-2">{audit.agent_name}</p>
              {audit.violations && audit.violations.length > 0 && (
                <div className="flex items-center gap-1.5 text-brand-red text-[9px] font-black uppercase tracking-widest">
                  <AlertCircle size={10} />
                  {audit.violations.length} Violations
                </div>
              )}
            </button>
          ))
        )}
      </div>

      <UsageIndicator />

      {/* Collapsed View Icons */}
      {collapsed && (
        <div className="flex-1 flex flex-col items-center pt-20 gap-4">
          {audits.map(audit => (
            <button
              key={audit.id}
              onClick={() => {
                setSelectedAudit(audit);
                if (window.innerWidth < 768) setCollapsed(true);
              }}
              className={cn(
                "p-3 rounded-xl transition-all",
                selectedAudit?.id === audit.id ? "bg-brand-accent text-white" : "text-zinc-500 hover:bg-brand-card"
              )}
            >
              {audit.type === 'chat' ? <MessageSquare size={16} /> : <Phone size={16} />}
            </button>
          ))}
        </div>
      )}

    </aside>
  );
};
