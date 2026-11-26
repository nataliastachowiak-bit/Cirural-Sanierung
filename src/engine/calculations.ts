import type {
  CalculationTrace,
  Component,
  CostItem,
  DataQualityStatus,
  LengthUnit,
  MaterialLayer,
  McdaWeights,
  Project,
  Scenario,
  TechnicalStatus,
} from '../types/resourceloop';

export interface ComponentQuantityResult {
  valid: boolean;
  errors: string[];
  grossAreaSingleM2: number | null;
  netAreaSingleM2: number | null;
  totalGrossAreaM2: number | null;
  totalNetAreaM2: number | null;
  totalVolumeM3: number | null;
  totalMassKg: number | null;
  massCompleteness: 'COMPLETE' | 'PARTIAL' | 'UNKNOWN';
  layerResults: Array<{
    layerId: string;
    materialName: string;
    thicknessM: number | null;
    volumeM3: number | null;
    massKg: number | null;
    gwpTotalKgCo2e: number | null;
    warnings: string[];
    traces: CalculationTrace[];
  }>;
  traces: CalculationTrace[];
}

export function convertLengthToMeters(value: number, unit: LengthUnit): { meters: number | null; error?: string } {
  if (!Number.isFinite(value) || value < 0) {
    return { meters: null, error: 'Längen- oder Dickenangaben dürfen nicht negativ oder ungültig sein.' };
  }
  switch (unit) {
    case 'm':
      return { meters: value };
    case 'cm':
      return { meters: value / 100 };
    case 'mm':
      return { meters: value / 1000 };
    default:
      return { meters: null, error: `Ungültige Längeneinheit: ${String(unit)}` };
  }
}

