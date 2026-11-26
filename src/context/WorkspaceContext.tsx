import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createDemoSeed } from '../data/demoSeed';
import type {
  AuditEvent,
  Building,
  Component,
  DecisionSnapshot,
  DocumentRecord,
  InspectionTask,
  LanguageCode,
  McdaWeights,
  Project,
  ReportArtifact,
  Scenario,
  UserRole,
  WorkspaceState,
} from '../types/resourceloop';

export type NavSection =
  | 'dashboard'
  | 'projects'
  | 'building_intelligence'
  | 'smart_scanner'
  | 'product_twin'
  | 'material_intelligence'
  | 'decision_compass'
  | 'scenario_comparison'
  | 'decision_memory'
  | 'data_trust'
  | 'reports'
  | 'settings';

const LOCAL_STORAGE_KEY = 'resourceloop_workspace_v1';

interface WorkspaceContextValue {
  state: WorkspaceState;
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  activeNav: NavSection;
  setActiveNav: (nav: NavSection) => void;
  copilotOpen: boolean;
  setCopilotOpen: (open: boolean) => void;
  activeProject: Project | undefined;
  activeBuilding: Building | undefined;
  activeComponent: Component | undefined;
  selectContext: (projectId: string, buildingId?: string, componentId?: string) => void;
  createProject: (input: { name: string; description: string; isDemo?: boolean; street?: string; city?: string; postalCode?: string; constructionYear?: number | null }) => void;
  updateProject: (projectId: string, patch: Partial<Project>, auditDetails?: string) => void;
  archiveProject: (projectId: string) => void;
  updateBuilding: (projectId: string, buildingId: string, patch: Partial<Building>, auditDetails?: string) => void;
  addComponent: (projectId: string, component: Component) => void;
  updateComponent: (projectId: string, componentId: string, patch: Partial<Component>, auditDetails?: string) => void;
  addDocument: (projectId: string, doc: DocumentRecord) => void;
  upsertScenario: (projectId: string, scenario: Scenario, auditDetails?: string) => void;
  duplicateScenario: (projectId: string, scenarioId: string) => void;
  updateMcdaWeights: (projectId: string, weights: McdaWeights) => void;
  addInspectionTask: (projectId: string, task: InspectionTask) => void;
  updateInspectionTask: (projectId: string, taskId: string, patch: Partial<InspectionTask>) => void;
  addDecisionSnapshot: (projectId: string, snapshot: DecisionSnapshot) => void;
  updateDecisionApproval: (projectId: string, snapshotId: string, status: DecisionSnapshot['approval']['decisionStatus'], comment: string) => void;
  addReportArtifact: (report: ReportArtifact) => void;
  setUserRole: (role: UserRole) => void;
  resetDemoWorkspace: () => void;
  logAudit: (event: Omit<AuditEvent, 'id' | 'timestamp'>) => void;
  syncStatus: 'SAVED_LOCAL' | 'SAVING' | 'ERROR';
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<WorkspaceState>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as WorkspaceState;
        if (parsed && Array.isArray(parsed.projects) && parsed.projects.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback to demo seed
    }
    return createDemoSeed();
  });

  const [language, setLanguage] = useState<LanguageCode>('de');
  const [activeNav, setActiveNav] = useState<NavSection>('dashboard');
  const [copilotOpen, setCopilotOpen] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'SAVED_LOCAL' | 'SAVING' | 'ERROR'>('SAVED_LOCAL');
  const [hydratedFromServer, setHydratedFromServer] = useState(false);

  // Hydrate from server local store on mount if available
  useEffect(() => {
    let mounted = true;
    fetch('/api/workspace')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!mounted) return;
        if (data?.exists && data.state && Array.isArray(data.state.projects) && data.state.projects.length > 0) {
          setState(data.state);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data.state));
        }
        setHydratedFromServer(true);
      })
      .catch(() => {
        if (mounted) setHydratedFromServer(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Persist changes locally (browser + local backend JSON file)
  useEffect(() => {
    if (!hydratedFromServer) return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors
    }
    setSyncStatus('SAVING');
    const timer = setTimeout(() => {
      fetch('/api/workspace', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      })
        .then((res) => setSyncStatus(res.ok ? 'SAVED_LOCAL' : 'ERROR'))
        .catch(() => setSyncStatus('ERROR'));
    }, 350);

    return () => clearTimeout(timer);
  }, [state, hydratedFromServer]);

  const activeProject = useMemo(
    () => state.projects.find((p) => p.id === state.activeProjectId) ?? state.projects[0],
    [state.projects, state.activeProjectId]
  );

  const activeBuilding = useMemo(
    () =>
      activeProject?.buildings.find((b) => b.id === state.activeBuildingId) ??
      activeProject?.buildings[0],
    [activeProject, state.activeBuildingId]
  );

  const activeComponent = useMemo(
    () =>
      activeProject?.components.find((c) => c.id === state.activeComponentId) ??
      activeProject?.components[0],
    [activeProject, state.activeComponentId]
  );

  const createAudit = useCallback(
    (prev: WorkspaceState, ev: Omit<AuditEvent, 'id' | 'timestamp'>): AuditEvent[] => {
      const entry: AuditEvent = {
        ...ev,
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
      };
      return [entry, ...prev.auditEvents].slice(0, 250);
    },
    []
  );

  const logAudit = useCallback(
    (event: Omit<AuditEvent, 'id' | 'timestamp'>) => {
      setState((prev) => ({
        ...prev,
        auditEvents: createAudit(prev, event),
      }));
    },
    [createAudit]
  );

  const selectContext = useCallback((projectId: string, buildingId?: string, componentId?: string) => {
    setState((prev) => {
      const proj = prev.projects.find((p) => p.id === projectId);
      const nextBldgId = buildingId ?? proj?.buildings[0]?.id ?? '';
      const nextCompId = componentId ?? proj?.components[0]?.id ?? '';
      return {
        ...prev,
        activeProjectId: projectId,
        activeBuildingId: nextBldgId,
        activeComponentId: nextCompId,
      };
    });
  }, []);

  const createProject = useCallback(
    (input: {
      name: string;
      description: string;
      isDemo?: boolean;
      street?: string;
      city?: string;
      postalCode?: string;
      constructionYear?: number | null;
    }) => {
      const now = new Date().toISOString();
      const projId = `proj-${Date.now()}`;
      const bldgId = `bldg-${Date.now()}`;
      const newProject: Project = {
        id: projId,
        name: input.name.trim(),
        description: input.description.trim(),
        isDemo: Boolean(input.isDemo),
        status: 'PREPARATION',
        organizationId: state.currentUser.organizationId,
        ownerName: state.currentUser.name,
        createdAt: now,
        updatedAt: now,
        mcdaWeights: {
          technicalSuitability: 30,
          economicViability: 25,
          environmentalImpact: 20,
          resourcePotential: 15,
          timeEffort: 5,
          dataQuality: 5,
        },
        buildings: [
          {
            id: bldgId,
            projectId: projId,
            name: `${input.city || 'Neues'} Bestandsgebäude`,
            location: {
              street: input.street ?? '',
              houseNumber: '',
              postalCode: input.postalCode ?? '',
              city: input.city ?? '',
              stateRegion: 'Nordrhein-Westfalen',
              country: 'Deutschland',
              latitude: null,
              longitude: null,
              geocodingStatus: 'UNAVAILABLE',
            },
            geometry: {
              footprintAreaM2: null,
              buildingHeightM: null,
              floorsCount: null,
              roofShape: null,
              grossFloorAreaM2: null,
              status: 'UNKNOWN',
            },
            profile: {
              id: `prof-${Date.now()}`,
              buildingId: bldgId,
              constructionYear: input.constructionYear ?? null,
              constructionYearUnknown: input.constructionYear == null,
              buildingAgeClass: input.constructionYear ? `Baujahr ${input.constructionYear}` : 'Unbekannt',
              buildingType: 'Bestandsgebäude',
              buildingUsage: 'Unbekannt',
              knownConstructionType: {
                id: `obs-${Date.now()}`,
                fieldPath: 'profile.knownConstructionType',
                value: null,
                status: 'UNKNOWN',
                history: [],
              },
              typicalAgeMaterials: [],
              potentialEnergyWeaknesses: [],
              potentialPollutantHints: [],
              renovationDataGaps: ['Gebäudeanalyse in Building Intelligence noch nicht durchgeführt'],
            },
            zones: [],
            climateRisks: [],
            environmentalRisks: [],
          },
        ],
        components: [],
        documents: [],
        scenarios: [],
        inspectionTasks: [],
        decisions: [],
      };

      setState((prev) => ({
        ...prev,
        projects: [newProject, ...prev.projects],
        activeProjectId: projId,
        activeBuildingId: bldgId,
        activeComponentId: '',
        auditEvents: createAudit(prev, {
          projectId: projId,
          entityType: 'PROJECT',
          entityId: projId,
          action: 'PROJECT_CREATED',
          actor: prev.currentUser.name,
          role: prev.currentUser.role,
          details: `Projekt „${newProject.name}“ angelegt.`,
        }),
      }));
    },
    [createAudit, state.currentUser]
  );

  const updateProject = useCallback(
    (projectId: string, patch: Partial<Project>, auditDetails?: string) => {
      const now = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) =>
          p.id === projectId ? { ...p, ...patch, updatedAt: now } : p
        ),
        auditEvents: auditDetails
          ? createAudit(prev, {
              projectId,
              entityType: 'PROJECT',
              entityId: projectId,
              action: 'PROJECT_UPDATED',
              actor: prev.currentUser.name,
              role: prev.currentUser.role,
              details: auditDetails,
            })
          : prev.auditEvents,
      }));
    },
    [createAudit]
  );

  const archiveProject = useCallback(
    (projectId: string) => {
      updateProject(projectId, { status: 'ARCHIVED' }, 'Projekt archiviert.');
    },
    [updateProject]
  );

  const updateBuilding = useCallback(
    (projectId: string, buildingId: string, patch: Partial<Building>, auditDetails?: string) => {
      const now = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) =>
          p.id === projectId
            ? {
                ...p,
                updatedAt: now,
                buildings: p.buildings.map((b) => (b.id === buildingId ? { ...b, ...patch } : b)),
              }
            : p
        ),
        auditEvents: auditDetails
          ? createAudit(prev, {
              projectId,
              entityType: 'BUILDING',
              entityId: buildingId,
              action: 'BUILDING_UPDATED',
              actor: prev.currentUser.name,
              role: prev.currentUser.role,
              details: auditDetails,
            })
          : prev.auditEvents,
      }));
    },
    [createAudit]
  );

  const addComponent = useCallback(
    (projectId: string, component: Component) => {
      const now = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) =>
          p.id === projectId
            ? {
                ...p,
                updatedAt: now,
                components: [component, ...p.components],
              }
            : p
        ),
        activeProjectId: projectId,
        activeBuildingId: component.buildingId,
        activeComponentId: component.id,
        auditEvents: createAudit(prev, {
          projectId,
          entityType: 'COMPONENT',
          entityId: component.id,
          action: 'COMPONENT_CREATED',
          actor: prev.currentUser.name,
          role: prev.currentUser.role,
          details: `Bauteil „${component.name}“ im Product Twin angelegt.`,
        }),
      }));
    },
    [createAudit]
  );

  const updateComponent = useCallback(
    (projectId: string, componentId: string, patch: Partial<Component>, auditDetails?: string) => {
      const now = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) =>
          p.id === projectId
            ? {
                ...p,
                updatedAt: now,
                components: p.components.map((c) =>
                  c.id === componentId
                    ? { ...c, ...patch, version: c.version + 1, updatedAt: now }
                    : c
                ),
              }
            : p
        ),
        auditEvents: auditDetails
          ? createAudit(prev, {
              projectId,
              entityType: 'COMPONENT',
              entityId: componentId,
              action: 'COMPONENT_UPDATED',
              actor: prev.currentUser.name,
              role: prev.currentUser.role,
              details: auditDetails,
            })
          : prev.auditEvents,
      }));
    },
    [createAudit]
  );

  const addDocument = useCallback(
    (projectId: string, doc: DocumentRecord) => {
      const now = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) =>
          p.id === projectId
            ? { ...p, updatedAt: now, documents: [doc, ...p.documents] }
            : p
        ),
        auditEvents: createAudit(prev, {
          projectId,
          entityType: 'DOCUMENT',
          entityId: doc.id,
          action: 'DOCUMENT_ADDED',
          actor: prev.currentUser.name,
          role: prev.currentUser.role,
          details: `Dokument „${doc.fileName}“ erfasst (${doc.status}).`,
        }),
      }));
    },
    [createAudit]
  );

  const upsertScenario = useCallback(
    (projectId: string, scenario: Scenario, auditDetails?: string) => {
      const now = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== projectId) return p;
          const exists = p.scenarios.some((s) => s.id === scenario.id);
          return {
            ...p,
            updatedAt: now,
            scenarios: exists
              ? p.scenarios.map((s) => (s.id === scenario.id ? { ...scenario, updatedAt: now } : s))
              : [...p.scenarios, { ...scenario, updatedAt: now }],
          };
        }),
        auditEvents: auditDetails
          ? createAudit(prev, {
              projectId,
              entityType: 'SCENARIO',
              entityId: scenario.id,
              action: 'SCENARIO_UPDATED',
              actor: prev.currentUser.name,
              role: prev.currentUser.role,
              details: auditDetails,
            })
          : prev.auditEvents,
      }));
    },
    [createAudit]
  );

  const duplicateScenario = useCallback(
    (projectId: string, scenarioId: string) => {
      const now = new Date().toISOString();
      setState((prev) => {
        const proj = prev.projects.find((p) => p.id === projectId);
        const orig = proj?.scenarios.find((s) => s.id === scenarioId);
        if (!orig) return prev;
        const copy: Scenario = {
          ...JSON.parse(JSON.stringify(orig)),
          id: `scen-${Date.now()}`,
          name: `${orig.name} (Kopie)`,
          createdAt: now,
          updatedAt: now,
        };
        return {
          ...prev,
          projects: prev.projects.map((p) =>
            p.id === projectId ? { ...p, updatedAt: now, scenarios: [...p.scenarios, copy] } : p
          ),
          auditEvents: createAudit(prev, {
            projectId,
            entityType: 'SCENARIO',
            entityId: copy.id,
            action: 'SCENARIO_DUPLICATED',
            actor: prev.currentUser.name,
            role: prev.currentUser.role,
            details: `Szenario „${orig.name}“ dupliziert.`,
          }),
        };
      });
    },
    [createAudit]
  );

  const updateMcdaWeights = useCallback((projectId: string, weights: McdaWeights) => {
    setState((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => (p.id === projectId ? { ...p, mcdaWeights: weights } : p)),
    }));
  }, []);

  const addInspectionTask = useCallback(
    (projectId: string, task: InspectionTask) => {
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) =>
          p.id === projectId ? { ...p, inspectionTasks: [task, ...p.inspectionTasks] } : p
        ),
        auditEvents: createAudit(prev, {
          projectId,
          entityType: 'PROJECT',
          entityId: task.id,
          action: 'TASK_CREATED',
          actor: prev.currentUser.name,
          role: prev.currentUser.role,
          details: `Prüfaufgabe „${task.title}“ erstellt.`,
        }),
      }));
    },
    [createAudit]
  );

  const updateInspectionTask = useCallback(
    (projectId: string, taskId: string, patch: Partial<InspectionTask>) => {
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) =>
          p.id === projectId
            ? {
                ...p,
                inspectionTasks: p.inspectionTasks.map((t) =>
                  t.id === taskId ? { ...t, ...patch } : t
                ),
              }
            : p
        ),
      }));
    },
    []
  );

  const addDecisionSnapshot = useCallback(
    (projectId: string, snapshot: DecisionSnapshot) => {
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) =>
          p.id === projectId
            ? {
                ...p,
                status: snapshot.approval.decisionStatus === 'APPROVED' ? 'DECIDED' : p.status,
                decisions: [snapshot, ...p.decisions],
              }
            : p
        ),
        auditEvents: createAudit(prev, {
          projectId,
          entityType: 'DECISION',
          entityId: snapshot.id,
          action: 'DECISION_SNAPSHOT_SAVED',
          actor: prev.currentUser.name,
          role: prev.currentUser.role,
          details: `Entscheidungs-Snapshot v${snapshot.version} (${snapshot.humanDecisionStrategy}) gespeichert.`,
        }),
      }));
    },
    [createAudit]
  );

  const updateDecisionApproval = useCallback(
    (
      projectId: string,
      snapshotId: string,
      status: DecisionSnapshot['approval']['decisionStatus'],
      comment: string
    ) => {
      const now = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) =>
          p.id === projectId
            ? {
                ...p,
                status: status === 'APPROVED' ? 'DECIDED' : p.status,
                decisions: p.decisions.map((d) =>
                  d.id === snapshotId
                    ? {
                        ...d,
                        approval: {
                          ...d.approval,
                          decisionStatus: status,
                          approverName: prev.currentUser.name,
                          role: prev.currentUser.role,
                          timestamp: now,
                          comment,
                        },
                        subsequentChanges: [
                          ...d.subsequentChanges,
                          {
                            timestamp: now,
                            author: prev.currentUser.name,
                            changeNote: `Freigabestatus auf ${status} gesetzt: ${comment}`,
                          },
                        ],
                      }
                    : d
                ),
              }
            : p
        ),
        auditEvents: createAudit(prev, {
          projectId,
          entityType: 'DECISION',
          entityId: snapshotId,
          action: `DECISION_${status}`,
          actor: prev.currentUser.name,
          role: prev.currentUser.role,
          details: `Freigabe auf ${status} aktualisiert (${comment}).`,
        }),
      }));
    },
    [createAudit]
  );

  const addReportArtifact = useCallback((report: ReportArtifact) => {
    setState((prev) => ({
      ...prev,
      reports: [report, ...prev.reports],
    }));
  }, []);

  const setUserRole = useCallback((role: UserRole) => {
    setState((prev) => ({
      ...prev,
      currentUser: { ...prev.currentUser, role },
    }));
  }, []);

  const resetDemoWorkspace = useCallback(() => {
    const fresh = createDemoSeed();
    setState(fresh);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(fresh));
  }, []);

  const value: WorkspaceContextValue = {
    state,
    language,
    setLanguage,
    activeNav,
    setActiveNav,
    copilotOpen,
    setCopilotOpen,
    activeProject,
    activeBuilding,
    activeComponent,
    selectContext,
    createProject,
    updateProject,
    archiveProject,
    updateBuilding,
    addComponent,
    updateComponent,
    addDocument,
    upsertScenario,
    duplicateScenario,
    updateMcdaWeights,
    addInspectionTask,
    updateInspectionTask,
    addDecisionSnapshot,
    updateDecisionApproval,
    addReportArtifact,
    setUserRole,
    resetDemoWorkspace,
    logAudit,
    syncStatus,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used inside WorkspaceProvider');
  return ctx;
}
