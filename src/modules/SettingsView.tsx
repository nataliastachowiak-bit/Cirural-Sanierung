import React from 'react';
import { RefreshCw, Shield } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { RoadmapStatusLabel } from '../components/ui/TrustBadge';
import type { ImplementationBadge, UserRole } from '../types/resourceloop';

const CAPABILITY_MATRIX: Array<{ area: string; feature: string; status: ImplementationBadge; note: string }> = [
  {
    area: 'Core MVP (NOW)',
    feature: 'Projektanlage, Bearbeitung, Archivierung & JSON-Export',
    status: 'IMPLEMENTED_TESTED',
    note: 'End-to-End im Browser & lokalen Server-Store persistent.',
  },
  {
    area: 'Core MVP (NOW)',
    feature: 'Product Twin / Resource DNA & Deterministische Quantity Engine (12 − 2 = 10 m²)',
    status: 'IMPLEMENTED_TESTED',
    note: 'Durch Vitest-Suite gegen alle Fehlerfälle (Negativwerte, fehlende Dichte, Öffnung > Brutto) getestet.',
  },
  {
    area: 'Core MVP (NOW)',
    feature: 'Circular Decision Compass (5 R-Optionen + Konventionelle Referenz, MCDA, Kosten)',
    status: 'IMPLEMENTED_TESTED',
    note: 'Fehlende Kosten werden nie durch 0 € ersetzt; technische Ausschlüsse nicht kompensierbar.',
  },
  {
    area: 'Core MVP (NOW)',
    feature: 'Data Trust Center, Audit Trail & Decision Memory Snapshots',
    status: 'IMPLEMENTED_NOT_TESTED',
    note: 'Versionierte Snapshots, Freigaben und Nutzerbestätigung getrennt von Fachverifizierung.',
  },
  {
    area: 'Core MVP (NOW)',
    feature: 'Renovation Decision Report (18 Kapitel, PDF & CSV Export)',
    status: 'IMPLEMENTED_NOT_TESTED',
    note: 'Client-seitige PDF-Generierung über jsPDF und strukturierter CSV-Export.',
  },
  {
    area: 'AI & Building (NEXT)',
    feature: 'Building Intelligence: OSM Nominatim Geocoding, Overpass & Leaflet GIS-Karte',
    status: 'IMPLEMENTED_NOT_TESTED',
    note: 'Live OpenStreetMap-Adapter + GeoBasis NRW WMS-Anbindung; fehlende Risikokarten als UNKNOWN.',
  },
  {
    area: 'AI & Building (NEXT)',
    feature: 'Multimodaler Smart Scanner, Dokumentextraktion, AI Building Briefing & AI Copilot',
    status: 'IMPLEMENTED_NOT_TESTED',
    note: 'Serverseitiges @google/genai SDK (gemini-4-hydrogen) mit JSON-Schemas; erfordert GEMINI_API_KEY.',
  },
  {
    area: 'AI & Building (NEXT)',
    feature: 'Excel- / CSV-Bauteilimport-Assistent (XLSX)',
    status: 'IMPLEMENTED_NOT_TESTED',
    note: 'Tabellenblatt-Auswahl, Spalten-Mapping, Einheiten-, Fehler- und Dublettenprüfung.',
  },
  {
    area: 'Referenzdaten',
    feature: 'Aluminium-Fassadenelement (Düsseldorf) + Innenwand + Fenster Demo-Fälle',
    status: 'DEMO_ONLY',
    note: 'Eindeutig als DEMO gekennzeichnet und von realen Projekten getrennt.',
  },
  {
    area: 'Geo / Enterprise (LATER)',
    feature: 'Cloud Firestore & Firebase Auth Persistenz',
    status: 'PLANNED',
    note: 'Aktuell lokale Demonstrator-Persistenz (./data/workspace.json + localStorage). Migration vorbereitet.',
  },
  {
    area: 'Geo / Enterprise (LATER)',
    feature: 'Amtliche Hochwasser-/Starkregen-JSON-APIs & Kommunales Altlastenkataster NRW',
    status: 'BLOCKED',
    note: 'Keine offenen standardisierten Objekt-APIs ohne behördliche Einzelanfrage / manuellen Import.',
  },
  {
    area: 'Geo / Enterprise (LATER)',
    feature: 'IFC/BIM-Import, ERP-Schnittstelle & Material-Marktplatz',
    status: 'PLANNED',
    note: 'Geplant in Roadmap-Phase LATER — bewusst keine funktionslosen Attrappen.',
  },
];