export function calculateComponentQuantities(component: Component): ComponentQuantityResult {
  const errors: string[] = [];
  const traces: CalculationTrace[] = [];

  const { lengthM, heightM, openingAreaM2, quantityCount, manualOverrideGrossAreaM2 } = component.dimensions;

  if (!Number.isFinite(quantityCount) || quantityCount <= 0) {
    errors.push('Anzahl der Bauteile muss größer als 0 sein.');
  }
  if (!Number.isFinite(lengthM) || lengthM < 0 || !Number.isFinite(heightM) || heightM < 0) {
    errors.push('Länge und Höhe dürfen nicht negativ sein.');
  }
  if (!Number.isFinite(openingAreaM2) || openingAreaM2 < 0) {
    errors.push('Öffnungsfläche darf nicht negativ sein.');
  }
  if (manualOverrideGrossAreaM2 !== undefined && (!Number.isFinite(manualOverrideGrossAreaM2) || manualOverrideGrossAreaM2 < 0)) {
    errors.push('Manuelle Bruttofläche darf nicht negativ sein.');
  }

  let grossAreaSingle: number | null = null;
  if (errors.length === 0) {
    grossAreaSingle =
      manualOverrideGrossAreaM2 !== undefined
        ? roundTo(manualOverrideGrossAreaM2, 4)
        : roundTo(lengthM * heightM, 4);

    traces.push({
      id: `trace-gross-${component.id}`,
      label: 'Bruttofläche (je Bauteil)',
      formula:
        manualOverrideGrossAreaM2 !== undefined
          ? 'Bruttofläche = Dokumentierte Bruttofläche'
          : 'Bruttofläche = Länge × Höhe',
      inputs:
        manualOverrideGrossAreaM2 !== undefined
          ? [{ name: 'Bruttofläche (dokumentiert)', value: manualOverrideGrossAreaM2, unit: 'm²', status: 'USER_PROVIDED' }]
          : [
              { name: 'Länge', value: lengthM, unit: 'm', status: 'USER_PROVIDED' },
              { name: 'Höhe', value: heightM, unit: 'm', status: 'USER_PROVIDED' },
            ],
      result: grossAreaSingle,
      unit: 'm²',
      status: 'CALCULATED',
      warnings: [],
    });
  }

  let netAreaSingle: number | null = null;
  if (grossAreaSingle !== null && Number.isFinite(openingAreaM2) && openingAreaM2 >= 0) {
    if (openingAreaM2 > grossAreaSingle) {
      errors.push(
        `Geometrisch unmöglich: Öffnungsfläche (${openingAreaM2} m²) ist größer als die Bruttofläche (${grossAreaSingle} m²).`
      );
    } else {
      netAreaSingle = roundTo(grossAreaSingle - openingAreaM2, 4);
      traces.push({
        id: `trace-net-${component.id}`,
        label: 'Nettofläche (je Bauteil)',
        formula: 'Nettofläche = Bruttofläche − Öffnungsfläche',
        inputs: [
          { name: 'Bruttofläche', value: grossAreaSingle, unit: 'm²', status: 'CALCULATED' },
          { name: 'Öffnungsfläche', value: openingAreaM2, unit: 'm²', status: 'USER_PROVIDED' },
        ],
        result: netAreaSingle,
        unit: 'm²',
        status: 'CALCULATED',
        warnings: [],
      });
    }
  }

  if (errors.length > 0 || grossAreaSingle === null || netAreaSingle === null) {
    return {
      valid: false,
      errors,
      grossAreaSingleM2: grossAreaSingle,
      netAreaSingleM2: netAreaSingle,
      totalGrossAreaM2: null,
      totalNetAreaM2: null,
      totalVolumeM3: null,
      totalMassKg: null,
      massCompleteness: 'UNKNOWN',
      layerResults: [],
      traces,
    };
  }

  const totalGrossAreaM2 = roundTo(grossAreaSingle * quantityCount, 4);
  const totalNetAreaM2 = roundTo(netAreaSingle * quantityCount, 4);

  if (quantityCount !== 1) {
    traces.push({
      id: `trace-net-total-${component.id}`,
      label: 'Gesamt-Nettofläche',
      formula: 'Gesamt-Nettofläche = Nettofläche × Anzahl',
      inputs: [
        { name: 'Nettofläche', value: netAreaSingle, unit: 'm²', status: 'CALCULATED' },
        { name: 'Anzahl', value: quantityCount, unit: 'Stk', status: 'USER_PROVIDED' },
      ],
      result: totalNetAreaM2,
      unit: 'm²',
      status: 'CALCULATED',
      warnings: [],
    });
  }

  let totalVolumeM3 = 0;
  let hasAnyValidVolume = false;
  let totalMassKg = 0;
  let missingMassLayers = 0;
  let validMassLayers = 0;

  const layerResults = component.layers.map((layer: MaterialLayer) => {
    const layerWarnings: string[] = [];
    const layerTraces: CalculationTrace[] = [];

    const conv = convertLengthToMeters(layer.thicknessValue, layer.thicknessUnit);
    if (conv.error || conv.meters === null) {
      errors.push(`${layer.materialName}: ${conv.error}`);
      layerWarnings.push(conv.error ?? 'Ungültige Dicke');
      missingMassLayers++;
      return {
        layerId: layer.id,
        materialName: layer.materialName,
        thicknessM: null,
        volumeM3: null,
        massKg: null,
        gwpTotalKgCo2e: null,
        warnings: layerWarnings,
        traces: layerTraces,
      };
    }

    const thicknessM = conv.meters;
    const volumeM3 = roundTo(totalNetAreaM2 * thicknessM, 5);
    hasAnyValidVolume = true;
    totalVolumeM3 += volumeM3;

    layerTraces.push({
      id: `trace-vol-${layer.id}`,
      label: `Volumen (${layer.materialName})`,
      formula: 'Volumen = Nettofläche × Materialdicke',
      inputs: [
        { name: 'Gesamt-Nettofläche', value: totalNetAreaM2, unit: 'm²', status: 'CALCULATED' },
        {
          name: 'Materialdicke',
          value: `${layer.thicknessValue} ${layer.thicknessUnit} (= ${thicknessM} m)`,
          unit: 'm',
          status: 'USER_PROVIDED',
        },
      ],
      result: volumeM3,
      unit: 'm³',
      status: 'CALCULATED',
      warnings: [],
    });

    let massKg: number | null = null;
    if (
      layer.densityKgM3 === null ||
      layer.densityKgM3 === undefined ||
      !Number.isFinite(layer.densityKgM3) ||
      layer.densityKgM3 <= 0 ||
      layer.densityStatus === 'UNKNOWN'
    ) {
      missingMassLayers++;
      layerWarnings.push(
        `Keine dokumentierte Rohdichte für „${layer.materialName}“ — Masse wird nicht berechnet.`
      );
      layerTraces.push({
        id: `trace-mass-${layer.id}`,
        label: `Masse (${layer.materialName})`,
        formula: 'Masse = Volumen × dokumentierte Rohdichte',
        inputs: [
          { name: 'Volumen', value: volumeM3, unit: 'm³', status: 'CALCULATED' },
          { name: 'Rohdichte', value: null, unit: 'kg/m³', status: 'UNKNOWN' },
        ],
        result: null,
        unit: 'kg',
        status: 'UNKNOWN',
        warnings: layerWarnings,
      });
    } else {
      massKg = roundTo(volumeM3 * layer.densityKgM3, 2);
      totalMassKg += massKg;
      validMassLayers++;
      layerTraces.push({
        id: `trace-mass-${layer.id}`,
        label: `Masse (${layer.materialName})`,
        formula: 'Masse = Volumen × dokumentierte Rohdichte',
        inputs: [
          { name: 'Volumen', value: volumeM3, unit: 'm³', status: 'CALCULATED' },
          { name: 'Rohdichte', value: layer.densityKgM3, unit: 'kg/m³', status: layer.densityStatus },
        ],
        result: massKg,
        unit: 'kg',
        status: 'CALCULATED',
        warnings: [],
      });
    }

    let gwpTotalKgCo2e: number | null = null;
    if (massKg !== null && layer.gwpFactorKgCo2ePerKg !== null && layer.gwpStatus !== 'UNKNOWN') {
      gwpTotalKgCo2e = roundTo(massKg * layer.gwpFactorKgCo2ePerKg, 2);
    }

    return {
      layerId: layer.id,
      materialName: layer.materialName,
      thicknessM,
      volumeM3,
      massKg,
      gwpTotalKgCo2e,
      warnings: layerWarnings,
      traces: layerTraces,
    };
  });

  const massCompleteness: ComponentQuantityResult['massCompleteness'] =
    component.layers.length === 0 || validMassLayers === 0
      ? 'UNKNOWN'
      : missingMassLayers === 0
      ? 'COMPLETE'
      : 'PARTIAL';

  return {
    valid: errors.length === 0,
    errors,
    grossAreaSingleM2: grossAreaSingle,
    netAreaSingleM2: netAreaSingle,
    totalGrossAreaM2,
    totalNetAreaM2,
    totalVolumeM3: hasAnyValidVolume ? roundTo(totalVolumeM3, 5) : null,
    totalMassKg: validMassLayers > 0 ? roundTo(totalMassKg, 2) : null,
    massCompleteness,
    layerResults,
    traces,
  };
}

