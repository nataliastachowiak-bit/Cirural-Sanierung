import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Loader2,
  Plus,
  QrCode,
  Upload,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { TrustStatusLabel } from '../components/ui/TrustBadge';
import type { Component, ComponentCategory } from '../types/resourceloop';

interface ScanResultState {
  componentClass: string;
  componentType: string;
  manufacturerHints: string;
  materialHints: string[];
  constructionFeatures: string[];
  visibleDamages: string[];
  nameplateInfo: string;
  documentedDimensions: string;
  evidence: string[];
  uncertainties: string[];
  unobservableProperties: string[];
  requiredFollowUpQuestions: string[];
  recommendedAdditionalPhotos: string[];
}

export const SmartScannerView: React.FC = () => {
  const { activeProject, activeBuilding, addComponent, addDocument, setActiveNav, language, logAudit, state } =
    useWorkspace();

  const [mode, setMode] = useState<'SCANNER' | 'EXCEL' | 'DOCUMENT'>('SCANNER');

  // Multimodal Scanner State
  const [photos, setPhotos] = useState<Array<{ dataUrl: string; mimeType: string; name: string }>>([]);
  const [userHint, setUserHint] = useState('');
  const [qrCodeText, setQrCodeText] = useState('');
  const [scaleCalibrated, setScaleCalibrated] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResultState | null>(null);

  // Manual editable confirmation fields for Product Twin creation
  const [compName, setCompName] = useState('');
  const [compCategory, setCompCategory] = useState<ComponentCategory>('FACADE_ELEMENT');
  const [compManufacturer, setCompManufacturer] = useState('');
  const [compZone, setCompZone] = useState('Bestandsbereich');
  const [compFloor, setCompFloor] = useState('EG');
  const [compLength, setCompLength] = useState('1.0');
  const [compHeight, setCompHeight] = useState('1.0');
  const [compOpening, setCompOpening] = useState('0');
  const [compConfirmedMsg, setCompConfirmedMsg] = useState<string | null>(null);

  // Camera capture
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  // Excel Wizard State
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [sheetRows, setSheetRows] = useState<Array<Record<string, unknown>>>([]);
  const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
  const [colMap, setColMap] = useState({
    name: '',
    category: '',
    lengthM: '',
    heightM: '',
    openingM2: '',
    quantity: '',
    manufacturer: '',
  });
  const [excelImportMsg, setExcelImportMsg] = useState<string | null>(null);

  // Document Intelligence State
  const [docType, setDocType] = useState<'DATASHEET' | 'EPD' | 'OFFER' | 'BOQ' | 'TEST_REPORT'>('DATASHEET');
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  const [docResult, setDocResult] = useState<{
    fileName: string;
    summary: string;
    extractedItems: Array<{ field: string; value: string; unit?: string; pageRef?: string; legibility: 'CLEAR' | 'AMBIGUOUS' | 'ILLEGIBLE' }>;
  } | null>(null);

  if (!activeProject || !activeBuilding) {
    return (
      <div className="bg-white border border-[#101714]/10 rounded-md p-8 text-center text-sm text-[#6E8276]">
        Bitte zuerst ein Projekt und Gebäude auswählen.
      </div>
    );
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setPhotos((prev) => [
            ...prev,
            { dataUrl: reader.result as string, mimeType: file.type || 'image/jpeg', name: file.name },
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 50);
    } catch {
      setScanError('Kamerazugriff im Browser nicht verfügbar oder abgelehnt. Bitte Foto-Upload nutzen.');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      setPhotos((prev) => [...prev, { dataUrl, mimeType: 'image/jpeg', name: `kamera-${Date.now()}.jpg` }]);
    }
    stopCamera();
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  };

  const runGeminiScan = async () => {
    if (photos.length === 0) {
      setScanError('Bitte mindestens ein Foto oder Dokument für den KI-Scanner hochladen.');
      return;
    }
    setScanning(true);
    setScanError(null);
    setCompConfirmedMsg(null);

    try {
      const primary = photos[0];
      const res = await fetch('/api/ai/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          imageBase64: primary.dataUrl,
          mimeType: primary.mimeType.includes('png')
            ? 'image/png'
            : primary.mimeType.includes('pdf')
            ? 'application/pdf'
            : 'image/jpeg',
          userHint: [userHint, qrCodeText ? `QR/Barcode: ${qrCodeText}` : ''].filter(Boolean).join(' | '),
          scaleCalibrated,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setScanError(data.error || 'Scanner-Analyse fehlgeschlagen.');
      } else {
        setScanResult(data);
        setCompName(data.componentType || data.componentClass || 'Erfasstes Bauteil');
        setCompManufacturer(data.manufacturerHints || 'Unbekannt');
        const cls = (data.componentClass || '').toLowerCase();
        if (cls.includes('fenster') || cls.includes('window')) setCompCategory('WINDOW');
        else if (cls.includes('tür') || cls.includes('door')) setCompCategory('DOOR');
        else if (cls.includes('innenwand') || cls.includes('partition')) setCompCategory('INTERIOR_WALL');
        else if (cls.includes('fassade') || cls.includes('facade')) setCompCategory('FACADE_ELEMENT');
        else setCompCategory('CUSTOM');

        logAudit({
          projectId: activeProject.id,
          entityType: 'COMPONENT',
          entityId: activeBuilding.id,
          action: 'SMART_SCAN_EXECUTED',
          actor: state.currentUser.name,
          role: state.currentUser.role,
          details: `Multimodaler Scan durchgeführt (${primary.name}). Ergebnis als AI_HYPOTHESIS markiert.`,
        });
      }
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Verbindungsfehler');
    } finally {
      setScanning(false);
    }
  };

  const confirmAndCreateProductTwin = () => {
    const lengthM = Number(compLength);
    const heightM = Number(compHeight);
    const openingAreaM2 = Number(compOpening);
    if (!Number.isFinite(lengthM) || lengthM <= 0 || !Number.isFinite(heightM) || heightM <= 0 || openingAreaM2 < 0) {
      setScanError('Bitte gültige positive Abmessungen (Länge, Höhe) und Öffnungsfläche >= 0 eingeben.');
      return;
    }

    const compId = `comp-${Date.now()}`;
    const newComp: Component = {
      id: compId,
      projectId: activeProject.id,
      buildingId: activeBuilding.id,
      zoneName: compZone,
      floor: compFloor,
      componentGroup: compCategory,
      category: compCategory,
      name: compName || 'Manuell bestätigtes Bauteil',
      manufacturer: compManufacturer || 'Unbekannt',
      productDesignation: scanResult?.nameplateInfo || 'Bestandserfassung',
      installationYear: activeBuilding.profile.constructionYear,
      dimensions: {
        lengthM,
        heightM,
        openingAreaM2,
        quantityCount: 1,
        unitLabel: 'Element',
      },
      layers: [],
      conditionRating: 'UNKNOWN',
      conditionNote: scanResult?.visibleDamages.join('; ') || 'Sichtprüfung bei Aufnahme dokumentiert.',
      connectionType: 'Vor Ort prüfen',
      disassemblyRating: 'UNKNOWN',
      remainingServiceLifeYears: null,
      technicalProofs: [],
      openInspectionRequirements:
        scanResult?.requiredFollowUpQuestions ?? ['Materialschichten und Rohdichte im Product Twin ergänzen'],
      photos: photos.map((p, idx) => ({
        id: `ph-${Date.now()}-${idx}`,
        url: p.dataUrl,
        caption: p.name,
        capturedAt: new Date().toISOString(),
        scaleCalibrated,
      })),
      documentIds: [],
      observations: {},
      hypotheses: scanResult
        ? [
            {
              id: `hyp-${Date.now()}`,
              componentId: compId,
              proposedClass: scanResult.componentClass,
              proposedMaterial: scanResult.materialHints.join(', '),
              evidence: scanResult.evidence,
              uncertainties: scanResult.uncertainties,
              unobservableProperties: scanResult.unobservableProperties,
              requiredFollowUpQuestions: scanResult.requiredFollowUpQuestions,
              recommendedAdditionalPhotos: scanResult.recommendedAdditionalPhotos,
              status: 'USER_CONFIRMED',
              createdAt: new Date().toISOString(),
            },
          ]
        : [],
      version: 1,
      updatedAt: new Date().toISOString(),
    };

    addComponent(activeProject.id, newComp);
    setCompConfirmedMsg(`Bauteil „${newComp.name}“ nach menschlicher Bestätigung im Product Twin angelegt.`);
  };

  // Excel Handlers
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelImportMsg(null);
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    setWorkbook(wb);
    setSheetNames(wb.SheetNames);
    if (wb.SheetNames.length > 0) {
      loadSheet(wb, wb.SheetNames[0]);
    }
  };

  const loadSheet = (wb: XLSX.WorkBook, sheetName: string) => {
    setSelectedSheet(sheetName);
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
    setSheetRows(rows);
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    setSheetHeaders(headers);
    setColMap({
      name: headers.find((h) => /name|bauteil|bezeichnung/i.test(h)) ?? headers[0] ?? '',
      category: headers.find((h) => /kategorie|typ|class/i.test(h)) ?? '',
      lengthM: headers.find((h) => /länge|length|breite/i.test(h)) ?? '',
      heightM: headers.find((h) => /höhe|height/i.test(h)) ?? '',
      openingM2: headers.find((h) => /öffnung|opening/i.test(h)) ?? '',
      quantity: headers.find((h) => /anzahl|menge|qty|count/i.test(h)) ?? '',
      manufacturer: headers.find((h) => /hersteller|manufacturer/i.test(h)) ?? '',
    });
  };

  const validatedExcelRows = sheetRows.map((row, idx) => {
    const rowName = String(row[colMap.name] ?? '').trim();
    const l = Number(row[colMap.lengthM] || 1);
    const h = Number(row[colMap.heightM] || 1);
    const op = Number(row[colMap.openingM2] || 0);
    const qty = Number(row[colMap.quantity] || 1);
    const isDuplicate = activeProject.components.some((c) => c.name.toLowerCase() === rowName.toLowerCase());

    const rowErrors: string[] = [];
    if (!rowName) rowErrors.push('Name fehlt');
    if (!Number.isFinite(l) || l <= 0 || !Number.isFinite(h) || h <= 0) rowErrors.push('Ungültige Länge/Höhe');
    if (op < 0 || op > l * h) rowErrors.push('Öffnungsfläche > Bruttofläche oder negativ');
    if (!Number.isFinite(qty) || qty <= 0) rowErrors.push('Ungültige Anzahl');

    return { idx, row, rowName, l, h, op, qty, isDuplicate, rowErrors };
  });

  const importValidatedExcel = () => {
    const valid = validatedExcelRows.filter((r) => r.rowErrors.length === 0 && !r.isDuplicate);
    valid.forEach((r) => {
      addComponent(activeProject.id, {
        id: `comp-xl-${Date.now()}-${r.idx}`,
        projectId: activeProject.id,
        buildingId: activeBuilding.id,
        zoneName: 'Excel-Import',
        floor: 'Bestand',
        componentGroup: 'Importiert',
        category: 'CUSTOM',
        name: r.rowName,
        manufacturer: colMap.manufacturer ? String(r.row[colMap.manufacturer] || 'Unbekannt') : 'Unbekannt',
        productDesignation: 'XLSX/CSV-Import',
        installationYear: activeBuilding.profile.constructionYear,
        dimensions: {
          lengthM: r.l,
          heightM: r.h,
          openingAreaM2: r.op,
          quantityCount: r.qty,
          unitLabel: 'Stk',
        },
        layers: [],
        conditionRating: 'UNKNOWN',
        conditionNote: 'Aus Tabelle importiert — vor Ort verifizieren.',
        connectionType: 'Unbekannt',
        disassemblyRating: 'UNKNOWN',
        remainingServiceLifeYears: null,
        technicalProofs: [],
        openInspectionRequirements: ['Materialschichten & Rohdichten ergänzen'],
        photos: [],
        documentIds: [],
        observations: {},
        hypotheses: [],
        version: 1,
        updatedAt: new Date().toISOString(),
      });
    });
    setExcelImportMsg(`${valid.length} Bauteile validiert und in den Product Twin importiert.`);
  };

  // Document Intelligence Handler
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocLoading(true);
    setDocError(null);
    setDocResult(null);

    try {
      const isText = file.type.includes('text') || file.name.endsWith('.csv') || file.name.endsWith('.txt');
      let payload: Record<string, unknown> = {
        language,
        fileName: file.name,
        documentType: docType,
      };

      if (isText) {
        payload.textContent = await file.text();
        payload.mimeType = 'text/plain';
      } else {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        payload.fileBase64 = dataUrl;
        payload.mimeType = file.type.includes('pdf')
          ? 'application/pdf'
          : file.type.includes('png')
          ? 'image/png'
          : 'image/jpeg';
      }

      const res = await fetch('/api/ai/document-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setDocError(data.error || 'Dokumentanalyse fehlgeschlagen.');
      } else {
        setDocResult({
          fileName: file.name,
          summary: data.summary || '',
          extractedItems: data.extractedItems || [],
        });
        addDocument(activeProject.id, {
          id: `doc-${Date.now()}`,
          projectId: activeProject.id,
          title: file.name,
          documentType: docType,
          fileName: file.name,
          uploadedAt: new Date().toISOString(),
          extractedSummary: data.summary,
          extractedItems: data.extractedItems,
          status: 'SOURCE_DATA',
        });
      }
    } catch (err) {
      setDocError(err instanceof Error ? err.message : 'Fehler beim Dokument-Upload');
    } finally {
      setDocLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#101714]/10 pb-5">
        <div>
          <h1 className="text-2xl font-semibold text-[#101714]">02 · Smart Scanner & Document Intelligence</h1>
          <p className="text-sm text-[#6E8276] mt-1">
            Multimodale Bauteilerfassung, Dokumentenextraktion und validierter XLSX/CSV-Import in den Product Twin.
          </p>
        </div>

        <div className="inline-flex items-center p-1 bg-white border border-[#101714]/10 rounded-md self-start">
          {(
            [
              { id: 'SCANNER', label: 'Foto / Kamera', icon: Camera },
              { id: 'EXCEL', label: 'XLSX / CSV Import', icon: FileSpreadsheet },
              { id: 'DOCUMENT', label: 'PDF / Datenblatt', icon: FileText },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMode(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  mode === tab.id ? 'bg-[#101714] text-white' : 'text-[#6E8276] hover:text-[#101714]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* MODE 1: MULTIMODAL SMART SCANNER */}
      {mode === 'SCANNER' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Capture & Inputs */}
          <section className="lg:col-span-5 bg-white border border-[#101714]/10 rounded-md p-5 space-y-4">
            <h2 className="text-sm font-semibold text-[#101714]">Erfassung & Eingaben</h2>

            <div className="flex flex-wrap gap-2">
              <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md border border-[#101714]/20 bg-[#F7F5EF] text-xs font-medium cursor-pointer hover:border-[#063D2F]">
                <Upload className="w-3.5 h-3.5" />
                <span>Fotos / PDF wählen</span>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>

              {!cameraActive ? (
                <button
                  type="button"
                  onClick={startCamera}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md border border-[#101714]/20 bg-white text-xs font-medium hover:bg-[#F7F5EF]"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Kamera starten</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-[#063D2F] text-white text-xs font-medium"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Foto aufnehmen</span>
                </button>
              )}
            </div>

            {cameraActive && (
              <div className="rounded overflow-hidden border border-[#101714]/20 bg-black">
                <video ref={videoRef} autoPlay playsInline className="w-full h-56 object-cover" />
              </div>
            )}

            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((p, idx) => (
                  <div key={idx} className="relative border border-[#101714]/15 rounded overflow-hidden h-24 bg-[#F7F5EF]">
                    {p.mimeType.includes('pdf') ? (
                      <div className="h-full flex items-center justify-center text-[11px] font-mono p-2 text-center">
                        PDF: {p.name}
                      </div>
                    ) : (
                      <img src={p.dataUrl} alt={p.name} className="w-full h-full object-cover" />
                    )}
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="block text-xs text-[#6E8276] mb-1">
                QR-Code / Barcode / Typenschild-Text (optional)
              </label>
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-[#6E8276] shrink-0" />
                <input
                  type="text"
                  value={qrCodeText}
                  onChange={(e) => setQrCodeText(e.target.value)}
                  placeholder="z. B. DIN EN 1279-5 / Seriennummer"
                  className="w-full px-3 py-2 text-xs border border-[#101714]/20 rounded-md font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#6E8276] mb-1">Beobachtungsnotiz / Kontext</label>
              <textarea
                rows={2}
                value={userHint}
                onChange={(e) => setUserHint(e.target.value)}
                placeholder="z. B. Südfassade 2. OG, eloxiertes Profil, Dichtung porös"
                className="w-full px-3 py-2 text-xs border border-[#101714]/20 rounded-md"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-[#101714] cursor-pointer">
              <input
                type="checkbox"
                checked={scaleCalibrated}
                onChange={(e) => setScaleCalibrated(e.target.checked)}
              />
              <span>Kalibrierter Maßstab im Foto sichtbar (nur dann Maßhinweis zulässig)</span>
            </label>

            <div className="p-3 rounded bg-[#F7F5EF] border border-[#101714]/10 text-[11px] text-[#6E8276]">
              Sicherheitsregel: Keine Ableitung verdeckter Schäden, exakter Materialzusammensetzungen oder Schadstofffreiheit aus Fotos.
            </div>

            <button
              type="button"
              onClick={runGeminiScan}
              disabled={scanning || photos.length === 0}
              className="w-full py-2.5 rounded-md bg-[#063D2F] text-white text-xs font-medium hover:bg-[#101714] disabled:opacity-40 inline-flex items-center justify-center gap-2"
            >
              {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4 text-[#C6A45A]" />}
              <span>Mit Gemini Vision analysieren</span>
            </button>

            {scanError && (
              <div className="p-3 rounded border border-[#B91C1C]/30 bg-[#FEF2F2] text-xs text-[#B91C1C] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{scanError}</span>
              </div>
            )}
          </section>

          {/* Right: Structured AI Hypothesis + Manual Correction & Twin Confirmation */}
          <section className="lg:col-span-7 bg-white border border-[#101714]/10 rounded-md p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-[#101714]/10 pb-3">
              <h2 className="text-sm font-semibold text-[#101714]">
                Scanner-Ergebnis & Manuelle Korrektur
              </h2>
              <TrustStatusLabel status={scanResult ? 'AI_HYPOTHESIS' : 'USER_PROVIDED'} />
            </div>

            {scanResult ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-[#F7F5EF] p-4 rounded border border-[#101714]/10">
                <div>
                  <div className="font-semibold text-[#063D2F]">Erkannte Evidenz & Merkmale</div>
                  <ul className="list-disc pl-4 mt-1 space-y-0.5">
                    {scanResult.evidence.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                    {scanResult.constructionFeatures.map((f, i) => (
                      <li key={`cf-${i}`}>{f}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="font-semibold text-[#B91C1C]">Unsicherheiten & Nicht erkennbar</div>
                  <ul className="list-disc pl-4 mt-1 space-y-0.5">
                    {scanResult.uncertainties.map((u, i) => (
                      <li key={i}>{u}</li>
                    ))}
                    {scanResult.unobservableProperties.map((up, i) => (
                      <li key={`up-${i}`}>{up}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="font-semibold text-[#101714]">Notwendige Rückfragen</div>
                  <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[#6E8276]">
                    {scanResult.requiredFollowUpQuestions.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="font-semibold text-[#101714]">Empfohlene Zusatzfotos</div>
                  <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[#6E8276]">
                    {scanResult.recommendedAdditionalPhotos.map((ph, i) => (
                      <li key={i}>{ph}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-xs text-[#6E8276]">
                Laden Sie Fotos hoch und starten Sie die Analyse, oder erfassen Sie ein Bauteil direkt manuell unten.
              </div>
            )}

            {/* Editable Confirmation Form -> Creates Product Twin */}
            <div className="space-y-3 pt-2">
              <div className="text-xs font-semibold text-[#101714]">
                Menschliche Prüfung & Korrektur vor Übernahme in den Product Twin
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[#6E8276] mb-1">Bauteilbezeichnung *</label>
                  <input
                    type="text"
                    value={compName}
                    onChange={(e) => setCompName(e.target.value)}
                    placeholder="z. B. Aluminium-Fassadenelement F-202"
                    className="w-full px-3 py-2 border border-[#101714]/20 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[#6E8276] mb-1">Bauteilkategorie</label>
                  <select
                    value={compCategory}
                    onChange={(e) => setCompCategory(e.target.value as ComponentCategory)}
                    className="w-full px-3 py-2 border border-[#101714]/20 rounded-md bg-white"
                  >
                    <option value="FACADE_ELEMENT">Fassadenelement</option>
                    <option value="WINDOW">Fenster</option>
                    <option value="DOOR">Tür</option>
                    <option value="INTERIOR_WALL">Innenwand</option>
                    <option value="EXTERIOR_WALL">Außenwand</option>
                    <option value="ROOF">Dach</option>
                    <option value="FLOOR_ASSEMBLY">Bodenaufbau</option>
                    <option value="LOAD_BEARING_STRUCTURE">Tragwerk</option>
                    <option value="INSULATION">Dämmstoff</option>
                    <option value="MEP_TECHNICAL">Technische Gebäudeausrüstung</option>
                    <option value="CUSTOM">Sonstiges Bauteil</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#6E8276] mb-1">Hersteller (falls bekannt)</label>
                  <input
                    type="text"
                    value={compManufacturer}
                    onChange={(e) => setCompManufacturer(e.target.value)}
                    className="w-full px-3 py-2 border border-[#101714]/20 rounded-md"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[#6E8276] mb-1">Bereich</label>
                    <input
                      type="text"
                      value={compZone}
                      onChange={(e) => setCompZone(e.target.value)}
                      className="w-full px-3 py-2 border border-[#101714]/20 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-[#6E8276] mb-1">Geschoss</label>
                    <input
                      type="text"
                      value={compFloor}
                      onChange={(e) => setCompFloor(e.target.value)}
                      className="w-full px-3 py-2 border border-[#101714]/20 rounded-md"
                    />
                  </div>
                </div>
                <div className="sm:col-span-2 grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[#6E8276] mb-1">Länge (m)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={compLength}
                      onChange={(e) => setCompLength(e.target.value)}
                      className="w-full px-3 py-2 border border-[#101714]/20 rounded-md font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[#6E8276] mb-1">Höhe (m)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={compHeight}
                      onChange={(e) => setCompHeight(e.target.value)}
                      className="w-full px-3 py-2 border border-[#101714]/20 rounded-md font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[#6E8276] mb-1">Öffnungsfläche (m²)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={compOpening}
                      onChange={(e) => setCompOpening(e.target.value)}
                      className="w-full px-3 py-2 border border-[#101714]/20 rounded-md font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={confirmAndCreateProductTwin}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#101714] text-white text-xs font-medium hover:bg-[#063D2F]"
                >
                  <Plus className="w-3.5 h-3.5 text-[#C6A45A]" />
                  <span>Bestätigen & im Product Twin speichern</span>
                </button>
                {compConfirmedMsg && (
                  <button
                    type="button"
                    onClick={() => setActiveNav('product_twin')}
                    className="text-xs font-medium text-[#063D2F] underline"
                  >
                    Zum Product Twin wechseln →
                  </button>
                )}
              </div>

              {compConfirmedMsg && (
                <div className="p-3 rounded border border-[#063D2F]/30 bg-[#063D2F]/5 text-xs text-[#063D2F] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{compConfirmedMsg}</span>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* MODE 2: EXCEL / CSV IMPORT WIZARD */}
      {mode === 'EXCEL' && (
        <section className="bg-white border border-[#101714]/10 rounded-md p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#101714]/10 pb-3">
            <div>
              <h2 className="text-base font-semibold text-[#101714]">Excel- & CSV-Bauteilimport</h2>
              <p className="text-xs text-[#6E8276]">
                Workflow: Datei hochladen → Tabellenblatt wählen → Spalten zuordnen → Einheiten-, Fehler- & Dublettenprüfung → Bestätigen.
              </p>
            </div>
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#063D2F] text-white text-xs font-medium cursor-pointer hover:bg-[#101714]">
              <Upload className="w-3.5 h-3.5" />
              <span>XLSX / CSV hochladen</span>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelUpload} className="hidden" />
            </label>
          </div>

          {workbook && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[#6E8276] mb-1">Tabellenblatt</label>
                  <select
                    value={selectedSheet}
                    onChange={(e) => loadSheet(workbook, e.target.value)}
                    className="w-full px-3 py-2 border border-[#101714]/20 rounded-md bg-white"
                  >
                    {sheetNames.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[#6E8276] mb-1">Spalte: Bauteilname *</label>
                  <select
                    value={colMap.name}
                    onChange={(e) => setColMap({ ...colMap, name: e.target.value })}
                    className="w-full px-3 py-2 border border-[#101714]/20 rounded-md bg-white"
                  >
                    {sheetHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[#6E8276] mb-1">Spalte: Länge (m)</label>
                  <select
                    value={colMap.lengthM}
                    onChange={(e) => setColMap({ ...colMap, lengthM: e.target.value })}
                    className="w-full px-3 py-2 border border-[#101714]/20 rounded-md bg-white"
                  >
                    <option value="">(Standard 1 m)</option>
                    {sheetHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[#6E8276] mb-1">Spalte: Höhe (m)</label>
                  <select
                    value={colMap.heightM}
                    onChange={(e) => setColMap({ ...colMap, heightM: e.target.value })}
                    className="w-full px-3 py-2 border border-[#101714]/20 rounded-md bg-white"
                  >
                    <option value="">(Standard 1 m)</option>
                    {sheetHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto border border-[#101714]/10 rounded">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F5EF] border-b border-[#101714]/10 text-[#6E8276]">
                    <tr>
                      <th className="py-2 px-3">Zeile</th>
                      <th className="py-2 px-3">Bauteilname</th>
                      <th className="py-2 px-3 text-right">L × H (m)</th>
                      <th className="py-2 px-3 text-right">Öffnung (m²)</th>
                      <th className="py-2 px-3">Prüfstatus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#101714]/10">
                    {validatedExcelRows.slice(0, 20).map((r) => (
                      <tr key={r.idx}>
                        <td className="py-2 px-3 font-mono">{r.idx + 1}</td>
                        <td className="py-2 px-3 font-medium">{r.rowName || '—'}</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums">
                          {r.l} × {r.h}
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums">{r.op}</td>
                        <td className="py-2 px-3">
                          {r.isDuplicate ? (
                            <span className="text-[#9A5B13]">Dublette (übersprungen)</span>
                          ) : r.rowErrors.length > 0 ? (
                            <span className="text-[#B91C1C]">{r.rowErrors.join(', ')}</span>
                          ) : (
                            <span className="text-[#063D2F]">Gültig</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#6E8276]">
                  {validatedExcelRows.filter((r) => r.rowErrors.length === 0 && !r.isDuplicate).length} von{' '}
                  {validatedExcelRows.length} Zeilen importierbar
                </span>
                <button
                  type="button"
                  onClick={importValidatedExcel}
                  className="px-4 py-2 rounded-md bg-[#063D2F] text-white font-medium"
                >
                  Geprüfte Bauteile importieren
                </button>
              </div>
            </div>
          )}

          {excelImportMsg && (
            <div className="p-3 rounded border border-[#063D2F]/30 bg-[#063D2F]/5 text-xs text-[#063D2F]">
              {excelImportMsg}
            </div>
          )}
        </section>
      )}

      {/* MODE 3: DOCUMENT INTELLIGENCE */}
      {mode === 'DOCUMENT' && (
        <section className="bg-white border border-[#101714]/10 rounded-md p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#101714]/10 pb-3">
            <div>
              <h2 className="text-base font-semibold text-[#101714]">Dokumentenanalyse (Angebote, LV, EPDs, Prüfberichte)</h2>
              <p className="text-xs text-[#6E8276]">
                Extrahiert belegbare Kennwerte mit Dokument-/Seitenbezug; unleserliche Felder werden explizit gekennzeichnet.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as typeof docType)}
                className="px-3 py-2 text-xs border border-[#101714]/20 rounded-md bg-white"
              >
                <option value="DATASHEET">Technisches Datenblatt</option>
                <option value="EPD">Umweltproduktdeklaration (EPD)</option>
                <option value="OFFER">Angebot / Kostenvoranschlag</option>
                <option value="BOQ">Leistungsverzeichnis (LV)</option>
                <option value="TEST_REPORT">Prüfbericht / Gutachten</option>
              </select>
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#063D2F] text-white text-xs font-medium cursor-pointer hover:bg-[#101714]">
                <Upload className="w-3.5 h-3.5" />
                <span>PDF / Bild / TXT prüfen</span>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.txt,.csv"
                  onChange={handleDocumentUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {docLoading && (
            <div className="text-xs text-[#6E8276] flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Dokument wird mit Gemini analysiert…</span>
            </div>
          )}

          {docError && (
            <div className="p-3 rounded border border-[#B91C1C]/30 bg-[#FEF2F2] text-xs text-[#B91C1C]">
              {docError}
            </div>
          )}

          {docResult && (
            <div className="space-y-4 text-xs">
              <div className="p-3 rounded bg-[#F7F5EF] border border-[#101714]/10">
                <div className="font-semibold text-[#101714]">{docResult.fileName}</div>
                <p className="mt-1 text-[#101714]/85">{docResult.summary}</p>
              </div>
              <table className="w-full text-left border border-[#101714]/10">
                <thead className="bg-[#F7F5EF] border-b border-[#101714]/10 text-[#6E8276]">
                  <tr>
                    <th className="py-2 px-3">Feld</th>
                    <th className="py-2 px-3">Extrahierter Wert</th>
                    <th className="py-2 px-3">Einheit</th>
                    <th className="py-2 px-3">Seitenbezug</th>
                    <th className="py-2 px-3">Lesbarkeit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#101714]/10">
                  {docResult.extractedItems.map((item, i) => (
                    <tr key={i}>
                      <td className="py-2 px-3 font-medium">{item.field}</td>
                      <td className="py-2 px-3 font-mono">{item.value}</td>
                      <td className="py-2 px-3 font-mono">{item.unit || '—'}</td>
                      <td className="py-2 px-3 font-mono">{item.pageRef || '—'}</td>
                      <td className="py-2 px-3 font-mono">{item.legibility}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeProject.documents.length > 0 && (
            <div className="pt-2 border-t border-[#101714]/10 space-y-2">
              <h3 className="text-xs font-semibold text-[#101714]">Dokumentierte Projektunterlagen</h3>
              <div className="divide-y divide-[#101714]/10 border border-[#101714]/10 rounded text-xs">
                {activeProject.documents.map((d) => (
                  <div key={d.id} className="p-3 flex items-center justify-between gap-4">
                    <div>
                      <div className="font-medium text-[#101714]">{d.title}</div>
                      <div className="text-[#6E8276]">{d.extractedSummary || d.fileName}</div>
                    </div>
                    <TrustStatusLabel status={d.status} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
};
