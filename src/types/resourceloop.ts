export type LanguageCode = 'de' | 'en' | 'pl';

export type UserRole =
  | 'PROJECT_OWNER'
  | 'TECHNICAL_EXPERT'
  | 'EDITOR'
  | 'REVIEWER'
  | 'VIEWER';

export type DataQualityStatus =
  | 'VERIFIED'
  | 'SOURCE_DATA'
  | 'USER_PROVIDED'
  | 'CALCULATED'
  | 'AI_HYPOTHESIS'
  | 'CONFLICT'
  | 'UNKNOWN';

export type ImplementationBadge =
  | 'IMPLEMENTED_TESTED'
  | 'IMPLEMENTED_NOT_TESTED'
  | 'DEMO_ONLY'
  | 'PLANNED'
  | 'BLOCKED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId: string;
}

export interface Organization {
  id: string;
  name: string;
  region: string;
  country: string;
}

export interface DataSource {
  id: string;
  name: string;
  provider: string;
  url?: string;
  documentRef?: string;
  retrievedAt?: string;
  dataVersionDate?: string;
  collectionMethod: string;
  availabilityStatus: 'AVAILABLE' | 'PARTIAL' | 'UNAVAILABLE' | 'MANUAL_IMPORT';
  licenseNote?: string;
}

export interface DataObservation<T = unknown> {
  id: string;
  fieldPath: string;
  value: T | null;
  unit?: string;
  status: DataQualityStatus;
  sourceId?: string;
  sourceLabel?: string;
  sourceLink?: string;
  documentRef?: string;
  retrievedAt?: string;
  dataDate?: string;
  collectionMethod?: string;
  authorRole?: string;
  formula?: string;
  uncertaintyNote?: string;
  userConfirmedAt?: string;
  userConfirmedBy?: string;
  expertVerifiedAt?: string;
  expertVerifiedBy?: string;
  validScope?: string;
  history: Array<{
    timestamp: string;
    actor: string;
    previousValue: unknown;
    newValue: unknown;
    note?: string;
  }>;
}

export interface GeoLocation {
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  stateRegion?: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  geocodingStatus: 'VERIFIED' | 'AMBIGUOUS' | 'UNAVAILABLE' | 'MANUAL';
  geocodingSource?: string;
  ambiguityMatches?: Array<{
    displayName: string;
    lat: number;
    lon: number;
  }>;
}

export interface BuildingGeometry {
  footprintAreaM2: number | null;
  buildingHeightM: number | null;
  floorsCount: number | null;
  roofShape: string | null;
  grossFloorAreaM2: number | null;
  status: DataQualityStatus;
  sourceLabel?: string;
}

export interface RiskItem {
  id: string;
  category:
    | 'RIVER_FLOOD'
    | 'HEAVY_RAIN'
    | 'SURFACE_FLOODING'
    | 'SLOPE_STABILITY'
    | 'WATER_ACCUMULATION'
    | 'URBAN_HEAT_ISLAND'
    | 'CONTAMINATED_SITES'
    | 'ENVIRONMENTAL_LOAD';
  label: string;
  sourceName: string;
  dataDate: string;
  spatialResolution: string;
  availabilityStatus: 'AVAILABLE' | 'UNAVAILABLE' | 'MANUAL_IMPORT_REQUIRED';
  hazardClass: string; // e.g. 'UNKNOWN' when unavailable — never 'Low' by default
  renovationRelevance: string;
  recommendedExpertCheck: string;
}

export interface EnvironmentalRisk extends RiskItem {}
export interface ClimateRisk extends RiskItem {}

export interface BuildingProfile {
  id: string;
  buildingId: string;
  constructionYear: number | null;
  constructionYearUnknown: boolean;
  buildingAgeClass: string;
  buildingType: string;
  buildingUsage: string;
  knownConstructionType: DataObservation<string>;
  typicalAgeMaterials: string[];
  potentialEnergyWeaknesses: string[];
  potentialPollutantHints: string[];
  renovationDataGaps: string[];
  renovationHistoryNote?: string;
  aiBriefing?: {
    generatedAt: string;
    summary: string;
    locationInsights: string[];
    renovationPriorities: string[];
    resourcePotentials: string[];
    dataGaps: string[];
    openTechnicalQuestions: string[];
    prioritizedInspectionPlan: Array<{
      step: number;
      task: string;
      priority: 'HIGH' | 'MEDIUM' | 'LOW';
      rationale: string;
    }>;
    disclaimer: string;
  };
}