export interface ScenarioCostSummary {
  totalNetEur: number | null;
  totalGrossEur: number | null;
  vatAmountEur: number | null;
  knownNetSumEur: number;
  missingPositionsCount: number;
  missingPositionsLabels: string[];
  completenessPct: number;
  isComplete: boolean;
  lifecycleCostNetEur: number | null;
  sensitivityRangeEur: {
    lowNetEur: number | null;
    highNetEur: number | null;
  };
  itemBreakdown: Array<{
    item: CostItem;
    lineNetEur: number | null;
    formula: string;
  }>;
}

export function calculateScenarioCosts(scenario: Scenario): ScenarioCostSummary {
  let knownNetSum = 0;
  let missingCount = 0;
  const missingLabels: string[] = [];
  let lowSum = 0;
  let highSum = 0;

  const itemBreakdown = scenario.costItems.map((item) => {
    const validQty = item.quantity !== null && Number.isFinite(item.quantity) && item.quantity >= 0;
    const validPrice =
      item.unitPriceNetEur !== null &&
      Number.isFinite(item.unitPriceNetEur) &&
      item.unitPriceNetEur >= 0 &&
      item.status !== 'UNKNOWN';

    if (!validQty || !validPrice) {
      missingCount++;
      missingLabels.push(item.label);
      return {
        item,
        lineNetEur: null,
        formula: `${item.quantity ?? '?'} ${item.unit} × ${item.unitPriceNetEur ?? 'UNBEKANNT'} €`,
      };
    }

    const lineNet = roundTo((item.quantity as number) * (item.unitPriceNetEur as number), 2);
    knownNetSum += lineNet;
    const delta = (item.uncertaintyPct ?? 0) / 100;
    lowSum += lineNet * (1 - delta);
    highSum += lineNet * (1 + delta);

    return {
      item,
      lineNetEur: lineNet,
      formula: `${item.quantity} ${item.unit} × ${item.unitPriceNetEur?.toFixed(2)} € = ${lineNet.toFixed(2)} €`,
    };
  });

  const totalCount = scenario.costItems.length;
  const completenessPct = totalCount === 0 ? 0 : Math.round(((totalCount - missingCount) / totalCount) * 100);
  const isComplete = totalCount > 0 && missingCount === 0;

  const totalNetEur = isComplete ? roundTo(knownNetSum, 2) : null;
  const vatAmountEur = totalNetEur !== null ? roundTo(totalNetEur * (scenario.vatRatePct / 100), 2) : null;
  const totalGrossEur = totalNetEur !== null && vatAmountEur !== null ? roundTo(totalNetEur + vatAmountEur, 2) : null;

  // Optional Lifecycle Cost: CapEx + PV(annualMaintenance) - PV(residualValue)
  let lifecycleCostNetEur: number | null = null;
  if (
    totalNetEur !== null &&
    scenario.annualMaintenanceEur !== null &&
    scenario.analysisHorizonYears > 0
  ) {
    const r = scenario.discountRatePct / 100;
    const n = scenario.analysisHorizonYears;
    let pvMaint = 0;
    for (let yr = 1; yr <= n; yr++) {
      pvMaint += scenario.annualMaintenanceEur / Math.pow(1 + r, yr);
    }
    const pvResidual =
      scenario.documentedResidualValueEur !== null
        ? scenario.documentedResidualValueEur / Math.pow(1 + r, n)
        : 0;
    lifecycleCostNetEur = roundTo(totalNetEur + pvMaint - pvResidual, 2);
  }

  return {
    totalNetEur,
    totalGrossEur,
    vatAmountEur,
    knownNetSumEur: roundTo(knownNetSum, 2),
    missingPositionsCount: missingCount,
    missingPositionsLabels: missingLabels,
    completenessPct,
    isComplete,
    lifecycleCostNetEur,
    sensitivityRangeEur: {
      lowNetEur: isComplete ? roundTo(lowSum, 2) : null,
      highNetEur: isComplete ? roundTo(highSum, 2) : null,
    },
    itemBreakdown,
  };
}

