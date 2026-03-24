export type ProcessStep = {
  id: string;
  title: string;
  actor: string;
  system: string;
  type: 'manual' | 'system' | 'decision';
  detail: string;
};

export type AutomationOpportunity = {
  title: string;
  score: number;
  rationale: string;
  implementation: string;
};

export type DraftWorkflow = {
  platform: string;
  platformReason: string;
  steps: string[];
};

export type RoiEstimate = {
  annualRuns: number;
  currentMinutesPerRun: number;
  automatedMinutesPerRun: number;
  hoursSavedPerYear: number;
  hourlyRate: number;
  annualSavings: number;
  implementationCost: number;
  paybackMonths: number;
  roiPercentYearOne: number;
  assumptions: string[];
};

export type AnalyzeResponse = {
  summary: string;
  steps: ProcessStep[];
  flow: string[];
  automationOpportunities: AutomationOpportunity[];
  draftWorkflow: DraftWorkflow;
  roiEstimate: RoiEstimate;
};
