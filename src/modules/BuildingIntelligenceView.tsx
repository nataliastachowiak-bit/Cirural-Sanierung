import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { AlertTriangle, Compass, Globe, Layers, Loader2, MapPin, Sparkles } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { TrustStatusLabel } from '../components/ui/TrustBadge';
import type { RiskItem } from '../types/resourceloop';

function deriveAgeClassAndMaterials(year: number | null): {
  ageClass: string;
  materials: string[];
  weaknesses: string[];
  pollutants: string[];
} {
  if (!year) {
    return {
      ageClass: 'Unbekannt (Baujahr nicht dokumentiert)',
      materials: ['Ohne Baujahr keine verlässliche Typisierung — Vor-Ort-Begehung erforderlich'],
      weaknesses: ['Energetischer Standard unbekannt'],
      pollutants: ['Schadstoffverdacht grundsätzlich ungeklärt (vor Eingriff prüfen)'],
    };
  }
  if (year < 1949) {
    return {
      ageClass: 'Vor 1949 (Gründerzeit / Altbau)',
      materials: ['Vollziegelmauerwerk', 'Kalkmörtel', 'Holzbalkendecken', 'Einfach-/Kastenfenster'],
      weaknesses: ['Ungedämmte Außenwände', 'Undichte Fensteranschlüsse'],
      pollutants: ['Alte Holzanstriche (Blei), teerhaltige Abdichtungen möglich'],
    };
  }
  if (year <= 1978) {
    return {
      ageClass: '1949–1978 (Nachkriegs- / frühe Skelettbauten)',
      materials: ['Stahlbeton-Skelett / Mauerwerk', 'Unthermische Metall-/Holzfenster', 'Frühe Mineralwolle'],
      weaknesses: ['Ausgeprägte Wärmebrücken an Deckenstirnen', 'Hohe Transmissionsverluste'],
      pollutants: ['Hohes Risiko: Asbest (Faserzement/Kleber), PCB in Fugenmassen, alte KMF (< 2000), PCP im Holz'],
    };
  }
  if (year <= 1995) {
    return {
      ageClass: '1979–1995 (2./3. Wärmeschutzverordnung)',
      materials: ['Eloxierte Aluminium-Pfosten-Riegel-Fassaden', '2-fach Isolierverglasung', 'Mineralwolle / Hartschaum'],
      weaknesses: ['Geringe thermische Trennung der Altprofile', 'Gealterte EPDM-Dichtungen'],
      pollutants: ['Alte Mineralwolle (KMF vor 2000 nach TRGS 521), vereinzelt PCB/Asbest in Dichtmassen'],
    };
  }
  return {
    ageClass: 'Ab 1996 (WSchV 95 / EnEV / GEG)',
    materials: ['Thermisch getrennte Metall-/Kunststoffsysteme', 'Wärmeschutzverglasung', 'System-Trockenbau'],
    weaknesses: ['Detailanschlüsse und Sonnenschutz im Bestand prüfen'],
    pollutants: ['HBCD in XPS/EPS bis 2015 möglich; KMF ab 2000 i. d. R. RAL-geprüft (Nachweis prüfen)'],
  };
}

