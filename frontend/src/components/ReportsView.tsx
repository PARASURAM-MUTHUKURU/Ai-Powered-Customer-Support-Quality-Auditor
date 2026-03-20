import React, { useState, memo } from 'react';
import jsPDF from 'jspdf';
import {
  FileText,
  Calendar,
  Users,
  TrendingUp,
  Download,
  Filter,
  Clock,
  Settings,
  Plus,
  ChevronRight,
  FileCheck,
  Loader2,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Analytics, Audit } from '../types';
import { cn } from '../lib/utils';
import { useToast } from './Toasts';
import { downloadFileWithAuth } from '../lib/api';

interface ReportsViewProps {
  analytics: Analytics | null;
  audits: Audit[];
  userRole?: string;
}

export const ReportsView = memo(({ analytics, audits, userRole = 'supervisor' }: ReportsViewProps) => {
  const { showToast } = useToast();
  const [reportType, setReportType] = useState('Performance');
  const [dateRange, setDateRange] = useState('This Week');
  const [team, setTeam] = useState('All Teams');
  const [format, setFormat] = useState('PDF');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['Quality Scores', 'Compliance Rate', 'Violation Details', 'Agent Rankings']);

  const [recentReports, setRecentReports] = useState([
    { id: 1, name: 'Weekly Performance Audit', date: 'Oct 12, 2023', type: 'PDF', status: 'Completed' },
    { id: 2, name: 'Compliance Violation Summary', date: 'Oct 10, 2023', type: 'Excel', status: 'Completed' },
    { id: 3, name: 'Agent Ranking Quarterly', date: 'Oct 05, 2023', type: 'CSV', status: 'Completed' },
  ]);

  const [scheduledReports, setScheduledReports] = useState([
    { id: 1, name: 'Daily Compliance Feed', nextRun: 'Tomorrow, 08:00 AM', frequency: 'Daily' },
    { id: 2, name: 'Monthly Executive Summary', nextRun: 'Nov 01, 2023', frequency: 'Monthly' },
  ]);

  const toggleMetric = (metric: string) => {
    setSelectedMetrics(prev =>
      prev.includes(metric) ? prev.filter(m => m !== metric) : [...prev, metric]
    );
  };

  const generateReportContent = (formatToGenerate: string) => {
    const isCsv = formatToGenerate === 'CSV' || formatToGenerate === 'Excel';
    const isTxt = formatToGenerate === 'TXT';
    let content = '';

    if (isCsv) {
      content += `"AuditAI Intelligence Report"\n`;
      content += `"Report Type:","${reportType} Report"\n`;
      content += `"Date Range:","${dateRange}"\n`;
      content += `"Team:","${team}"\n`;
      content += `"Generated:","${new Date().toLocaleString()}"\n`;
      content += `"Metrics Included:","${selectedMetrics.join(', ')}"\n\n`;

      if (selectedMetrics.includes('Agent Rankings')) {
        content += '--- Agent Rankings ---\n';
        content += 'ID,Name,Avg Score,Empathy,Resolution,Compliance,Total Audits\n';
        if (analytics?.stats) {
          const sortedAgents = [...analytics.stats].sort((a, b) => b.avg_score - a.avg_score);
          sortedAgents.forEach(agent => {
            content += `"${agent.agent_id}","${agent.agent_name}","${Math.round(agent.avg_score)}%","${Math.round(agent.avg_empathy)}%","${Math.round(agent.avg_resolution)}%","${Math.round(agent.avg_compliance)}%","${agent.total_audits}"\n`;
          });
        }
        content += '\n';
      }

      if (selectedMetrics.includes('Quality Scores') || selectedMetrics.includes('Compliance Rate') || selectedMetrics.includes('Violation Details')) {
        content += '--- Audit Log ---\n';
        content += 'Audit ID,Date,Agent Name,Type,Overall Score,Empathy,Resolution,Compliance,Violations Count\n';

        const sortedAudits = [...audits].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        sortedAudits.forEach(audit => {
          content += `"${audit.id}","${new Date(audit.created_at).toLocaleDateString()}","${audit.agent_name}","${audit.type}","${audit.overall_score}%","${audit.empathy_score}%","${audit.resolution_score}%","${audit.compliance_score}%","${audit.violations?.length || 0}"\n`;
        });
        content += '\n';
      }

      if (selectedMetrics.includes('Trend Analysis')) {
        content += '--- Trend Analysis ---\n';
        content += 'Date,Avg Overall Score,Avg Empathy,Avg Resolution,Avg Compliance\n';
        if (analytics?.trend) {
          analytics.trend.forEach(t => {
            content += `"${t.date}","${Math.round(t.avg_score)}%","${Math.round(t.avg_empathy)}%","${Math.round(t.avg_resolution)}%","${Math.round(t.avg_compliance)}%"\n`;
          });
        }
        content += '\n';
      }
    } else {
      if (isTxt) {
        content += `=================================================================\n`;
        content += `                   AuditAI Intelligence Report                   \n`;
        content += `=================================================================\n`;
        content += `Report Type  : ${reportType} Report\n`;
        content += `Date Range   : ${dateRange}\n`;
        content += `Team         : ${team}\n`;
        content += `Generated At : ${new Date().toLocaleString()}\n`;
        content += `Metrics      : ${selectedMetrics.join(', ')}\n`;
        content += `=================================================================\n\n`;
      }

      if (selectedMetrics.includes('Agent Rankings') && analytics?.stats) {
        content += `=== TOP AGENTS ===\n`;
        const topAgents = [...analytics.stats].sort((a, b) => b.avg_score - a.avg_score);
        topAgents.forEach(a => {
          content += `${a.agent_name.padEnd(20)} | Score: ${Math.round(a.avg_score)}% | Empathy: ${Math.round(a.avg_empathy)}% | Res: ${Math.round(a.avg_resolution)}% | Audits: ${a.total_audits}\n`;
        });
        content += `\n`;
      }

      if (selectedMetrics.includes('Quality Scores') || selectedMetrics.includes('Compliance Rate') || selectedMetrics.includes('Violation Details')) {
        content += `=== AUDIT LOG ===\n`;
        const sortedAudits = [...audits].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        sortedAudits.forEach(audit => {
          content += `[${new Date(audit.created_at).toLocaleDateString()}] ID: ${audit.id} | Agent: ${audit.agent_name.padEnd(15)} | Score: ${audit.overall_score.toString().padEnd(3)}% | Comp: ${audit.compliance_score}%\n`;
          if (selectedMetrics.includes('Violation Details') && audit.violations && audit.violations.length > 0) {
            content += `  Violations:\n`;
            audit.violations.forEach(v => {
              content += `    - [${v.severity}] ${v.type}: ${v.description}\n`;
            });
          }
        });
        content += `\n`;
      }

      if (selectedMetrics.includes('Trend Analysis') && analytics?.trend) {
        content += `=== TREND ANALYSIS ===\n`;
        analytics.trend.forEach(t => {
          content += `Date: ${t.date.padEnd(12)} | Avg Score: ${Math.round(t.avg_score)}% | Compliance: ${Math.round(t.avg_compliance)}%\n`;
        });
        content += `\n`;
      }
    }

    return content;
  };

  const handleGenerateReport = async () => {
    if (selectedMetrics.length === 0) {
      showToast('Please select at least one metric.', 'error');
      return;
    }

    setIsGenerating(true);
    showToast('Generating report...', 'info');

    // Simulate API call processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    const newReport = {
      id: Date.now(),
      name: `${reportType} Report - ${dateRange}`,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      type: format,
      status: 'Completed'
    };

    setRecentReports(prev => [newReport, ...prev]);
    setIsGenerating(false);
    showToast(`${reportType} report generated successfully!!`, 'success');

    // Auto download with dynamic content
    const content = generateReportContent(format);
    downloadReport(newReport.name, newReport.type, content);
  };

  const downloadReport = (name: string, format: string, customContent?: string) => {
    const isCsv = format === 'CSV' || format === 'Excel';
    const isPdf = format === 'PDF';
    const content = customContent || generateReportContent(format);

    if (isPdf) {
      const metricsParam = selectedMetrics.join(',');
      downloadFileWithAuth(`/api/reports/export/summary?metrics=${encodeURIComponent(metricsParam)}`, `${name.replace(/\s+/g, '_')}.pdf`)
        .then(() => showToast('Summary Report downloaded', 'success'))
        .catch(() => showToast('Failed to export Summary Report', 'error'));
      showToast('Exporting Summary Report...', 'info');
      return;
    }

    if (format === 'Detailed PDF (Backend)') {
      // Assuming we take the most recent audit for the "detailed" version in this specific builder
      if (audits.length > 0) {
        downloadFileWithAuth(`/api/reports/export/pdf/${audits[0].id}`, `audit_${audits[0].id}_detailed.pdf`)
          .then(() => showToast('Detailed PDF downloaded', 'success'))
          .catch(() => showToast('Failed to export Detailed PDF', 'error'));
        showToast('Exporting Detailed PDF...', 'info');
      } else {
        showToast('No audits found for detailed report.', 'error');
      }
      return;
    }

    const mimeType = isCsv ? 'text/csv' : 'text/plain';
    const extension = isCsv ? 'csv' : 'txt';

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name.replace(/\s+/g, '_')}.${extension}`;
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
    showToast(`Downloading ${format} file...`, 'info');
  };

  const handleAddSchedule = () => {
    const newSchedule = {
      id: Date.now(),
      name: `Automated ${reportType} Feed`,
      nextRun: 'Calculated based on frequency',
      frequency: 'Weekly'
    };
    setScheduledReports(prev => [newSchedule, ...prev]);
    showToast('New schedule created successfully!', 'success');
  };

  const deleteRecent = (id: number) => {
    setRecentReports(prev => prev.filter(r => r.id !== id));
    showToast('Report removed from history.', 'info');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-brand-bg p-4 md:p-8 space-y-12">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-4xl font-display font-black text-white tracking-tight">Reports <span className="text-brand-accent">Engine</span></h2>
            <p className="text-zinc-400 font-medium">Generate custom insights, schedule automation, and manage history.</p>
          </div>
          <div className="flex items-center gap-2 bg-brand-surface/50 backdrop-blur-md border border-brand-border px-4 py-2 rounded-2xl">
            <Clock className="text-zinc-500" size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Last updated just now</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Report Builder - 2 Columns */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-brand-surface/40 backdrop-blur-md border border-brand-border p-10 rounded-[3rem] space-y-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-accent/5 rounded-full blur-[100px] pointer-events-none"></div>

              <div className="flex items-center gap-4">
                <div className="p-3 bg-brand-accent/20 rounded-2xl border border-brand-accent/30">
                  <Plus className="text-brand-accent" size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-display font-black text-white">Report Builder</h3>
                  <p className="text-sm text-zinc-500 font-medium">Configure and generate a manual report.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <BuilderSelect
                  label="REPORT TYPE"
                  value={reportType}
                  onChange={setReportType}
                  options={['Performance', 'Compliance', 'Resolution', 'Coaching']}
                />
                <BuilderSelect
                  label="DATE RANGE"
                  value={dateRange}
                  onChange={setDateRange}
                  options={['Today', 'This Week', 'This Month', 'Last 30 Days', 'Custom']}
                />
                <BuilderSelect
                  label="TEAM"
                  value={team}
                  onChange={setTeam}
                  options={['All Teams', 'Support Alpha', 'Sales Beta', 'Tech Gamma']}
                />
                <BuilderSelect
                  label="FORMAT"
                  value={format}
                  onChange={setFormat}
                  options={userRole === 'agent'
                    ? ['PDF', 'Excel', 'CSV', 'TXT']
                    : ['PDF', 'Excel', 'CSV', 'TXT', 'Detailed PDF (Backend)']
                  }
                />
              </div>

              <div className="space-y-4 pt-4 border-t border-brand-border/50">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">INCLUDE METRICS</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {['Quality Scores', 'Compliance Rate', 'Violation Details', 'Agent Rankings', 'Trend Analysis', 'Suggestions'].map((metric) => (
                    <label key={metric} className={cn(
                      "flex items-center gap-3 p-4 border rounded-2xl cursor-pointer transition-all group",
                      selectedMetrics.includes(metric)
                        ? "bg-brand-accent/10 border-brand-accent/40"
                        : "bg-brand-bg/50 border-brand-border hover:border-zinc-700"
                    )}>
                      <input
                        type="checkbox"
                        checked={selectedMetrics.includes(metric)}
                        onChange={() => toggleMetric(metric)}
                        className="w-4 h-4 rounded border-brand-border bg-brand-surface text-brand-accent focus:ring-brand-accent/50"
                      />
                      <span className={cn(
                        "text-sm font-bold transition-colors",
                        selectedMetrics.includes(metric) ? "text-brand-accent" : "text-zinc-400 group-hover:text-zinc-200"
                      )}>{metric}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerateReport}
                disabled={isGenerating}
                className={cn(
                  "w-full py-6 rounded-3xl font-black text-sm uppercase tracking-widest shadow-2xl transition-all flex items-center justify-center gap-3",
                  isGenerating
                    ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                    : "bg-brand-accent text-white hover:bg-brand-accent/90"
                )}
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Download size={20} />
                    Generate Report →
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Side Panels - 1 Column */}
          <div className="space-y-8">
            {/* Recent Reports */}
            <div className="bg-brand-surface/40 backdrop-blur-md border border-brand-border p-8 rounded-[2.5rem] space-y-6">
              <h3 className="text-xl font-display font-bold">Recent Reports</h3>
              <div className="space-y-3 min-h-[200px]">
                <AnimatePresence initial={false}>
                  {recentReports.map(report => (
                    <motion.div
                      key={report.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="flex items-center justify-between p-4 bg-brand-bg/50 border border-brand-border rounded-2xl group hover:border-brand-accent/30 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-zinc-800 rounded-xl border border-brand-border">
                          <FileText className="text-zinc-500 group-hover:text-brand-accent transition-colors" size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-zinc-200">{report.name}</p>
                          <p className="text-[10px] text-zinc-500 font-black uppercase">{report.date} • {report.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Download
                          size={16}
                          className="text-zinc-600 hover:text-brand-accent transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadReport(report.name, report.type);
                          }}
                        />
                        <Trash2
                          size={16}
                          className="text-zinc-600 hover:text-brand-red transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteRecent(report.id);
                          }}
                        />
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {recentReports.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-600 py-10 border border-dashed border-brand-border rounded-2xl">
                    <FileText size={32} strokeWidth={1} />
                    <p className="text-xs font-bold mt-2">No reports yet</p>
                  </div>
                )}
              </div>
              <button className="w-full py-3 text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-brand-accent transition-colors border border-dashed border-brand-border rounded-xl">
                View All History
              </button>
            </div>

            {userRole !== 'agent' && (
              <div className="bg-brand-surface/40 backdrop-blur-md border border-brand-border p-8 rounded-[2.5rem] space-y-6">
                <h3 className="text-xl font-display font-bold">Recent Audits</h3>
                <div className="space-y-3">
                  {audits.slice(0, 5).map(audit => (
                    <div key={audit.id} className="flex items-center justify-between p-4 bg-brand-bg/50 border border-brand-border rounded-2xl">
                      <div className="flex flex-col">
                        <p className="text-sm font-bold text-zinc-200">Audit #{audit.id}</p>
                        <p className="text-[10px] text-zinc-500 font-black uppercase">{audit.agent_name}</p>
                      </div>
                      <button
                        onClick={() => {
                          downloadFileWithAuth(`/api/reports/export/pdf/${audit.id}`, `audit_${audit.id}_detailed.pdf`)
                            .then(() => showToast(`Audit #${audit.id} PDF downloaded`, 'success'))
                            .catch(() => showToast('Failed to download PDF', 'error'));
                          showToast('Starting download...', 'info');
                        }}
                        className="p-2 hover:bg-brand-accent/10 rounded-xl transition-colors text-zinc-500 hover:text-brand-accent"
                        title="Download Detailed PDF"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Scheduled Tasks */}
            <div className="bg-brand-surface/40 backdrop-blur-md border border-brand-border p-8 rounded-[2.5rem] space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-display font-bold">Scheduled</h3>
                <Settings size={18} className="text-zinc-600 cursor-pointer hover:text-white transition-colors" />
              </div>
              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {scheduledReports.map(task => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-brand-bg/50 border border-brand-border rounded-2xl space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-zinc-200">{task.name}</p>
                        <span className="px-2 py-1 bg-brand-accent/10 border border-brand-accent/20 rounded-md text-[8px] font-black uppercase text-brand-accent">{task.frequency}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar size={12} className="text-zinc-500" />
                        <p className="text-[10px] text-zinc-500 font-medium whitespace-nowrap overflow-hidden text-ellipsis">Next run: {task.nextRun}</p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              <button
                onClick={handleAddSchedule}
                className="w-full bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
              >
                Add Schedule
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Insight Section (reused with refinement) */}
        <div className="bg-gradient-to-r from-brand-accent/20 to-brand-green/10 border border-brand-accent/20 p-6 md:p-10 rounded-[3rem] items-center">
          <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            <div className="p-6 bg-brand-surface rounded-full shadow-2xl shrink-0">
              <FileCheck size={48} className="text-brand-accent" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl md:text-3xl font-display font-black text-white leading-tight">Automation Active</h3>
              <p className="text-zinc-400 text-sm md:text-lg">Your reports are being automatically summarized by Gemini 1.5 Pro and delivered to your Slack channel.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

const BuilderSelect = ({ label, value, onChange, options }: any) => (
  <div className="space-y-3">
    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{label}</p>
    <div className="relative group">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-brand-bg/50 border border-brand-border rounded-2xl py-4 px-5 text-sm font-bold text-zinc-300 appearance-none focus:outline-none focus:border-brand-accent/50 transition-all cursor-pointer"
      >
        {options.map((opt: string) => (
          <option key={opt} value={opt} className="bg-brand-surface">{opt}</option>
        ))}
      </select>
      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 group-hover:text-brand-accent transition-colors">
        <ChevronRight size={16} className="rotate-90" />
      </div>
    </div>
  </div>
);
