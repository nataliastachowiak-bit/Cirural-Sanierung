import React, { useState } from 'react';
import { Archive, Check, Download, FolderPlus, Layers } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { evaluateProjectDataQuality } from '../engine/calculations';
import type { Project } from '../types/resourceloop';

export const ProjectsView: React.FC = () => {
  const {
    state,
    activeProject,
    selectContext,
    setActiveNav,
    createProject,
    archiveProject,
    updateProject,
  } = useWorkspace();

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [street, setStreet] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [year, setYear] = useState('');
  const [description, setDescription] = useState('');

  const handleQuickCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createProject({
      name,
      description: description || 'Neues Sanierungsprojekt',
      isDemo: false,
      street,
      postalCode,
      city,
      constructionYear: year ? Number(year) : null,
    });
    setName('');
    setCity('');
    setStreet('');
    setPostalCode('');
    setYear('');
    setDescription('');
  };

  const exportJson = (proj: Project) => {
    const blob = new Blob([JSON.stringify(proj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${proj.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-[#101714]/10 pb-5">
        <h1 className="text-2xl font-semibold text-[#101714]">Projektverwaltung</h1>
        <p className="text-sm text-[#6E8276] mt-1">
          Reale Sanierungsprojekte und gekennzeichnete Demo-Referenzfälle verwalten, wechseln und exportieren.
        </p>
      </div>

      {/* Create Real Project Form */}
      <section className="bg-white border border-[#101714]/10 rounded-md p-6 space-y-4">
        <h2 className="text-base font-semibold text-[#101714] flex items-center gap-2">
          <FolderPlus className="w-4 h-4 text-[#063D2F]" />
          <span>Neues reales Projekt anlegen</span>
        </h2>
        <form onSubmit={handleQuickCreate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Projektname *"
            className="lg:col-span-2 px-3 py-2 text-sm border border-[#101714]/20 rounded-md"
          />
          <input
            type="text"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            placeholder="Straße & Nr."
            className="px-3 py-2 text-sm border border-[#101714]/20 rounded-md"
          />
          <input
            type="text"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder="PLZ"
            className="px-3 py-2 text-sm border border-[#101714]/20 rounded-md"
          />
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Stadt (z. B. Essen)"
            className="px-3 py-2 text-sm border border-[#101714]/20 rounded-md"
          />
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="Baujahr"
            className="px-3 py-2 text-sm border border-[#101714]/20 rounded-md"
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Kurzbeschreibung des Sanierungsvorhabens"
            className="sm:col-span-2 lg:col-span-5 px-3 py-2 text-sm border border-[#101714]/20 rounded-md"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-md bg-[#063D2F] text-white text-xs font-medium hover:bg-[#101714] transition-colors"
          >
            Projekt anlegen
          </button>
        </form>
      </section>

      {/* Projects Table */}
      <section className="bg-white border border-[#101714]/10 rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F5EF] border-b border-[#101714]/10 text-[#6E8276]">
              <tr>
                <th className="py-3 px-4 font-medium">Typ</th>
                <th className="py-3 px-4 font-medium">Projekt & Adresse</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium text-right">Bauteile</th>
                <th className="py-3 px-4 font-medium text-right">Vollständigkeit</th>
                <th className="py-3 px-4 font-medium text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#101714]/10">
              {state.projects.map((p) => {
                const isSelected = activeProject?.id === p.id;
                const dq = evaluateProjectDataQuality(p);
                const b = p.buildings[0];
                return (
                  <tr key={p.id} className={isSelected ? 'bg-[#063D2F]/5' : 'hover:bg-[#F7F5EF]/60'}>
                    <td className="py-3.5 px-4 font-mono">
                      <span
                        className={`px-2 py-0.5 rounded border text-[11px] ${
                          p.isDemo
                            ? 'border-[#C6A45A] text-[#8C6413] bg-[#C6A45A]/10'
                            : 'border-[#063D2F]/40 text-[#063D2F] bg-[#063D2F]/5'
                        }`}
                      >
                        {p.isDemo ? 'DEMO' : 'REAL'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#101714]">{p.name}</div>
                      <div className="text-[#6E8276]">
                        {b
                          ? `${b.location.street} ${b.location.houseNumber}, ${b.location.postalCode} ${b.location.city}`.trim()
                          : 'Kein Gebäude'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono">{p.status}</td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums">{p.components.length}</td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums">{dq.completenessPct} %</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            selectContext(p.id, b?.id, p.components[0]?.id);
                            setActiveNav('building_intelligence');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#101714] text-white text-[11px] font-medium hover:bg-[#063D2F]"
                        >
                          {isSelected ? <Check className="w-3 h-3 text-[#C6A45A]" /> : <Layers className="w-3 h-3" />}
                          <span>{isSelected ? 'Aktiv' : 'Aktivieren'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => exportJson(p)}
                          className="p-1.5 rounded border border-[#101714]/15 text-[#101714] hover:bg-[#F7F5EF]"
                          title="JSON exportieren"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        {p.status !== 'ARCHIVED' ? (
                          <button
                            type="button"
                            onClick={() => archiveProject(p.id)}
                            className="p-1.5 rounded border border-[#101714]/15 text-[#6E8276] hover:text-[#B91C1C]"
                            title="Archivieren"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => updateProject(p.id, { status: 'PREPARATION' }, 'Projekt reaktiviert.')}
                            className="px-2 py-1 rounded border border-[#101714]/15 text-[11px]"
                          >
                            Reaktivieren
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
