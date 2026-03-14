import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MoreHorizontal, Loader2, Upload } from 'lucide-react';
import { cn } from '../lib/utils';
import { Agent } from '../types';
import { UsageIndicator } from './UsageIndicator';

interface AuditModalProps {
  show: boolean;
  onClose: () => void;
  agents: Agent[];
  newAuditData: {
    agentId: string;
    transcript: string;
    type: 'chat' | 'call';
    audioData: string;
    mimeType: string;
  };
  setNewAuditData: React.Dispatch<React.SetStateAction<{
    agentId: string;
    transcript: string;
    type: 'chat' | 'call';
    audioData: string;
    mimeType: string;
  }>>;
  handleAudioUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRunAudit: () => void;
  isTranscribing: boolean;
  isAuditing: boolean;
}

export const AuditModal = ({
  show,
  onClose,
  agents,
  newAuditData,
  setNewAuditData,
  handleAudioUpload,
  handleRunAudit,
  isTranscribing,
  isAuditing
}: AuditModalProps) => {
  useEffect(() => {
    if (show && agents.length === 1 && !newAuditData.agentId) {
      setNewAuditData(prev => ({ ...prev, agentId: String(agents[0].id) }));
    }
  }, [show, agents, newAuditData.agentId, setNewAuditData]);

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-brand-surface border border-brand-border rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-display font-bold">New Quality Audit</h3>
                <button onClick={onClose} className="text-zinc-500 hover:text-white">
                  <MoreHorizontal size={24} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Agent</label>
                  {agents.length === 1 ? (
                    <div className="w-full bg-brand-bg/50 border border-brand-border rounded-xl p-3 text-sm text-zinc-300 font-bold capitalize">
                      {agents[0].name}
                    </div>
                  ) : (
                    <select
                      value={newAuditData.agentId}
                      onChange={(e) => setNewAuditData(prev => ({ ...prev, agentId: e.target.value }))}
                      className="w-full bg-brand-bg border border-brand-border rounded-xl p-3 text-sm outline-none focus:ring-1 focus:ring-brand-accent"
                    >
                      <option value="">Select Agent</option>
                      {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Channel</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setNewAuditData(prev => ({ ...prev, type: 'chat' }))}
                      className={cn("flex-1 py-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all", newAuditData.type === 'chat' ? "bg-brand-accent border-brand-accent text-white" : "border-brand-border text-zinc-500")}
                    >
                      Chat
                    </button>
                    <button
                      onClick={() => setNewAuditData(prev => ({ ...prev, type: 'call' }))}
                      className={cn("flex-1 py-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all", newAuditData.type === 'call' ? "bg-brand-accent border-brand-accent text-white" : "border-brand-border text-zinc-500")}
                    >
                      Call
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Transcript</label>
                  <label className="cursor-pointer group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-accent">
                    <input type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} />
                    {isTranscribing ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                    {isTranscribing ? 'Transcribing...' : newAuditData.audioData ? 'Audio Uploaded' : 'Upload Audio'}
                  </label>
                </div>
                <textarea
                  value={newAuditData.transcript}
                  onChange={(e) => setNewAuditData(prev => ({ ...prev, transcript: e.target.value }))}
                  className="w-full h-48 bg-brand-bg border border-brand-border rounded-2xl p-4 text-sm outline-none focus:ring-1 focus:ring-brand-accent resize-none font-mono"
                  placeholder="Paste transcript here..."
                />
              </div>

              <button
                onClick={handleRunAudit}
                disabled={isAuditing || !newAuditData.agentId || !newAuditData.transcript}
                className="w-full py-4 bg-brand-accent text-white rounded-2xl font-bold text-sm uppercase tracking-widest disabled:opacity-50"
              >
                {isAuditing ? 'Analyzing with Gemini...' : 'Start Audit'}
              </button>

              <UsageIndicator service="flash" className="mx-0 mb-0 bg-transparent border-none p-0" />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