export interface BuildingZone {
  id: string;
  buildingId: string;
  name: string; // Gebäudebereich
  floor: string; // Geschoss
  componentGroup: string; // Bauteilgruppe
}

export interface Building {
  id: string;
  projectId: string;
  name: string;
  imageUrl?: string;
  location: GeoLocation;
  geometry: BuildingGeometry;
  profile: BuildingProfile;
  zones: BuildingZone[];
  climateRisks: ClimateRisk[];
  environmentalRisks: EnvironmentalRisk[];
  gisLayersSnapshot?: {
    osmBuildingFound: boolean;
    osmTags: Record<string, string>;
    nearbyFeatures: string[];
    lastCheckedAt: string;
  };
}

export type ComponentCategory =
  | 'FACADE_ELEMENT'
  | 'WINDOW'
  | 'DOOR'
  | 'INTERIOR_WALL'
  | 'EXTERIOR_WALL'
  | 'ROOF'
  | 'FLOOR_ASSEMBLY'
  | 'LOAD_BEARING_STRUCTURE'
  | 'INSULATION'
  | 'MEP_TECHNICAL'
  | 'CUSTOM';

export type LengthUnit = 'm' | 'cm' | 'mm';

export interface Material {
  id: string;
  name: string;
  group:
    | 'ALUMINIUM'
    | 'STEEL'
    | 'STAINLESS_STEEL'
    | 'CONCRETE'
    | 'BRICK'
    | 'GLASS'
    | 'WOOD'
    | 'GYPSUM'
    | 'MINERAL_WOOL'
    | 'PLASTICS'
    | 'INSULATION'
    | 'COMPOSITE';
  technicalProperties: string;
  densityKgM3: number | null;
  densityStatus: DataQualityStatus;
  originNote: string;
  epdReference: string | null;
  gwpKgCo2ePerKg: number | null; // null if unknown — never invented
  gwpSystemBoundary: string | null; // e.g., 'EN 15804 A1-A3'
  environmentalDataStatus: DataQualityStatus;
  reusePotential: string;
  recyclingPotential: string;
  disassemblyRequirements: string;
  pollutantHints: string[];
  materialLimitations: string[];
  sourceName: string;
}

export interface MaterialLayer {
  id: string;
  materialId?: string;
  materialName: string;
  thicknessValue: number;
  thicknessUnit: LengthUnit;
  densityKgM3: number | null;
  densityStatus: DataQualityStatus;
  densitySource?: string;
  gwpFactorKgCo2ePerKg: number | null;
  gwpStatus: DataQualityStatus;
  gwpBoundary?: string;
  isRecyclable?: boolean;
  isReusable?: boolean;
  pollutantNote?: string;
}

export interface ComponentPhoto {
  id: string;
  url: string;
  caption: string;
  capturedAt: string;
  scaleCalibrated: boolean;
}

export interface DocumentRecord {
  id: string;
  projectId: string;
  componentId?: string;
  title: string;
  documentType: 'OFFER' | 'BOQ' | 'DATASHEET' | 'EPD' | 'TEST_REPORT' | 'AS_BUILT' | 'MANUFACTURER_DOC' | 'CSV_XLSX';
  fileName: string;
  uploadedAt: string;
  pageCount?: number;
  extractedSummary?: string;
  extractedItems?: Array<{
    field: string;
    value: string;
    unit?: string;
    pageRef?: string;
    legibility: 'CLEAR' | 'AMBIGUOUS' | 'ILLEGIBLE';
  }>;
  status: DataQualityStatus;
}

export interface MaterialHypothesis {
  id: string;
  componentId: string;
  proposedClass: string;
  proposedMaterial: string;
  evidence: string[];
  uncertainties: string[];
  unobservableProperties: string[];
  requiredFollowUpQuestions: string[];
  recommendedAdditionalPhotos: string[];
  status: 'UNCONFIRMED_AI' | 'USER_CORRECTED' | 'USER_CONFIRMED';
  createdAt: string;
}

