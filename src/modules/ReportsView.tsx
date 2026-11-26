import React, { useMemo } from 'react';
import { jsPDF } from 'jspdf';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import {
  calculateComponentQuantities,
  calculateScenarioCosts,
  evaluateProjectDataQuality,
} from '../engine/calculations';

export const ReportsView: React.FC = () => {
  const { state, activeProject, activeBuilding, activeComponent, addReportArtifact } = useWorkspace();

  const quantities = useMemo(
    () => (activeComponent ? calculateComponentQuantities(activeComponent) : null),
    [activeComponent]
  );

  const dq = useMemo(
    () => (activeProject ? evaluateProjectDataQuality(activeProject) : null),
    [activeProject]
  );

  const scenarios = useMemo(() => {
    if (!activeProject || !activeComponent) return [];
    return activeProject.scenarios.filter((s) => s.componentId === activeComponent.id);
  }, [activeProject, activeComponent]);

  if (!activeProject || !activeBuilding || !dq) {
    return (
      <div className="bg-white border border-[#101714]/10 rounded-md p-8 text-center text-sm text-[#6E8276]">
        Bitte wählen Sie ein Projekt aus.
      </div>
    );
  }

  const latestDecision = activeProject.decisions[0];

  const exportCsv = () => {
    const header = [
      'Strategie',
      'Zirkulaer',
      'Technischer_Status',
      'Nettokosten_EUR',
      'Kosten_Vollstaendigkeit_Pct',
      'Erhaltenes_Material_kg',
      'Abfall_kg',
      'THG_kgCO2e',
      'Offene_Pruefungen',
    ];
    const rows = scenarios.map((s) => {
      const c = calculateScenarioCosts(s);
      return [
        s.strategyCode,
        s.isCircular ? 'JA' : 'REFERENZ',
        s.overallTechnicalStatus,
        c.totalNetEur !== null ? c.totalNetEur.toFixed(2) : 'UNKNOWN',
        String(c.completenessPct),
        s.environmentalImpact.preservedMaterialKg ?? 'UNKNOWN',
        s.environmentalImpact.expectedWasteKg ?? 'UNKNOWN',
        s.environmentalImpact.ghgEmissionsKgCo2e ?? 'UNKNOWN',
        `"${s.requiredTests.join('; ').replace(/"/g, '""')}"`,
      ].join(',');
    });
    const csvContent = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ResourceLoop_Report_${activeProject.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    addReportArtifact({
      id: `rep-${Date.now()}`,
      projectId: activeProject.id,
      componentId: activeComponent?.id ?? '',
      createdAt: new Date().toISOString(),
      createdBy: state.currentUser.name,
      format: 'CSV',
      title: `CSV-Export ${activeProject.name}`,
    });
  };

  const exportPdf = () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    let y = 18;
    const addLine = (text: string, size = 10, bold = false) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(size);
      const lines = doc.splitTextToSize(text, 175);
      if (y + lines.length * 5 > 280) {
        doc.addPage();
        y = 18;
      }
      doc.text(lines, 16, y);
      y += lines.length * (size * 0.45) + 2;
    };

    addLine('ResourceLoop AI — Sanierungsentscheidungsbericht', 15, true);
    addLine('Hinweis: Entscheidungsunterstützung, kein zertifiziertes technisches Gutachten.', 9, false);
    y += 3;

    addLine(`1. Executive Summary & 2. Projektbeschreibung`, 12, true);
    addLine(`Projekt: ${activeProject.name} (${activeProject.isDemo ? 'DEMO' : 'REAL'})`);
    addLine(`Status: ${activeProject.status} | Eigentümer: ${activeProject.ownerName}`);
    addLine(activeProject.description);
    y += 2;

    addLine(`3. Building Profile & 4. Standort- und Umweltdaten`, 12, true);
    addLine(
      `Gebäude: ${activeBuilding.name}, ${activeBuilding.location.street} ${activeBuilding.location.houseNumber}, ${activeBuilding.location.postalCode} ${activeBuilding.location.city}`
    );
    addLine(
      `Baujahr: ${activeBuilding.profile.constructionYear ?? 'UNBEKANNT'} | Baualtersklasse: ${activeBuilding.profile.buildingAgeClass}`
    );
    y += 2;

    addLine(`5. Klimarisiken`, 12, true);
    activeBuilding.climateRisks.forEach((r) => {
      addLine(`- ${r.label}: Klasse=${r.hazardClass} (${r.availabilityStatus}, Quelle: ${r.sourceName})`);
    });
    y += 2;

    addLine(`6. Bauteilbestand & 7. Materialinformationen`, 12, true);
    if (activeComponent && quantities) {
      addLine(`Bauteil: ${activeComponent.name} (${activeComponent.category})`);
      addLine(
        `Bruttofläche: ${quantities.totalGrossAreaM2 ?? 'UNKNOWN'} m² | Nettofläche: ${
          quantities.totalNetAreaM2 ?? 'UNKNOWN'
        } m² | Masse: ${quantities.totalMassKg ?? 'UNKNOWN'} kg`
      );
      activeComponent.layers.forEach((l) => {
        addLine(`- Schicht: ${l.materialName} (${l.thicknessValue} ${l.thicknessUnit}, Dichte: ${l.densityKgM3 ?? 'UNKNOWN'} kg/m³)`);
      });
    }
    y += 2;

    addLine(`8.–11. Technische, Wirtschaftliche & Umweltbewertung (5R-Vergleich)`, 12, true);
    scenarios.forEach((s) => {
      const c = calculateScenarioCosts(s);
      addLine(
        `- ${s.name}: Technik=${s.overallTechnicalStatus}, Kosten=${
          c.totalNetEur !== null ? `${c.totalNetEur.toLocaleString('de-DE')} EUR netto` : 'UNKNOWN'
        }, Erhalt=${s.environmentalImpact.preservedMaterialKg ?? 'UNKNOWN'} kg, CO2e=${
          s.environmentalImpact.ghgEmissionsKgCo2e ?? 'UNKNOWN'
        } kg`
      );
    });
    y += 2;

    addLine(`12.–14. Datenqualität, Lücken & Prüfanforderungen`, 12, true);
    addLine(
      `Vollständigkeit: ${dq.completenessPct} % | Dokumentierte Quellen: ${dq.documentedSourcesPct} % | Offene Nachweise: ${dq.openExpertProofsCount}`
    );
    y += 2;

    addLine(`15.–18. Empfehlung, Menschliche Entscheidung & Änderungshistorie`, 12, true);
    if (latestDecision) {
      addLine(`Menschliche Entscheidung (v${latestDecision.version}): ${latestDecision.humanDecisionStrategy}`);
      addLine(`Begründung: ${latestDecision.humanDecisionRationale}`);
      addLine(`Freigabestatus: ${latestDecision.approval.decisionStatus}`);
    } else {
      addLine('Noch kein Entscheidungssnapshot gespeichert.');
    }

    doc.save(`ResourceLoop_Bericht_${activeProject.id}.pdf`);
    addReportArtifact({
      id: `rep-${Date.now()}`,
      projectId: activeProject.id,
      componentId: activeComponent?.id ?? '',
      createdAt: new Date().toISOString(),
      createdBy: state.currentUser.name,
      format: 'PDF',
      title: `PDF-Entscheidungsbericht ${activeProject.name}`,
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#101714]/10 pb-5 no-print">
        <div>
          <h1 className="text-2xl font-semibold text-[#101714]">09 · Sanierungsentscheidungsbericht</h1>
          <p className="text-sm text-[#6E8276] mt-1">
            Vollständige 18-Kapitel-Dokumentation als PDF- oder CSV-Export. Entscheidungsunterstützung — kein zertifiziertes technisches Gutachten.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md border border-[#101714]/20 bg-white text-xs font-medium hover:bg-[#F7F5EF]"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#063D2F]" />
            <span>CSV exportieren</span>
          </button>
          <button
            type="button"
            onClick={exportPdf}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#063D2F] text-white text-xs font-medium hover:bg-[#101714]"
          >
            <Download className="w-4 h-4 text-[#C6A45A]" />
            <span>PDF-Bericht herunterladen</span>
          </button>
        </div>
      </div>

      {/* 18-Section Structured Report Preview */}
      <article className="bg-white border border-[#101714]/15 rounded-md p-6 sm:p-8 space-y-6 text-xs leading-relaxed">
        <div className="border-b border-[#101714]/15 pb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[11px] text-[#063D2F]">RESOURCELOOP AI · ENTSCHEIDUNGSBERICHT</div>
            <h2 className="text-xl font-semibold text-[#101714] mt-1">{activeProject.name}</h2>
          </div>
          <div className="font-mono text-[11px] text-[#6E8276] text-right">
            <div>Stand: {new Date().toLocaleDateString('de-DE')}</div>
            <div>Hinweis: Kein technisches Gutachten</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="space-y-1.5">
            <h3 className="font-semibold text-sm text-[#101714]">1. Executive Summary & 2. Projektbeschreibung</h3>
            <p className="text-[#101714]/85">{activeProject.description}</p>
            <div className="font-mono text-[11px] text-[#6E8276]">
              Status: {activeProject.status} · Projektverantwortung: {activeProject.ownerName}
            </div>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-semibold text-sm text-[#101714]">3. Building Profile & 4. Standortdaten</h3>
            <div>
              {activeBuilding.name} · {activeBuilding.location.street} {activeBuilding.location.houseNumber},{' '}
              {activeBuilding.location.postalCode} {activeBuilding.location.city}
            </div>
            <div>
              Baujahr: {activeBuilding.profile.constructionYear ?? 'UNKNOWN'} · {activeBuilding.profile.buildingAgeClass}
            </div>
            <div className="text-[#6E8276]">
              Koordinaten: {activeBuilding.location.latitude ?? 'UNKNOWN'}, {activeBuilding.location.longitude ?? 'UNKNOWN'}
            </div>
          </section>
        </div>

        <section className="space-y-2 border-t border-[#101714]/10 pt-4">
          <h3 className="font-semibold text-sm text-[#101714]">5. Klimarisiken & Umweltkontext</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeBuilding.climateRisks.map((r) => (
              <div key={r.id} className="p-3 rounded bg-[#F7F5EF] border border-[#101714]/10">
                <div className="font-semibold">{r.label}</div>
                <div className="font-mono text-[11px]">Klasse: {r.hazardClass}</div>
                <div className="text-[#6E8276] mt-0.5">{r.recommendedExpertCheck}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2 border-t border-[#101714]/10 pt-4">
          <h3 className="font-semibold text-sm text-[#101714]">
            6. Bauteilbestand & 7. Materialinformationen (Deterministische Berechnung)
          </h3>
          {activeComponent && quantities ? (
            <div className="space-y-2">
              <div className="font-mono">
                {activeComponent.name}: Brutto {quantities.totalGrossAreaM2} m² − Öffnung{' '}
                {activeComponent.dimensions.openingAreaM2} m² = Netto {quantities.totalNetAreaM2} m² · Masse{' '}
                {quantities.totalMassKg ?? 'UNKNOWN'} kg ({quantities.massCompleteness})
              </div>
              <ul className="list-disc pl-4 space-y-0.5">
                {activeComponent.layers.map((l) => (
                  <li key={l.id}>
                    {l.materialName}: {l.thicknessValue} {l.thicknessUnit} · Rohdichte{' '}
                    {l.densityKgM3 ?? 'UNKNOWN'} kg/m³ ({l.densityStatus})
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-[#6E8276]">Kein Bauteil ausgewählt.</div>
          )}
        </section>

        <section className="space-y-2 border-t border-[#101714]/10 pt-4">
          <h3 className="font-semibold text-sm text-[#101714]">
            8.–11. Technische, Wirtschaftliche & Umweltbewertung (5R-Vergleich)
          </h3>
          <div className="overflow-x-auto border border-[#101714]/10 rounded">
            <table className="w-full text-left">
              <thead className="bg-[#F7F5EF] border-b border-[#101714]/10 text-[#6E8276]">
                <tr>
                  <th className="py-2 px-3">Option</th>
                  <th className="py-2 px-3">Technik</th>
                  <th className="py-2 px-3 text-right">Nettokosten</th>
                  <th className="py-2 px-3 text-right">Materialerhalt</th>
                  <th className="py-2 px-3 text-right">CO₂e</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#101714]/10">
                {scenarios.map((s) => {
                  const c = calculateScenarioCosts(s);
                  return (
                    <tr key={s.id}>
                      <td className="py-2 px-3 font-medium">{s.name}</td>
                      <td className="py-2 px-3">{s.overallTechnicalStatus}</td>
                      <td className="py-2 px-3 text-right font-mono">
                        {c.totalNetEur !== null ? `${c.totalNetEur.toLocaleString('de-DE')} €` : 'UNKNOWN'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {s.environmentalImpact.preservedMaterialKg ?? 'UNKNOWN'} kg
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {s.environmentalImpact.ghgEmissionsKgCo2e ?? 'UNKNOWN'} kg
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-[#101714]/10 pt-4">
          <section className="space-y-1.5">
            <h3 className="font-semibold text-sm text-[#101714]">
              12.–14. Datenqualität, Lücken & Prüfanforderungen
            </h3>
            <div className="font-mono">
              Pflichtfelder: {dq.completenessPct} % · Quellenquote: {dq.documentedSourcesPct} % · Offene Nachweise:{' '}
              {dq.openExpertProofsCount}
            </div>
            <ul className="list-disc pl-4 space-y-0.5 text-[#9A5B13]">
              {activeComponent?.openInspectionRequirements.map((req, i) => (
                <li key={i}>{req}</li>
              ))}
            </ul>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-semibold text-sm text-[#101714]">
              15.–18. Empfehlung, Menschliche Entscheidung, Quellen & Historie
            </h3>
            {latestDecision ? (
              <div className="space-y-1">
                <div>
                  <strong>Entscheidung (v{latestDecision.version}):</strong> {latestDecision.humanDecisionStrategy} (
                  {latestDecision.approval.decisionStatus})
                </div>
                <div>{latestDecision.humanDecisionRationale}</div>
                <div className="text-[#6E8276]">
                  Quellen: {state.dataSources.map((ds) => ds.name).slice(0, 4).join(', ')}
                </div>
              </div>
            ) : (
              <div className="text-[#6E8276]">Noch kein Entscheidungssnapshot dokumentiert.</div>
            )}
          </section>
        </div>

        {state.reports.length > 0 && (
          <div className="border-t border-[#101714]/10 pt-4 text-[11px] text-[#6E8276] flex items-center gap-2">
            <FileText className="w-3.5 h-3.5" />
            <span>Zuletzt exportiert: {state.reports[0].title} ({new Date(state.reports[0].createdAt).toLocaleString('de-DE')})</span>
          </div>
        )}
      </article>
    </div>
  );
};
