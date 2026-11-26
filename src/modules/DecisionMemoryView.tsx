import React, { useMemo, useState } from 'react';
import { CheckCircle2, GitCompare, History, Search, XCircle } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { TechnicalStatusLabel } from '../components/ui/TrustBadge';

export const DecisionMemoryView: React.FC = () => {
  const { state, activeProject, updateDecisionApproval } = useWorkspace();
  const [search, setSearch] = useState('');
  const [compareIds, setCompareIds] = useState<[string, string]>(['', '']);
  const [approvalComment, setApprovalComment] = useState('');

  const allDecisions = useMemo(() => {
    const list = state.projects.flatMap((p) =>
      p.decisions.map((d) => ({
        project: p,
        component: p.components.find((c) => c.id === d.componentId),
        decision: d,
      }))
    );
    const q = search.toLowerCase().trim();
    if (!q) return list;
    return list.filter(
      (item) =>
        item.project.name.toLowerCase().includes(q) ||
        item.decision.humanDecisionStrategy.toLowerCase().includes(q) ||
        item.decision.humanDecisionRationale.toLowerCase().includes(q) ||
        (item.component?.name.toLowerCase().includes(q) ?? false)
    );
  }, [state.projects, search]);

  const compareA = allDecisions.find((d) => d.decision.id === compareIds[0]);
  const compareB = allDecisions.find((d) => d.decision.id === compareIds[1]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#101714]/10 pb-5">
        <div>
          <h1 className="text-2xl font-semibold text-[#101714]">07 · Decision Memory</h1>
          <p className="text-sm text-[#6E8276] mt-1">
            Unveränderbares, versioniertes Entscheidungsjournal. Ähnliche Referenzfälle dienen nur als Orientierung und ersetzen keine objektbezogene Prüfung.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#6E8276] absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Entscheidungen durchsuchen…"
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#101714]/20 rounded-md"
          />
        </div>
      </div>

      {/* Version Comparison Selector */}
      {allDecisions.length >= 2 && (
        <section className="bg-white border border-[#101714]/10 rounded-md p-5 space-y-4 text-xs">
          <h2 className="text-sm font-semibold text-[#101714] flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-[#063D2F]" />
            <span>Entscheidungs-Snapshots vergleichen</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              value={compareIds[0]}
              onChange={(e) => setCompareIds([e.target.value, compareIds[1]])}
              className="px-3 py-2 border border-[#101714]/20 rounded bg-white"
            >
              <option value="">Snapshot A wählen…</option>
              {allDecisions.map((item) => (
                <option key={item.decision.id} value={item.decision.id}>
                  v{item.decision.version} · {item.component?.name ?? item.project.name} ({item.decision.humanDecisionStrategy})
                </option>
              ))}
            </select>
            <select
              value={compareIds[1]}
              onChange={(e) => setCompareIds([compareIds[0], e.target.value])}
              className="px-3 py-2 border border-[#101714]/20 rounded bg-white"
            >
              <option value="">Snapshot B wählen…</option>
              {allDecisions.map((item) => (
                <option key={item.decision.id} value={item.decision.id}>
                  v{item.decision.version} · {item.component?.name ?? item.project.name} ({item.decision.humanDecisionStrategy})
                </option>
              ))}
            </select>
          </div>

          {compareA && compareB && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#101714]/10">
              {[compareA, compareB].map((entry, idx) => (
                <div key={idx} className="p-3 rounded bg-[#F7F5EF] border border-[#101714]/10 space-y-1.5">
                  <div className="font-mono text-[11px] text-[#063D2F]">
                    Snapshot v{entry.decision.version} · {new Date(entry.decision.decisionDate).toLocaleString('de-DE')}
                  </div>
                  <div className="font-semibold">{entry.decision.humanDecisionStrategy}</div>
                  <div>{entry.decision.humanDecisionRationale}</div>
                  <div className="text-[#6E8276]">Freigabe: {entry.decision.approval.decisionStatus}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Decision Snapshots List */}
      <div className="space-y-4">
        {allDecisions.length === 0 ? (
          <div className="bg-white border border-[#101714]/10 rounded-md p-8 text-center text-xs text-[#6E8276]">
            Noch keine Entscheidungssnapshots gespeichert. Speichern Sie im Circular Decision Compass einen Snapshot.
          </div>
        ) : (
          allDecisions.map(({ project, component, decision }) => (
            <article key={decision.id} className="bg-white border border-[#101714]/10 rounded-md p-6 space-y-4 text-xs">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#101714]/10 pb-3">
                <div className="space-y-1">
                  <div className="font-mono text-[11px] text-[#6E8276] flex items-center gap-2">
                    <History className="w-3.5 h-3.5" />
                    <span>
                      Version v{decision.version} · {new Date(decision.decisionDate).toLocaleString('de-DE')} ·{' '}
                      {project.isDemo ? 'DEMO-REFERENZ' : 'PROJEKT'}
                    </span>
                  </div>
                  <h2 className="text-base font-semibold text-[#101714]">
                    {project.name} — {component?.name ?? 'Bauteil'}
                  </h2>
                </div>

                <div className="text-right font-mono">
                  <div className="text-[11px] text-[#6E8276]">Freigabestatus</div>
                  <div
                    className={`font-semibold ${
                      decision.approval.decisionStatus === 'APPROVED'
                        ? 'text-[#063D2F]'
                        : decision.approval.decisionStatus === 'REJECTED'
                        ? 'text-[#B91C1C]'
                        : 'text-[#8C6413]'
                    }`}
                  >
                    {decision.approval.decisionStatus}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <div className="font-semibold text-[#063D2F]">
                    Menschliche Entscheidung: {decision.humanDecisionStrategy}
                  </div>
                  <p className="text-[#101714] leading-relaxed">{decision.humanDecisionRationale}</p>
                  <div className="text-[#6E8276]">
                    Verantwortlich: {decision.responsiblePerson} ({decision.responsibleRole})
                  </div>
                  <div className="p-2.5 rounded bg-[#F7F5EF] border border-[#101714]/10">
                    <span className="font-semibold">KI-Hinweis:</span> {decision.aiRecommendationSummary}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="font-semibold text-[#101714]">Betrachtete Optionen im Snapshot</div>
                  <div className="divide-y divide-[#101714]/10 border border-[#101714]/10 rounded">
                    {decision.consideredScenarios.map((cs) => (
                      <div key={cs.scenarioId} className="px-3 py-2 flex items-center justify-between gap-2">
                        <span className="font-medium truncate">{cs.name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono tabular-nums">
                            {cs.totalNetCostEur !== null ? `${cs.totalNetCostEur.toLocaleString('de-DE')} €` : 'UNKNOWN'}
                          </span>
                          <TechnicalStatusLabel status={cs.technicalStatus} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Approval Controls for active project */}
              {activeProject?.id === project.id && (
                <div className="pt-3 border-t border-[#101714]/10 flex flex-wrap items-center justify-between gap-3">
                  <input
                    type="text"
                    value={approvalComment}
                    onChange={(e) => setApprovalComment(e.target.value)}
                    placeholder="Prüfkommentar für Freigabe / Ablehnung…"
                    className="flex-1 min-w-[220px] px-3 py-1.5 border border-[#101714]/20 rounded"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateDecisionApproval(
                          project.id,
                          decision.id,
                          'APPROVED',
                          approvalComment || 'Fachlich geprüft und freigegeben.'
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#063D2F] text-white font-medium hover:bg-[#101714]"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Freigeben</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateDecisionApproval(
                          project.id,
                          decision.id,
                          'REJECTED',
                          approvalComment || 'Nachbesserung der Nachweise erforderlich.'
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#B91C1C]/40 text-[#B91C1C] font-medium hover:bg-[#FEF2F2]"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Zurückweisen</span>
                    </button>
                  </div>
                </div>
              )}

              {decision.subsequentChanges.length > 0 && (
                <div className="text-[11px] text-[#6E8276] font-mono pt-1 space-y-0.5">
                  {decision.subsequentChanges.map((sc, i) => (
                    <div key={i}>
                      [{new Date(sc.timestamp).toLocaleString('de-DE')}] {sc.author}: {sc.changeNote}
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  );
};
