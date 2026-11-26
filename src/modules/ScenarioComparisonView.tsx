import React, { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Copy } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { calculateScenarioCosts } from '../engine/calculations';
import { TechnicalStatusLabel } from '../components/ui/TrustBadge';

export const ScenarioComparisonView: React.FC = () => {
  const { activeProject, activeComponent, duplicateScenario } = useWorkspace();

  const scenarios = useMemo(() => {
    if (!activeProject || !activeComponent) return [];
    return activeProject.scenarios.filter((s) => s.componentId === activeComponent.id);
  }, [activeProject, activeComponent]);

  const chartData = useMemo(() => {
    return scenarios.map((s) => {
      const c = calculateScenarioCosts(s);
      return {
        shortName: s.strategyCode === 'CONVENTIONAL_REPLACEMENT' ? 'Ersatz (Ref.)' : s.strategyCode.split('_')[0],
        netCostKnownOrTotal: c.totalNetEur,
        knownPartialEur: c.totalNetEur === null ? c.knownNetSumEur : 0,
        preservedKg: s.environmentalImpact.preservedMaterialKg ?? 0,
        wasteKg: s.environmentalImpact.expectedWasteKg ?? 0,
        co2eKg: s.environmentalImpact.ghgEmissionsKgCo2e,
      };
    });
  }, [scenarios]);

  if (!activeProject || !activeComponent) {
    return (
      <div className="bg-white border border-[#101714]/10 rounded-md p-8 text-center text-sm text-[#6E8276]">
        Bitte wählen Sie ein Projekt und Bauteil aus.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="border-b border-[#101714]/10 pb-5">
        <h1 className="text-2xl font-semibold text-[#101714]">06 · Interaktiver Szenarienvergleich</h1>
        <p className="text-sm text-[#6E8276] mt-1">
          Nebeneinanderstellung aller fünf R-Optionen für „{activeComponent.name}“ und der Vergleichsreferenz. Fehlende Kosten werden nicht durch 0 € ersetzt.
        </p>
      </div>

      {scenarios.length === 0 ? (
        <div className="bg-white border border-[#101714]/10 rounded-md p-8 text-center text-xs text-[#6E8276]">
          Noch keine Szenarien für dieses Bauteil angelegt. Bitte im Circular Decision Compass initialisieren.
        </div>
      ) : (
        <>
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-white border border-[#101714]/10 rounded-md p-5 space-y-3">
              <h2 className="text-sm font-semibold text-[#101714]">
                Kostenvergleich (Netto €) — unvollständige Varianten ohne Balkenwert
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,23,20,0.08)" />
                    <XAxis dataKey="shortName" tick={{ fontSize: 11, fill: '#101714' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#6E8276' }} unit=" €" />
                    <Tooltip
                      formatter={(val) =>
                        val === null || val === undefined ? ['UNKNOWN', 'Netto'] : [`${Number(val).toLocaleString('de-DE')} €`, 'Netto']
                      }
                    />
                    <Bar dataKey="netCostKnownOrTotal" name="Vollständige Kosten (€)" fill="#063D2F" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="bg-white border border-[#101714]/10 rounded-md p-5 space-y-3">
              <h2 className="text-sm font-semibold text-[#101714]">
                Materialerhalt vs. erwarteter Abfall (kg)
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,23,20,0.08)" />
                    <XAxis dataKey="shortName" tick={{ fontSize: 11, fill: '#101714' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#6E8276' }} unit=" kg" />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="preservedKg" name="Erhaltenes Material (kg)" fill="#063D2F" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="wasteKg" name="Erwarteter Abfall (kg)" fill="#C6A45A" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          {/* 8 Mandatory Questions Matrix */}
          <section className="bg-white border border-[#101714]/10 rounded-md overflow-hidden">
            <div className="p-4 border-b border-[#101714]/10 bg-[#F7F5EF]">
              <h2 className="text-sm font-semibold text-[#101714]">
                Vergleichsmatrix (8 Pflichtfragen je Sanierungsoption)
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs align-top">
                <thead className="bg-[#F7F5EF] border-b border-[#101714]/10 text-[#6E8276]">
                  <tr>
                    <th className="py-3 px-3 min-w-[160px]">Prüffrage</th>
                    {scenarios.map((s) => (
                      <th key={s.id} className="py-3 px-3 min-w-[210px] text-[#101714]">
                        <div className="flex items-center justify-between gap-2">
                          <span>{s.strategyCode === 'CONVENTIONAL_REPLACEMENT' ? 'Ersatz-Referenz' : s.strategyCode}</span>
                          <button
                            type="button"
                            onClick={() => duplicateScenario(activeProject.id, s.id)}
                            title="Szenario duplizieren"
                            className="p-1 rounded hover:bg-white text-[#6E8276]"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="font-normal text-[11px] text-[#6E8276] truncate">{s.name}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#101714]/10">
                  <tr>
                    <td className="py-3 px-3 font-semibold">1. Was ist vorgesehen?</td>
                    {scenarios.map((s) => (
                      <td key={s.id} className="py-3 px-3 text-[#101714]/85">{s.intendedScope}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-semibold">2. Welche Daten liegen vor?</td>
                    {scenarios.map((s) => (
                      <td key={s.id} className="py-3 px-3">
                        <ul className="list-disc pl-4 space-y-0.5">
                          {s.availableDataSummary.map((d, i) => (
                            <li key={i}>{d}</li>
                          ))}
                        </ul>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-semibold">3. Welche Daten fehlen?</td>
                    {scenarios.map((s) => (
                      <td key={s.id} className="py-3 px-3 text-[#9A5B13]">
                        <ul className="list-disc pl-4 space-y-0.5">
                          {s.missingDataSummary.map((d, i) => (
                            <li key={i}>{d}</li>
                          ))}
                        </ul>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-semibold">4. Welche Kosten entstehen?</td>
                    {scenarios.map((s) => {
                      const c = calculateScenarioCosts(s);
                      return (
                        <td key={s.id} className="py-3 px-3 font-mono tabular-nums">
                          {c.totalNetEur !== null ? (
                            <div>
                              <div className="font-semibold">{c.totalNetEur.toLocaleString('de-DE')} € netto</div>
                              <div className="text-[11px] text-[#6E8276]">
                                Spanne: {c.sensitivityRangeEur.lowNetEur?.toLocaleString('de-DE')}–
                                {c.sensitivityRangeEur.highNetEur?.toLocaleString('de-DE')} €
                              </div>
                            </div>
                          ) : (
                            <span className="text-[#B91C1C]">
                              UNKNOWN ({c.missingPositionsCount} Position(en) offen)
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-semibold">5. Welche Ressourcen bleiben erhalten?</td>
                    {scenarios.map((s) => (
                      <td key={s.id} className="py-3 px-3 font-mono tabular-nums">
                        <div>
                          Erhalt:{' '}
                          {s.environmentalImpact.preservedMaterialKg !== null
                            ? `${s.environmentalImpact.preservedMaterialKg} kg`
                            : 'UNKNOWN'}
                        </div>
                        <div className="text-[11px] text-[#6E8276]">
                          CO₂e:{' '}
                          {s.environmentalImpact.ghgEmissionsKgCo2e !== null
                            ? `${s.environmentalImpact.ghgEmissionsKgCo2e} kg`
                            : 'UNKNOWN'}
                        </div>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-semibold">6. Welche Risiken bestehen?</td>
                    {scenarios.map((s) => (
                      <td key={s.id} className="py-3 px-3">
                        <ul className="list-disc pl-4 space-y-0.5">
                          {s.risks.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-semibold">7. Welche Prüfungen sind erforderlich?</td>
                    {scenarios.map((s) => (
                      <td key={s.id} className="py-3 px-3 text-[#063D2F]">
                        <ul className="list-disc pl-4 space-y-0.5">
                          {s.requiredTests.map((t, i) => (
                            <li key={i}>{t}</li>
                          ))}
                        </ul>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-semibold">8. Bewertung & Begründung</td>
                    {scenarios.map((s) => (
                      <td key={s.id} className="py-3 px-3 space-y-1.5">
                        <TechnicalStatusLabel status={s.overallTechnicalStatus} />
                        <div className="text-[#101714]/85">{s.technicalSummaryRationale}</div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
};
