import React, { useState, useEffect } from 'react';
import {
    Bell,
    ShieldAlert,
    CheckCircle,
    Clock,
    ExternalLink,
    AlertTriangle,
    Loader2,
    Trash2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useToast } from './Toasts';
import { fetchWithAuth } from '../lib/api';

interface Alert {
    id: number;
    audit_id: number;
    type: string;
    description: string;
    severity: string;
    created_at: string;
    is_resolved: boolean;
}

interface AlertsViewProps {
    onAuditSelect: (auditId: number) => void;
    userRole?: string;
}

export const AlertsView = ({ onAuditSelect, userRole = 'supervisor' }: AlertsViewProps) => {
    const { showToast } = useToast();
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('unresolved');

    useEffect(() => {
        fetchAlerts();
    }, [filter]);

    const fetchAlerts = async () => {
        setLoading(true);
        try {
            const resolvedParam = filter === 'all' ? '' : `?resolved=${filter === 'resolved'}`;
            const endpoint = userRole === 'agent' 
                ? `/api/alerts/agent-notifications${resolvedParam}` 
                : `/api/alerts${resolvedParam}`;
                
            const response = await fetchWithAuth(endpoint);
            if (!response.ok) throw new Error('Failed to fetch alerts');
            const data = await response.json();
            setAlerts(data);
        } catch (error) {
            console.error('Error fetching alerts:', error);
            showToast('Error loading alerts', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async (id: number) => {
        if (userRole !== 'supervisor') {
            showToast('Only supervisors can resolve alerts', 'error');
            return;
        }
        try {
            const response = await fetchWithAuth(`/api/alerts/${id}/resolve`, { method: 'PATCH' });
            if (response.ok) {
                showToast('Alert resolved', 'success');
                fetchAlerts();
            } else {
                throw new Error('Failed to resolve alert');
            }
        } catch (error) {
            console.error('Error resolving alert:', error);
            showToast('Error resolving alert', 'error');
        }
    };

    return (
        <div className="flex-1 overflow-y-auto bg-brand-bg p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-2">
                        <h2 className="text-4xl font-display font-black text-white tracking-tight flex items-center gap-3">
                            Compliance <span className="text-brand-accent">{userRole === 'agent' ? 'Notifications' : 'Alerts'}</span>
                            <div className="bg-brand-red/20 p-2 rounded-xl text-brand-red">
                                <ShieldAlert size={24} />
                            </div>
                        </h2>
                        <p className="text-zinc-400 font-medium">
                            {userRole === 'agent' 
                                ? 'Review compliance flags related to your sessions.' 
                                : 'Monitor and resolve critical compliance violations in real-time.'}
                        </p>
                    </div>

                    <div className="flex bg-brand-surface border border-brand-border p-1 rounded-xl">
                        {(['unresolved', 'resolved', 'all'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                                    filter === f
                                        ? "bg-brand-accent text-white shadow-lg"
                                        : "text-zinc-500 hover:text-white"
                                )}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="animate-spin text-brand-accent" size={48} />
                    </div>
                ) : alerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-brand-surface/40 border border-dashed border-brand-border rounded-[3rem] text-zinc-500 gap-4">
                        <CheckCircle size={64} className="opacity-10" />
                        <p className="font-display font-bold text-xl">All clear! No {userRole === 'agent' ? 'notifications' : 'alerts'} found.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {alerts.map((alert) => (
                            <div
                                key={alert.id}
                                className={cn(
                                    "bg-brand-surface/40 backdrop-blur-md border p-6 rounded-3xl flex items-center justify-between group transition-all",
                                    alert.is_resolved ? "border-brand-border opacity-60" : "border-brand-red/30 hover:border-brand-red/50"
                                )}
                            >
                                <div className="flex items-center gap-6">
                                    <div className={cn(
                                        "p-4 rounded-2xl",
                                        alert.severity === 'Critical' ? "bg-brand-red/20 text-brand-red" : "bg-brand-accent/20 text-brand-accent"
                                    )}>
                                        <AlertTriangle size={24} />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className="font-bold text-lg text-white">{alert.type}</h3>
                                            <span className={cn(
                                                "text-[10px] font-black uppercase px-2 py-0.5 rounded",
                                                alert.severity === 'Critical' ? "bg-brand-red/10 text-brand-red" : "bg-brand-accent/10 text-brand-accent"
                                            )}>
                                                {alert.severity}
                                            </span>
                                        </div>
                                        <p className="text-zinc-400 text-sm">{alert.description}</p>
                                        <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-zinc-600">
                                            <span className="flex items-center gap-1.5"><Clock size={12} /> {new Date(alert.created_at).toLocaleString()}</span>
                                            <span className="flex items-center gap-1.5"><Bell size={12} /> Audit #{alert.audit_id}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => onAuditSelect(alert.audit_id)}
                                        className="p-3 bg-brand-bg border border-brand-border rounded-xl text-zinc-400 hover:text-white hover:border-brand-accent transition-all"
                                        title="View Audit"
                                    >
                                        <ExternalLink size={18} />
                                    </button>
                                    {!alert.is_resolved && userRole === 'supervisor' && (
                                        <button
                                            onClick={() => handleResolve(alert.id)}
                                            className="px-6 py-3 bg-brand-green/20 text-brand-green border border-brand-green/30 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-green hover:text-white transition-all"
                                        >
                                            Resolve Issue
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
