import React from 'react';
import { Clock, Calendar, Flag, Upload, MessageSquare } from 'lucide-react';
import { Audit } from '../types';
import { cn } from '../lib/utils';

interface TranscriptViewProps {
  selectedAudit: Audit;
  onUploadClick?: () => void;
  userRole?: string;
}

export const TranscriptView = ({ selectedAudit, onUploadClick, userRole }: TranscriptViewProps) => {
  const parseTranscript = (text: string) => {
    if (!text) return [];

    // Updated parsing for "[MM:SS] Speaker Name (Confidence%): Message" format
    const lines = text.split('\n').filter(line => line.trim());
    return lines.map((line, index) => {
      // Match [MM:SS] Name (Conf%): Message
      const match = line.match(/^\[(\d{1,2}:\d{2})\]\s*([^(:]+)\s*(?:\((\d+)\%?\))?:\s*(.*)$/i);

      // Fallback for old formats
      const fallbackMatch = !match ? line.match(/^\[?(\d{1,2}:\d{2})\]?\s*([^:]+):\s*(.*)$/i) : null;
      const simpleMatch = !match && !fallbackMatch ? line.match(/^([^:]+):\s*(.*)$/i) : null;

      const timestamp = match ? match[1] : (fallbackMatch ? fallbackMatch[1] : `00:${(index * 12).toString().padStart(2, '0')}`);
      const name = match ? match[2].trim() : (fallbackMatch ? fallbackMatch[2].trim() : (simpleMatch ? simpleMatch[1].trim() : 'System'));
      const confidence = match ? match[3] : null;
      const message = match ? match[4].trim() : (fallbackMatch ? fallbackMatch[3].trim() : (simpleMatch ? simpleMatch[2].trim() : line));

      const speakerType = name.toLowerCase().includes('customer') || name.toLowerCase().includes('client') || name.toLowerCase() === 'system'
        ? 'customer'
        : 'agent';

      // Find violations for this line index
      const lineViolations = selectedAudit.violations?.filter(v => v.transcript_line_index === index) || [];

      return {
        speaker: speakerType,
        name: name,
        message: message,
        timestamp: timestamp,
        confidence: confidence,
        violations: lineViolations
      };
    });
  };

  const transcriptData = parseTranscript(selectedAudit.transcript);
  const date = new Date(selectedAudit.created_at);

  return (
    <div className="flex-1 flex flex-col bg-brand-bg">
      <div className="h-16 border-b border-brand-border flex items-center justify-between px-4 md:px-8 bg-brand-surface/20 overflow-x-auto">
        <div className="flex items-center gap-4 md:gap-6 shrink-0">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
            <h3 className="font-display font-bold text-base md:text-lg whitespace-nowrap">Call Transcript</h3>
          </div>

          {userRole !== 'supervisor' && (
            <button
              onClick={onUploadClick}
              className="flex items-center gap-2 px-3 py-1.5 bg-brand-accent/10 hover:bg-brand-accent/20 text-brand-accent rounded-lg border border-brand-accent/20 transition-all text-[9px] md:text-[10px] font-black uppercase tracking-widest shrink-0"
            >
              <Upload size={12} />
              <span className="hidden sm:inline">Upload Audio</span>
            </button>
          )}
        </div>
        <div className="hidden sm:flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 shrink-0 ml-4">
          <span className="flex items-center gap-1"><Clock size={12} /> {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <span className="flex items-center gap-1"><Calendar size={12} /> {date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        <div className="space-y-6 max-w-3xl mx-auto">
          {transcriptData.length > 0 ? (
            transcriptData.map((item, i) => (
              <div key={i} className={item.speaker === 'agent' ? "transcript-bubble-agent" : "transcript-bubble-customer"}>
                <div className="flex justify-between items-center mb-2">
                  <p className={cn(
                    "text-[10px] font-black uppercase tracking-widest",
                    item.speaker === 'agent' ? "text-brand-accent" : "text-zinc-500"
                  )}>
                    {item.name}
                  </p>
                  <div className="flex items-center gap-2">
                    {item.confidence && (
                      <span className="text-[9px] font-bold text-brand-accent/60 bg-brand-accent/5 px-1.5 py-0.5 rounded border border-brand-accent/10">
                        {item.confidence}% matching signature
                      </span>
                    )}
                    <span className="text-[9px] font-mono text-zinc-600">{item.timestamp}</span>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-zinc-300">{item.message}</p>

                {item.violations.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {item.violations.map((v, vi) => (
                      <div key={vi} className={cn(
                        "flex items-start gap-2 p-2 rounded-lg border text-[10px] font-medium",
                        v.severity === 'Critical'
                          ? "bg-brand-red/10 border-brand-red/20 text-brand-red"
                          : "bg-brand-accent/10 border-brand-accent/20 text-brand-accent"
                      )}>
                        <Flag size={12} className="mt-0.5 shrink-0" />
                        <div>
                          <span className="font-black uppercase mr-1">[{v.type}]</span>
                          {v.description}
                        </div>
                        {userRole === 'agent' && (
                          <button title="Request Human Review" className="ml-auto flex items-center gap-1.5 px-2 py-1 bg-brand-surface/50 border border-brand-border rounded hover:bg-white/10 transition-colors text-zinc-400 hover:text-white shrink-0 mt-0.5">
                            <MessageSquare size={10} />
                            <span className="text-[8px] uppercase tracking-wider font-bold">Dispute</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-20 text-zinc-600 italic text-sm">
              No transcript content available for this audit.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
