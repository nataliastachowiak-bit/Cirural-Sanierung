import React, { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Plus, Send, X } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { calculateComponentQuantities, calculateScenarioCosts, evaluateProjectDataQuality } from '../../engine/calculations';

interface CopilotStructuredReply {
  answer: string;
  documentedFacts: string[];
  calculations: string[];
  assumptions: string[];
  openQuestions: string[];
  suggestedNextStep?: string;
}

interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  structured?: CopilotStructuredReply;
}

const SAMPLE_PROMPTS = [
  'Welche Informationen fehlen für die Bewertung dieser Fassade?',
  'Welche 5R-Optionen sollten wir genauer prüfen?',
  'Warum ist REFURBISH bzw. REMANUFACTURE aktuell nicht abschließend bewertbar?',
  'Welche technischen Nachweise benötigen wir?',
  'Welche Kostenpositionen beeinflussen das Ergebnis am stärksten?',
  'Erstelle einen Untersuchungsplan für die nächste Gebäudebegehung.',
];

export const AiCopilotDrawer: React.FC = () => {
  const {
    copilotOpen,
    setCopilotOpen,
    activeProject,
    activeBuilding,
    activeComponent,
    language,
    addInspectionTask,
    logAudit,
    state,
  } = useWorkspace();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [taskCreatedBanner, setTaskCreatedBanner] = useState<string | null>(null);

  const authorizedContext = useMemo(() => {
    if (!activeProject) return {};
    const qty = activeComponent ? calculateComponentQuantities(activeComponent) : null;
    const dq = evaluateProjectDataQuality(activeProject);
    const scenarios = activeProject.scenarios
      .filter((s) => !activeComponent || s.componentId === activeComponent.id)
      .map((s) => ({
        strategy: s.strategyCode,
        name: s.name,
        technicalStatus: s.overallTechnicalStatus,
        cost: calculateScenarioCosts(s),
        environmental: s.environmentalImpact,
        missingData: s.missingDataSummary,
        requiredTests: s.requiredTests,
      }));

    return {
      project: {
        id: activeProject.id,
        name: activeProject.name,
        isDemo: activeProject.isDemo,
        status: activeProject.status,
      },
      building: activeBuilding
        ? {
            name: activeBuilding.name,
            address: activeBuilding.location,
            constructionYear: activeBuilding.profile.constructionYear,
            buildingType: activeBuilding.profile.buildingType,
            pollutantHints: activeBuilding.profile.potentialPollutantHints,
            climateRisks: activeBuilding.climateRisks.map((r) => ({
              label: r.label,
              hazardClass: r.hazardClass,
              availabilityStatus: r.availabilityStatus,
            })),
          }
        : null,
      component: activeComponent
        ? {
            name: activeComponent.name,
            category: activeComponent.category,
            dimensions: activeComponent.dimensions,
            quantities: qty,
            openInspectionRequirements: activeComponent.openInspectionRequirements,
            conditionNote: activeComponent.conditionNote,
          }
        : null,
      dataQuality: dq,
      scenarios,
    };
  }, [activeProject, activeBuilding, activeComponent]);

  if (!copilotOpen) return null;

  const sendQuestion = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || loading) return;

    setError(null);
    setTaskCreatedBanner(null);
    const userTurn: ChatTurn = { id: `u-${Date.now()}`, role: 'user', text: trimmed };
    const nextTurns = [...turns, userTurn];
    setTurns(nextTurns);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          question: trimmed,
          projectContext: authorizedContext,
          history: nextTurns.map((t) => ({ role: t.role, content: t.text })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'AI Copilot konnte nicht antworten.');
        setLoading(false);
        return;
      }

      const reply: CopilotStructuredReply = {
        answer: data.answer || '',
        documentedFacts: Array.isArray(data.documentedFacts) ? data.documentedFacts : [],
        calculations: Array.isArray(data.calculations) ? data.calculations : [],
        assumptions: Array.isArray(data.assumptions) ? data.assumptions : [],
        openQuestions: Array.isArray(data.openQuestions) ? data.openQuestions : [],
        suggestedNextStep: data.suggestedNextStep,
      };

      setTurns((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: reply.answer,
          structured: reply,
        },
      ]);
      if (activeProject) {
        logAudit({
          projectId: activeProject.id,
          entityType: 'PROJECT',
          entityId: activeComponent?.id ?? activeProject.id,
          action: 'AI_COPILOT_QUERY',
          actor: state.currentUser.name,
          role: state.currentUser.role,
          details: `Copilot-Anfrage: "${trimmed.slice(0, 80)}"`,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verbindungsfehler zum Server');
    } finally {
      setLoading(false);
    }
  };

  const confirmSuggestedTask = (taskTitle: string) => {
    if (!activeProject) return;
    addInspectionTask(activeProject.id, {
      id: `task-ai-${Date.now()}`,
      projectId: activeProject.id,
      componentId: activeComponent?.id,
      title: taskTitle.slice(0, 120),
      description: 'Aus AI-Copilot-Vorschlag nach menschlicher Bestätigung übernommen.',
      assignedRole: 'TECHNICAL_EXPERT',
      priority: 'HIGH',
      status: 'OPEN',
    });
    setTaskCreatedBanner('Prüfaufgabe nach Bestätigung im Projekt gespeichert.');
  };

  return (
    <aside
      aria-label="ResourceLoop AI Copilot"
      className="no-print fixed top-16 right-0 bottom-0 z-40 w-full sm:w-[440px] bg-white border-l border-[#101714]/15 flex flex-col shadow-xl"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#101714]/10 flex items-center justify-between bg-[#F7F5EF]">
        <div>
          <h2 className="text-sm font-semibold text-[#101714]">ResourceLoop AI Copilot</h2>
          <p className="text-xs text-[#6E8276]">
            Kontext: {activeComponent ? activeComponent.name : activeProject?.name ?? 'Kein Projekt'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCopilotOpen(false)}
          className="p-1.5 rounded hover:bg-[#101714]/10 text-[#101714]"
          aria-label="Copilot schließen"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Transparency Rule Notice */}
      <div className="px-5 py-2.5 bg-[#063D2F]/5 border-b border-[#063D2F]/15 text-[11px] text-[#063D2F]">
        Lesezugriff auf autorisierte Projektdaten. Keine automatische Datenüberschreibung — Änderungen erfordern Bestätigung.
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {turns.length === 0 && (
          <div className="space-y-3">
            <div className="text-xs font-medium text-[#6E8276]">Beispielanfragen für den aktiven Kontext:</div>
            <div className="space-y-2">
              {SAMPLE_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => sendQuestion(p)}
                  className="w-full text-left px-3 py-2 text-xs rounded border border-[#101714]/15 bg-[#F7F5EF] hover:border-[#063D2F] text-[#101714] transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((turn) => (
          <div
            key={turn.id}
            className={`rounded-md p-3.5 text-xs space-y-2.5 ${
              turn.role === 'user'
                ? 'bg-[#101714] text-white ml-8'
                : 'bg-[#F7F5EF] border border-[#101714]/10 text-[#101714] mr-2'
            }`}
          >
            <div className="font-semibold text-[11px] opacity-70">
              {turn.role === 'user' ? 'Ihre Anfrage' : 'ResourceLoop AI Copilot'}
            </div>
            <div className="leading-relaxed whitespace-pre-wrap">{turn.text}</div>

            {turn.structured && (
              <div className="space-y-2 pt-2 border-t border-[#101714]/10">
                {turn.structured.documentedFacts.length > 0 && (
                  <div>
                    <div className="font-mono text-[10px] font-semibold text-[#063D2F]">DOKUMENTIERTE FAKTEN</div>
                    <ul className="list-disc pl-4 space-y-0.5 text-[#101714]/90">
                      {turn.structured.documentedFacts.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {turn.structured.calculations.length > 0 && (
                  <div>
                    <div className="font-mono text-[10px] font-semibold text-[#101714]">BERECHNUNGEN</div>
                    <ul className="list-disc pl-4 space-y-0.5 font-mono text-[11px]">
                      {turn.structured.calculations.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {turn.structured.assumptions.length > 0 && (
                  <div>
                    <div className="font-mono text-[10px] font-semibold text-[#8C6413]">ANNAHMEN</div>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {turn.structured.assumptions.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {turn.structured.openQuestions.length > 0 && (
                  <div>
                    <div className="font-mono text-[10px] font-semibold text-[#B91C1C]">OFFENE FRAGEN / NACHWEISE</div>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {turn.structured.openQuestions.map((q, i) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {turn.structured.suggestedNextStep && activeProject && (
                  <div className="pt-2 border-t border-[#101714]/10 flex items-start justify-between gap-2">
                    <span className="text-[11px] text-[#6E8276]">
                      Vorschlag: {turn.structured.suggestedNextStep}
                    </span>
                    <button
                      type="button"
                      onClick={() => confirmSuggestedTask(turn.structured!.suggestedNextStep!)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#063D2F] text-white text-[11px] font-medium whitespace-nowrap shrink-0 hover:bg-[#101714]"
                    >
                      <Plus className="w-3 h-3" />
                      Als Aufgabe übernehmen
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="p-3 rounded border border-[#101714]/10 bg-[#F7F5EF] text-xs text-[#6E8276]">
            Analysiere autorisierte Projektdaten…
          </div>
        )}

        {error && (
          <div className="p-3 rounded border border-[#B91C1C]/30 bg-[#FEF2F2] text-xs text-[#B91C1C] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {taskCreatedBanner && (
          <div className="p-3 rounded border border-[#063D2F]/30 bg-[#063D2F]/5 text-xs text-[#063D2F] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{taskCreatedBanner}</span>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendQuestion(input);
        }}
        className="p-4 border-t border-[#101714]/10 bg-white flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Frage zu Datenlücken, 5R oder Nachweisen…"
          className="flex-1 px-3 py-2 text-xs border border-[#101714]/20 rounded-md focus:outline-none focus:border-[#063D2F]"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-3.5 py-2 rounded-md bg-[#063D2F] text-white text-xs font-medium disabled:opacity-40 hover:bg-[#101714] transition-colors inline-flex items-center gap-1.5"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Senden</span>
        </button>
      </form>
    </aside>
  );
};