export const BuildingIntelligenceView: React.FC = () => {
  const { activeProject, activeBuilding, updateBuilding, language, logAudit, state } = useWorkspace();

  const [street, setStreet] = useState(activeBuilding?.location.street ?? '');
  const [houseNumber, setHouseNumber] = useState(activeBuilding?.location.houseNumber ?? '');
  const [postalCode, setPostalCode] = useState(activeBuilding?.location.postalCode ?? '');
  const [city, setCity] = useState(activeBuilding?.location.city ?? '');
  const [country, setCountry] = useState(activeBuilding?.location.country ?? 'Deutschland');
  const [yearInput, setYearInput] = useState(
    activeBuilding?.profile.constructionYear ? String(activeBuilding.profile.constructionYear) : ''
  );
  const [yearUnknown, setYearUnknown] = useState(activeBuilding?.profile.constructionYearUnknown ?? false);
  const [buildingType, setBuildingType] = useState(activeBuilding?.profile.buildingType ?? 'Büro- und Verwaltungsgebäude');
  const [buildingUsage, setBuildingUsage] = useState(activeBuilding?.profile.buildingUsage ?? 'Büronutzung');
  const [footprintArea, setFootprintArea] = useState(
    activeBuilding?.geometry.footprintAreaM2 ? String(activeBuilding.geometry.footprintAreaM2) : ''
  );
  const [floorsCount, setFloorsCount] = useState(
    activeBuilding?.geometry.floorsCount ? String(activeBuilding.geometry.floorsCount) : ''
  );
  const [renovationHistory, setRenovationHistory] = useState(activeBuilding?.profile.renovationHistoryNote ?? '');

  // Map Layer toggles
  const [showOsmBase, setShowOsmBase] = useState(true);
  const [showSatellite, setShowSatellite] = useState(false);
  const [showNrwAlkisWms, setShowNrwAlkisWms] = useState(false);
  const [showTopo, setShowTopo] = useState(false);

  const [analyzing, setAnalyzing] = useState(false);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [geoStatusMsg, setGeoStatusMsg] = useState<string | null>(null);
  const [briefingError, setBriefingError] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!activeBuilding) return;
    setStreet(activeBuilding.location.street);
    setHouseNumber(activeBuilding.location.houseNumber);
    setPostalCode(activeBuilding.location.postalCode);
    setCity(activeBuilding.location.city);
    setCountry(activeBuilding.location.country);
    setYearInput(activeBuilding.profile.constructionYear ? String(activeBuilding.profile.constructionYear) : '');
    setYearUnknown(activeBuilding.profile.constructionYearUnknown);
    setBuildingType(activeBuilding.profile.buildingType);
    setBuildingUsage(activeBuilding.profile.buildingUsage);
    setFootprintArea(activeBuilding.geometry.footprintAreaM2 ? String(activeBuilding.geometry.footprintAreaM2) : '');
    setFloorsCount(activeBuilding.geometry.floorsCount ? String(activeBuilding.geometry.floorsCount) : '');
    setRenovationHistory(activeBuilding.profile.renovationHistoryNote ?? '');
  }, [activeBuilding?.id]);

  // Initialize & update Leaflet GIS Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const lat = activeBuilding?.location.latitude ?? 51.2422;
    const lon = activeBuilding?.location.longitude ?? 6.7748;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, { zoomControl: true }).setView([lat, lon], 17);
      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.setView([lat, lon], 17);
    }

    const map = mapInstanceRef.current;
    map.eachLayer((layer) => map.removeLayer(layer));

    if (showOsmBase && !showSatellite && !showTopo) {
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap-Mitwirkende',
        maxZoom: 19,
      }).addTo(map);
    }
    if (showTopo) {
      L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenTopoMap (CC-BY-SA)',
        maxZoom: 17,
      }).addTo(map);
    }
    if (showSatellite) {
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles © Esri',
        maxZoom: 19,
      }).addTo(map);
    }
    if (showNrwAlkisWms) {
      L.tileLayer
        .wms('https://www.wms.nrw.de/geobasis/wms_nw_alkis', {
          layers: 'adv_alkis_gebaeude,adv_alkis_flurstuecke',
          format: 'image/png',
          transparent: true,
          attribution: '© GeoBasis NRW (ALKIS Open Data)',
        })
        .addTo(map);
    }

    if (activeBuilding?.location.latitude && activeBuilding?.location.longitude) {
      L.circleMarker([lat, lon], {
        radius: 9,
        color: '#063D2F',
        weight: 3,
        fillColor: '#C6A45A',
        fillOpacity: 0.9,
      })
        .addTo(map)
        .bindPopup(
          `<strong>${activeBuilding.name}</strong><br/>${street} ${houseNumber}, ${postalCode} ${city}`
        );
    }
  }, [
    activeBuilding?.id,
    activeBuilding?.location.latitude,
    activeBuilding?.location.longitude,
    showOsmBase,
    showSatellite,
    showNrwAlkisWms,
    showTopo,
  ]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  if (!activeProject || !activeBuilding) {
    return (
      <div className="bg-white border border-[#101714]/10 rounded-md p-8 text-center text-sm text-[#6E8276]">
        Bitte wählen oder erstellen Sie zuerst ein Projekt.
      </div>
    );
  }

  const runBuildingAnalysis = async () => {
    setAnalyzing(true);
    setGeoStatusMsg(null);

    const parsedYear = yearUnknown || !yearInput ? null : Number(yearInput);
    const typology = deriveAgeClassAndMaterials(parsedYear);

    let nextLat = activeBuilding.location.latitude;
    let nextLon = activeBuilding.location.longitude;
    let geocodingStatus = activeBuilding.location.geocodingStatus;
    let geocodingSource = activeBuilding.location.geocodingSource;
    let ambiguityMatches = activeBuilding.location.ambiguityMatches;
    let osmTags: Record<string, string> = activeBuilding.gisLayersSnapshot?.osmTags ?? {};
    let nearbyFeatures: string[] = activeBuilding.gisLayersSnapshot?.nearbyFeatures ?? [];
    let osmBuildingFound = activeBuilding.gisLayersSnapshot?.osmBuildingFound ?? false;

    try {
      const geoRes = await fetch('/api/geo/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ street, houseNumber, postalCode, city, country }),
      });
      const geoData = await geoRes.json();

      if (geoRes.ok && geoData.primary) {
        nextLat = geoData.primary.lat;
        nextLon = geoData.primary.lon;
        geocodingStatus = geoData.status;
        geocodingSource = geoData.source;
        ambiguityMatches = geoData.matches;
        setGeoStatusMsg(
          geoData.status === 'AMBIGUOUS'
            ? `Mehrdeutige Adresse: ${geoData.matches.length} Treffer gefunden — bitte Koordinaten prüfen.`
            : `Adresse über ${geoData.source} geokodiert.`
        );

        // Fetch Overpass building footprint & nearby context
        const ctxRes = await fetch('/api/geo/building-context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat: nextLat, lon: nextLon }),
        });
        if (ctxRes.ok) {
          const ctxData = await ctxRes.json();
          osmTags = ctxData.buildingTags ?? {};
          nearbyFeatures = ctxData.nearbyFeatures ?? [];
          osmBuildingFound = Boolean(ctxData.buildingFound);
        }
      } else {
        geocodingStatus = 'UNAVAILABLE';
        setGeoStatusMsg(
          geoData.message || 'Geokodierung aktuell nicht verfügbar. Bestehende Daten bleiben unverändert.'
        );
      }
    } catch {
      geocodingStatus = 'UNAVAILABLE';
      setGeoStatusMsg('Externe Geo-Schnittstelle nicht erreichbar (Offline/Timeout). Fehlende Daten werden nicht geschätzt.');
    }

    const defaultRisks: RiskItem[] =
      activeBuilding.climateRisks.length > 0
        ? activeBuilding.climateRisks
        : [
            {
              id: `risk-flood-${Date.now()}`,
              category: 'RIVER_FLOOD',
              label: 'Flusshochwasser (HQ100 / HQextrem)',
              sourceName: 'Hochwassergefahrenkarten NRW (ELWAS)',
              dataDate: 'Nicht abgerufen',
              spatialResolution: 'Parzellenebene',
              availabilityStatus: 'MANUAL_IMPORT_REQUIRED',
              hazardClass: 'UNKNOWN',
              renovationRelevance: 'Vor Erdgeschoss-/Kellersanierung zwingend klären.',
              recommendedExpertCheck: 'Manueller Abgleich über flussgebiete.nrw.de dokumentieren.',
            },
            {
              id: `risk-rain-${Date.now()}`,
              category: 'HEAVY_RAIN',
              label: 'Starkregen & Überflutung',
              sourceName: 'BKG Starkregengefahrenhinweise',
              dataDate: 'Nicht abgerufen',
              spatialResolution: '100 m Raster',
              availabilityStatus: 'UNAVAILABLE',
              hazardClass: 'UNKNOWN',
              renovationRelevance: 'Fassadenentwässerung und Rückstauschutz prüfen.',
              recommendedExpertCheck: 'Kommunale Starkregengefahrenkarte NRW einsehen.',
            },
          ];

    const parsedFootprint = footprintArea ? Number(footprintArea) : activeBuilding.geometry.footprintAreaM2;
    const parsedFloors =
      floorsCount
        ? Number(floorsCount)
        : osmTags['building:levels']
        ? Number(osmTags['building:levels'])
        : activeBuilding.geometry.floorsCount;

    updateBuilding(
      activeProject.id,
      activeBuilding.id,
      {
        location: {
          street,
          houseNumber,
          postalCode,
          city,
          stateRegion: 'Nordrhein-Westfalen',
          country,
          latitude: nextLat,
          longitude: nextLon,
          geocodingStatus,
          geocodingSource,
          ambiguityMatches,
        },
        geometry: {
          ...activeBuilding.geometry,
          footprintAreaM2: parsedFootprint,
          floorsCount: parsedFloors,
          buildingHeightM: osmTags.height ? Number(osmTags.height) : activeBuilding.geometry.buildingHeightM,
          roofShape: osmTags['roof:shape'] ?? activeBuilding.geometry.roofShape,
          status: footprintArea ? 'USER_PROVIDED' : osmBuildingFound ? 'SOURCE_DATA' : activeBuilding.geometry.status,
        },
        profile: {
          ...activeBuilding.profile,
          constructionYear: parsedYear,
          constructionYearUnknown: yearUnknown,
          buildingAgeClass: typology.ageClass,
          buildingType,
          buildingUsage,
          typicalAgeMaterials: typology.materials,
          potentialEnergyWeaknesses: typology.weaknesses,
          potentialPollutantHints: typology.pollutants,
          renovationHistoryNote: renovationHistory,
        },
        climateRisks: defaultRisks,
        gisLayersSnapshot: {
          osmBuildingFound,
          osmTags,
          nearbyFeatures,
          lastCheckedAt: new Date().toISOString(),
        },
      },
      `Gebäudeanalyse für ${street} ${houseNumber}, ${city} durchgeführt.`
    );

    setAnalyzing(false);
  };

  const generateAiBriefing = async () => {
    setBriefingLoading(true);
    setBriefingError(null);
    try {
      const res = await fetch('/api/ai/building-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          address: `${street} ${houseNumber}, ${postalCode} ${city}, ${country}`,
          constructionYear: yearUnknown || !yearInput ? null : Number(yearInput),
          buildingType,
          buildingUsage,
          geometrySummary: `Grundfläche: ${activeBuilding.geometry.footprintAreaM2 ?? 'UNBEKANNT'} m², Geschosse: ${
            activeBuilding.geometry.floorsCount ?? 'UNBEKANNT'
          }, Dach: ${activeBuilding.geometry.roofShape ?? 'UNBEKANNT'}`,
          knownMaterials: activeBuilding.profile.typicalAgeMaterials,
          climateRisksSummary: activeBuilding.climateRisks
            .map((r) => `${r.label}: ${r.hazardClass} (${r.availabilityStatus})`)
            .join('; '),
          renovationHistoryNote: renovationHistory,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBriefingError(data.error || 'Building Briefing konnte nicht erstellt werden.');
      } else {
        updateBuilding(
          activeProject.id,
          activeBuilding.id,
          {
            profile: {
              ...activeBuilding.profile,
              aiBriefing: data,
            },
          },
          'KI-Building-Briefing erstellt (als AI HYPOTHESIS markiert).'
        );
        logAudit({
          projectId: activeProject.id,
          entityType: 'BUILDING',
          entityId: activeBuilding.id,
          action: 'AI_BRIEFING_GENERATED',
          actor: state.currentUser.name,
          role: state.currentUser.role,
          details: 'Vorbereitendes AI Building Briefing generiert.',
        });
      }
    } catch (err) {
      setBriefingError(err instanceof Error ? err.message : 'Verbindungsfehler');
    } finally {
      setBriefingLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#101714]/10 pb-5">
        <div>
          <h1 className="text-2xl font-semibold text-[#101714]">01 · Building Intelligence</h1>
          <p className="text-sm text-[#6E8276] mt-1">
            Automatisierte Vorbereitung der Gebäude-, Standort- und Klimarisikoanalyse vor der Bauteilerfassung (Pilotregion NRW).
          </p>
        </div>

        <button
          type="button"
          onClick={runBuildingAnalysis}
          disabled={analyzing}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#063D2F] text-white text-xs font-medium hover:bg-[#101714] disabled:opacity-50 whitespace-nowrap"
        >
          {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Compass className="w-4 h-4 text-[#C6A45A]" />}
          <span>Gebäudeanalyse starten</span>
        </button>
      </div>

      {geoStatusMsg && (
        <div className="p-3.5 rounded-md bg-white border border-[#101714]/15 text-xs text-[#101714] flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#063D2F] shrink-0" />
          <span>{geoStatusMsg}</span>
        </div>
      )}

      {/* Input Form + Interactive GIS Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Input Form */}
        <section className="lg:col-span-5 bg-white border border-[#101714]/10 rounded-md p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[#101714]">Gebäude- & Standortdaten</h2>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-[#6E8276] mb-1">Straße</label>
              <input
                type="text"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#101714]/20 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs text-[#6E8276] mb-1">Hausnr.</label>
              <input
                type="text"
                value={houseNumber}
                onChange={(e) => setHouseNumber(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#101714]/20 rounded-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-[#6E8276] mb-1">PLZ</label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#101714]/20 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs text-[#6E8276] mb-1">Stadt</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#101714]/20 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs text-[#6E8276] mb-1">Land</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#101714]/20 rounded-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-xs text-[#6E8276] mb-1">Baujahr</label>
              <input
                type="number"
                disabled={yearUnknown}
                value={yearUnknown ? '' : yearInput}
                onChange={(e) => setYearInput(e.target.value)}
                placeholder={yearUnknown ? 'Unbekannt' : 'z. B. 1984'}
                className="w-full px-3 py-2 text-xs border border-[#101714]/20 rounded-md disabled:bg-[#F7F5EF]"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-[#101714] pb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={yearUnknown}
                onChange={(e) => setYearUnknown(e.target.checked)}
                className="rounded border-[#101714]/30"
              />
              <span>Baujahr unbekannt</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#6E8276] mb-1">Gebäudetyp</label>
              <input
                type="text"
                value={buildingType}
                onChange={(e) => setBuildingType(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#101714]/20 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs text-[#6E8276] mb-1">Nutzung</label>
              <input
                type="text"
                value={buildingUsage}
                onChange={(e) => setBuildingUsage(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#101714]/20 rounded-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#6E8276] mb-1">Grundfläche (m², optional)</label>
              <input
                type="number"
                value={footprintArea}
                onChange={(e) => setFootprintArea(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#101714]/20 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-[#6E8276] mb-1">Geschosse (optional)</label>
              <input
                type="number"
                value={floorsCount}
                onChange={(e) => setFloorsCount(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#101714]/20 rounded-md font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#6E8276] mb-1">Sanierungshistorie (optional)</label>
            <textarea
              rows={2}
              value={renovationHistory}
              onChange={(e) => setRenovationHistory(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[#101714]/20 rounded-md"
            />
          </div>

          {/* Ambiguous Address Picker if Nominatim returned multiple matches */}
          {activeBuilding.location.ambiguityMatches && activeBuilding.location.ambiguityMatches.length > 1 && (
            <div className="p-3 rounded bg-[#FFFBEB] border border-[#D97706]/30 space-y-1.5 text-xs">
              <div className="font-semibold text-[#9A5B13]">Mehrdeutige Adresstreffer auswählen:</div>
              {activeBuilding.location.ambiguityMatches.slice(0, 3).map((m, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() =>
                    updateBuilding(activeProject.id, activeBuilding.id, {
                      location: {
                        ...activeBuilding.location,
                        latitude: m.lat,
                        longitude: m.lon,
                        geocodingStatus: 'VERIFIED',
                      },
                    })
                  }
                  className="block w-full text-left px-2 py-1 rounded hover:bg-white text-[11px] truncate"
                >
                  {m.displayName} ({m.lat.toFixed(4)}, {m.lon.toFixed(4)})
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Right: Interactive Location Intelligence GIS Map */}
        <section className="lg:col-span-7 bg-white border border-[#101714]/10 rounded-md p-5 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-[#101714] flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#063D2F]" />
                <span>Location Intelligence (Interaktive GIS-Karte)</span>
              </h2>
              <p className="text-[11px] text-[#6E8276] font-mono tabular-nums">
                Koordinaten:{' '}
                {activeBuilding.location.latitude && activeBuilding.location.longitude
                  ? `${activeBuilding.location.latitude.toFixed(5)}, ${activeBuilding.location.longitude.toFixed(5)}`
                  : 'UNKNOWN'}{' '}
                · Status: {activeBuilding.location.geocodingStatus}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setShowOsmBase(true);
                  setShowSatellite(false);
                  setShowTopo(false);
                }}
                className={`px-2.5 py-1 rounded border ${
                  showOsmBase && !showSatellite && !showTopo
                    ? 'bg-[#101714] text-white border-[#101714]'
                    : 'bg-[#F7F5EF] border-[#101714]/15'
                }`}
              >
                OSM Grundriss
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSatellite(true);
                  setShowTopo(false);
                }}
                className={`px-2.5 py-1 rounded border ${
                  showSatellite ? 'bg-[#101714] text-white border-[#101714]' : 'bg-[#F7F5EF] border-[#101714]/15'
                }`}
              >
                Satellit
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowTopo(true);
                  setShowSatellite(false);
                }}
                className={`px-2.5 py-1 rounded border ${
                  showTopo ? 'bg-[#101714] text-white border-[#101714]' : 'bg-[#F7F5EF] border-[#101714]/15'
                }`}
              >
                Topografie
              </button>
              <button
                type="button"
                onClick={() => setShowNrwAlkisWms((v) => !v)}
                className={`px-2.5 py-1 rounded border ${
                  showNrwAlkisWms
                    ? 'bg-[#063D2F] text-white border-[#063D2F]'
                    : 'bg-[#F7F5EF] border-[#101714]/15'
                }`}
              >
                GeoBasis NRW ALKIS (WMS)
              </button>
            </div>
          </div>

          <div
            ref={mapContainerRef}
            className="w-full h-[340px] lg:flex-1 rounded border border-[#101714]/15 z-10"
          />

          {activeBuilding.gisLayersSnapshot && (
            <div className="text-[11px] text-[#6E8276] flex flex-wrap gap-x-4 gap-y-1">
              <span>
                OSM-Gebäudepolygon: {activeBuilding.gisLayersSnapshot.osmBuildingFound ? 'Gefunden' : 'Nicht detailliert kartiert'}
              </span>
              {activeBuilding.gisLayersSnapshot.nearbyFeatures.length > 0 && (
                <span>Umfeld: {activeBuilding.gisLayersSnapshot.nearbyFeatures.slice(0, 3).join(' · ')}</span>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Building Profile: Documented Facts vs Typified Assumptions */}
      <section className="bg-white border border-[#101714]/10 rounded-md p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#101714]/10 pb-3">
          <h2 className="text-base font-semibold text-[#101714]">
            Strukturiertes Gebäudeprofil (Dokumentierte Eigenschaften vs. typisierte Annahmen)
          </h2>
          <span className="text-xs text-[#6E8276]">Baualtersklasse: {activeBuilding.profile.buildingAgeClass}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#101714]">Dokumentierte Konstruktion</span>
              <TrustStatusLabel status={activeBuilding.profile.knownConstructionType.status} />
            </div>
            <p className="text-[#101714]/85 leading-relaxed">
              {activeBuilding.profile.knownConstructionType.value || 'Noch nicht vor Ort dokumentiert.'}
            </p>
            <div className="font-mono text-[11px] text-[#6E8276] pt-1">
              Höhe: {activeBuilding.geometry.buildingHeightM ?? 'UNKNOWN'} m · Dach:{' '}
              {activeBuilding.geometry.roofShape ?? 'UNKNOWN'}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#101714]">Typische Materialien (IWU-Annahme)</span>
              <TrustStatusLabel status="SOURCE_DATA" />
            </div>
            <ul className="list-disc pl-4 space-y-1 text-[#101714]/85">
              {activeBuilding.profile.typicalAgeMaterials.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#101714]">Potenzielle Schadstoffhinweise</span>
              <TrustStatusLabel status="AI_HYPOTHESIS" />
            </div>
            <ul className="list-disc pl-4 space-y-1 text-[#9A5B13]">
              {activeBuilding.profile.potentialPollutantHints.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#101714]">Energetische Schwachstellen & Lücken</span>
              <TrustStatusLabel status="UNKNOWN" />
            </div>
            <ul className="list-disc pl-4 space-y-1 text-[#6E8276]">
              {activeBuilding.profile.potentialEnergyWeaknesses.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
              {activeBuilding.profile.renovationDataGaps.map((g, i) => (
                <li key={`g-${i}`} className="text-[#B91C1C]">Lücke: {g}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Climate and Environmental Risk Intelligence */}
      <section className="bg-white border border-[#101714]/10 rounded-md p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#101714]/10 pb-3">
          <div>
            <h2 className="text-base font-semibold text-[#101714]">
              Klima- und Umweltrisiko-Intelligenz
            </h2>
            <p className="text-xs text-[#6E8276]">
              Fehlende Geodaten werden strikt als UNKNOWN geführt und niemals als geringes Risiko interpretiert. Kein Ersatz für ein Gebäudeschadensgutachten.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F5EF] border-b border-[#101714]/10 text-[#6E8276]">
              <tr>
                <th className="py-2.5 px-3 font-medium">Risikokategorie</th>
                <th className="py-2.5 px-3 font-medium">Quelle & Stand</th>
                <th className="py-2.5 px-3 font-medium">Verfügbarkeit</th>
                <th className="py-2.5 px-3 font-medium">Gefahrenklasse</th>
                <th className="py-2.5 px-3 font-medium">Sanierungsrelevanz & Empfohlene Prüfung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#101714]/10">
              {[...activeBuilding.climateRisks, ...activeBuilding.environmentalRisks].map((risk) => (
                <tr key={risk.id}>
                  <td className="py-3 px-3 font-medium text-[#101714]">{risk.label}</td>
                  <td className="py-3 px-3 text-[#6E8276]">
                    <div>{risk.sourceName}</div>
                    <div className="font-mono text-[11px]">
                      Stand: {risk.dataDate} · {risk.spatialResolution}
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px]">{risk.availabilityStatus}</td>
                  <td className="py-3 px-3 font-mono">
                    {risk.hazardClass === 'UNKNOWN' ? (
                      <TrustStatusLabel status="UNKNOWN" />
                    ) : (
                      <span className="text-[#101714] font-medium">{risk.hazardClass}</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <div className="text-[#101714]">{risk.renovationRelevance}</div>
                    <div className="text-[#063D2F] mt-0.5">Prüfung: {risk.recommendedExpertCheck}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* AI Building Briefing */}
      <section className="bg-white border border-[#101714]/10 rounded-md p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#101714]/10 pb-3">
          <div>
            <h2 className="text-base font-semibold text-[#101714] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#063D2F]" />
              <span>AI Building Briefing</span>
            </h2>
            <p className="text-xs text-[#6E8276]">
              Vorbereitende KI-Analyse mit priorisiertem Untersuchungsplan (kein technisches Gutachten).
            </p>
          </div>
          <button
            type="button"
            onClick={generateAiBriefing}
            disabled={briefingLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#101714] text-white text-xs font-medium hover:bg-[#063D2F] disabled:opacity-50"
          >
            {briefingLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-[#C6A45A]" />}
            <span>Briefing mit Gemini generieren</span>
          </button>
        </div>

        {briefingError && (
          <div className="p-3 rounded border border-[#B91C1C]/30 bg-[#FEF2F2] text-xs text-[#B91C1C] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{briefingError}</span>
          </div>
        )}

        {activeBuilding.profile.aiBriefing ? (
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded bg-[#F7F5EF] border border-[#101714]/10 flex items-center justify-between gap-3">
              <span>{activeBuilding.profile.aiBriefing.disclaimer}</span>
              <TrustStatusLabel status="AI_HYPOTHESIS" />
            </div>

            <p className="text-sm text-[#101714] leading-relaxed">
              {activeBuilding.profile.aiBriefing.summary}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <h3 className="font-semibold text-[#063D2F] mb-1.5">Sanierungsschwerpunkte & Ressourcenpotenziale</h3>
                <ul className="list-disc pl-4 space-y-1 text-[#101714]/85">
                  {activeBuilding.profile.aiBriefing.renovationPriorities.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                  {activeBuilding.profile.aiBriefing.resourcePotentials.map((item, i) => (
                    <li key={`rp-${i}`}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-[#B91C1C] mb-1.5">Datenlücken & offene technische Fragen</h3>
                <ul className="list-disc pl-4 space-y-1 text-[#101714]/85">
                  {activeBuilding.profile.aiBriefing.dataGaps.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                  {activeBuilding.profile.aiBriefing.openTechnicalQuestions.map((item, i) => (
                    <li key={`oq-${i}`}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-[#101714] mb-2">Priorisierter Untersuchungsplan</h3>
              <div className="divide-y divide-[#101714]/10 border border-[#101714]/10 rounded">
                {activeBuilding.profile.aiBriefing.prioritizedInspectionPlan.map((step) => (
                  <div key={step.step} className="p-3 flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium text-[#101714]">
                        {step.step}. {step.task}
                      </div>
                      <div className="text-[#6E8276] mt-0.5">{step.rationale}</div>
                    </div>
                    <span className="font-mono text-[11px] px-2 py-0.5 border border-[#101714]/15 rounded shrink-0">
                      {step.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-[#6E8276]">
            Noch kein KI-Building-Briefing für dieses Gebäude erstellt. Klicken Sie auf „Briefing mit Gemini generieren“.
          </div>
        )}
      </section>
    </div>
  );
};