export const SettingsView: React.FC = () => {
  const { state, setUserRole, resetDemoWorkspace } = useWorkspace();

  return (
    <div className="space-y-8">
      <div className="border-b border-[#101714]/10 pb-5">
        <h1 className="text-2xl font-semibold text-[#101714]">10 · Einstellungen, Sicherheit & Implementierungsstatus</h1>
        <p className="text-sm text-[#6E8276] mt-1">
          Rollenperspektive (RBAC), Persistenztransparenz, Validierungs-KPIs und vollständige Funktionsmatrix.
        </p>
      </div>

      {/* RBAC & Persistence Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-white border border-[#101714]/10 rounded-md p-5 space-y-4 text-xs">
          <h2 className="text-sm font-semibold text-[#101714] flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#063D2F]" />
            <span>Rollenbasierte Perspektive (RBAC-Modell)</span>
          </h2>
          <div>
            <div className="text-[#6E8276] mb-1">Angemeldeter Demo-Nutzer</div>
            <div className="font-semibold text-[#101714]">
              {state.currentUser.name} ({state.currentUser.email})
            </div>
          </div>
          <div>
            <label className="block text-[#6E8276] mb-1">Aktive Rolle für Prüfabläufe & Audit-Trail</label>
            <select
              value={state.currentUser.role}
              onChange={(e) => setUserRole(e.target.value as UserRole)}
              className="w-full px-3 py-2 border border-[#101714]/20 rounded-md bg-white"
            >
              <option value="PROJECT_OWNER">Project Owner</option>
              <option value="TECHNICAL_EXPERT">Technical Expert</option>
              <option value="EDITOR">Editor</option>
              <option value="REVIEWER">Reviewer</option>
              <option value="VIEWER">Viewer</option>
            </select>
          </div>
          <div className="text-[11px] text-[#6E8276]">
            API-Schlüssel (GEMINI_API_KEY) werden ausschließlich serverseitig in Express verarbeitet und niemals an den Browser übertragen.
          </div>
        </section>

        <section className="bg-white border border-[#101714]/10 rounded-md p-5 space-y-4 text-xs">
          <h2 className="text-sm font-semibold text-[#101714]">Persistenz & Cloud-Migration</h2>
          <div className="p-3 rounded bg-[#F7F5EF] border border-[#101714]/10 space-y-1">
            <div className="font-semibold text-[#063D2F]">Aktiver Modus: Lokale Demonstrator-Persistenz</div>
            <div className="text-[#101714]/85">
              Speicherung erfolgt lokal im Browser (localStorage) sowie in der Serverdatei{' '}
              <span className="font-mono">data/workspace.json</span>. Es wird keine aktive Cloud-Firestore-Anbindung vorgetäuscht.
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-[#6E8276]">Alle Demo-Daten auf Ausgangszustand zurücksetzen:</span>
            <button
              type="button"
              onClick={resetDemoWorkspace}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded border border-[#101714]/20 hover:bg-[#F7F5EF] font-medium"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Demo-Daten zurücksetzen</span>
            </button>
          </div>
        </section>
      </div>

      {/* Product Validation Framework (Section 25 — without invented uplift claims) */}
      <section className="bg-white border border-[#101714]/10 rounded-md p-5 space-y-3 text-xs">
        <h2 className="text-sm font-semibold text-[#101714]">
          Vorbereitete Validierungsmetriken (Hypothesenprüfung vs. manueller Excel-Prozess)
        </h2>
        <p className="text-[#6E8276]">
          Die Produktwirkung ist eine zu validierende Hypothese. Es werden keine erfundenen Produktivitätssteigerungen ausgewiesen; folgende KPIs sind für Pilotstudien vorgesehen:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono text-[11px]">
          {[
            'Zeit Informationsbeschaffung',
            'Zeit Variantenvergleich',
            'Anteil belegter Felder (%)',
            'Erkannte kritische Lücken',
            'Berechnungsfehler-Rate',
          ].map((kpi) => (
            <div key={kpi} className="p-2.5 rounded bg-[#F7F5EF] border border-[#101714]/10">
              {kpi}: <span className="text-[#6E8276]">Pilotmessung ausstehend</span>
            </div>
          ))}
        </div>
      </section>

      {/* Implementation & Roadmap Matrix */}
      <section className="bg-white border border-[#101714]/10 rounded-md overflow-hidden">
        <div className="p-4 border-b border-[#101714]/10 bg-[#F7F5EF]">
          <h2 className="text-sm font-semibold text-[#101714]">
            Transparenzmatrix: Implementierungs- & Teststatus aller Module
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F5EF] border-b border-[#101714]/10 text-[#6E8276]">
              <tr>
                <th className="py-2.5 px-4">Phase</th>
                <th className="py-2.5 px-4">Funktion / Modul</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Technische Einordnung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#101714]/10">
              {CAPABILITY_MATRIX.map((row, idx) => (
                <tr key={idx}>
                  <td className="py-2.5 px-4 font-mono text-[11px]">{row.area}</td>
                  <td className="py-2.5 px-4 font-medium">{row.feature}</td>
                  <td className="py-2.5 px-4">
                    <RoadmapStatusLabel status={row.status} />
                  </td>
                  <td className="py-2.5 px-4 text-[#6E8276]">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
