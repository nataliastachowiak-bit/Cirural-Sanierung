import React, { useMemo } from 'react';
import { Check, ShieldCheck } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { evaluateProjectDataQuality } from '../engine/calculations';
import { TrustStatusLabel } from '../components/ui/TrustBadge';

export const DataTrustCenterView: React.FC = () => {
  const { state, activeProject, updateComponent, logAudit } = useWorkspace();

  const dq = useMemo(
    () => (activeProject ? evaluateProjectDataQuality(activeProject) : null),
    [activeProject]
  );

  if (!activeProject || !dq) {
    return (
      <div className="bg-white border border-[#101714]/10 rounded-md p-8 text-center text-sm text-[#6E8276]">
        Bitte ein Projekt auswählen.
      </div>
    );
  }

  const unconfirmedHypotheses = activeProject.components.flatMap((c) =>
    c.hypotheses
      .filter((h) => h.status === 'UNCONFIRMED_AI')
      .map((h) => ({ component: c, hypothesis: h }))
  );

  const confirmHypothesis = (componentId: string, hypothesisId: string) => {
    const comp = activeProject.components.find((c) => c.id === componentId);
    if (!comp) return;
    updateComponent(
      activeProject.id,
      componentId,
      {
        hypotheses: comp.hypotheses.map((h) =>
          h.id === hypothesisId ? { ...h, status: 'USER_CONFIRMED' } : h
        ),
      },
      `KI-Hypothese ${hypothesisId} durch Nutzer bestätigt (getrennt von unabhängiger Fachprüfung).`
    );
    logAudit({
      projectId: activeProject.id,
      entityType: 'TRUST',
      entityId: hypothesisId,
      action: 'HYPOTHESIS_USER_CONFIRMED',
      actor: state.currentUser.name,
      role: state.currentUser.role,
      details: `Nutzerbestätigung erteilt — ersetzt keine unabhängige fachliche Verifizierung.`,
    });
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-[#101714]/10 pb-5">
        <h1 className="text-2xl font-semibold text-[#101714]">08 · Data Trust Center & Audit Trail</h1>
        <p className="text-sm text-[#6E8276] mt-1">
          Transparente Herkunfts-, Qualitäts- und Nachweisführung. Ein hoher Vollständigkeitsgrad ist kein Beweis für inhaltliche Richtigkeit.
        </p>
      </div>

      {/* Data Quality Dashboard */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Pflichtfeld-Vollständigkeit', val: `${dq.completenessPct} %` },
          { label: 'Dokumentierte Quellen', val: `${dq.documentedSourcesPct} %` },
          { label: 'Unbestätigte KI-Hypothesen', val: dq.unconfirmedAiHypothesesCount },
          { label: 'Widersprüche (CONFLICT)', val: dq.conflictCount },
          { label: 'Kritische Datenlücken', val: dq.criticalDataGapsCount },
          { label: 'Offene fachliche Nachweise', val: dq.openExpertProofsCount },
        ].map((k) => (
          <div key={k.label} className="bg-white border border-[#101714]/10 rounded-md p-4">
            <div className="text-[11px] text-[#6E8276]">{k.label}</div>
            <div className="text-xl font-mono font-semibold tabular-nums mt-1 text-[#101714]">{k.val}</div>
          </div>
        ))}
      </section>

      {/* Status Taxonomy Legend & Counts */}
      <section className="bg-white border border-[#101714]/10 rounded-md p-5 space-y-3 text-xs">
        <h2 className="text-sm font-semibold text-[#101714] flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#063D2F]" />
          <span>Verteilung der Datenstatus im aktiven Projekt</span>
        </h2>
        <div className="flex flex-wrap gap-4">
          {(Object.keys(dq.statusBreakdown) as Array<keyof typeof dq.statusBreakdown>).map((st) => (
            <div key={st} className="flex items-center gap-2">
              <TrustStatusLabel status={st} />
              <span className="font-mono font-semibold tabular-nums">{dq.statusBreakdown[st]}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-[#6E8276] pt-1">
          Hinweis: Eine Nutzerbestätigung (USER PROVIDED / USER_CONFIRMED) wird systemseitig strikt von einer unabhängigen fachlichen Verifizierung (VERIFIED) getrennt gespeichert.
        </p>
      </section>

      {/* Unconfirmed AI Hypotheses */}
      <section className="bg-white border border-[#101714]/10 rounded-md p-5 space-y-4 text-xs">
        <h2 className="text-sm font-semibold text-[#101714]">
          Unbestätigte KI-Hypothesen ({unconfirmedHypotheses.length})
        </h2>
        {unconfirmedHypotheses.length === 0 ? (
          <div className="text-[#6E8276]">Keine unbestätigten KI-Hypothesen offen.</div>
        ) : (
          <div className="divide-y divide-[#101714]/10 border border-[#101714]/10 rounded">
            {unconfirmedHypotheses.map(({ component, hypothesis }) => (
              <div key={hypothesis.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <TrustStatusLabel status="AI_HYPOTHESIS" />
                    <span className="font-semibold text-[#101714]">{component.name}</span>
                  </div>
                  <div>Vorschlag: {hypothesis.proposedMaterial}</div>
                  <div className="text-[#9A5B13]">
                    Unsicherheiten: {hypothesis.uncertainties.join(' · ')}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => confirmHypothesis(component.id, hypothesis.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#063D2F] text-white font-medium whitespace-nowrap shrink-0"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Als Nutzer bestätigen</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Data Sources Registry */}
      <section className="bg-white border border-[#101714]/10 rounded-md overflow-hidden">
        <div className="p-4 border-b border-[#101714]/10 bg-[#F7F5EF]">
          <h2 className="text-sm font-semibold text-[#101714]">Angebundene & geprüfte Datenquellen</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F5EF] border-b border-[#101714]/10 text-[#6E8276]">
              <tr>
                <th className="py-2.5 px-4">Quelle</th>
                <th className="py-2.5 px-4">Anbieter</th>
                <th className="py-2.5 px-4">Methode</th>
                <th className="py-2.5 px-4">Verfügbarkeit</th>
                <th className="py-2.5 px-4">Hinweis / Lizenz</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#101714]/10">
              {state.dataSources.map((src) => (
                <tr key={src.id}>
                  <td className="py-2.5 px-4 font-medium">{src.name}</td>
                  <td className="py-2.5 px-4 text-[#6E8276]">{src.provider}</td>
                  <td className="py-2.5 px-4">{src.collectionMethod}</td>
                  <td className="py-2.5 px-4 font-mono">{src.availabilityStatus}</td>
                  <td className="py-2.5 px-4 text-[#6E8276]">{src.licenseNote}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Audit Trail */}
      <section className="bg-white border border-[#101714]/10 rounded-md overflow-hidden">
        <div className="p-4 border-b border-[#101714]/10 bg-[#F7F5EF]">
          <h2 className="text-sm font-semibold text-[#101714]">Audit Trail (Änderungshistorie)</h2>
        </div>
        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F5EF] border-b border-[#101714]/10 text-[#6E8276]">
              <tr>
                <th className="py-2 px-4">Zeitstempel</th>
                <th className="py-2 px-4">Akteur & Rolle</th>
                <th className="py-2 px-4">Aktion</th>
                <th className="py-2 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#101714]/10">
              {state.auditEvents.slice(0, 40).map((ev) => (
                <tr key={ev.id}>
                  <td className="py-2 px-4 font-mono text-[11px] whitespace-nowrap">
                    {new Date(ev.timestamp).toLocaleString('de-DE')}
                  </td>
                  <td className="py-2 px-4 whitespace-nowrap">
                    {ev.actor} ({ev.role})
                  </td>
                  <td className="py-2 px-4 font-mono text-[11px]">{ev.action}</td>
                  <td className="py-2 px-4 text-[#101714]/85">{ev.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
