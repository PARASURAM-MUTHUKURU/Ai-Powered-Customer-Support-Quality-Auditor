import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  MessageSquare,
  Phone,
  LayoutDashboard,
  Users,
  History,
  Bell,
  Settings,
  FileAudio,
  Upload,
  Target,
  BookOpen,
  Plus,
  Menu,
  X,
  LogOut,
  Loader2,
  ShieldAlert
} from 'lucide-react';
import { auditTranscript, transcribeAudio } from './services/geminiService';
import { Agent, Audit, Analytics } from './types';

// Components
import { NavItem } from './components/NavItem';
import { CallHistorySidebar } from './components/CallHistorySidebar';
import { AuditSidebar } from './components/AuditSidebar';
import { TranscriptView } from './components/TranscriptView';
import { AuditModal } from './components/AuditModal';
import { ReportsView } from './components/ReportsView';
import { AlertsView } from './components/AlertsView';
import { RAGSearch } from './components/RAGSearch';
import { AgentsDashboard } from './components/AgentsDashboard';
import { LandingPage } from './components/LandingPage';
import { DashboardView } from './components/DashboardView';
import { ThemeProvider, ThemeToggle } from './components/ThemeToggle';
import { ToastProvider, useToast } from './components/Toasts';
import { ErrorBoundary } from './components/ErrorBoundary';
import { getApiUrl, fetchWithAuth } from './lib/api';

import { LoginView } from './components/LoginView';
import { AgentPortalView } from './components/AgentPortalView';
import { SettingsView } from './components/SettingsView';
import { supabase, initSupabase } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

