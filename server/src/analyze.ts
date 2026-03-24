import type {
  AnalyzeProcessResult,
  AutomationOpportunity,
  ProcessStep,
  RoiEstimate
} from './types.js';

const systemHints: Record<string, string> = {
  csv: 'CSV File',
  excel: 'Spreadsheet',
  crm: 'CRM',
  salesforce: 'Salesforce',
  sap: 'SAP',
  email: 'Email',
  portal: 'Web Portal',
  finance: 'Finance Portal',
  upload: 'Target System',
  download: 'Source System'
};

const manualSignals = [
  'download',
  'clean',
  'copy',
  'paste',
  'review',
  'check',
  'remove',
  'update',
  'email'
];

const systemSignals = ['export', 'import', 'sync', 'validate', 'calculate', 'create'];

export function analyzeProcess(input: string): AnalyzeProcessResult {
  const normalized = input.trim().replace(/\s+/g, ' ');
  const rawSteps = extractClauses(normalized);
  const steps = rawSteps.map((clause, index) => buildStep(clause, index));
  const flow = [
    'Start Event',
    ...steps.map((step, index) => `${index + 1}. ${step.title}`),
    'End Event'
  ];
  const automationOpportunities = buildAutomationOpportunities(steps);
  const platform = selectPlatform(steps);
  const roiEstimate = estimateRoi(steps, platform);
  const draftWorkflow = {
    platform,
    platformReason: explainPlatformSelection(platform, steps),
    steps: [
      'Trigger when a new process run starts or a source file arrives.',
      ...steps.map((step) => toWorkflowStep(step)),
      'Write a completion log and notify the process owner.'
    ]
  };

  return {
    summary: summarizeProcess(steps),
    steps,
    flow,
    automationOpportunities,
    draftWorkflow,
    roiEstimate
  };
}

function extractClauses(input: string): string[] {
  return input
    .split(/(?:,| then | and then | after that | afterwards | finally )/i)
    .map((part) => sanitizeClause(part))
    .filter(Boolean);
}

function buildStep(clause: string, index: number): ProcessStep {
  const lower = clause.toLowerCase();
  const actor = lower.includes('user') || lower.includes('analyst') ? 'Business User' : 'Operator';
  const system = inferSystem(lower);
  const type = inferType(lower);
  const title = titleCase(stripLeadingActor(clause).replace(/[.]+$/g, ''));

  return {
    id: `step-${index + 1}`,
    title,
    actor,
    system,
    type,
    detail: clause.endsWith('.') ? clause : `${clause}.`
  };
}

function inferSystem(clause: string): string {
  const matchedHint = Object.entries(systemHints).find(([hint]) => clause.includes(hint));
  return matchedHint ? matchedHint[1] : 'Business Application';
}

function inferType(clause: string): ProcessStep['type'] {
  if (clause.includes('if ') || clause.includes('approve') || clause.includes('reject')) {
    return 'decision';
  }

  if (systemSignals.some((signal) => clause.includes(signal))) {
    return 'system';
  }

  if (manualSignals.some((signal) => clause.includes(signal))) {
    return 'manual';
  }

  return 'manual';
}

function buildAutomationOpportunities(steps: ProcessStep[]): AutomationOpportunity[] {
  const manualSteps = steps.filter((step) => step.type === 'manual');
  const fileHandling = steps.filter((step) =>
    /csv|excel|download|upload|file/i.test(`${step.title} ${step.detail}`)
  );
  const notification = steps.filter((step) => /email|notify/i.test(step.detail));

  const candidates: AutomationOpportunity[] = [];

  if (fileHandling.length > 0) {
    candidates.push({
      title: 'File handling automation',
      score: 9,
      rationale:
        'The process includes repeated file download, cleanup, and upload actions that are deterministic and suitable for bot execution.',
      implementation:
        'Use an RPA bot or scheduled integration flow to fetch the source file, transform it, and push it to the destination system.'
    });
  }

  if (manualSteps.length > 1) {
    candidates.push({
      title: 'Reduce manual touchpoints',
      score: 8,
      rationale:
        'Multiple human-driven steps suggest opportunities to standardize execution and reduce variation across runs.',
      implementation:
        'Model the steps as a reusable workflow with validation, retry handling, and status tracking.'
    });
  }

  if (notification.length > 0) {
    candidates.push({
      title: 'Automate completion notifications',
      score: 7,
      rationale:
        'Status emails are low-value manual actions that are straightforward to generate from workflow events.',
      implementation:
        'Send templated notifications after successful upload or when exceptions require human review.'
    });
  }

  if (candidates.length === 0) {
    candidates.push({
      title: 'Introduce process monitoring',
      score: 6,
      rationale:
        'The described flow is compact, but observability and structured execution would still improve consistency.',
      implementation:
        'Wrap the process in a workflow that logs each step and flags exceptions.'
    });
  }

  return candidates;
}

