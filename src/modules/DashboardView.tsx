import React, { useMemo, useState } from 'react';
import {
  Archive,
  ArrowRight,
  Building2,
  Download,
  FolderPlus,
  Pencil,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { TRANSLATIONS } from '../i18n/translations';
import {
  calculateComponentQuantities,
  calculateScenarioCosts,
  evaluateProjectDataQuality,
} from '../engine/calculations';
import type { Project } from '../types/resourceloop';

export const DashboardView: React.FC = () => {
  const {
    state,
    language,
    setActiveNav,
    selectContext,
    createProject,
    updateProject,
    archiveProject,
  } = useWorkspace();

  const t = TRANSLATIONS[language];
  const [filterMode, setFilterMode] = useState<'ALL' | 'REAL' | 'DEMO' | 'ARCHIVED'>('ALL');
  const [showNewModal, setShowNewModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // New project form state
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newStreet, setNewStreet] = useState('');
  const [newPostal, setNewPostal] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newYear, setNewYear] = useState('');

  const visibleProjects = useMemo(() => {
    return state.projects.filter((p) => {
      if (filterMode === 'ARCHIVED') return p.status === 'ARCHIVED';
      if (p.status === 'ARCHIVED') return false;
      if (filterMode === 'DEMO') return p.isDemo;
      if (filterMode === 'REAL') return !p.isDemo;
      return true;
    });
  }, [state.projects, filterMode]);

  const portfolioStats = useMemo(() => {
    const activeProjects = state.projects.filter((p) => p.status !== 'ARCHIVED');
    let buildingsCount = 0;
    let componentsCount = 0;
    let openDecisions = 0;
    let completedDecisions = 0;
    let missingProofs = 0;
    let openDataGaps = 0;
    let documentedPotentialKg = 0;

    // Forecast vs realized savings calculated strictly from documented scenarios & benchmark replacement
    let forecastPreservedMassKg = 0;
    let forecastAvoidedCo2eKg = 0;
    let forecastCostDeltaEur = 0;
    let hasForecastSavings = false;

    let realizedPreservedMassKg = 0;
    let realizedAvoidedCo2eKg = 0;
    let realizedCostDeltaEur = 0;
    let hasRealizedSavings = false;

    activeProjects.forEach((p) => {
      buildingsCount += p.buildings.length;
      componentsCount += p.components.length;
      const dq = evaluateProjectDataQuality(p);
      missingProofs += dq.openExpertProofsCount;
      openDataGaps += dq.criticalDataGapsCount;

      const approvedDecisions = p.decisions.filter((d) => d.approval.decisionStatus === 'APPROVED');
      completedDecisions += approvedDecisions.length;
      if (approvedDecisions.length === 0 && p.components.length > 0) {
        openDecisions += p.components.length;
      }

      p.components.forEach((c) => {
        const qty = calculateComponentQuantities(c);
        if (qty.totalMassKg !== null) {
          documentedPotentialKg += qty.totalMassKg;
        }

        const compScenarios = p.scenarios.filter((s) => s.componentId === c.id);
        const conv = compScenarios.find((s) => s.strategyCode === 'CONVENTIONAL_REPLACEMENT');
        const preferredDraft = p.decisions[0];
        const chosenScenario =
          (preferredDraft &&
            compScenarios.find((s) => s.strategyCode === preferredDraft.humanDecisionStrategy)) ||
          compScenarios.find((s) => s.strategyCode === 'R3_REFURBISH');

        if (conv && chosenScenario && chosenScenario.isCircular) {
          const convCost = calculateScenarioCosts(conv).totalNetEur;
          const chosenCost = calculateScenarioCosts(chosenScenario).totalNetEur;
          const convGhg = conv.environmentalImpact.ghgEmissionsKgCo2e;
          const chosenGhg = chosenScenario.environmentalImpact.ghgEmissionsKgCo2e;
          const preserved = chosenScenario.environmentalImpact.preservedMaterialKg;

          if (preserved !== null && convGhg !== null && chosenGhg !== null && convCost !== null && chosenCost !== null) {
            if (preferredDraft?.approval.decisionStatus === 'APPROVED') {
              hasRealizedSavings = true;
              realizedPreservedMassKg += preserved;
              realizedAvoidedCo2eKg += Math.max(0, convGhg - chosenGhg);
              realizedCostDeltaEur += convCost - chosenCost;
            } else {
              hasForecastSavings = true;
              forecastPreservedMassKg += preserved;
              forecastAvoidedCo2eKg += Math.max(0, convGhg - chosenGhg);
              forecastCostDeltaEur += convCost - chosenCost;
            }
          }
        }
      });
    });

    return {
      activeProjectsCount: activeProjects.length,
      buildingsCount,
      componentsCount,
      openDecisions,
      completedDecisions,
      missingProofs,
      openDataGaps,
      documentedPotentialKg: Math.round(documentedPotentialKg),
      hasForecastSavings,
      forecastPreservedMassKg: Math.round(forecastPreservedMassKg),
      forecastAvoidedCo2eKg: Math.round(forecastAvoidedCo2eKg),
      forecastCostDeltaEur: Math.round(forecastCostDeltaEur),
      hasRealizedSavings,
      realizedPreservedMassKg: Math.round(realizedPreservedMassKg),
      realizedAvoidedCo2eKg: Math.round(realizedAvoidedCo2eKg),
      realizedCostDeltaEur: Math.round(realizedCostDeltaEur),
    };
  }, [state.projects]);

  const handleExportProject = (proj: Project) => {
    const blob = new Blob([JSON.stringify(proj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${proj.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    createProject({
      name: newName,
      description: newDesc || 'Zirkuläres Sanierungsprojekt',
      isDemo: false,
      street: newStreet,
      postalCode: newPostal,
      city: newCity,
      constructionYear: newYear ? Number(newYear) : null,
    });
    setNewName('');
    setNewDesc('');
    setNewStreet('');
    setNewPostal('');
    setNewCity('');
    setNewYear('');
    setShowNewModal(false);
    setActiveNav('building_intelligence');
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#101714]/10 pb-6">
        <div className="space-y-1 max-w-2xl">
          <div className="text-xs font-mono text-[#063D2F] tracking-wide">
            {t.claim}
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#101714]">
            {t.dashboard.title}
          </h1>
          <p className="text-sm text-[#6E8276]">{t.dashboard.subtitle}</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#063D2F] text-white text-xs font-medium hover:bg-[#101714] transition-colors whitespace-nowrap"
          >
            <FolderPlus className="w-4 h-4 text-[#C6A45A]" />
            <span>{t.dashboard.newProject}</span>
          </button>
        </div>
      </div>

      {/* Portfolio Metrics Strip (8 Core KPIs) */}
      <section aria-label="Portfolio Kennzahlen" className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: t.dashboard.activeProjects, value: portfolioStats.activeProjectsCount, unit: '' },
          { label: t.dashboard.buildings, value: portfolioStats.buildingsCount, unit: '' },
          { label: t.dashboard.components, value: portfolioStats.componentsCount, unit: '' },
          { label: t.dashboard.openDecisions, value: portfolioStats.openDecisions, unit: '' },
          { label: t.dashboard.missingProofs, value: portfolioStats.missingProofs, unit: '' },
          { label: t.dashboard.openGaps, value: portfolioStats.openDataGaps, unit: '' },
          {
            label: t.dashboard.documentedPotentials,
            value: portfolioStats.documentedPotentialKg.toLocaleString('de-DE'),
            unit: 'kg',
          },
          { label: t.dashboard.completedDecisions, value: portfolioStats.completedDecisions, unit: '' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white border border-[#101714]/10 rounded-md p-4 flex flex-col justify-between gap-2"
          >
            <div className="text-xs text-[#6E8276]">{kpi.label}</div>
            <div className="text-2xl font-semibold font-mono tabular-nums text-[#101714]">
              {kpi.value}
              {kpi.unit && <span className="text-sm font-normal text-[#6E8276] ml-1">{kpi.unit}</span>}
            </div>
          </div>
        ))}
      </section>

      {/* Transparent Savings Comparison: Forecast vs. Realized */}
      <section className="bg-white border border-[#101714]/10 rounded-md p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#101714]/10 pb-3">
          <h2 className="text-sm font-semibold text-[#101714]">
            Nachvollziehbare Einsparpotenziale (Prognose vs. Realisiert)
          </h2>
          <span className="text-[11px] text-[#6E8276]">{t.dashboard.savingsDisclaimer}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="text-xs font-mono text-[#8C6413]">
              PROGNOSTIZIERT (Szenariovergleich vs. Konventioneller Ersatz, Entwurf)
            </div>
            {portfolioStats.hasForecastSavings ? (
              <div className="grid grid-cols-3 gap-3 pt-1">
                <div>
                  <div className="text-[11px] text-[#6E8276]">Materialerhalt</div>
                  <div className="text-lg font-mono font-semibold tabular-nums">
                    {portfolioStats.forecastPreservedMassKg.toLocaleString('de-DE')} kg
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[#6E8276]">Vermiedene CO₂e</div>
                  <div className="text-lg font-mono font-semibold tabular-nums text-[#063D2F]">
                    {portfolioStats.forecastAvoidedCo2eKg.toLocaleString('de-DE')} kg
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[#6E8276]">Kostendifferenz (netto)</div>
                  <div className="text-lg font-mono font-semibold tabular-nums">
                    {portfolioStats.forecastCostDeltaEur.toLocaleString('de-DE')} €
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-[#6E8276]">Keine vollständig berechneten Prognose-Szenarien vorhanden.</div>
            )}
          </div>

          <div className="space-y-2 md:border-l md:border-[#101714]/10 md:pl-6">
            <div className="text-xs font-mono text-[#063D2F]">
              TATSÄCHLICH REALISIERT (Freigegebene Entscheidungen mit Nachweis)
            </div>
            {portfolioStats.hasRealizedSavings ? (
              <div className="grid grid-cols-3 gap-3 pt-1">
                <div>
                  <div className="text-[11px] text-[#6E8276]">Materialerhalt</div>
                  <div className="text-lg font-mono font-semibold tabular-nums">
                    {portfolioStats.realizedPreservedMassKg.toLocaleString('de-DE')} kg
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[#6E8276]">CO₂e-Einsparung</div>
                  <div className="text-lg font-mono font-semibold tabular-nums text-[#063D2F]">
                    {portfolioStats.realizedAvoidedCo2eKg.toLocaleString('de-DE')} kg
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[#6E8276]">Kosteneinsparung</div>
                  <div className="text-lg font-mono font-semibold tabular-nums">
                    {portfolioStats.realizedCostDeltaEur.toLocaleString('de-DE')} €
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-[#6E8276] pt-1">
                0 kg / 0 € realisiert — bisher liegen ausschließlich Entwurfs- oder Demo-Entscheidungen ohne abgeschlossene Umsetzung vor.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Filter Toolbar & Project Cards */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-[#101714]">Sanierungsprojekte</h2>

          <div className="inline-flex items-center p-1 bg-white border border-[#101714]/10 rounded-md self-start">
            {(
              [
                { id: 'ALL', label: 'Alle aktiven' },
                { id: 'REAL', label: 'Eigene Projekte' },
                { id: 'DEMO', label: 'Demo-Referenzen' },
                { id: 'ARCHIVED', label: 'Archiv' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterMode(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  filterMode === tab.id
                    ? 'bg-[#101714] text-white'
                    : 'text-[#6E8276] hover:text-[#101714]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {visibleProjects.length === 0 ? (
          <div className="bg-white border border-[#101714]/10 rounded-md p-8 text-center space-y-3">
            <p className="text-sm text-[#6E8276]">Keine Projekte in dieser Ansicht vorhanden.</p>
            <button
              type="button"
              onClick={() => setShowNewModal(true)}
              className="px-4 py-2 rounded-md bg-[#063D2F] text-white text-xs font-medium"
            >
              {t.dashboard.newProject}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {visibleProjects.map((proj) => {
              const bldg = proj.buildings[0];
              const dq = evaluateProjectDataQuality(proj);
              const openTasksCount =
                proj.inspectionTasks.filter((task) => task.status !== 'DONE').length +
                proj.components.reduce((acc, c) => acc + c.openInspectionRequirements.length, 0);
              const inventoryProgress =
                proj.components.length === 0
                  ? 0
                  : Math.min(100, Math.round((dq.completenessPct + (proj.scenarios.length > 0 ? 100 : 20)) / 2));

              return (
                <article
                  key={proj.id}
                  className="bg-white border border-[#101714]/12 rounded-md overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    {/* Building Image */}
                    <div className="relative h-44 bg-[#101714]/5 overflow-hidden border-b border-[#101714]/10">
                      {bldg?.imageUrl ? (
                        <img
                          src={bldg.imageUrl}
                          alt={bldg.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-[#6E8276] gap-2 bg-[#F7F5EF]">
                          <Building2 className="w-8 h-8 opacity-60" />
                          <span className="text-xs">Kein Gebäudebild hinterlegt</span>
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#101714]/75 to-transparent" />
                      <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] text-white font-mono">
                        <span>{proj.isDemo ? proj.demoLabel ?? 'DEMO' : 'REALES PROJEKT'}</span>
                        <span>{proj.status}</span>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-5 space-y-3">
                      <div className="space-y-1">
                        <div className="text-xs text-[#6E8276] truncate">
                          {bldg?.profile.buildingType ?? 'Bestandsgebäude'} ·{' '}
                          {bldg
                            ? `${bldg.location.street} ${bldg.location.houseNumber}, ${bldg.location.postalCode} ${bldg.location.city}`.trim()
                            : 'Adresse offen'}
                        </div>
                        <h3 className="text-base font-semibold text-[#101714] leading-snug">
                          {proj.name}
                        </h3>
                      </div>

                      {/* Key Progress & Quality Metrics */}
                      <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[#101714]/10 text-xs">
                        <div>
                          <div className="text-[11px] text-[#6E8276]">Datenqualität</div>
                          <div className="font-mono font-semibold tabular-nums text-[#063D2F]">
                            {dq.completenessPct} %
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] text-[#6E8276]">Bestandsaufnahme</div>
                          <div className="font-mono font-semibold tabular-nums text-[#101714]">
                            {inventoryProgress} %
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] text-[#6E8276]">Offene Aufgaben</div>
                          <div className="font-mono font-semibold tabular-nums text-[#101714]">
                            {openTasksCount}
                          </div>
                        </div>
                      </div>

                      <div className="text-[11px] text-[#6E8276] font-mono">
                        Aktualisiert: {new Date(proj.updatedAt).toLocaleDateString('de-DE')}
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="px-5 py-3 bg-[#F7F5EF] border-t border-[#101714]/10 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        selectContext(proj.id, bldg?.id, proj.components[0]?.id);
                        setActiveNav(proj.components.length > 0 ? 'product_twin' : 'building_intelligence');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#063D2F] text-white text-xs font-medium hover:bg-[#101714] transition-colors"
                    >
                      <span>Öffnen</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingProject(proj)}
                        title="Projekt bearbeiten"
                        className="p-1.5 rounded text-[#6E8276] hover:text-[#101714] hover:bg-white"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportProject(proj)}
                        title="Projekt als JSON exportieren"
                        className="p-1.5 rounded text-[#6E8276] hover:text-[#101714] hover:bg-white"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      {proj.status !== 'ARCHIVED' && (
                        <button
                          type="button"
                          onClick={() => archiveProject(proj.id)}
                          title="Projekt archivieren"
                          className="p-1.5 rounded text-[#6E8276] hover:text-[#B91C1C] hover:bg-white"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* New Project Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-[#101714]/50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#101714]/15 rounded-md max-w-lg w-full p-6 space-y-5">
            <h2 className="text-lg font-semibold text-[#101714]">{t.dashboard.newProject}</h2>
            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[#101714] mb-1">Projektname *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="z. B. Fassadensanierung Stadthaus West"
                  className="w-full px-3 py-2 text-sm border border-[#101714]/20 rounded-md focus:outline-none focus:border-[#063D2F]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#101714] mb-1">Beschreibung</label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Zielsetzung und betroffene Bauteile"
                  className="w-full px-3 py-2 text-sm border border-[#101714]/20 rounded-md focus:outline-none focus:border-[#063D2F]"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#101714] mb-1">Straße</label>
                  <input
                    type="text"
                    value={newStreet}
                    onChange={(e) => setNewStreet(e.target.value)}
                    placeholder="Musterstraße 12"
                    className="w-full px-3 py-2 text-sm border border-[#101714]/20 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#101714] mb-1">Baujahr</label>
                  <input
                    type="number"
                    min={1800}
                    max={2030}
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                    placeholder="1982"
                    className="w-full px-3 py-2 text-sm border border-[#101714]/20 rounded-md"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#101714] mb-1">PLZ</label>
                  <input
                    type="text"
                    value={newPostal}
                    onChange={(e) => setNewPostal(e.target.value)}
                    placeholder="40213"
                    className="w-full px-3 py-2 text-sm border border-[#101714]/20 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#101714] mb-1">Stadt</label>
                  <input
                    type="text"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    placeholder="Düsseldorf"
                    className="w-full px-3 py-2 text-sm border border-[#101714]/20 rounded-md"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 text-xs font-medium text-[#6E8276] hover:text-[#101714]"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-[#063D2F] text-white text-xs font-medium hover:bg-[#101714]"
                >
                  Projekt anlegen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {editingProject && (
        <div className="fixed inset-0 z-50 bg-[#101714]/50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#101714]/15 rounded-md max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-semibold text-[#101714]">Projekt bearbeiten</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Projektname</label>
                <input
                  type="text"
                  value={editingProject.name}
                  onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#101714]/20 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Status</label>
                <select
                  value={editingProject.status}
                  onChange={(e) =>
                    setEditingProject({ ...editingProject, status: e.target.value as Project['status'] })
                  }
                  className="w-full px-3 py-2 text-sm border border-[#101714]/20 rounded-md bg-white"
                >
                  <option value="PREPARATION">PREPARATION</option>
                  <option value="INVENTORY">INVENTORY</option>
                  <option value="EVALUATION">EVALUATION</option>
                  <option value="DECIDED">DECIDED</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Beschreibung</label>
                <textarea
                  rows={3}
                  value={editingProject.description}
                  onChange={(e) =>
                    setEditingProject({ ...editingProject, description: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-[#101714]/20 rounded-md"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingProject(null)}
                className="px-4 py-2 text-xs text-[#6E8276]"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => {
                  updateProject(
                    editingProject.id,
                    {
                      name: editingProject.name,
                      status: editingProject.status,
                      description: editingProject.description,
                    },
                    `Projektstammdaten aktualisiert (${editingProject.status}).`
                  );
                  setEditingProject(null);
                }}
                className="px-4 py-2 rounded-md bg-[#063D2F] text-white text-xs font-medium"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