export type TechnicalStatus =
  | 'PASSED'
  | 'CONDITIONALLY_POSSIBLE'
  | 'EXPERT_REVIEW_REQUIRED'
  | 'EXCLUDED'
  | 'UNKNOWN';

export interface TechnicalConstraint {
  id: string;
  domain:
    | 'CONDITION'
    | 'FEASIBILITY'
    | 'MATERIAL_COMPATIBILITY'
    | 'DISASSEMBLY'
    | 'REPAIRABILITY'
    | 'SYSTEM_LIMITS'
    | 'REQUIRED_TESTS'
    | 'FIRE_PROTECTION'
    | 'STRUCTURAL'
    | 'ENERGETIC'
    | 'LIABILITY_EVIDENCE'
    | 'SITE_ENVIRONMENT';
  title: string;
  status: TechnicalStatus;
  rationale: string;
  requiredEvidence?: string;
  verifiedByExpert?: string;
  verifiedAt?: string;
}

export interface InspectionTask {
  id: string;
  projectId: string;
  componentId?: string;
  title: string;
  description: string;
  assignedRole: UserRole;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE';
  dueDate?: string;
}

export interface CalculationTrace {
  id: string;
  label: string;
  formula: string;
  inputs: Array<{ name: string; value: number | string | null; unit?: string; status: DataQualityStatus }>;
  result: number | null;
  unit: string;
  status: DataQualityStatus;
  warnings: string[];
}

export interface Component {
  id: string;
  projectId: string;
  buildingId: string;
  zoneId?: string;
  zoneName: string;
  floor: string;
  componentGroup: string;
  category: ComponentCategory;
  name: string;
  manufacturer: string;
  productDesignation: string;
  installationYear: number | null;
  dimensions: {
    lengthM: number;
    heightM: number;
    openingAreaM2: number;
    quantityCount: number;
    unitLabel: string;
    geometryNote?: string;
    manualOverrideGrossAreaM2?: number;
  };
  layers: MaterialLayer[];
  conditionRating: 'GOOD' | 'FAIR' | 'WORN' | 'DAMAGED' | 'UNKNOWN';
  conditionNote: string;
  connectionType: string;
  disassemblyRating: 'NON_DESTRUCTIVE' | 'PARTIAL_LOSS' | 'DESTRUCTIVE' | 'UNKNOWN';
  remainingServiceLifeYears: number | null;
  technicalProofs: string[];
  openInspectionRequirements: string[];
  photos: ComponentPhoto[];
  documentIds: string[];
  observations: Record<string, DataObservation>;
  hypotheses: MaterialHypothesis[];
  version: number;
  updatedAt: string;
}

export type RenovationStrategyCode =
  | 'R1_KEEP'
  | 'R2_REPAIR_REUSE'
  | 'R3_REFURBISH'
  | 'R4_REMANUFACTURE'
  | 'R5_RECYCLE'
  | 'CONVENTIONAL_REPLACEMENT';

export interface RenovationStrategy {
  code: RenovationStrategyCode;
  isCircularStrategy: boolean; // false for CONVENTIONAL_REPLACEMENT
  title: string;
  shortLabel: string;
  description: string;
}

export type CostCategory =
  | 'SURVEY'
  | 'MATERIAL'
  | 'LABOR'
  | 'DISASSEMBLY'
  | 'TRANSPORT'
  | 'STORAGE'
  | 'CLEANING'
  | 'TESTING'
  | 'REPAIR'
  | 'REFURBISHMENT'
  | 'INSTALLATION'
  | 'DISPOSAL'
  | 'MAINTENANCE'
  | 'OTHER';

export interface CostItem {
  id: string;
  category: CostCategory;
  label: string;
  quantity: number | null;
  unit: string;
  unitPriceNetEur: number | null; // null = UNKNOWN (never 0 unless verified free!)
  status: DataQualityStatus;
  uncertaintyPct?: number; // for sensitivity analysis
  sourceNote?: string;
}

export interface EnvironmentalFactor {
  id: string;
  name: string;
  kgCo2ePerKg: number | null;
  systemBoundary: string;
  sourceName: string;
  status: DataQualityStatus;
}

