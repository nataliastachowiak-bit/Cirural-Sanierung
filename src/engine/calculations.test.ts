import { describe, expect, it } from 'vitest';
import {
  calculateComponentQuantities,
  calculateScenarioCosts,
  evaluateMcdaScenarios,
  evaluateProjectDataQuality,
} from './calculations';
import { createDemoSeed } from '../data/demoSeed';
import type { Component, Scenario } from '../types/resourceloop';

describe('ResourceLoop AI Deterministic Calculation Engine', () => {
  const seed = createDemoSeed();
  const demoProject = seed.projects[0];
  const facadeComponent = demoProject.components[0];

  it('computes exact Aluminium Facade reference net area 12 - 2 = 10 m²', () => {
    const res = calculateComponentQuantities(facadeComponent);
    expect(res.valid).toBe(true);
    expect(res.grossAreaSingleM2).toBe(12);
    expect(res.netAreaSingleM2).toBe(10);
    expect(res.traces.some((t) => t.formula.includes('Bruttofläche − Öffnungsfläche'))).toBe(true);
  });

  it('rejects negative dimensions cleanly', () => {
    const invalid: Component = {
      ...facadeComponent,
      dimensions: { ...facadeComponent.dimensions, lengthM: -4 },
    };
    const res = calculateComponentQuantities(invalid);
    expect(res.valid).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
  });

  it('rejects opening area greater than gross area', () => {
    const invalid: Component = {
      ...facadeComponent,
      dimensions: { ...facadeComponent.dimensions, openingAreaM2: 15 },
    };
    const res = calculateComponentQuantities(invalid);
    expect(res.valid).toBe(false);
    expect(res.errors[0]).toContain('Geometrisch unmöglich');
  });

  it('does not calculate mass for layers with UNKNOWN density', () => {
    const res = calculateComponentQuantities(facadeComponent);
    const unknownLayer = res.layerResults.find((l) => l.layerId === 'layer-polyamide-break');
    expect(unknownLayer).toBeDefined();
    expect(unknownLayer?.massKg).toBeNull();
    expect(res.massCompleteness).toBe('PARTIAL');
  });

  it('never replaces missing cost items with 0 EUR', () => {
    const r4Scenario = demoProject.scenarios.find((s) => s.strategyCode === 'R4_REMANUFACTURE') as Scenario;
    const cost = calculateScenarioCosts(r4Scenario);
    expect(cost.isComplete).toBe(false);
    expect(cost.totalNetEur).toBeNull();
    expect(cost.missingPositionsCount).toBeGreaterThan(0);
  });

  it('calculates exact cost totals when all items are documented', () => {
    const r1Scenario = demoProject.scenarios.find((s) => s.strategyCode === 'R1_KEEP') as Scenario;
    const cost = calculateScenarioCosts(r1Scenario);
    expect(cost.isComplete).toBe(true);
    expect(cost.totalNetEur).toBeGreaterThan(0);
    expect(cost.totalGrossEur).toBeCloseTo((cost.totalNetEur ?? 0) * 1.19, 2);
  });

  it('blocks final MCDA ranking when critical criteria are unknown and never overrides technical exclusions', () => {
    const mcda = evaluateMcdaScenarios(demoProject.scenarios, demoProject.mcdaWeights);
    expect(mcda.canProduceFinalRanking).toBe(false);
    expect(mcda.blockingReasons.length).toBeGreaterThan(0);

    const excludedScenario: Scenario = {
      ...demoProject.scenarios[0],
      id: 'test-excl',
      overallTechnicalStatus: 'EXCLUDED',
    };
    const mcdaExcl = evaluateMcdaScenarios([excludedScenario], demoProject.mcdaWeights);
    expect(mcdaExcl.rows[0].excludedOrBlocked).toBe(true);
    expect(mcdaExcl.rows[0].normalizedScore).toBeNull();
  });

  it('computes transparent Data Quality metrics for demo project', () => {
    const dq = evaluateProjectDataQuality(demoProject);
    expect(dq.completenessPct).toBeGreaterThan(0);
    expect(dq.completenessPct).toBeLessThanOrEqual(100);
    expect(dq.openExpertProofsCount).toBeGreaterThan(0);
  });
});
