import React, { useState } from 'react';
import {
  Building2,
  Camera,
  ChevronLeft,
  ChevronRight,
  Compass,
  FileSpreadsheet,
  FolderKanban,
  GitCompare,
  History,
  Layers,
  LayoutDashboard,
  Menu,
  MessageSquareText,
  Settings,
  ShieldCheck,
  X,
} from 'lucide-react';
import { type NavSection, useWorkspace } from '../../context/WorkspaceContext';
import { TRANSLATIONS } from '../../i18n/translations';
import type { LanguageCode } from '../../types/resourceloop';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const {
    language,
    setLanguage,
    activeNav,
    setActiveNav,
    copilotOpen,
    setCopilotOpen,
    activeProject,
    activeBuilding,
    activeComponent,
    syncStatus,
  } = useWorkspace();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = TRANSLATIONS[language];

  const navItems: Array<{ id: NavSection; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
    { id: 'projects', label: t.nav.projects, icon: FolderKanban },
    { id: 'building_intelligence', label: t.nav.buildingIntelligence, icon: Building2 },
    { id: 'smart_scanner', label: t.nav.smartScanner, icon: Camera },
    { id: 'product_twin', label: t.nav.productTwin, icon: Layers },
    { id: 'material_intelligence', label: t.nav.materialIntelligence, icon: Layers },
    { id: 'decision_compass', label: t.nav.decisionCompass, icon: Compass },
    { id: 'scenario_comparison', label: t.nav.scenarioComparison, icon: GitCompare },
    { id: 'decision_memory', label: t.nav.decisionMemory, icon: History },
    { id: 'data_trust', label: t.nav.dataTrustCenter, icon: ShieldCheck },
    { id: 'reports', label: t.nav.reports, icon: FileSpreadsheet },
    { id: 'settings', label: t.nav.settings, icon: Settings },
  ];

  const handleNavClick = (id: NavSection) => {
    setActiveNav(id);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex bg-[#F7F5EF] text-[#101714]">
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#101714]/40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Permanent Collapsible Sidebar */}
      <aside
        className={`no-print fixed lg:sticky top-0 left-0 z-50 h-screen bg-[#101714] text-[#F7F5EF] flex flex-col border-r border-[#101714] transition-all duration-200 ${
          sidebarCollapsed ? 'lg:w-[72px]' : 'lg:w-[260px]'
        } ${mobileMenuOpen ? 'translate-x-0 w-[260px]' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-white/10 shrink-0">
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <div className="text-base font-semibold tracking-tight text-white whitespace-nowrap truncate">
                ResourceLoop <span className="text-[#C6A45A]">AI</span>
              </div>
              <div className="text-[11px] text-[#6E8276] truncate">
                Circular Renovation OS
              </div>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="mx-auto text-base font-bold text-[#C6A45A]" aria-label="ResourceLoop AI">
              RL
            </div>
          )}
          <button
            type="button"
            onClick={() => setSidebarCollapsed((c) => !c)}
            className="hidden lg:inline-flex p-1.5 rounded text-[#F7F5EF]/70 hover:text-white hover:bg-white/10 transition-colors"
            title={sidebarCollapsed ? 'Sidebar ausklappen' : 'Sidebar einklappen'}
            aria-label={sidebarCollapsed ? 'Sidebar ausklappen' : 'Sidebar einklappen'}
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 rounded text-[#F7F5EF]/70 hover:text-white"
            aria-label="Menü schließen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5" aria-label="Hauptnavigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                title={sidebarCollapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors text-left ${
                  isActive
                    ? 'bg-[#063D2F] text-white font-medium'
                    : 'text-[#F7F5EF]/75 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#C6A45A]' : 'text-[#6E8276]'}`} />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Footer Persistence Notice */}
        {!sidebarCollapsed && (
          <div className="p-3.5 border-t border-white/10 text-[11px] text-[#6E8276] space-y-1 shrink-0">
            <div className="text-[#F7F5EF]/80 font-medium truncate">
              {t.topbar.localMode}
            </div>
            <div className="font-mono text-[10px] text-[#6E8276]">
              {syncStatus === 'SAVING'
                ? 'Speichert lokal…'
                : syncStatus === 'ERROR'
                ? 'Browser-Cache aktiv'
                : 'Lokal gespeichert'}
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Context Bar */}
        <header className="no-print sticky top-0 z-30 h-16 bg-white border-b border-[#101714]/10 px-4 lg:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-md border border-[#101714]/15 text-[#101714]"
              aria-label="Navigation öffnen"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
              <span className="text-[#6E8276] font-medium whitespace-nowrap">{t.topbar.activeContext}:</span>
              <span className="font-semibold text-[#101714] truncate max-w-[210px] sm:max-w-[280px]">
                {activeProject ? activeProject.name : '—'}
              </span>
              <span className="text-[#6E8276]" aria-hidden="true">/</span>
              <span className="text-[#101714]/80 truncate max-w-[160px] hidden sm:inline">
                {activeBuilding ? activeBuilding.name : 'Kein Gebäude'}
              </span>
              <span className="text-[#6E8276] hidden md:inline" aria-hidden="true">/</span>
              <span className="text-[#063D2F] font-medium truncate max-w-[200px] hidden md:inline">
                {activeComponent ? activeComponent.name : t.topbar.noComponent}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Language Switcher */}
            <div className="flex items-center border border-[#101714]/15 rounded-md overflow-hidden bg-[#F7F5EF]">
              {(['de', 'en', 'pl'] as LanguageCode[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  className={`px-2.5 py-1.5 text-xs font-mono uppercase transition-colors ${
                    language === lang
                      ? 'bg-[#101714] text-white font-semibold'
                      : 'text-[#6E8276] hover:text-[#101714]'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>

            {/* AI Copilot Toggle */}
            <button
              type="button"
              onClick={() => setCopilotOpen(!copilotOpen)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                copilotOpen
                  ? 'bg-[#063D2F] text-white'
                  : 'bg-[#101714] text-white hover:bg-[#063D2F]'
              }`}
            >
              <MessageSquareText className="w-4 h-4 text-[#C6A45A]" />
              <span>{t.topbar.copilot}</span>
            </button>
          </div>
        </header>

        {/* Active View Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