export interface EnvironmentalImpact {
  preservedMaterialKg: number | null;
  avoidedPrimaryMaterialKg: number | null;
  expectedWasteKg: number | null;
  reusePotentialKg: number | null;
  recyclingMassKg: number | null;
  ghgEmissionsKgCo2e: number | null;
  systemBoundary: string | null;
  functionalEquivalenceNote: string;
  serviceLifeYears: number | null;
  status: DataQualityStatus;
  missingIndicators: string[];
}

export interface Scenario {
  id: string;
  projectId: string;
  componentId: string;
  strategyCode: RenovationStrategyCode;
  isCircular: boolean;
  name: string;
  intendedScope: string;
  vatRatePct: number;
  discountRatePct: number;
  analysisHorizonYears: number;
  annualMaintenanceEur: number | null;
  documentedResidualValueEur: number | null;
  costItems: CostItem[];
  technicalConstraints: TechnicalConstraint[];
  overallTechnicalStatus: TechnicalStatus;
  technicalSummaryRationale: string;
  environmentalImpact: EnvironmentalImpact;
  availableDataSummary: string[];
  missingDataSummary: string[];
  risks: string[];
  requiredTests: string[];
  createdAt: string;
  updatedAt: string;
  isDemoAssumption?: boolean;
}

export interface McdaWeights {
  technicalSuitability: number;
  economicViability: number;
  environmentalImpact: number;
  resourcePotential: number;
  timeEffort: number;
  dataQuality: number;
}

export interface Approval {
  id: string;
  role: UserRole;
  approverName: string;
  decisionStatus: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  timestamp: string;
  comment: string;
}

export interface DecisionSnapshot {
  id: string;
  version: number;
  parentSnapshotId?: string;
  projectId: string;
  componentId: string;
  decisionDate: string;
  consideredScenarios: Array<{
    scenarioId: string;
    strategyCode: RenovationStrategyCode;
    name: string;
    technicalStatus: TechnicalStatus;
    totalNetCostEur: number | null;
    costCompletenessPct: number;
    preservedMassKg: number | null;
    ghgKgCo2e: number | null;
  }>;
  dataBasisSummary: string;
  costAssumptions: string[];
  environmentalAssumptions: string[];
  technicalExclusions: string[];
  expertChecks: string[];
  openRisks: string[];
  weights: McdaWeights;
  aiRecommendationSummary: string;
  humanDecisionStrategy: RenovationStrategyCode;
  humanDecisionRationale: string;
  responsibleRole: UserRole;
  responsiblePerson: string;
  approval: Approval;
  subsequentChanges: Array<{
    timestamp: string;
    author: string;
    changeNote: string;
  }>;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  projectId: string;
  entityType: 'PROJECT' | 'BUILDING' | 'COMPONENT' | 'SCENARIO' | 'DECISION' | 'DOCUMENT' | 'TRUST';
  entityId: string;
  action: string;
  actor: string;
  role: UserRole;
  details: string;
}

export interface ReportArtifact {
  id: string;
  projectId: string;
  componentId: string;
  createdAt: string;
  createdBy: string;
  format: 'PDF' | 'CSV' | 'JSON';
  title: string;
}

export type ProjectStatus = 'PREPARATION' | 'INVENTORY' | 'EVALUATION' | 'DECIDED' | 'ARCHIVED';

export interface Project {
  id: string;
  name: string;
  description: string;
  isDemo: boolean;
  demoLabel?: string;
  status: ProjectStatus;
  organizationId: string;
  ownerName: string;
  buildings: Building[];
  components: Component[];
  documents: DocumentRecord[];
  scenarios: Scenario[];
  inspectionTasks: InspectionTask[];
  decisions: DecisionSnapshot[];
  mcdaWeights: McdaWeights;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceState {
  projects: Project[];
  materials: Material[];
  dataSources: DataSource[];
  auditEvents: AuditEvent[];
  reports: ReportArtifact[];
  activeProjectId: string;
  activeBuildingId: string;
  activeComponentId: string;
  currentUser: User;
  persistenceMode: 'LOCAL_SERVER_AND_BROWSER';
}
