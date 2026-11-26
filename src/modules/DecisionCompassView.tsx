import React, { useMemo, useState } from 'react';
import { AlertTriangle, Check, Lock, Plus, Save, SlidersHorizontal } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { RENOVATION_STRATEGIES } from '../data/demoSeed';
import {
  calculateScenarioCosts,
  evaluateMcdaScenarios,
} from '../engine/calculations';
import { TechnicalStatusLabel, TrustStatusLabel } from '../components/ui/TrustBadge';
import type {
  CostCategory,
  CostItem,
  DecisionSnapshot,
  RenovationStrategyCode,
  Scenario,
  TechnicalStatus,
} from '../types/resourceloop';

export const DecisionCompassView: React.FC = () => {
  const {
    state,
    activeProject,
    activeComponent,
    upsertScenario,
    updateMcdaWeights,
    addDecisionSnapshot,
    setActiveNav,
  } = useWorkspace();

  const [selectedStrategy, setSelectedStrategy] = useState<RenovationStrategyCode>('R3_REFURBISH');
  const [layerTab, setLayerTab] = useState<'TECHNICAL' | 'ECONOMIC' | 'ENVIRONMENTAL' | 'MCDA'>('TECHNICAL');
  const [showGross, setShowGross] = useState(false);

  // Add Cost Item state
  const [newCostLabel, setNewCostLabel] = useState('');
  const [newCostCat, setNewCostCat] = useState<CostCategory>('MATERIAL');
  const [newCostQty, setNewCostQty] = useState('10');
  const [newCostUnit, setNewCostUnit] = useState('m²');
  const [newCostPrice, setNewCostPrice] = useState('');

  // Human decision snapshot modal/form state
  const [humanStrategy, setHumanStrategy] = useState<RenovationStrategyCode>('R3_REFURBISH');
  const [humanRationale, setHumanRationale] = useState('');
  const [snapshotSavedMsg, setSnapshotSavedMsg] = useState<string | null>(null);

  const componentScenarios = useMemo(() => {
    if (!activeProject || !activeComponent) return [];
    return activeProject.scenarios.filter((s) => s.componentId === activeComponent.id);
  }, [activeProject, activeComponent]);

  const activeScenario = useMemo(
    () => componentScenarios.find((s) => s.strategyCode === selectedStrategy) ?? componentScenarios[0],
    [componentScenarios, selectedStrategy]
  );

  const mcda = useMemo(() => {
    if (!activeProject) return null;
    return evaluateMcdaScenarios(componentScenarios, activeProject.mcdaWeights);
  }, [componentScenarios, activeProject]);

  if (!activeProject || !activeComponent) {
    return (
      <div className="bg-white border border-[#101714]/10 rounded-md p-8 text-center text-sm text-[#6E8276]">
        Bitte wählen Sie zuerst ein Projekt und ein Bauteil im Product Twin aus.
      </div>
    );
  }

  const initializeEmptyScenarios = () => {
    const now = new Date().toISOString();
    RENOVATION_STRATEGIES.forEach((strat) => {
      if (componentScenarios.some((s) => s.strategyCode === strat.code)) return;
      const blank: Scenario = {
        id: `scen-${strat.code.toLowerCase()}-${Date.now()}`,
        projectId: activeProject.id,
        componentId: activeComponent.id,
        strategyCode: strat.code,
        isCircular: strat.isCircularStrategy,
        name: `${strat.title}: ${activeComponent.name}`,
        intendedScope: strat.description,
        vatRatePct: 19,
        discountRatePct: 3.5,
        analysisHorizonYears: 20,
        annualMaintenanceEur: null,
        documentedResidualValueEur: null,
        costItems: [
          {
            id: `ci-init-${Date.now()}-${strat.code}`,
            category: 'SURVEY',
            label: 'Fachliche Prüfung / Kostenermittlung ausstehend',
            quantity: 1,
            unit: 'Psch',
            unitPriceNetEur: null,
            status: 'UNKNOWN',
          },
        ],
        technicalConstraints: [
          {
            id: `tc-init-${Date.now()}`,
            domain: 'FEASIBILITY',
            title: 'Technische Machbarkeitsprüfung',
            status: 'UNKNOWN',
            rationale: 'Noch nicht durch Fachexperten bewertet.',
          },
        ],
        overallTechnicalStatus: 'UNKNOWN',
        technicalSummaryRationale: 'Erstbewertung ausstehend.',
        environmentalImpact: {
          preservedMaterialKg: null,
          avoidedPrimaryMaterialKg: null,
          expectedWasteKg: null,
          reusePotentialKg: null,
          recyclingMassKg: null,
          ghgEmissionsKgCo2e: null,
          systemBoundary: null,
          functionalEquivalenceNote: 'Noch nicht festgelegt',
          serviceLifeYears: null,
          status: 'UNKNOWN',
          missingIndicators: ['CO₂e-Faktoren und Massenbilanz ergänzen'],
        },
        availableDataSummary: [],
        missingDataSummary: ['Kostendaten (UNKNOWN)', 'Technische Prüfung (UNKNOWN)', 'Umweltdaten (UNKNOWN)'],
        risks: [],
        requiredTests: ['Vor-Ort-Prüfung durchführen'],
        createdAt: now,
        updatedAt: now,
      };
      upsertScenario(activeProject.id, blank, `5R-Szenario ${strat.title} initialisiert.`);
    });
  };

  const costSummary = activeScenario ? calculateScenarioCosts(activeScenario) : null;

  const updateCostItemField = (itemId: string, patch: Partial<CostItem>) => {
    if (!activeScenario) return;
    const updated: Scenario = {
      ...activeScenario,
      costItems: activeScenario.costItems.map((ci) => (ci.id === itemId ? { ...ci, ...patch } : ci)),
    };
    upsertScenario(activeProject.id, updated, `Kostenposition in ${activeScenario.strategyCode} aktualisiert.`);
  };

  const handleAddCostItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeScenario || !newCostLabel.trim()) return;
    const priceVal = newCostPrice.trim() === '' ? null : Number(newCostPrice);
    const qtyVal = newCostQty.trim() === '' ? null : Number(newCostQty);
    const item: CostItem = {
      id: `ci-${Date.now()}`,
      category: newCostCat,
      label: newCostLabel.trim(),
      quantity: qtyVal,
      unit: newCostUnit || 'Psch',
      unitPriceNetEur: priceVal,
      status: priceVal === null ? 'UNKNOWN' : 'USER_PROVIDED',
      uncertaintyPct: 15,
    };
    upsertScenario(
      activeProject.id,
      { ...activeScenario, costItems: [...activeScenario.costItems, item] },
      `Neue Kostenposition „${item.label}“ ergänzt.`
    );
    setNewCostLabel('');
    setNewCostPrice('');
  };

  const handleTechnicalStatusChange = (nextStatus: TechnicalStatus) => {
    if (!activeScenario) return;
    upsertScenario(
      activeProject.id,
      { ...activeScenario, overallTechnicalStatus: nextStatus },
      `Technischer Status von ${activeScenario.strategyCode} auf ${nextStatus} geändert.`
    );
  };

  const saveDecisionSnapshot = () => {
    if (!humanRationale.trim()) return;
    const nextVersion =
      activeProject.decisions.filter((d) => d.componentId === activeComponent.id).length + 1;
    const snap: DecisionSnapshot = {
      id: `dec-${Date.now()}`,
      version: nextVersion,
      parentSnapshotId: activeProject.decisions[0]?.id,
      projectId: activeProject.id,
      componentId: activeComponent.id,
      decisionDate: new Date().toISOString(),
      consideredScenarios: componentScenarios.map((s) => {
        const c = calculateScenarioCosts(s);
        return {
          scenarioId: s.id,
          strategyCode: s.strategyCode,
          name: s.name,
          technicalStatus: s.overallTechnicalStatus,
          totalNetCostEur: c.totalNetEur,
          costCompletenessPct: c.completenessPct,
          preservedMassKg: s.environmentalImpact.preservedMaterialKg,
          ghgKgCo2e: s.environmentalImpact.ghgEmissionsKgCo2e,
        };
      }),
      dataBasisSummary: `Bauteil ${activeComponent.name} (v${activeComponent.version}), ${componentScenarios.length} Szenarien ausgewertet.`,
      costAssumptions: ['Preise gemäß dokumentierter Kostenpositionen; fehlende Positionen als UNKNOWN markiert.'],
      environmentalAssumptions: ['CO₂e nur bei dokumentierter Systemgrenze berücksichtigt.'],
      technicalExclusions: componentScenarios
        .filter((s) => s.overallTechnicalStatus === 'EXCLUDED')
        .map((s) => `${s.name}: ${s.technicalSummaryRationale}`),
      expertChecks: componentScenarios.flatMap((s) => s.requiredTests),
      openRisks: componentScenarios.flatMap((s) => s.risks),
      weights: activeProject.mcdaWeights,
      aiRecommendationSummary:
        mcda?.canProduceFinalRanking
          ? `MCDA-Rang 1: ${mcda.rows.find((r) => r.rank === 1)?.name ?? '—'}`
          : 'Keine abschließende Rangfolge wegen unbekannter kritischer Kriterien.',
      humanDecisionStrategy: humanStrategy,
      humanDecisionRationale: humanRationale.trim(),
      responsibleRole: state.currentUser.role,
      responsiblePerson: state.currentUser.name,
      approval: {
        id: `appr-${Date.now()}`,
        role: state.currentUser.role,
        approverName: 'Ausstehend',
        decisionStatus: 'PENDING_REVIEW',
        timestamp: new Date().toISOString(),
        comment: 'Zur fachlichen Prüfung im Decision Memory abgelegt.',
      },
      subsequentChanges: [],
    };
    addDecisionSnapshot(activeProject.id, snap);
    setHumanRationale('');
    setSnapshotSavedMsg(`Entscheidungs-Snapshot v${nextVersion} unveränderbar im Decision Memory gespeichert.`);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#101714]/10 pb-5">
        <div>
          <h1 className="text-2xl font-semibold text-[#101714]">05 · Circular Decision Compass</h1>
          <p className="text-sm text-[#6E8276] mt-1">
            Bewertung der fünf zirkulären Sanierungsstrategien (R1–R5) und Vergleich mit der konventionellen Ersatzreferenz.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setActiveNav('scenario_comparison')}
          className="px-4 py-2 rounded-md bg-[#101714] text-white text-xs font-medium hover:bg-[#063D2F] whitespace-nowrap"
        >
          Zum Variantenvergleich →
        </button>
      </div>

      {componentScenarios.length === 0 ? (
        <div className="bg-white border border-[#101714]/10 rounded-md p-8 text-center space-y-3">
          <p className="text-sm text-[#6E8276]">
            Für das Bauteil „{activeComponent.name}“ wurden noch keine 5R-Szenarien angelegt.
          </p>
          <button
            type="button"
            onClick={initializeEmptyScenarios}
            className="px-4 py-2 rounded-md bg-[#063D2F] text-white text-xs font-medium"
          >
            Alle 5 R-Strategien + Ersatzreferenz initialisieren
          </button>
        </div>
      ) : (
        <>
          {/* 5R Strategy Selector Strip + Separated Benchmark */}
          <section className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {RENOVATION_STRATEGIES.filter((s) => s.isCircularStrategy).map((strat) => {
                const scen = componentScenarios.find((s) => s.strategyCode === strat.code);
                const c = scen ? calculateScenarioCosts(scen) : null;
                const isActive = activeScenario?.strategyCode === strat.code;
                return (
                  <button
                    key={strat.code}
                    type="button"
                    onClick={() => setSelectedStrategy(strat.code)}
                    className={`text-left p-4 rounded-md border transition-colors flex flex-col justify-between gap-2 ${
                      isActive
                        ? 'bg-[#063D2F] text-white border-[#063D2F]'
                        : 'bg-white text-[#101714] border-[#101714]/12 hover:border-[#063D2F]'
                    }`}
                  >
                    <div>
                      <div className={`text-[11px] font-mono ${isActive ? 'text-[#C6A45A]' : 'text-[#063D2F]'}`}>
                        ZIRKULÄR
                      </div>
                      <div className="font-semibold text-sm">{strat.title}</div>
                      <div className={`text-[11px] mt-0.5 ${isActive ? 'text-white/75' : 'text-[#6E8276]'}`}>
                        {strat.shortLabel}
                      </div>
                    </div>
                    <div className="pt-2 border-t border-current/10 flex items-center justify-between text-xs font-mono tabular-nums">
                      <span>
                        {c?.totalNetEur !== null && c?.totalNetEur !== undefined
                          ? `${c.totalNetEur.toLocaleString('de-DE')} €`
                          : 'UNKNOWN €'}
                      </span>
                      <span>{scen?.overallTechnicalStatus ?? 'UNKNOWN'}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Conventional Benchmark (explicitly NOT a 6th circular strategy) */}
            {(() => {
              const convScen = componentScenarios.find((s) => s.strategyCode === 'CONVENTIONAL_REPLACEMENT');
              const convCost = convScen ? calculateScenarioCosts(convScen) : null;
              const isConvActive = activeScenario?.strategyCode === 'CONVENTIONAL_REPLACEMENT';
              if (!convScen) return null;
              return (
                <button
                  type="button"
                  onClick={() => setSelectedStrategy('CONVENTIONAL_REPLACEMENT')}
                  className={`w-full text-left px-4 py-3 rounded-md border flex flex-wrap items-center justify-between gap-3 text-xs transition-colors ${
                    isConvActive
                      ? 'bg-[#101714] text-white border-[#101714]'
                      : 'bg-[#F7F5EF] text-[#101714] border-[#101714]/15 hover:border-[#101714]'
                  }`}
                >
                  <div>
                    <span className="font-mono text-[11px] uppercase opacity-75 mr-2">
                      Vergleichsreferenz (keine zirkuläre Strategie):
                    </span>
                    <span className="font-semibold">{convScen.name}</span>
                  </div>
                  <div className="font-mono tabular-nums">
                    {convCost?.totalNetEur !== null && convCost?.totalNetEur !== undefined
                      ? `${convCost.totalNetEur.toLocaleString('de-DE')} € netto`
                      : 'UNKNOWN €'}{' '}
                    · Abfall: {convScen.environmentalImpact.expectedWasteKg ?? 'UNKNOWN'} kg
                  </div>
                </button>
              );
            })()}
          </section>

          {/* Active Strategy Detail Layers */}
          {activeScenario && costSummary && (
            <section className="bg-white border border-[#101714]/10 rounded-md overflow-hidden">
              <div className="p-5 border-b border-[#101714]/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-[#101714]">{activeScenario.name}</h2>
                  <p className="text-xs text-[#6E8276] mt-0.5">{activeScenario.intendedScope}</p>
                </div>

                <div className="inline-flex items-center p-1 bg-[#F7F5EF] border border-[#101714]/10 rounded-md self-start">
                  {(
                    [
                      { id: 'TECHNICAL', label: '1. Technik' },
                      { id: 'ECONOMIC', label: '2. Wirtschaftlichkeit' },
                      { id: 'ENVIRONMENTAL', label: '3. Umwelt' },
                      { id: 'MCDA', label: '4. MCDA-Gewichtung' },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setLayerTab(t.id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap ${
                        layerTab === t.id ? 'bg-[#101714] text-white' : 'text-[#6E8276] hover:text-[#101714]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-5 space-y-5">
                {/* LAYER 1: TECHNICAL DECISION LAYER */}
                {layerTab === 'TECHNICAL' && (
                  <div className="space-y-5 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded bg-[#F7F5EF] border border-[#101714]/10">
                      <div className="space-y-1">
                        <div className="text-[#6E8276]">
                          Technischer Gesamtstatus (nicht durch Kosten oder Umweltwerte kompensierbar)
                        </div>
                        <div className="flex items-center gap-3">
                          <TechnicalStatusLabel status={activeScenario.overallTechnicalStatus} />
                          <span className="text-[#101714]">{activeScenario.technicalSummaryRationale}</span>
                        </div>
                      </div>
                      <select
                        value={activeScenario.overallTechnicalStatus}
                        onChange={(e) => handleTechnicalStatusChange(e.target.value as TechnicalStatus)}
                        className="px-3 py-2 border border-[#101714]/20 rounded-md bg-white text-xs"
                      >
                        <option value="PASSED">Prüfung bestanden (nur mit Nachweis)</option>
                        <option value="CONDITIONALLY_POSSIBLE">Bedingt möglich</option>
                        <option value="EXPERT_REVIEW_REQUIRED">Fachprüfung erforderlich</option>
                        <option value="EXCLUDED">Ausgeschlossen (mit Begründung)</option>
                        <option value="UNKNOWN">Unbekannt</option>
                      </select>
                    </div>

                    <div className="overflow-x-auto border border-[#101714]/10 rounded">
                      <table className="w-full text-left">
                        <thead className="bg-[#F7F5EF] border-b border-[#101714]/10 text-[#6E8276]">
                          <tr>
                            <th className="py-2.5 px-3">Prüfbereich</th>
                            <th className="py-2.5 px-3">Kriterium</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3">Begründung & erforderlicher Nachweis</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#101714]/10">
                          {activeScenario.technicalConstraints.map((tc) => (
                            <tr key={tc.id}>
                              <td className="py-2.5 px-3 font-mono text-[11px]">{tc.domain}</td>
                              <td className="py-2.5 px-3 font-medium">{tc.title}</td>
                              <td className="py-2.5 px-3">
                                <TechnicalStatusLabel status={tc.status} />
                              </td>
                              <td className="py-2.5 px-3">
                                <div>{tc.rationale}</div>
                                {tc.requiredEvidence && (
                                  <div className="text-[#063D2F] mt-0.5">Nachweis: {tc.requiredEvidence}</div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* LAYER 2: ECONOMIC DECISION LAYER */}
                {layerTab === 'ECONOMIC' && (
                  <div className="space-y-5 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
                        <div className="p-3 rounded bg-[#F7F5EF] border border-[#101714]/10">
                          <div className="text-[#6E8276]">Gesamtkosten ({showGross ? 'Brutto' : 'Netto'})</div>
                          <div className="text-lg font-mono font-semibold tabular-nums mt-0.5">
                            {costSummary.isComplete
                              ? `${(showGross ? costSummary.totalGrossEur : costSummary.totalNetEur)?.toLocaleString(
                                  'de-DE'
                                )} €`
                              : 'UNVOLLSTÄNDIG'}
                          </div>
                        </div>
                        <div className="p-3 rounded bg-[#F7F5EF] border border-[#101714]/10">
                          <div className="text-[#6E8276]">Zwischensumme belegter Positionen</div>
                          <div className="text-lg font-mono font-semibold tabular-nums mt-0.5">
                            {costSummary.knownNetSumEur.toLocaleString('de-DE')} €
                          </div>
                        </div>
                        <div className="p-3 rounded bg-[#F7F5EF] border border-[#101714]/10">
                          <div className="text-[#6E8276]">Lebenszykluskosten (Barwert)</div>
                          <div className="text-lg font-mono font-semibold tabular-nums mt-0.5">
                            {costSummary.lifecycleCostNetEur !== null
                              ? `${costSummary.lifecycleCostNetEur.toLocaleString('de-DE')} €`
                              : 'UNKNOWN'}
                          </div>
                        </div>
                        <div className="p-3 rounded bg-[#F7F5EF] border border-[#101714]/10">
                          <div className="text-[#6E8276]">Sensitivitätspanne (Netto)</div>
                          <div className="text-sm font-mono font-semibold tabular-nums mt-1">
                            {costSummary.sensitivityRangeEur.lowNetEur !== null
                              ? `${costSummary.sensitivityRangeEur.lowNetEur.toLocaleString('de-DE')} – ${costSummary.sensitivityRangeEur.highNetEur?.toLocaleString('de-DE')} €`
                              : 'Nicht berechenbar'}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowGross((v) => !v)}
                        className="px-3 py-2 rounded border border-[#101714]/20 bg-white font-mono text-[11px]"
                      >
                        {showGross ? 'Brutto (inkl. 19 % MwSt.)' : 'Netto anzeigen'}
                      </button>
                    </div>

                    {!costSummary.isComplete && (
                      <div className="p-3 rounded border border-[#D97706]/40 bg-[#FFFBEB] text-[#9A5B13] flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>
                          {costSummary.missingPositionsCount} Kostenposition(en) sind UNKNOWN ({costSummary.missingPositionsLabels.join(', ')}). Fehlende Werte werden ausdrücklich nicht mit 0 € ersetzt.
                        </span>
                      </div>
                    )}

                    {/* Editable Cost Items Table */}
                    <div className="overflow-x-auto border border-[#101714]/10 rounded">
                      <table className="w-full text-left">
                        <thead className="bg-[#F7F5EF] border-b border-[#101714]/10 text-[#6E8276]">
                          <tr>
                            <th className="py-2 px-3">Kategorie</th>
                            <th className="py-2 px-3">Kostenposition</th>
                            <th className="py-2 px-3 text-right">Menge</th>
                            <th className="py-2 px-3">Einheit</th>
                            <th className="py-2 px-3 text-right">Einheitspreis (€ netto)</th>
                            <th className="py-2 px-3 text-right">Positionskosten</th>
                            <th className="py-2 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#101714]/10">
                          {costSummary.itemBreakdown.map(({ item, lineNetEur }) => (
                            <tr key={item.id}>
                              <td className="py-2 px-3 font-mono text-[11px]">{item.category}</td>
                              <td className="py-2 px-3 font-medium">{item.label}</td>
                              <td className="py-2 px-3 text-right">
                                <input
                                  type="number"
                                  step="0.1"
                                  value={item.quantity ?? ''}
                                  onChange={(e) =>
                                    updateCostItemField(item.id, {
                                      quantity: e.target.value === '' ? null : Number(e.target.value),
                                    })
                                  }
                                  className="w-20 px-2 py-1 text-right border border-[#101714]/20 rounded font-mono tabular-nums"
                                />
                              </td>
                              <td className="py-2 px-3 font-mono">{item.unit}</td>
                              <td className="py-2 px-3 text-right">
                                <input
                                  type="number"
                                  step="1"
                                  placeholder="UNKNOWN"
                                  value={item.unitPriceNetEur ?? ''}
                                  onChange={(e) =>
                                    updateCostItemField(item.id, {
                                      unitPriceNetEur: e.target.value === '' ? null : Number(e.target.value),
                                      status: e.target.value === '' ? 'UNKNOWN' : 'USER_PROVIDED',
                                    })
                                  }
                                  className="w-24 px-2 py-1 text-right border border-[#101714]/20 rounded font-mono tabular-nums"
                                />
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-semibold tabular-nums">
                                {lineNetEur !== null ? `${lineNetEur.toLocaleString('de-DE')} €` : 'UNKNOWN'}
                              </td>
                              <td className="py-2 px-3">
                                <TrustStatusLabel status={item.status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Add Cost Position */}
                    <form onSubmit={handleAddCostItem} className="flex flex-wrap items-center gap-2">
                      <select
                        value={newCostCat}
                        onChange={(e) => setNewCostCat(e.target.value as CostCategory)}
                        className="px-2.5 py-2 border border-[#101714]/20 rounded bg-white"
                      >
                        <option value="MATERIAL">Material</option>
                        <option value="LABOR">Arbeitskosten</option>
                        <option value="DISASSEMBLY">Demontage</option>
                        <option value="TRANSPORT">Transport</option>
                        <option value="TESTING">Prüfung</option>
                        <option value="REPAIR">Reparatur</option>
                        <option value="REFURBISHMENT">Aufbereitung</option>
                        <option value="DISPOSAL">Entsorgung</option>
                      </select>
                      <input
                        type="text"
                        required
                        value={newCostLabel}
                        onChange={(e) => setNewCostLabel(e.target.value)}
                        placeholder="Neue Kostenposition"
                        className="flex-1 min-w-[180px] px-3 py-2 border border-[#101714]/20 rounded"
                      />
                      <input
                        type="number"
                        step="0.1"
                        value={newCostQty}
                        onChange={(e) => setNewCostQty(e.target.value)}
                        placeholder="Menge"
                        className="w-20 px-2.5 py-2 border border-[#101714]/20 rounded font-mono"
                      />
                      <input
                        type="text"
                        value={newCostUnit}
                        onChange={(e) => setNewCostUnit(e.target.value)}
                        placeholder="Einheit"
                        className="w-20 px-2.5 py-2 border border-[#101714]/20 rounded font-mono"
                      />
                      <input
                        type="number"
                        step="1"
                        value={newCostPrice}
                        onChange={(e) => setNewCostPrice(e.target.value)}
                        placeholder="Preis € (leer=UNKNOWN)"
                        className="w-36 px-2.5 py-2 border border-[#101714]/20 rounded font-mono"
                      />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 px-3.5 py-2 rounded bg-[#101714] text-white font-medium"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Hinzufügen</span>
                      </button>
                    </form>
                  </div>
                )}

                {/* LAYER 3: ENVIRONMENTAL DECISION LAYER */}
                {layerTab === 'ENVIRONMENTAL' && (
                  <div className="space-y-4 text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      {[
                        { label: 'Erhaltenes Material', val: activeScenario.environmentalImpact.preservedMaterialKg, unit: 'kg' },
                        { label: 'Vermiedener Primärbedarf', val: activeScenario.environmentalImpact.avoidedPrimaryMaterialKg, unit: 'kg' },
                        { label: 'Erwarteter Abfall', val: activeScenario.environmentalImpact.expectedWasteKg, unit: 'kg' },
                        { label: 'Wiederverwendung', val: activeScenario.environmentalImpact.reusePotentialKg, unit: 'kg' },
                        { label: 'Recyclingmasse', val: activeScenario.environmentalImpact.recyclingMassKg, unit: 'kg' },
                        { label: 'THG-Emissionen (CO₂e)', val: activeScenario.environmentalImpact.ghgEmissionsKgCo2e, unit: 'kg CO₂e' },
                      ].map((m) => (
                        <div key={m.label} className="p-3 rounded bg-[#F7F5EF] border border-[#101714]/10">
                          <div className="text-[#6E8276]">{m.label}</div>
                          <div className="text-base font-mono font-semibold tabular-nums mt-1">
                            {m.val !== null ? `${m.val.toLocaleString('de-DE')} ${m.unit}` : 'UNKNOWN'}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-4 rounded border border-[#101714]/10 space-y-1.5">
                      <div>
                        <span className="font-semibold">Systemgrenze:</span>{' '}
                        {activeScenario.environmentalImpact.systemBoundary ?? 'UNKNOWN (nicht dokumentiert)'}
                      </div>
                      <div>
                        <span className="font-semibold">Funktionale Vergleichbarkeit:</span>{' '}
                        {activeScenario.environmentalImpact.functionalEquivalenceNote}
                      </div>
                      {activeScenario.environmentalImpact.missingIndicators.length > 0 && (
                        <div className="text-[#9A5B13]">
                          <span className="font-semibold">Fehlende Umweltindikatoren:</span>{' '}
                          {activeScenario.environmentalImpact.missingIndicators.join(' · ')}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* LAYER 4: MCDA */}
                {layerTab === 'MCDA' && mcda && (
                  <div className="space-y-5 text-xs">
                    <div className="p-4 rounded bg-[#F7F5EF] border border-[#101714]/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#101714] flex items-center gap-2">
                          <SlidersHorizontal className="w-4 h-4 text-[#063D2F]" />
                          <span>Gewichtung der Entscheidungskriterien (Multi-Criteria Decision Analysis)</span>
                        </span>
                        <span className="font-mono text-[11px] text-[#6E8276]">
                          Lineare Min-Max-Normalisierung · Technische Ausschlusskriterien nicht kompensierbar
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                        {(
                          [
                            { key: 'technicalSuitability', label: 'Technische Eignung' },
                            { key: 'economicViability', label: 'Wirtschaftlichkeit' },
                            { key: 'environmentalImpact', label: 'Umweltwirkung' },
                            { key: 'resourcePotential', label: 'Ressourcenpotenzial' },
                            { key: 'timeEffort', label: 'Zeitaufwand' },
                            { key: 'dataQuality', label: 'Datenqualität' },
                          ] as const
                        ).map((w) => (
                          <div key={w.key}>
                            <div className="flex justify-between mb-1">
                              <span>{w.label}</span>
                              <span className="font-mono font-semibold">{activeProject.mcdaWeights[w.key]} %</span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={60}
                              step={5}
                              value={activeProject.mcdaWeights[w.key]}
                              onChange={(e) =>
                                updateMcdaWeights(activeProject.id, {
                                  ...activeProject.mcdaWeights,
                                  [w.key]: Number(e.target.value),
                                })
                              }
                              className="w-full accent-[#063D2F]"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {!mcda.canProduceFinalRanking && (
                      <div className="p-3.5 rounded border border-[#B91C1C]/30 bg-[#FEF2F2] text-[#B91C1C] flex items-start gap-2">
                        <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold">
                            Keine endgültige MCDA-Rangfolge angezeigt (Schutz vor Scheinpräzision)
                          </div>
                          <div>{mcda.blockingReasons.join(' ')}</div>
                        </div>
                      </div>
                    )}

                    <div className="overflow-x-auto border border-[#101714]/10 rounded">
                      <table className="w-full text-left">
                        <thead className="bg-[#F7F5EF] border-b border-[#101714]/10 text-[#6E8276]">
                          <tr>
                            <th className="py-2 px-3">Strategie</th>
                            <th className="py-2 px-3">Technik</th>
                            <th className="py-2 px-3 text-right">Wirtschaft</th>
                            <th className="py-2 px-3 text-right">Umwelt</th>
                            <th className="py-2 px-3 text-right">Ressource</th>
                            <th className="py-2 px-3">Fehlende kritische Kriterien</th>
                            <th className="py-2 px-3 text-right">Gesamtscore / Rang</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#101714]/10">
                          {mcda.rows.map((row) => (
                            <tr key={row.scenarioId}>
                              <td className="py-2.5 px-3 font-medium">{row.name}</td>
                              <td className="py-2.5 px-3">
                                <TechnicalStatusLabel status={row.technicalStatus} />
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                                {row.dimensionScores.economic ?? 'UNKNOWN'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                                {row.dimensionScores.environmental ?? 'UNKNOWN'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                                {row.dimensionScores.resourcePotential ?? 'UNKNOWN'}
                              </td>
                              <td className="py-2.5 px-3 text-[#9A5B13]">
                                {row.missingCriticalCriteria.length > 0
                                  ? row.missingCriticalCriteria.join(', ')
                                  : 'Vollständig'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-semibold tabular-nums">
                                {row.excludedOrBlocked
                                  ? 'AUSGESCHLOSSEN'
                                  : row.rank !== null
                                  ? `#${row.rank} (${row.normalizedScore})`
                                  : 'Gesperrt (UNKNOWN)'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Save Human Decision Snapshot */}
          <section className="bg-white border border-[#101714]/10 rounded-md p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#101714]/10 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-[#101714]">
                  Menschliche Entscheidung dokumentieren (Decision Memory Snapshot)
                </h3>
                <p className="text-xs text-[#6E8276]">
                  Die KI unterstützt die Entscheidung. Der Mensch trifft die Entscheidung.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-[#6E8276] mb-1">Gewählte Strategie</label>
                <select
                  value={humanStrategy}
                  onChange={(e) => setHumanStrategy(e.target.value as RenovationStrategyCode)}
                  className="w-full px-3 py-2 border border-[#101714]/20 rounded-md bg-white"
                >
                  {RENOVATION_STRATEGIES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[#6E8276] mb-1">Fachliche Entscheidungsbegründung *</label>
                <input
                  type="text"
                  value={humanRationale}
                  onChange={(e) => setHumanRationale(e.target.value)}
                  placeholder="Begründung, offene Vorbehalte und nächste Prüfanforderungen festhalten…"
                  className="w-full px-3 py-2 border border-[#101714]/20 rounded-md"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              {snapshotSavedMsg ? (
                <span className="text-xs text-[#063D2F] flex items-center gap-1.5">
                  <Check className="w-4 h-4" />
                  {snapshotSavedMsg}
                </span>
              ) : (
                <span />
              )}
              <button
                type="button"
                disabled={!humanRationale.trim()}
                onClick={saveDecisionSnapshot}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#063D2F] text-white text-xs font-medium disabled:opacity-40 hover:bg-[#101714]"
              >
                <Save className="w-3.5 h-3.5 text-[#C6A45A]" />
                <span>Entscheidungssnapshot speichern</span>
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
};