export interface McdaEvaluationRow {
  scenarioId: string;
  strategyCode: Scenario['strategyCode'];
  name: string;
  isCircular: boolean;
  technicalStatus: TechnicalStatus;
  excludedOrBlocked: boolean;
  missingCriticalCriteria: string[];
  normalizedScore: number | null; // null if excluded OR critical criteria missing
  rank: number | null;
  dimensionScores: {
    technical: number | null;
    economic: number | null;
    environmental: number | null;
    resourcePotential: number | null;
    timeEffort: number | null;
    dataQuality: number | null;
  };
}

export function evaluateMcdaScenarios(
  scenarios: Scenario[],
  weights: McdaWeights
): {
  canProduceFinalRanking: boolean;
  blockingReasons: string[];
  rows: McdaEvaluationRow[];
} {
  const circularOrBench = scenarios;
  const isExcluded = (s: Scenario) => s.overallTechnicalStatus === 'EXCLUDED' || s.technicalConstraints.some(c => c.status === 'EXCLUDED');
  const needsReview = (s: Scenario) => s.overallTechnicalStatus !== 'PASSED' || s.technicalConstraints.length === 0 || s.technicalConstraints.some(c => c.status !== 'PASSED');
  const eligible = scenarios.filter(s => !isExcluded(s) && !needsReview(s));
  const validWeights = Object.values(weights).every(w => Number.isFinite(w) && w >= 0);
  const costSummaries = new Map(circularOrBench.map((s) => [s.id, calculateScenarioCosts(s)]));

  const validNetCosts = eligible
    .map((s) => costSummaries.get(s.id)?.totalNetEur)
    .filter((v): v is number => v !== null && v !== undefined && Number.isFinite(v) && v >= 0);
  const minCost = validNetCosts.length ? Math.min(...validNetCosts) : null;
  const maxCost = validNetCosts.length ? Math.max(...validNetCosts) : null;

  const validPreserved = eligible
    .map((s) => s.environmentalImpact.preservedMaterialKg)
    .filter((v): v is number => v !== null && Number.isFinite(v) && v >= 0);
  const maxPreserved = validPreserved.length ? Math.max(...validPreserved) : null;

  const validGhg = eligible
    .map((s) => s.environmentalImpact.ghgEmissionsKgCo2e)
    .filter((v): v is number => v !== null && Number.isFinite(v));
  const minGhg = validGhg.length ? Math.min(...validGhg) : null;
  const maxGhg = validGhg.length ? Math.max(...validGhg) : null;

  const weightSum =
    weights.technicalSuitability +
    weights.economicViability +
    weights.environmentalImpact +
    weights.resourcePotential +
    weights.timeEffort +
    weights.dataQuality;

  const blockingReasons: string[] = [];

  const rows: McdaEvaluationRow[] = circularOrBench.map((s) => {
    const cost = costSummaries.get(s.id)!;
    const missingCritical: string[] = [];

    if (!isExcluded(s) && needsReview(s)) {
      missingCritical.push('Technische Fachprüfung oder Einzelkriterien offen');
    }
    if (s.environmentalImpact.preservedMaterialKg === null || !Number.isFinite(s.environmentalImpact.preservedMaterialKg) || s.environmentalImpact.preservedMaterialKg < 0) {
      missingCritical.push('Ressourcenerhalt unbekannt oder ungültig');
    }
    if (!cost.isComplete) {
      missingCritical.push(`Fehlende Kostenpositionen (${cost.missingPositionsCount})`);
    }
    if (s.environmentalImpact.status === 'UNKNOWN' || s.environmentalImpact.ghgEmissionsKgCo2e === null || !Number.isFinite(s.environmentalImpact.ghgEmissionsKgCo2e)) {
      missingCritical.push('Fehlende Umwelt-/CO₂e-Daten');
    }

    const techScoreMap: Record<TechnicalStatus, number | null> = {
      PASSED: 100,
      CONDITIONALLY_POSSIBLE: 70,
      EXPERT_REVIEW_REQUIRED: 45,
      EXCLUDED: 0,
      UNKNOWN: null,
    };

    const techScore = isExcluded(s) ? 0 : needsReview(s) ? null : techScoreMap[s.overallTechnicalStatus];

    let econScore: number | null = null;
    if (cost.totalNetEur !== null && minCost !== null && maxCost !== null) {
      econScore = maxCost === minCost ? 100 : roundTo(((maxCost - cost.totalNetEur) / (maxCost - minCost)) * 80 + 20, 1);
    }

    let envScore: number | null = null;
    if (s.environmentalImpact.ghgEmissionsKgCo2e !== null && minGhg !== null && maxGhg !== null) {
      envScore =
        maxGhg === minGhg
          ? 100
          : roundTo(((maxGhg - s.environmentalImpact.ghgEmissionsKgCo2e) / (maxGhg - minGhg)) * 80 + 20, 1);
    }

    let resScore: number | null = null;
    if (s.environmentalImpact.preservedMaterialKg !== null && maxPreserved !== null && maxPreserved > 0) {
      resScore = roundTo((s.environmentalImpact.preservedMaterialKg / maxPreserved) * 100, 1);
    } else if (s.environmentalImpact.preservedMaterialKg === 0) {
      resScore = 0;
    }

    const timeEffortMap: Record<Scenario['strategyCode'], number> = {
      R1_KEEP: 95,
      R2_REPAIR_REUSE: 80,
      R3_REFURBISH: 60,
      R4_REMANUFACTURE: 40,
      R5_RECYCLE: 70,
      CONVENTIONAL_REPLACEMENT: 65,
    };
    const timeScore = timeEffortMap[s.strategyCode];

    const dataQualityScore = roundTo(
      (cost.completenessPct + (s.environmentalImpact.ghgEmissionsKgCo2e !== null ? 100 : 30) + (techScore !== null ? 100 : 20)) / 3,
      1
    );

    const excluded = isExcluded(s);
    const hasMissing = missingCritical.length > 0;

    let normalizedScore: number | null = null;
    if (!excluded && !hasMissing && validWeights && weightSum > 0 && techScore !== null && econScore !== null && envScore !== null && resScore !== null) {
      normalizedScore = roundTo(
        (techScore * weights.technicalSuitability +
          econScore * weights.economicViability +
          envScore * weights.environmentalImpact +
          resScore * weights.resourcePotential +
          timeScore * weights.timeEffort +
          dataQualityScore * weights.dataQuality) /
          weightSum,
        1
      );
    }

    return {
      scenarioId: s.id,
      strategyCode: s.strategyCode,
      name: s.name,
      isCircular: s.isCircular,
      technicalStatus: s.overallTechnicalStatus,
      excludedOrBlocked: excluded,
      missingCriticalCriteria: missingCritical,
      normalizedScore,
      rank: null,
      dimensionScores: {
        technical: techScore,
        economic: econScore,
        environmental: envScore,
        resourcePotential: resScore,
        timeEffort: timeScore,
        dataQuality: dataQualityScore,
      },
    };
  });

  const circularIncomplete = rows.filter((r) => r.isCircular && !r.excludedOrBlocked && r.missingCriticalCriteria.length > 0);
  if (circularIncomplete.length > 0) {
    blockingReasons.push(
      `${circularIncomplete.length} zirkuläre Strategie(n) weisen unbekannte kritische Kriterien auf — endgültige Rangfolge gesperrt.`
    );
  }

  if (!validWeights || weightSum <= 0) blockingReasons.push('MCDA-Gewichte ungültig');
  const canProduceFinalRanking = validWeights && weightSum > 0 && circularIncomplete.length === 0 && rows.some((r) => r.isCircular && r.normalizedScore !== null);

  if (canProduceFinalRanking) {
    const rankable = rows
      .filter((r) => r.isCircular && r.normalizedScore !== null)
      .sort((a, b) => (b.normalizedScore ?? 0) - (a.normalizedScore ?? 0));
    rankable.forEach((r, idx) => {
      r.rank = idx + 1;
    });
  }

  return {
    canProduceFinalRanking,
    blockingReasons,
    rows,
  };
}

