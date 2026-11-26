import React from 'react';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
import { AppShell } from './components/layout/AppShell';
import { AiCopilotDrawer } from './components/copilot/AiCopilotDrawer';
import { DashboardView } from './modules/DashboardView';
import { ProjectsView } from './modules/ProjectsView';
import { BuildingIntelligenceView } from './modules/BuildingIntelligenceView';
import { SmartScannerView } from './modules/SmartScannerView';
import { ProductTwinView } from './modules/ProductTwinView';
import { MaterialIntelligenceView } from './modules/MaterialIntelligenceView';
import { DecisionCompassView } from './modules/DecisionCompassView';
import { ScenarioComparisonView } from './modules/ScenarioComparisonView';
import { DecisionMemoryView } from './modules/DecisionMemoryView';
import { DataTrustCenterView } from './modules/DataTrustCenterView';
import { ReportsView } from './modules/ReportsView';
import { SettingsView } from './modules/SettingsView';

const ActiveModuleRouter: React.FC = () => {
  const { activeNav } = useWorkspace();

  switch (activeNav) {
    case 'dashboard':
      return <DashboardView />;
    case 'projects':
      return <ProjectsView />;
    case 'building_intelligence':
      return <BuildingIntelligenceView />;
    case 'smart_scanner':
      return <SmartScannerView />;
    case 'product_twin':
      return <ProductTwinView />;
    case 'material_intelligence':
      return <MaterialIntelligenceView />;
    case 'decision_compass':
      return <DecisionCompassView />;
    case 'scenario_comparison':
      return <ScenarioComparisonView />;
    case 'decision_memory':
      return <DecisionMemoryView />;
    case 'data_trust':
      return <DataTrustCenterView />;
    case 'reports':
      return <ReportsView />;
    case 'settings':
      return <SettingsView />;
    default:
      return <DashboardView />;
  }
};

export default function App() {
  return (
    <WorkspaceProvider>
      <AppShell>
        <ActiveModuleRouter />
      </AppShell>
      <AiCopilotDrawer />
    </WorkspaceProvider>
  );
}
