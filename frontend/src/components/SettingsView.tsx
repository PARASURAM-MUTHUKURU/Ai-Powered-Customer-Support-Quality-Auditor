import React from 'react';
import { Settings, Plus, LayoutPanelTop } from 'lucide-react';
import { UsageIndicator } from './UsageIndicator';

interface SettingsViewProps {
    onNewAuditClick: () => void;
}

export const SettingsView = ({ onNewAuditClick }: SettingsViewProps) => {
    return (
        <div className="flex-1 overflow-y-auto p-8 bg-brand-bg">
            <div className="max-w-4xl mx-auto space-y-8">
                <header className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="bg-brand-surface p-2 rounded-xl border border-brand-border">
                            <Settings className="text-brand-accent" size={24} />
                        </div>
                        <h2 className="font-display font-bold text-2xl">Platform Settings</h2>
                    </div>
                    <p className="text-zinc-500">Manage your workspace configuration and administrative tools.</p>
                </header>

                <section className="bg-brand-surface border border-brand-border rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-brand-border">
                        <h3 className="font-display font-bold text-lg text-white mb-2 flex items-center gap-2">
                            <LayoutPanelTop size={20} className="text-brand-accent" />
                            Administrative Actions
                        </h3>
                        <p className="text-sm text-zinc-400">
                            Tools available exclusively for supervisors and administrative staff.
                        </p>
                    </div>
                    <div className="p-6 bg-brand-surface/50">
                        <div className="flex items-center justify-between p-4 bg-brand-bg rounded-xl border border-brand-border/50">
                            <div>
                                <h4 className="font-bold text-zinc-200">Manual Quality Audit</h4>
                                <p className="text-sm text-zinc-500 mt-1">
                                    Upload an audio file or paste a text transcript to initiate a manual quality assurance audit.
                                </p>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <button
                                    onClick={onNewAuditClick}
                                    className="px-4 py-2 bg-brand-accent text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg hover:bg-brand-accent/90 transition-all flex items-center gap-2 whitespace-nowrap"
                                >
                                    <Plus size={16} />
                                    <span>New Audit</span>
                                </button>
                                <UsageIndicator service="flash" compact className="bg-transparent border-none p-0 mb-0 mx-0" />
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};
