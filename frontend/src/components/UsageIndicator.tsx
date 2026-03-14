import React, { useEffect, useState } from 'react';
import { Zap, Database, Info } from 'lucide-react';
import { cn } from '../lib/utils';
import { fetchWithAuth } from '../lib/api';

interface UsageStats {
  usage: Record<string, number>;
  limits: Record<string, number>;
}

interface UsageIndicatorProps {
  service?: 'flash' | 'embed' | 'both';
  compact?: boolean;
  className?: string;
}

export const UsageIndicator = ({ service = 'both', compact = false, className }: UsageIndicatorProps) => {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUsage = async () => {
    try {
      const response = await fetchWithAuth('/api/ai/usage');
      if (!response.ok) throw new Error('Failed to fetch usage');
      const data = await response.json();
      
      if (data && data.usage && data.limits) {
        setStats(data);
      } else {
        console.error('Invalid usage data format:', data);
      }
    } catch (error) {
      console.error('Failed to fetch usage stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
    const interval = setInterval(fetchUsage, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !stats) return null;

  const isEmbedding = (key: string) => key.toLowerCase().includes('embed') || key.toLowerCase().includes('embedding');
  const isFlash = (key: string) => key.toLowerCase().includes('flash');

  const filteredServices = Object.keys(stats.usage).filter(key => {
    if (service === 'flash') return isFlash(key);
    if (service === 'embed') return isEmbedding(key);
    return true;
  });

  // Sort: Flash models first, then embedding
  const sortedServices = [...filteredServices].sort((a, b) => {
    if (isFlash(a) && !isFlash(b)) return -1;
    if (!isFlash(a) && isFlash(b)) return 1;
    return a.localeCompare(b);
  });

  if (sortedServices.length === 0) return null;

  const getLabel = (key: string) => {
    if (key.includes('embedding')) return 'Embeddings';
    if (key.includes('flash-lite')) return 'Flash Lite';
    if (key.includes('flash')) return 'Flash';
    if (key === 'gemini_embed') return 'Embeddings';
    if (key === 'gemini_flash') return 'Flash';
    return key.replace('gemini-', '').replace('models/', '');
  };

  return (
    <div className={cn(
      "bg-brand-bg/50 border border-brand-border rounded-2xl",
      compact ? "p-2" : "p-4 mx-3 mb-4 space-y-4",
      className
    )}>
      {sortedServices.map(key => {
        const used = stats.usage[key] || 0;
        const limit = stats.limits[key] || (isEmbedding(key) ? 1000 : 20);
        const remaining = Math.max(0, limit - used);
        const percentage = Math.min(100, (used / limit) * 100);
        
        const isCritical = remaining <= (limit * 0.15);
        const isWarning = remaining <= (limit * 0.35);
        const label = getLabel(key);
        const Icon = isEmbedding(key) ? Database : Zap;

        return (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "p-1.5 rounded-lg",
                  isCritical ? "bg-brand-red/10 text-brand-red" : isWarning ? "bg-brand-accent/10 text-brand-accent" : "bg-brand-green/10 text-brand-green"
                )}>
                  <Icon size={compact ? 10 : 12} fill={isFlash(key) ? "currentColor" : "none"} />
                </div>
                <div>
                  {!compact && <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{isEmbedding(key) ? 'Other Models' : 'API Quota'} ({label})</p>}
                  <p className={cn(
                      "font-bold",
                      compact ? "text-[10px]" : "text-xs",
                      isCritical ? "text-brand-red" : isWarning ? "text-brand-accent" : "text-zinc-200"
                  )}>
                    {remaining} / {limit} {compact ? 'RPD' : 'left'}
                  </p>
                </div>
              </div>
              {isCritical && !compact && (
                  <div className="animate-pulse text-brand-red">
                      <Info size={14} />
                  </div>
              )}
            </div>

            <div className={cn("w-full bg-zinc-800 rounded-full overflow-hidden", compact ? "h-0.5" : "h-1")}>
              <div 
                className={cn(
                  "h-full transition-all duration-500",
                  isCritical ? "bg-brand-red" : isWarning ? "bg-brand-accent" : "bg-brand-green"
                )}
                style={{ width: `${100 - percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
