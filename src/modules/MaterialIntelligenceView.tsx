import React, { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Search } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { TrustStatusLabel } from '../components/ui/TrustBadge';
import { calculateComponentQuantities } from '../engine/calculations';

export const MaterialIntelligenceView: React.FC = () => {
  const { state, activeProject, activeComponent } = useWorkspace();
  const [query, setQuery] = useState('');
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('');

  const filteredMaterials = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return state.materials;
    return state.materials.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.group.toLowerCase().includes(q) ||
        m.reusePotential.toLowerCase().includes(q)
    );
  }, [state.materials, query]);

  const componentScenarios = useMemo(() => {
    if (!activeProject || !activeComponent) return [];
    return activeProject.scenarios.filter((s) => s.componentId === activeComponent.id);
  }, [activeProject, activeComponent]);

  const activeScenario =
    componentScenarios.find((s) => s.id === selectedScenarioId) ?? componentScenarios[0];

  const qty = activeComponent ? calculateComponentQuantities(activeComponent) : null;

  const flowChartData = useMemo(() => {
    const stockKg = qty?.totalMassKg ?? 0;
    if (!activeScenario) {
      return [
        { stage: 'Dokumentierter Bestand', masseKg: Math.round(stockKg), type: 'Bestand' },
      ];
    }
    const env = activeScenario.environmentalImpact;
    const isKeep = activeScenario.strategyCode === 'R1_KEEP';
    const isRepair = activeScenario.strategyCode === 'R2_REPAIR_REUSE';
    const isRefurb = activeScenario.strategyCode === 'R3_REFURBISH';
    const isReman = activeScenario.strategyCode === 'R4_REMANUFACTURE';

    return [
      { stage: 'Bestand (Berechnet)', masseKg: Math.round(stockKg) },
      { stage: 'Erhalt (R1)', masseKg: isKeep ? Math.round(env.preservedMaterialKg ?? 0) : 0 },
      { stage: 'Reparatur / Reuse (R2)', masseKg: isRepair ? Math.round(env.reusePotentialKg ?? 0) : 0 },
      { stage: 'Aufbereitung (R3)', masseKg: isRefurb ? Math.round(env.preservedMaterialKg ?? 0) : 0 },
      { stage: 'Remanufacturing (R4)', masseKg: isReman ? Math.round(env.reusePotentialKg ?? 0) : 0 },
      { stage: 'Recycling (R5)', masseKg: Math.round(env.recyclingMassKg ?? 0) },
      { stage: 'Nicht verwertbarer Rest', masseKg: Math.round(env.expectedWasteKg ?? 0) },
    ];
  }, [qty, activeScenario]);

  return (
    <div className="space-y-8">
      <div className="border-b border-[#101714]/10 pb-5">
        <h1 className="text-2xl font-semibold text-[#101714]">04 · Material Intelligence & Material Flow</h1>
        <p className="text-sm text-[#6E8276] mt-1">
          Strukturierte Materialbibliothek ohne erfundene EPDs sowie Gegenüberstellung von realem Bestand und Szenario-Materialfluss.
        </p>
      </div>

      {/* Material Flow Visualization */}
      <section className="bg-white border border-[#101714]/10 rounded-md p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#101714]/10 pb-3">
          <div>
            <h2 className="text-base font-semibold text-[#101714]">
              Materialfluss-Analyse: Dokumentierter Bestand vs. Szenarioprognose
            </h2>
            <p className="text-xs text-[#6E8276]">
              Bauteil: {activeComponent?.name ?? 'Kein Bauteil gewählt'} · Masse „Bestand“ ist deterministisch berechnet; Pfade R1–Rest sind Szenarioprognosen.
            </p>
          </div>
          {componentScenarios.length > 0 && (
            <select
              value={activeScenario?.id ?? ''}
              onChange={(e) => setSelectedScenarioId(e.target.value)}
              className="px-3 py-2 text-xs border border-[#101714]/20 rounded-md bg-white"
            >
              {componentScenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={flowChartData} layout="vertical" margin={{ top: 8, right: 24, left: 40, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,23,20,0.08)" />
              <XAxis type="number" unit=" kg" tick={{ fontSize: 11, fill: '#6E8276' }} />
              <YAxis type="category" dataKey="stage" width={160} tick={{ fontSize: 11, fill: '#101714' }} />
              <Tooltip
                formatter={(val) => [`${val} kg`, 'Masse']}
                contentStyle={{ fontSize: '12px', borderColor: 'rgba(16,23,20,0.15)' }}
              />
              <Bar dataKey="masseKg" fill="#063D2F" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Material Library */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-[#101714]">
            Materialbibliothek ({filteredMaterials.length} Werkstoffgruppen)
          </h2>
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-[#6E8276] absolute left-3 top-2.5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Material suchen (z. B. Aluminium, Glas, KMF)…"
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#101714]/20 rounded-md"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMaterials.map((mat) => (
            <article key={mat.id} className="bg-white border border-[#101714]/10 rounded-md p-5 space-y-3 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-mono text-[11px] text-[#6E8276]">{mat.group}</div>
                  <h3 className="text-sm font-semibold text-[#101714]">{mat.name}</h3>
                </div>
                <TrustStatusLabel status={mat.environmentalDataStatus} />
              </div>

              <div className="grid grid-cols-2 gap-3 py-2 border-y border-[#101714]/10">
                <div>
                  <div className="text-[#6E8276]">Rohdichte</div>
                  <div className="font-mono font-semibold tabular-nums">
                    {mat.densityKgM3 !== null ? `${mat.densityKgM3} kg/m³` : 'UNKNOWN'}
                  </div>
                </div>
                <div>
                  <div className="text-[#6E8276]">GWP (EN 15804 Referenz)</div>
                  <div className="font-mono font-semibold tabular-nums">
                    {mat.gwpKgCo2ePerKg !== null ? `${mat.gwpKgCo2ePerKg} kg CO₂e/kg` : 'UNKNOWN'}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 text-[#101714]/85">
                <div>
                  <span className="font-semibold">Wiederverwendung:</span> {mat.reusePotential}
                </div>
                <div>
                  <span className="font-semibold">Recycling:</span> {mat.recyclingPotential}
                </div>
                <div>
                  <span className="font-semibold">Demontage:</span> {mat.disassemblyRequirements}
                </div>
                {mat.pollutantHints.length > 0 && (
                  <div className="text-[#9A5B13]">
                    <span className="font-semibold">Schadstoffhinweis:</span> {mat.pollutantHints.join(' ')}
                  </div>
                )}
              </div>

              <div className="text-[11px] font-mono text-[#6E8276] pt-1">
                Quelle: {mat.epdReference ?? mat.sourceName}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};
