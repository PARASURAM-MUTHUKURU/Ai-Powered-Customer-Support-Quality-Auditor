import React, { useState } from 'react';
import { Search, Loader2, FileText, Upload, AlertCircle, ExternalLink } from 'lucide-react';
import { queryRAG, ingestFile, RAGSource } from '../services/ragService';
import { UsageIndicator } from './UsageIndicator';

export const RAGSearch: React.FC = () => {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [answer, setAnswer] = useState<string | null>(null);
    const [sources, setSources] = useState<RAGSource[]>([]);
    const [ingesting, setIngesting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setError(null);
        try {
            const res = await queryRAG(query);
            setAnswer(res.answer);
            setSources(res.sources);
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIngesting(true);
        setError(null);
        try {
            await ingestFile(file);
            alert(`${file.name} ingested successfully!`);
        } catch (err: any) {
            setError(err.message || 'Ingestion failed');
        } finally {
            setIngesting(false);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto p-8 space-y-8 max-w-5xl mx-auto">
            <div className="space-y-2">
                <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                    <div>
                        <h2 className="text-3xl font-display font-bold text-white">Knowledge Base</h2>
                        <p className="text-zinc-400">Query your documents using AI for contextual answers.</p>
                    </div>
                    <UsageIndicator service="both" compact className="mb-0 mx-0 w-64 bg-transparent border-none md:pb-1" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Search Input */}
                <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-xl space-y-4">
                    <form onSubmit={handleSearch} className="relative">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Ask a question about your policies or transcripts..."
                            className="w-full bg-brand-bg border border-brand-border rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-brand-accent transition-all"
                        />
                        <Search className="absolute left-4 top-3.5 text-zinc-500" size={20} />
                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-4 w-full bg-brand-accent hover:bg-brand-accent/90 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Ask AI'}
                        </button>
                    </form>
                </div>

                {/* Upload Block */}
                <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-xl flex flex-col items-center justify-center space-y-4 text-center">
                    <div className="p-4 bg-brand-accent/10 rounded-full">
                        <Upload className="text-brand-accent" size={32} />
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-bold text-lg">Ingest Documents</h3>
                        <p className="text-xs text-zinc-500">Upload PDF, DOCX, or TXT files to expand knowledge</p>
                    </div>
                    <label className="cursor-pointer bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50">
                        {ingesting ? 'Ingesting...' : 'Select File'}
                        <input type="file" className="hidden" onChange={handleFileUpload} disabled={ingesting} />
                    </label>
                </div>
            </div>

            {error && (
                <div className="bg-brand-red/10 border border-brand-red/20 rounded-xl p-4 flex items-center gap-3 text-brand-red">
                    <AlertCircle size={20} />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            {(answer || loading) && (
                <div className="bg-brand-surface border border-brand-border rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-brand-accent"></div>
                    {loading ? (
                        <div className="flex items-center gap-4 text-zinc-400">
                            <Loader2 className="animate-spin" size={24} />
                            <p className="font-medium animate-pulse">Thinking...</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-brand-accent">AI Response</h3>
                                <div className="prose prose-invert max-w-none text-zinc-200 leading-relaxed text-lg">
                                    {answer}
                                </div>
                            </div>

                            {sources.length > 0 && (
                                <div className="pt-6 border-t border-brand-border space-y-4">
                                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Sources Used</h4>
                                    <div className="flex flex-wrap gap-3">
                                        {sources.map((src, i) => (
                                            <div key={i} className="flex items-center gap-2 bg-brand-bg border border-brand-border px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400">
                                                <FileText size={14} className="text-brand-accent" />
                                                <span>{src.source.split(/[\\/]/).pop()}</span>
                                                <span className="text-[10px] bg-zinc-800 px-1.5 rounded text-zinc-500">{Math.round(src.top_score * 100)}% Match</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