function AppContent() {
  const { showToast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [view, setView] = useState<'landing' | 'dashboard' | 'audits' | 'agents' | 'reports' | 'knowledge' | 'settings' | 'login' | 'alerts'>(
    () => (localStorage.getItem('appView') as any) || 'landing'
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [selectedAudit, setSelectedAudit] = useState<Audit | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('All');

  const userRole = session?.user?.user_metadata?.role || 'supervisor';

  const displayedAudits = React.useMemo(() => {
    let filtered = audits;
    if (userRole === 'agent' && session?.user?.user_metadata?.name) {
      const myName = session.user.user_metadata.name.toLowerCase();
      filtered = filtered.filter(a => a.agent_name?.toLowerCase() === myName);
    }
    
    if (filterTab === 'Flagged') {
      return filtered.filter(a => a.violations && a.violations.length > 0);
    }
    
    if (filterTab === 'Critical') {
      return filtered.filter(a => 
        (a.compliance_score !== undefined && a.compliance_score < 70) || 
        (a.violations && a.violations.some((v: any) => ['Critical', 'High'].includes(v.severity)))
      );
    }
    
    return filtered;
  }, [audits, session, userRole, filterTab]);

  const displayedAgents = React.useMemo(() => {
    if (userRole === 'agent' && session?.user?.user_metadata?.name) {
      const myName = session.user.user_metadata.name.toLowerCase();
      return agents.filter(a => a.name.toLowerCase() === myName);
    }
    return agents;
  }, [agents, session, userRole]);

  // Auth Initialization
  useEffect(() => {
    const initAuth = async () => {
      try {
        const url = getApiUrl('/api/config');
        console.log(`Fetching auth config from: ${url}`);
        const res = await fetch(url);
        
        if (!res.ok) {
           throw new Error(`Backend configuration endpoint returned ${res.status}: ${res.statusText}`);
        }
        
        const config = await res.json();
        console.log("Auth config received:", { 
          hasUrl: !!config.supabaseUrl, 
          hasKey: !!config.supabaseAnonKey 
        });

        if (config.supabaseUrl && config.supabaseAnonKey) {
          const client = initSupabase(config.supabaseUrl, config.supabaseAnonKey);
          if (client) {
            const { data: { session } } = await client.auth.getSession();
            setSession(session);

            client.auth.onAuthStateChange((_event, session) => {
              setSession(session);
            });
          }
        } else {
          throw new Error('Supabase configuration (URL or Anon Key) is missing in backend. Please check backend environment variables.');
        }
      } catch (err: any) {
        console.error("Failed to initialize authentication:", err);
        const message = err.message || "Unknown error";
        showToast(`Authentication initialization failed: ${message}`, "error");
      } finally {
        setAuthInitialized(true);
      }
    };


    initAuth();
  }, [showToast]);

  // New Audit State
  const [isAuditing, setIsAuditing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showNewAuditModal, setShowNewAuditModal] = useState(false);
  const [newAuditData, setNewAuditData] = useState({
    agentId: '',
    transcript: '',
    type: 'call' as 'chat' | 'call',
    audioData: '',
    mimeType: ''
  });

  useEffect(() => {
    localStorage.setItem('appView', view);
    if (session && view === 'login') {
      setView('dashboard');
    }
  }, [view, session]);

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [agentsRes, auditsRes, analyticsRes, alertsRes] = await Promise.all([
        fetchWithAuth('/api/agents'),
        fetchWithAuth('/api/audits'),
        fetchWithAuth('/api/analytics'),
        fetchWithAuth('/api/alerts?resolved=false')
      ]);

      const agentsData = await agentsRes.json();
      const auditsData = await auditsRes.json();
      const analyticsData = await analyticsRes.json();
      const alertsData = await alertsRes.json();

      const parsedAudits = auditsData.map((a: any) => {
        let violations = a.violations;
        if (typeof violations === 'string') {
          try {
            violations = JSON.parse(violations);
          } catch (e) {
            console.error("Failed to parse violations for audit:", a.id, e);
            violations = [];
          }
        }
        return { ...a, violations };
      });

      setAgents(agentsData);
      setAudits(parsedAudits);
      setAnalytics(analyticsData);
      setAlerts(alertsData);

      if (parsedAudits.length > 0 && !selectedAudit) {
        setSelectedAudit(parsedAudits[0]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRunAudit = async () => {
    if (!newAuditData.agentId || !newAuditData.transcript) return;
    setIsAuditing(true);
    try {
      const result = await auditTranscript(newAuditData.transcript, newAuditData.type);
      const auditPayload = {
        agent_id: parseInt(newAuditData.agentId),
        transcript: newAuditData.transcript,
        type: newAuditData.type,
        audio_data: newAuditData.audioData,
        mime_type: newAuditData.mimeType,
        ...result,
        suggestions: result.suggestions
      };

      const saveRes = await fetchWithAuth('/api/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(auditPayload)
      });

      await saveRes.json();
      await fetchData();
      setShowNewAuditModal(false);
      setNewAuditData({ agentId: '', transcript: '', type: 'call', audioData: '', mimeType: '' });
      showToast('Audit completed successfully!', 'success');
    } catch (error) {
      console.error("Audit failed:", error);
      showToast('Audit failed. Please try again.', 'error');
    } finally {
      setIsAuditing(false);
    }
  };

  const handleDeleteAudit = async (auditId: number) => {
    try {
      const response = await fetchWithAuth(`/api/audits/${auditId}`, { method: 'DELETE' });
      if (response.ok) {
        setAudits(prev => prev.filter(a => a.id !== auditId));
        if (selectedAudit?.id === auditId) {
          setSelectedAudit(null);
        }
        showToast('Audit deleted successfully', 'success');
        // Refresh analytics as it might have changed
        fetchData();
      } else {
        throw new Error('Failed to delete audit');
      }
    } catch (err) {
      console.error(err);
      showToast('Error deleting audit', 'error');
    }
  };


  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsTranscribing(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;
      const text = await transcribeAudio(base64Data, file.type);
      setNewAuditData(prev => ({
        ...prev,
        transcript: text,
        type: 'call',
        audioData: base64Data,
        mimeType: file.type
      }));
      showToast('Transcription completed!', 'success');
    } catch (error) {
      console.error('Transcription error:', error);
      showToast('Transcription failed.', 'error');
    } finally {
      setIsTranscribing(false);
    }
  };

  if (!authInitialized) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <Loader2 className="animate-spin text-brand-accent" size={48} />
      </div>
    );
  }

  if (!session) {
    if (view !== 'login') {
      // Show landing page by default for unauthenticated external visitors
      return <LandingPage onGetStarted={() => setView('login')} />;
    }
    return <LoginView onBack={() => setView('landing')} />;
  }

  return (
    <div className="min-h-screen bg-brand-bg font-sans text-text-primary flex flex-col">
      {/* Top Navigation */}
      <header className="h-16 border-b border-brand-border bg-brand-surface flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setView('landing')}>
            <div className="bg-brand-accent p-1.5 rounded-lg shadow-[0_0_15px_rgba(242,125,38,0.3)]">
              <ShieldCheck className="text-white" size={20} />
            </div>
            <h1 className="font-display font-bold text-xl tracking-tight">GenAI-Audit</h1>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {view !== 'landing' && userRole === 'supervisor' && (
              <>
                <NavItem icon={LayoutDashboard} label="Dashboard" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
                <NavItem icon={ShieldAlert} label="Alerts" active={view === 'alerts'} onClick={() => setView('alerts')} />
                <NavItem icon={MessageSquare} label="Transcript Review" active={view === 'audits'} onClick={() => setView('audits')} />
                <NavItem icon={BookOpen} label="Knowledge Base" active={view === 'knowledge'} onClick={() => setView('knowledge')} />
                <NavItem icon={Users} label="Agents" active={view === 'agents'} onClick={() => setView('agents')} />
                <NavItem icon={History} label="Reports" active={view === 'reports'} onClick={() => setView('reports')} />
                <NavItem icon={Settings} label="Settings" active={view === 'settings'} onClick={() => setView('settings')} />
              </>
            )}
            {view !== 'landing' && userRole === 'agent' && (
              <>
                <NavItem icon={LayoutDashboard} label="My Dashboard" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
                <NavItem icon={MessageSquare} label="My Audits" active={view === 'audits'} onClick={() => setView('audits')} />
              </>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {userRole !== 'supervisor' && (
            <button
              onClick={() => setShowNewAuditModal(true)}
              className="px-3 md:px-4 py-2 bg-brand-accent text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg hover:bg-brand-accent/90 transition-all flex items-center gap-2"
            >
              <Plus size={16} />
              <span className="hidden md:inline">New Audit</span>
            </button>
          )}

          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={() => setView('alerts')}
              className="relative p-2 text-zinc-400 hover:text-white transition-colors"
            >
              <Bell size={20} />
              {alerts.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-brand-red text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-brand-surface">
                  {alerts.length}
                </span>
              )}
            </button>
            <ThemeToggle />
            <div className="flex items-center gap-3 ml-2 pl-4 border-l border-brand-border">
              <div className="w-8 h-8 rounded-lg bg-brand-accent/20 border border-brand-accent/30 flex items-center justify-center text-brand-accent font-bold text-xs uppercase">
                {session?.user?.user_metadata?.name?.substring(0, 2) || session?.user?.email?.substring(0, 2) || 'U'}
              </div>
              <div className="hidden lg:block text-sm">
                <p className="font-bold truncate max-w-[120px] capitalize">{session?.user?.user_metadata?.name || session?.user?.email}</p>
                <p className="text-xs text-zinc-500 capitalize">{userRole}</p>
              </div>
              <button onClick={() => supabase.auth.signOut()} className="p-2 text-zinc-400 hover:text-brand-red transition-colors ml-2" title="Logout">
                <LogOut size={18} />
              </button>
            </div>
          </div>

          <button
            className="md:hidden p-2 text-zinc-400 hover:text-white transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-brand-bg/95 backdrop-blur-md pt-20 px-6 flex flex-col gap-6">
          <nav className="flex flex-col gap-2">
            {view !== 'landing' && userRole === 'supervisor' && (
              <>
                <NavItem icon={LayoutDashboard} label="Dashboard" active={view === 'dashboard'} onClick={() => { setView('dashboard'); setMobileMenuOpen(false); }} />
                <NavItem icon={ShieldAlert} label="Alerts" active={view === 'alerts'} onClick={() => { setView('alerts'); setMobileMenuOpen(false); }} />
                <NavItem icon={MessageSquare} label="Transcript Review" active={view === 'audits'} onClick={() => { setView('audits'); setMobileMenuOpen(false); }} />
                <NavItem icon={BookOpen} label="Knowledge Base" active={view === 'knowledge'} onClick={() => { setView('knowledge'); setMobileMenuOpen(false); }} />
                <NavItem icon={Users} label="Agents" active={view === 'agents'} onClick={() => { setView('agents'); setMobileMenuOpen(false); }} />
                <NavItem icon={History} label="Reports" active={view === 'reports'} onClick={() => { setView('reports'); setMobileMenuOpen(false); }} />
                <NavItem icon={Settings} label="Settings" active={view === 'settings'} onClick={() => { setView('settings'); setMobileMenuOpen(false); }} />
              </>
            )}
            {view !== 'landing' && userRole === 'agent' && (
              <>
                <NavItem icon={LayoutDashboard} label="My Dashboard" active={view === 'dashboard'} onClick={() => { setView('dashboard'); setMobileMenuOpen(false); }} />
                <NavItem icon={MessageSquare} label="My Audits" active={view === 'audits'} onClick={() => { setView('audits'); setMobileMenuOpen(false); }} />
              </>
            )}
          </nav>
          <div className="border-t border-brand-border pt-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand-accent/20 border border-brand-accent/30 flex items-center justify-center text-brand-accent font-bold text-sm uppercase">
                {session?.user?.user_metadata?.name?.substring(0, 2) || session?.user?.email?.substring(0, 2) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate capitalize">{session?.user?.user_metadata?.name || session?.user?.email}</p>
                <p className="text-xs text-zinc-500 capitalize">{userRole}</p>
              </div>
              <button onClick={() => supabase.auth.signOut()} className="p-2 text-brand-red/80 hover:text-brand-red transition-colors" title="Logout">
                <LogOut size={20} />
              </button>
            </div>
            <ThemeToggle />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden">
        {view === 'landing' || view === 'login' ? (
          <LandingPage onGetStarted={() => setView('dashboard')} />
        ) : view === 'dashboard' ? (
          userRole === 'agent' ? <AgentPortalView audits={displayedAudits} agentEmail={session?.user?.email} /> : <DashboardView analytics={analytics} audits={audits} />
        ) : view === 'audits' ? (
          <>
            <CallHistorySidebar
              audits={displayedAudits}
              selectedAudit={selectedAudit}
              setSelectedAudit={setSelectedAudit}
              setShowNewAuditModal={setShowNewAuditModal}
              collapsed={sidebarCollapsed}
              setCollapsed={setSidebarCollapsed}
              loading={loading}
              onDeleteAudit={handleDeleteAudit}
              activeTab={filterTab}
              setActiveTab={setFilterTab}
            />

            {/* Right Side: Information (Audit Details + Transcript) */}
            <section className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {selectedAudit ? (
                <>
                  <AuditSidebar selectedAudit={selectedAudit} userRole={userRole} />
                  <TranscriptView
                    selectedAudit={selectedAudit}
                    onUploadClick={() => setShowNewAuditModal(true)}
                    userRole={userRole}
                  />
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-6">
                  <div className="p-8 bg-brand-surface rounded-full border border-brand-border shadow-xl">
                    <FileAudio size={64} className="opacity-20" />
                  </div>
                  <div className="text-center space-y-4">
                    <div className="space-y-2">
                      <p className="font-display font-bold text-lg text-zinc-400">No Recording Selected</p>
                      <p className="text-sm text-zinc-600">Select a call from the history or upload a new one</p>
                    </div>
                    <button
                      onClick={() => setShowNewAuditModal(true)}
                      className="px-6 py-2.5 bg-brand-accent text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg hover:bg-brand-accent/90 transition-all flex items-center gap-2 mx-auto"
                    >
                      <Upload size={16} />
                      Upload Audio
                    </button>
                  </div>
                </div>
              )}
            </section>
          </>
        ) : view === 'reports' ? (
          <ReportsView analytics={analytics} audits={audits} userRole={userRole} />
        ) : view === 'knowledge' ? (
          <RAGSearch />
        ) : view === 'agents' ? (
          <AgentsDashboard
            analytics={analytics}
            onAuditSelect={(auditId) => {
              const audit = audits.find(a => a.id === auditId);
              if (audit) {
                setSelectedAudit(audit);
                setView('audits');
              }
            }}
          />
        ) : view === 'alerts' ? (
          <AlertsView
            onAuditSelect={(auditId) => {
              const audit = audits.find(a => a.id === auditId);
              if (audit) {
                setSelectedAudit(audit);
                setView('audits');
              }
            }}
          />
        ) : view === 'settings' && userRole === 'supervisor' ? (
          <SettingsView onNewAuditClick={() => setShowNewAuditModal(true)} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-500">
            <p className="font-display font-bold text-lg">Select a view to get started</p>
          </div>
        )}
      </main>      <AuditModal
        show={showNewAuditModal}
        onClose={() => setShowNewAuditModal(false)}
        agents={displayedAgents}
        newAuditData={newAuditData}
        setNewAuditData={setNewAuditData}
        handleAudioUpload={handleAudioUpload}
        handleRunAudit={handleRunAudit}
        isTranscribing={isTranscribing}
        isAuditing={isAuditing}
      />
    </div>
  );
}
