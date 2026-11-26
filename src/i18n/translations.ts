import type { LanguageCode } from '../types/resourceloop';

export interface TranslationBundle {
  claim: string;
  nav: {
    dashboard: string;
    projects: string;
    buildingIntelligence: string;
    smartScanner: string;
    productTwin: string;
    materialIntelligence: string;
    decisionCompass: string;
    scenarioComparison: string;
    decisionMemory: string;
    dataTrustCenter: string;
    reports: string;
    settings: string;
  };
  topbar: {
    activeContext: string;
    noComponent: string;
    copilot: string;
    localMode: string;
  };
  dashboard: {
    title: string;
    subtitle: string;
    activeProjects: string;
    buildings: string;
    components: string;
    openDecisions: string;
    missingProofs: string;
    openGaps: string;
    documentedPotentials: string;
    completedDecisions: string;
    savingsDisclaimer: string;
    newProject: string;
  };
  common: {
    save: string;
    cancel: string;
    exportJson: string;
    exportCsv: string;
    exportPdf: string;
    demoTag: string;
    realTag: string;
    unknown: string;
    verified: string;
    humanDecides: string;
  };
}

export const TRANSLATIONS: Record<LanguageCode, TranslationBundle> = {
  de: {
    claim: 'Preserve Value. Reduce Waste. Make Better Decisions.',
    nav: {
      dashboard: 'Dashboard',
      projects: 'Projekte',
      buildingIntelligence: 'Building Intelligence',
      smartScanner: 'Smart Scanner',
      productTwin: 'Product Twin',
      materialIntelligence: 'Material Intelligence',
      decisionCompass: 'Circular Decision Compass',
      scenarioComparison: 'Szenarienvergleich',
      decisionMemory: 'Decision Memory',
      dataTrustCenter: 'Data Trust Center',
      reports: 'Reports',
      settings: 'Einstellungen',
    },
    topbar: {
      activeContext: 'Aktiver Kontext',
      noComponent: 'Kein Bauteil gewählt',
      copilot: 'AI Copilot',
      localMode: 'Lokale Persistenz (Demonstrator)',
    },
    dashboard: {
      title: 'Portfolio-Übersicht',
      subtitle: 'Zirkuläre Sanierungsentscheidungen transparent vorbereiten, prüfen und dokumentieren.',
      activeProjects: 'Aktive Sanierungsprojekte',
      buildings: 'Erfasste Gebäude',
      components: 'Erfasste Bauteile',
      openDecisions: 'Offene Entscheidungen',
      missingProofs: 'Fehlende Nachweise',
      openGaps: 'Offene Datenlücken',
      documentedPotentials: 'Dokumentierte Ressourcenpotenziale',
      completedDecisions: 'Abgeschlossene Entscheidungen',
      savingsDisclaimer: 'Einsparwerte werden ausschließlich bei nachvollziehbaren Berechnungen und dokumentierten Systemgrenzen ausgewiesen.',
      newProject: 'Neues Projekt anlegen',
    },
    common: {
      save: 'Speichern',
      cancel: 'Abbrechen',
      exportJson: 'JSON exportieren',
      exportCsv: 'CSV exportieren',
      exportPdf: 'PDF-Bericht exportieren',
      demoTag: 'DEMO',
      realTag: 'PROJEKT',
      unknown: 'UNKNOWN',
      verified: 'VERIFIED',
      humanDecides: 'Die KI unterstützt die Entscheidung. Der Mensch trifft die Entscheidung.',
    },
  },
  en: {
    claim: 'Preserve Value. Reduce Waste. Make Better Decisions.',
    nav: {
      dashboard: 'Dashboard',
      projects: 'Projects',
      buildingIntelligence: 'Building Intelligence',
      smartScanner: 'Smart Scanner',
      productTwin: 'Product Twin',
      materialIntelligence: 'Material Intelligence',
      decisionCompass: 'Circular Decision Compass',
      scenarioComparison: 'Scenario Comparison',
      decisionMemory: 'Decision Memory',
      dataTrustCenter: 'Data Trust Center',
      reports: 'Reports',
      settings: 'Settings',
    },
    topbar: {
      activeContext: 'Active Context',
      noComponent: 'No component selected',
      copilot: 'AI Copilot',
      localMode: 'Local Persistence (Demonstrator)',
    },
    dashboard: {
      title: 'Portfolio Overview',
      subtitle: 'Prepare, verify, and document circular building renovation decisions on a transparent data basis.',
      activeProjects: 'Active Renovation Projects',
      buildings: 'Registered Buildings',
      components: 'Registered Components',
      openDecisions: 'Open Decisions',
      missingProofs: 'Missing Technical Proofs',
      openGaps: 'Open Data Gaps',
      documentedPotentials: 'Documented Resource Potentials',
      completedDecisions: 'Completed Decisions',
      savingsDisclaimer: 'Savings metrics are displayed only when backed by transparent calculations and documented system boundaries.',
      newProject: 'Create New Project',
    },
    common: {
      save: 'Save',
      cancel: 'Cancel',
      exportJson: 'Export JSON',
      exportCsv: 'Export CSV',
      exportPdf: 'Export PDF Report',
      demoTag: 'DEMO',
      realTag: 'PROJECT',
      unknown: 'UNKNOWN',
      verified: 'VERIFIED',
      humanDecides: 'AI supports the decision. Humans make the decision.',
    },
  },
  pl: {
    claim: 'Preserve Value. Reduce Waste. Make Better Decisions.',
    nav: {
      dashboard: 'Panel główny',
      projects: 'Projekty',
      buildingIntelligence: 'Building Intelligence',
      smartScanner: 'Smart Scanner',
      productTwin: 'Product Twin',
      materialIntelligence: 'Material Intelligence',
      decisionCompass: 'Circular Decision Compass',
      scenarioComparison: 'Porównanie scenariuszy',
      decisionMemory: 'Decision Memory',
      dataTrustCenter: 'Data Trust Center',
      reports: 'Raporty',
      settings: 'Ustawienia',
    },
    topbar: {
      activeContext: 'Aktywny kontekst',
      noComponent: 'Brak wybranego elementu',
      copilot: 'AI Copilot',
      localMode: 'Lokalna persystencja (Demonstrator)',
    },
    dashboard: {
      title: 'Przegląd portfela projektów',
      subtitle: 'Przygotowuj, weryfikuj i dokumentuj decyzje dotyczące cyrkularnej renowacji budynków w oparciu o przejrzyste dane.',
      activeProjects: 'Aktywne projekty renowacyjne',
      buildings: 'Zarejestrowane budynki',
      components: 'Zarejestrowane elementy',
      openDecisions: 'Otwarte decyzje',
      missingProofs: 'Brakujące ekspertyzy',
      openGaps: 'Luki w danych',
      documentedPotentials: 'Udokumentowany potencjał zasobów',
      completedDecisions: 'Zatwierdzone decyzje',
      savingsDisclaimer: 'Oszczędności są prezentowane wyłącznie wtedy, gdy wynikają z przejrzystych obliczeń i udokumentowanych granic systemu.',
      newProject: 'Utwórz nowy projekt',
    },
    common: {
      save: 'Zapisz',
      cancel: 'Anuluj',
      exportJson: 'Eksportuj JSON',
      exportCsv: 'Eksportuj CSV',
      exportPdf: 'Eksportuj raport PDF',
      demoTag: 'DEMO',
      realTag: 'PROJEKT',
      unknown: 'UNKNOWN',
      verified: 'VERIFIED',
      humanDecides: 'AI wspiera decyzję. Decyzję podejmuje człowiek.',
    },
  },
};
