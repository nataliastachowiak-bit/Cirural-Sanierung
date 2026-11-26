import React, { useMemo, useState } from 'react';
import { AlertCircle, Calculator, Plus, Trash2 } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { calculateComponentQuantities } from '../engine/calculations';
import { TrustStatusLabel } from '../components/ui/TrustBadge';
import type { Component, LengthUnit, MaterialLayer } from '../types/resourceloop';

export const ProductTwinView: React.FC = () => {
  const {
    state,
    activeProject,
    activeBuilding,
    activeComponent,
    selectContext,
    addComponent,
    updateComponent,
    setActiveNav,
  } = useWorkspace();

  const [newLayerMatId, setNewLayerMatId] = useState(state.materials[0]?.id ?? '');
  const [newLayerThick, setNewLayerThick] = useState('10');
  const [newLayerUnit, setNewLayerUnit] = useState<LengthUnit>('mm');
  const [showNewCompForm, setShowNewCompForm] = useState(false);
  const [newCompName, setNewCompName] = useState('');

  const quantities = useMemo(
    () => (activeComponent ? calculateComponentQuantities(activeComponent) : null),
    [activeComponent]
  );

  if (!activeProject || !activeBuilding) {
    return (
      <div className="bg-white border border-[#101714]/10 rounded-md p-8 text-center text-sm text-[#6E8276]">
        Bitte zuerst ein Projekt auswählen.
      </div>
    );
  }

  const handleDimChange = (field: keyof Component['dimensions'], val: number) => {
    if (!activeComponent) return;
    updateComponent(
      activeProject.id,
      activeComponent.id,
      {
        dimensions: {
          ...activeComponent.dimensions,
          [field]: val,
        },
      },
      `Abmessung ${String(field)} auf ${val} aktualisiert.`
    );
  };

  const handleAddLayer = () => {
    if (!activeComponent) return;
    const mat = state.materials.find((m) => m.id === newLayerMatId);
    if (!mat) return;
    const layer: MaterialLayer = {
      id: `layer-${Date.now()}`,
      materialId: mat.id,
      materialName: mat.name,
      thicknessValue: Number(newLayerThick) || 0,
      thicknessUnit: newLayerUnit,
      densityKgM3: mat.densityKgM3,
      densityStatus: mat.densityStatus,
      densitySource: mat.sourceName,
      gwpFactorKgCo2ePerKg: mat.gwpKgCo2ePerKg,
      gwpStatus: mat.environmentalDataStatus,
      gwpBoundary: mat.gwpSystemBoundary ?? undefined,
    };
    updateComponent(
      activeProject.id,
      activeComponent.id,
      { layers: [...activeComponent.layers, layer] },
      `Materialschicht „${mat.name}“ (${newLayerThick} ${newLayerUnit}) ergänzt.`
    );
  };

  const handleRemoveLayer = (layerId: string) => {
    if (!activeComponent) return;
    updateComponent(
      activeProject.id,
      activeComponent.id,
      { layers: activeComponent.layers.filter((l) => l.id !== layerId) },
      `Materialschicht entfernt.`
    );
  };

  const handleCreateManualComp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompName.trim()) return;
    addComponent(activeProject.id, {
      id: `comp-${Date.now()}`,
      projectId: activeProject.id,
      buildingId: activeBuilding.id,
      zoneName: 'Bestandsbereich',
      floor: 'EG',
      componentGroup: 'Fassaden / Ausbau',
      category: 'FACADE_ELEMENT',
      name: newCompName.trim(),
      manufacturer: 'Unbekannt',
      productDesignation: 'Manuelle Erfassung',
      installationYear: activeBuilding.profile.constructionYear,
      dimensions: {
        lengthM: 4,
        heightM: 3,
        openingAreaM2: 2,
        quantityCount: 1,
        unitLabel: 'Element',
      },
      layers: [],
      conditionRating: 'UNKNOWN',
      conditionNote: '',
      connectionType: 'Unbekannt',
      disassemblyRating: 'UNKNOWN',
      remainingServiceLifeYears: null,
      technicalProofs: [],
      openInspectionRequirements: ['Zustand & Materialschichten vor Ort prüfen'],
      photos: [],
      documentIds: [],
      observations: {},
      hypotheses: [],
      version: 1,
      updatedAt: new Date().toISOString(),
    });
    setNewCompName('');
    setShowNewCompForm(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#101714]/10 pb-5">
        <div>
          <h1 className="text-2xl font-semibold text-[#101714]">03 · Product Twin / Resource DNA</h1>
          <p className="text-sm text-[#6E8276] mt-1">
            Strukturierte digitale Bauteilakte (kein vollständiges BIM-Modell) mit deterministischer Quantity Engine außerhalb der KI.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowNewCompForm((v) => !v)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-[#063D2F] text-white text-xs font-medium hover:bg-[#101714]"
          >
            <Plus className="w-3.5 h-3.5 text-[#C6A45A]" />
            <span>Neues Bauteil anlegen</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveNav('decision_compass')}
            className="px-3.5 py-2 rounded-md border border-[#101714]/20 bg-white text-xs font-medium hover:bg-[#F7F5EF]"
          >
            Zum Decision Compass →
          </button>
        </div>
      </div>

      {showNewCompForm && (
        <form onSubmit={handleCreateManualComp} className="bg-white border border-[#101714]/15 rounded-md p-4 flex flex-wrap gap-3 items-center">
          <input
            type="text"
            required
            value={newCompName}
            onChange={(e) => setNewCompName(e.target.value)}
            placeholder="Bauteilbezeichnung (z. B. Aluminium-Fassadenelement Nord)"
            className="flex-1 min-w-[240px] px-3 py-2 text-xs border border-[#101714]/20 rounded-md"
          />
          <button type="submit" className="px-4 py-2 rounded-md bg-[#063D2F] text-white text-xs font-medium">
            Erstellen
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Building Hierarchy Explorer */}
        <aside className="lg:col-span-4 bg-white border border-[#101714]/10 rounded-md p-5 space-y-4 self-start">
          <h2 className="text-sm font-semibold text-[#101714]">Gebäudehierarchie</h2>
          <div className="text-xs space-y-2 font-mono">
            <div className="text-[#6E8276]">Projekt: {activeProject.name}</div>
            <div className="pl-3 text-[#101714]">↳ Gebäude: {activeBuilding.name}</div>
            <div className="pl-6 space-y-1.5 pt-1">
              {activeProject.components.length === 0 && (
                <div className="text-[#6E8276] font-sans">Noch keine Bauteile erfasst.</div>
              )}
              {activeProject.components.map((c) => {
                const isSel = activeComponent?.id === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectContext(activeProject.id, c.buildingId, c.id)}
                    className={`w-full text-left px-3 py-2 rounded border transition-colors font-sans ${
                      isSel
                        ? 'bg-[#063D2F] text-white border-[#063D2F]'
                        : 'bg-[#F7F5EF] text-[#101714] border-[#101714]/10 hover:border-[#063D2F]'
                    }`}
                  >
                    <div className="text-[11px] opacity-75">
                      {c.zoneName} · {c.floor}
                    </div>
                    <div className="font-medium text-xs">{c.name}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {activeComponent?.photos[0] && (
            <div className="pt-3 border-t border-[#101714]/10 space-y-1.5">
              <div className="text-xs font-medium text-[#101714]">Dokumentationsfoto</div>
              <img
                src={activeComponent.photos[0].url}
                alt={activeComponent.photos[0].caption}
                referrerPolicy="no-referrer"
                className="w-full h-44 object-cover rounded border border-[#101714]/10"
              />
              <div className="text-[11px] text-[#6E8276]">{activeComponent.photos[0].caption}</div>
            </div>
          )}
        </aside>

        {/* Right: Resource DNA + Quantity Engine */}
        <div className="lg:col-span-8 space-y-6">
          {!activeComponent ? (
            <div className="bg-white border border-[#101714]/10 rounded-md p-8 text-center text-xs text-[#6E8276]">
              Kein Bauteil ausgewählt.
            </div>
          ) : (
            <>
              {/* Resource DNA Core Metadata */}
              <section className="bg-white border border-[#101714]/10 rounded-md p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#101714]/10 pb-3">
                  <div>
                    <div className="text-[11px] font-mono text-[#6E8276]">
                      ID: {activeComponent.id} · Version v{activeComponent.version}
                    </div>
                    <h2 className="text-base font-semibold text-[#101714]">{activeComponent.name}</h2>
                  </div>
                  <TrustStatusLabel
                    status={activeComponent.manufacturer.includes('Vermutet') ? 'AI_HYPOTHESIS' : 'USER_PROVIDED'}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-[#6E8276] mb-1">Hersteller</label>
                    <input
                      type="text"
                      value={activeComponent.manufacturer}
                      onChange={(e) =>
                        updateComponent(activeProject.id, activeComponent.id, { manufacturer: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-[#101714]/20 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-[#6E8276] mb-1">Produkt / System</label>
                    <input
                      type="text"
                      value={activeComponent.productDesignation}
                      onChange={(e) =>
                        updateComponent(activeProject.id, activeComponent.id, {
                          productDesignation: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-[#101714]/20 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-[#6E8276] mb-1">Demontierbarkeit</label>
                    <select
                      value={activeComponent.disassemblyRating}
                      onChange={(e) =>
                        updateComponent(activeProject.id, activeComponent.id, {
                          disassemblyRating: e.target.value as Component['disassemblyRating'],
                        })
                      }
                      className="w-full px-3 py-2 border border-[#101714]/20 rounded-md bg-white"
                    >
                      <option value="NON_DESTRUCTIVE">Zerstörungsfrei demontierbar</option>
                      <option value="PARTIAL_LOSS">Teilverlust bei Rückbau</option>
                      <option value="DESTRUCTIVE">Nur destruktiv rückbaubar</option>
                      <option value="UNKNOWN">Unbekannt</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#6E8276] mb-1">Verbindungstechnik</label>
                    <input
                      type="text"
                      value={activeComponent.connectionType}
                      onChange={(e) =>
                        updateComponent(activeProject.id, activeComponent.id, { connectionType: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-[#101714]/20 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-[#6E8276] mb-1">Zustand</label>
                    <select
                      value={activeComponent.conditionRating}
                      onChange={(e) =>
                        updateComponent(activeProject.id, activeComponent.id, {
                          conditionRating: e.target.value as Component['conditionRating'],
                        })
                      }
                      className="w-full px-3 py-2 border border-[#101714]/20 rounded-md bg-white"
                    >
                      <option value="GOOD">Gut</option>
                      <option value="FAIR">Gebrauchsfähig / altersentsprechend</option>
                      <option value="WORN">Verschlissen</option>
                      <option value="DAMAGED">Beschädigt</option>
                      <option value="UNKNOWN">Unbekannt</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#6E8276] mb-1">Restnutzungsdauer (Jahre)</label>
                    <input
                      type="number"
                      value={activeComponent.remainingServiceLifeYears ?? ''}
                      onChange={(e) =>
                        updateComponent(activeProject.id, activeComponent.id, {
                          remainingServiceLifeYears: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full px-3 py-2 border border-[#101714]/20 rounded-md font-mono"
                    />
                  </div>
                </div>
              </section>

              {/* Deterministic Quantity Engine */}
              <section className="bg-white border border-[#101714]/10 rounded-md p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[#101714]/10 pb-3">
                  <h3 className="text-sm font-semibold text-[#101714] flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-[#063D2F]" />
                    <span>Deterministische Quantity Engine (außerhalb des Sprachmodells)</span>
                  </h3>
                  <TrustStatusLabel status="CALCULATED" />
                </div>

                {/* Geometry Inputs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-[#6E8276] mb-1">Länge (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={activeComponent.dimensions.lengthM}
                      onChange={(e) => handleDimChange('lengthM', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-[#101714]/20 rounded-md font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[#6E8276] mb-1">Höhe (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={activeComponent.dimensions.heightM}
                      onChange={(e) => handleDimChange('heightM', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-[#101714]/20 rounded-md font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[#6E8276] mb-1">Öffnungsfläche (m²)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={activeComponent.dimensions.openingAreaM2}
                      onChange={(e) => handleDimChange('openingAreaM2', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-[#101714]/20 rounded-md font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[#6E8276] mb-1">Anzahl</label>
                    <input
                      type="number"
                      step="1"
                      value={activeComponent.dimensions.quantityCount}
                      onChange={(e) => handleDimChange('quantityCount', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-[#101714]/20 rounded-md font-mono tabular-nums"
                    />
                  </div>
                </div>

                {/* Validation Errors */}
                {quantities && !quantities.valid && (
                  <div className="p-3 rounded border border-[#B91C1C]/35 bg-[#FEF2F2] text-xs text-[#B91C1C] space-y-1">
                    {quantities.errors.map((err, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{err}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Formula Trace Output */}
                {quantities && quantities.valid && (
                  <div className="bg-[#F7F5EF] border border-[#101714]/10 rounded p-4 space-y-2 text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pb-3 border-b border-[#101714]/10">
                      <div>
                        <div className="text-[#6E8276]">Bruttofläche</div>
                        <div className="text-base font-mono font-semibold tabular-nums">
                          {quantities.totalGrossAreaM2} m²
                        </div>
                      </div>
                      <div>
                        <div className="text-[#6E8276]">Nettofläche</div>
                        <div className="text-base font-mono font-semibold tabular-nums text-[#063D2F]">
                          {quantities.totalNetAreaM2} m²
                        </div>
                      </div>
                      <div>
                        <div className="text-[#6E8276]">Gesamtvolumen</div>
                        <div className="text-base font-mono font-semibold tabular-nums">
                          {quantities.totalVolumeM3 ?? '—'} m³
                        </div>
                      </div>
                      <div>
                        <div className="text-[#6E8276]">Dokumentierte Masse</div>
                        <div className="text-base font-mono font-semibold tabular-nums">
                          {quantities.totalMassKg !== null ? `${quantities.totalMassKg} kg` : 'UNKNOWN'}
                        </div>
                      </div>
                    </div>

                    <div className="font-mono text-[11px] space-y-1 pt-1">
                      {quantities.traces.map((tr) => (
                        <div key={tr.id} className="flex flex-wrap justify-between gap-2 text-[#101714]">
                          <span>
                            {tr.label}: {tr.formula} (
                            {tr.inputs.map((inp) => `${inp.name}=${inp.value ?? 'UNKNOWN'} ${inp.unit ?? ''}`).join(', ')})
                          </span>
                          <span className="font-semibold">
                            = {tr.result ?? 'UNKNOWN'} {tr.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Multi-Layer Material Table */}
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-semibold text-[#101714]">
                    Mehrschichtige Materialzusammensetzung
                  </div>

                  <div className="overflow-x-auto border border-[#101714]/10 rounded">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F7F5EF] border-b border-[#101714]/10 text-[#6E8276]">
                        <tr>
                          <th className="py-2 px-3">Materialschicht</th>
                          <th className="py-2 px-3 text-right">Dicke</th>
                          <th className="py-2 px-3 text-right">Rohdichte</th>
                          <th className="py-2 px-3 text-right">Volumen</th>
                          <th className="py-2 px-3 text-right">Masse</th>
                          <th className="py-2 px-3">Status</th>
                          <th className="py-2 px-3 text-right"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#101714]/10">
                        {activeComponent.layers.map((layer) => {
                          const lr = quantities?.layerResults.find((r) => r.layerId === layer.id);
                          return (
                            <tr key={layer.id}>
                              <td className="py-2.5 px-3 font-medium">
                                <div>{layer.materialName}</div>
                                {layer.pollutantNote && (
                                  <div className="text-[11px] text-[#9A5B13]">{layer.pollutantNote}</div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                                {layer.thicknessValue} {layer.thicknessUnit}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                                {layer.densityKgM3 !== null ? `${layer.densityKgM3} kg/m³` : 'UNKNOWN'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                                {lr?.volumeM3 !== null && lr?.volumeM3 !== undefined ? `${lr.volumeM3} m³` : '—'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-semibold tabular-nums">
                                {lr?.massKg !== null && lr?.massKg !== undefined ? `${lr.massKg} kg` : 'UNKNOWN'}
                              </td>
                              <td className="py-2.5 px-3">
                                <TrustStatusLabel status={layer.densityStatus} />
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveLayer(layer.id)}
                                  className="text-[#6E8276] hover:text-[#B91C1C]"
                                  title="Schicht entfernen"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Add Layer Form */}
                  <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                    <select
                      value={newLayerMatId}
                      onChange={(e) => setNewLayerMatId(e.target.value)}
                      className="flex-1 min-w-[220px] px-3 py-2 border border-[#101714]/20 rounded-md bg-white"
                    >
                      {state.materials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.densityKgM3 ? `${m.densityKgM3} kg/m³` : 'Dichte UNKNOWN'})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.5"
                      value={newLayerThick}
                      onChange={(e) => setNewLayerThick(e.target.value)}
                      className="w-24 px-3 py-2 border border-[#101714]/20 rounded-md font-mono"
                    />
                    <select
                      value={newLayerUnit}
                      onChange={(e) => setNewLayerUnit(e.target.value as LengthUnit)}
                      className="w-20 px-2 py-2 border border-[#101714]/20 rounded-md bg-white font-mono"
                    >
                      <option value="mm">mm</option>
                      <option value="cm">cm</option>
                      <option value="m">m</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleAddLayer}
                      className="px-3.5 py-2 rounded-md bg-[#101714] text-white font-medium hover:bg-[#063D2F]"
                    >
                      Schicht hinzufügen
                    </button>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