export interface DataQualityMetrics {
  completenessPct: number;
  documentedSourcesPct: number;
  unconfirmedAiHypothesesCount: number;
  conflictCount: number;
  criticalDataGapsCount: number;
  openExpertProofsCount: number;
  statusBreakdown: Record<DataQualityStatus, number>;
}

export function evaluateProjectDataQuality(project: Project): DataQualityMetrics {
  const statusBreakdown: Record<DataQualityStatus, number> = {
    VERIFIED: 0,
    SOURCE_DATA: 0,
    USER_PROVIDED: 0,
    CALCULATED: 0,
    AI_HYPOTHESIS: 0,
    CONFLICT: 0,
    UNKNOWN: 0,
  };

  let totalMandatorySlots = 0;
  let filledMandatorySlots = 0;
  let documentedSourceSlots = 0;
  let unconfirmedAiHypothesesCount = 0;
  let conflictCount = 0;
  let criticalDataGapsCount = 0;
  let openExpertProofsCount = 0;

  project.buildings.forEach((b) => {
    const slots: Array<{ filled: boolean; status: DataQualityStatus; hasSource: boolean }> = [
      {
        filled: b.location.latitude !== null && b.location.longitude !== null,
        status: b.location.geocodingStatus === 'VERIFIED' ? 'SOURCE_DATA' : 'UNKNOWN',
        hasSource: Boolean(b.location.geocodingSource),
      },
      {
        filled: b.profile.constructionYear !== null,
        status: b.profile.constructionYear !== null ? 'USER_PROVIDED' : 'UNKNOWN',
        hasSource: false,
      },
      {
        filled: b.geometry.footprintAreaM2 !== null,
        status: b.geometry.status,
        hasSource: Boolean(b.geometry.sourceLabel),
      },
      {
        filled: b.profile.knownConstructionType.value !== null,
        status: b.profile.knownConstructionType.status,
        hasSource: Boolean(b.profile.knownConstructionType.sourceLabel),
      },
    ];
    slots.forEach((s) => {
      totalMandatorySlots++;
      statusBreakdown[s.status]++;
      if (s.filled) filledMandatorySlots++;
      else criticalDataGapsCount++;
      if (s.hasSource) documentedSourceSlots++;
      if (s.status === 'CONFLICT') conflictCount++;
    });

    b.climateRisks.forEach((r) => {
      if (r.availabilityStatus !== 'AVAILABLE' || r.hazardClass === 'UNKNOWN') {
        criticalDataGapsCount++;
      }
    });
  });

  project.components.forEach((c) => {
    totalMandatorySlots += 4;
    if (c.manufacturer) {
      filledMandatorySlots++;
      documentedSourceSlots++;
    }
    if (c.installationYear !== null) filledMandatorySlots++;
    if (c.dimensions.lengthM > 0 && c.dimensions.heightM > 0) {
      filledMandatorySlots++;
      statusBreakdown.USER_PROVIDED++;
    }
    if (c.layers.length > 0) filledMandatorySlots++;

    c.layers.forEach((l) => {
      totalMandatorySlots++;
      statusBreakdown[l.densityStatus]++;
      if (l.densityKgM3 !== null && l.densityStatus !== 'UNKNOWN') {
        filledMandatorySlots++;
        if (l.densitySource) documentedSourceSlots++;
      } else {
        criticalDataGapsCount++;
      }
      if (l.gwpStatus === 'UNKNOWN') {
        criticalDataGapsCount++;
      }
    });

    Object.values(c.observations).forEach((obs) => {
      statusBreakdown[obs.status]++;
      if (obs.status === 'CONFLICT') conflictCount++;
      if (obs.sourceId || obs.sourceLabel || obs.documentRef) documentedSourceSlots++;
    });

    c.hypotheses.forEach((h) => {
      if (h.status === 'UNCONFIRMED_AI') {
        unconfirmedAiHypothesesCount++;
        statusBreakdown.AI_HYPOTHESIS++;
      }
    });

    openExpertProofsCount += c.openInspectionRequirements.length;
  });

  project.scenarios.forEach((s) => {
    s.costItems.forEach((ci) => {
      statusBreakdown[ci.status]++;
      if (ci.unitPriceNetEur === null || ci.status === 'UNKNOWN') {
        criticalDataGapsCount++;
      }
    });
    s.technicalConstraints.forEach((tc) => {
      if (tc.status === 'EXPERT_REVIEW_REQUIRED' || tc.status === 'UNKNOWN') {
        openExpertProofsCount++;
      }
    });
  });

  const completenessPct =
    totalMandatorySlots === 0 ? 0 : Math.round((filledMandatorySlots / totalMandatorySlots) * 100);
  const documentedSourcesPct =
    totalMandatorySlots === 0 ? 0 : Math.min(100, Math.round((documentedSourceSlots / totalMandatorySlots) * 100));

  return {
    completenessPct,
    documentedSourcesPct,
    unconfirmedAiHypothesesCount,
    conflictCount,
    criticalDataGapsCount,
    openExpertProofsCount,
    statusBreakdown,
  };
}

export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