function selectPlatform(steps: ProcessStep[]): string {
  const hasUi = steps.some((step) => step.type === 'manual');
  return hasUi ? 'UiPath-style RPA workflow' : 'API-led integration workflow';
}

function explainPlatformSelection(platform: string, steps: ProcessStep[]): string {
  const manualSteps = steps.filter((step) => step.type === 'manual').length;
  const decisionSteps = steps.filter((step) => step.type === 'decision').length;
  const systems = [...new Set(steps.map((step) => step.system))];

  if (platform === 'UiPath-style RPA workflow') {
    return `UiPath-style RPA is recommended because the process includes ${manualSteps} manual step${manualSteps === 1 ? '' : 's'} across ${systems.join(', ')}. That pattern usually benefits from UI automation, file handling, and attended or unattended bot execution rather than a pure API integration.`;
  }

  return `An API-led integration workflow is recommended because the process appears system-driven with limited manual intervention${decisionSteps > 0 ? ` and ${decisionSteps} decision point${decisionSteps === 1 ? '' : 's'}` : ''}. That makes orchestration through connectors, validations, and service-to-service calls a better fit than desktop RPA.`;
}

function toWorkflowStep(step: ProcessStep): string {
  switch (step.type) {
    case 'system':
      return `Invoke system action for "${step.title}" in ${step.system}.`;
    case 'decision':
      return `Evaluate decision rule for "${step.title}" and branch accordingly.`;
    default:
      return `Automate or assist the manual activity "${step.title}" using ${step.system}.`;
  }
}

function estimateRoi(steps: ProcessStep[], platform: string): RoiEstimate {
  const manualSteps = steps.filter((step) => step.type === 'manual').length;
  const decisionSteps = steps.filter((step) => step.type === 'decision').length;
  const systemSteps = steps.filter((step) => step.type === 'system').length;
  const fileHeavyProcess = steps.some((step) =>
    /csv|excel|file|download|upload/i.test(`${step.title} ${step.detail}`)
  );

  const annualRuns = fileHeavyProcess ? 520 : 260;
  const currentMinutesPerRun = manualSteps * 9 + decisionSteps * 4 + systemSteps * 2 || 12;
  const automationReductionFactor = platform === 'UiPath-style RPA workflow' ? 0.72 : 0.6;
  const automatedMinutesPerRun = Math.max(
    3,
    Math.round(currentMinutesPerRun * (1 - automationReductionFactor))
  );
  const hoursSavedPerYear =
    Math.round((((currentMinutesPerRun - automatedMinutesPerRun) * annualRuns) / 60) * 10) / 10;
  const hourlyRate = 55;
  const annualSavings = Math.round(hoursSavedPerYear * hourlyRate);
  const implementationCost = platform === 'UiPath-style RPA workflow' ? 18000 : 14000;
  const paybackMonths =
    annualSavings > 0
      ? Math.round(((implementationCost / annualSavings) * 12) * 10) / 10
      : 0;
  const roiPercentYearOne =
    implementationCost > 0
      ? Math.round((((annualSavings - implementationCost) / implementationCost) * 100) * 10) / 10
      : 0;

  return {
    annualRuns,
    currentMinutesPerRun,
    automatedMinutesPerRun,
    hoursSavedPerYear,
    hourlyRate,
    annualSavings,
    implementationCost,
    paybackMonths,
    roiPercentYearOne,
    assumptions: [
      `Estimated run frequency: ${annualRuns} runs per year based on the described process pattern.`,
      `Current effort: ${currentMinutesPerRun} minutes per run with ${manualSteps} manual step${manualSteps === 1 ? '' : 's'}.`,
      `Post-automation effort: ${automatedMinutesPerRun} minutes per run after workflow execution, exception handling, and review.`,
      `Blended labor cost: $${hourlyRate}/hour.`,
      `Estimated implementation cost: $${implementationCost.toLocaleString()} for build, test, and deployment.`
    ]
  };
}

function summarizeProcess(steps: ProcessStep[]): string {
  const manualCount = steps.filter((step) => step.type === 'manual').length;
  const systems = [...new Set(steps.map((step) => step.system))];

  return `This process contains ${steps.length} primary steps, ${manualCount} of which appear manual, and touches ${systems.join(', ')}. It is a strong candidate for a guided automation flow with validation and notification handling.`;
}

function stripLeadingActor(input: string): string {
  return input.replace(/^(user|analyst|operator)\s+/i, '');
}

function sanitizeClause(input: string): string {
  return input
    .trim()
    .replace(/^(and|then|finally|after that|afterwards)\s+/i, '')
    .trim();
}

function titleCase(input: string): string {
  return input
    .toLowerCase()
    .replace(/(^|\s)\S/g, (char) => char.toUpperCase());
}
