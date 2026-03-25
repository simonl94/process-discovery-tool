import { FormEvent, useState } from 'react';
import type { AnalyzeResponse, RoiEstimate } from './types';

const samplePrompt =
  'User downloads a CSV from the finance portal, removes duplicate rows, standardizes customer names, uploads the cleaned file to Salesforce CRM, and emails the sales team that the import is complete.';

const configuredApiBaseUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/g, '');
const isLocalDevelopmentHost =
  typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1'].includes(window.location.hostname);
const apiBaseUrl = configuredApiBaseUrl || (isLocalDevelopmentHost ? 'http://localhost:8787' : '');

type RoiInputs = {
  annualRuns: number;
  currentMinutesPerRun: number;
  automatedMinutesPerRun: number;
  hourlyRate: number;
  implementationCost: number;
};

export default function App() {
  const [input, setInput] = useState(samplePrompt);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [roiInputs, setRoiInputs] = useState<RoiInputs | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!apiBaseUrl) {
        throw new Error(
          'API is not configured for this deployment. Set VITE_API_URL to your deployed backend URL.'
        );
      }

      const response = await fetch(`${apiBaseUrl}/analyze-process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ input })
      });

      if (!response.ok) {
        throw new Error('Analysis request failed');
      }

      const data = (await response.json()) as AnalyzeResponse;
      setResult(data);
      setRoiInputs({
        annualRuns: data.roiEstimate.annualRuns,
        currentMinutesPerRun: data.roiEstimate.currentMinutesPerRun,
        automatedMinutesPerRun: data.roiEstimate.automatedMinutesPerRun,
        hourlyRate: data.roiEstimate.hourlyRate,
        implementationCost: data.roiEstimate.implementationCost
      });
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : 'Unexpected error'
      );
    } finally {
      setLoading(false);
    }
  };

  const roiEstimate = roiInputs ? calculateRoiEstimate(roiInputs) : null;

  return (
    <div className="app-shell">
      <main className="layout">
        <section className="hero">
          <form className="input-card" onSubmit={handleSubmit}>
            <label className="input-label" htmlFor="process-input">
              Raw process description
            </label>
            <textarea
              id="process-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={8}
              placeholder="Describe the process in plain English..."
            />

            <div className="actions">
              <button type="submit" disabled={loading || !input.trim()}>
                {loading ? 'Analyzing...' : 'Analyze Process'}
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => setInput(samplePrompt)}
              >
                Load Demo Example
              </button>
            </div>

            {error ? <p className="error">{error}</p> : null}
          </form>
        </section>

        <section className="panel-grid">
          <article className="panel">
            <div className="panel-header">
              <h2>Steps</h2>
              <p>Structured sequence</p>
            </div>
            {result ? (
              <ol className="steps-list">
                {result.steps.map((step) => (
                  <li key={step.id}>
                    <div className="step-head">
                      <strong>{step.title}</strong>
                      <span className={`badge badge-${step.type}`}>
                        {step.type}
                      </span>
                    </div>
                    <p>{step.detail}</p>
                    <small>
                      {step.actor} via {step.system}
                    </small>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState text="Run an analysis to generate the ordered process steps." />
            )}
          </article>

          <article className="panel">
            <div className="panel-header">
              <h2>Flow</h2>
              <p>BPMN-style path</p>
            </div>
            {result ? (
              <div className="flow-list">
                {result.flow.map((node) => (
                  <div key={node} className="flow-node">
                    {node}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState text="The workflow flowline will appear here after analysis." />
            )}
          </article>

          <article className="panel panel-wide">
            <div className="panel-header">
              <h2>Recommendation</h2>
              <p>Automation feasibility and draft implementation</p>
            </div>
            {result ? (
              <div className="recommendation-grid">
                <section className="summary-card">
                  <h3>Process summary</h3>
                  <p>{result.summary}</p>
                </section>

                <section className="opportunities-card">
                  <h3>Automation candidates</h3>
                  <div className="opportunity-list">
                    {result.automationOpportunities.map((opportunity) => (
                      <div key={opportunity.title} className="opportunity-item">
                        <div className="opportunity-head">
                          <strong>{opportunity.title}</strong>
                          <span>{opportunity.score}/10</span>
                        </div>
                        <p>{opportunity.rationale}</p>
                        <small>{opportunity.implementation}</small>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="workflow-card">
                  <h3>Draft workflow</h3>
                  <p className="workflow-platform">{result.draftWorkflow.platform}</p>
                  <div className="technology-rationale">
                    <strong>Why this technology</strong>
                    <p>{result.draftWorkflow.platformReason}</p>
                  </div>
                  <ol>
                    {result.draftWorkflow.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </section>
              </div>
            ) : (
              <EmptyState text="Recommendations and draft workflow output will render here." />
            )}
          </article>

          <article className="panel panel-wide">
            <div className="panel-header">
              <h2>ROI Calculator</h2>
              <p>Adjust assumptions and update the business case in real time</p>
            </div>
            {result && roiInputs && roiEstimate ? (
              <section className="roi-card roi-card-wide">
                <div className="roi-controls">
                  <SliderControl
                    label="Annual runs"
                    value={roiInputs.annualRuns}
                    min={12}
                    max={2000}
                    step={4}
                    formatValue={(value) => `${value} runs/year`}
                    onChange={(value) =>
                      setRoiInputs((current) =>
                        current ? { ...current, annualRuns: value } : current
                      )
                    }
                  />
                  <SliderControl
                    label="Current effort"
                    value={roiInputs.currentMinutesPerRun}
                    min={5}
                    max={180}
                    step={1}
                    formatValue={(value) => `${value} min/run`}
                    onChange={(value) =>
                      setRoiInputs((current) =>
                        current
                          ? {
                              ...current,
                              currentMinutesPerRun: value,
                              automatedMinutesPerRun: Math.min(
                                current.automatedMinutesPerRun,
                                value
                              )
                            }
                          : current
                      )
                    }
                  />
                  <SliderControl
                    label="Automated effort"
                    value={roiInputs.automatedMinutesPerRun}
                    min={1}
                    max={roiInputs.currentMinutesPerRun}
                    step={1}
                    formatValue={(value) => `${value} min/run`}
                    onChange={(value) =>
                      setRoiInputs((current) =>
                        current
                          ? {
                              ...current,
                              automatedMinutesPerRun: Math.min(
                                value,
                                current.currentMinutesPerRun
                              )
                            }
                          : current
                      )
                    }
                  />
                  <SliderControl
                    label="Hourly rate"
                    value={roiInputs.hourlyRate}
                    min={20}
                    max={200}
                    step={5}
                    formatValue={(value) => `$${value}/hr`}
                    onChange={(value) =>
                      setRoiInputs((current) =>
                        current ? { ...current, hourlyRate: value } : current
                      )
                    }
                  />
                  <SliderControl
                    label="Implementation cost"
                    value={roiInputs.implementationCost}
                    min={2000}
                    max={100000}
                    step={1000}
                    formatValue={(value) => `$${value.toLocaleString()}`}
                    onChange={(value) =>
                      setRoiInputs((current) =>
                        current ? { ...current, implementationCost: value } : current
                      )
                    }
                  />
                </div>

                <div className="roi-results">
                  <div className="roi-metrics">
                    <div className="roi-metric">
                      <strong>${roiEstimate.annualSavings.toLocaleString()}</strong>
                      <span>Annual savings</span>
                    </div>
                    <div className="roi-metric">
                      <strong>{roiEstimate.paybackMonths}</strong>
                      <span>Payback months</span>
                    </div>
                    <div className="roi-metric">
                      <strong>{roiEstimate.roiPercentYearOne}%</strong>
                      <span>Year 1 ROI</span>
                    </div>
                    <div className="roi-metric">
                      <strong>{roiEstimate.hoursSavedPerYear}</strong>
                      <span>Hours saved/year</span>
                    </div>
                  </div>

                  <div className="roi-details">
                    <p>Current effort: {roiInputs.currentMinutesPerRun} min/run</p>
                    <p>Automated effort: {roiInputs.automatedMinutesPerRun} min/run</p>
                    <p>Run frequency: {roiInputs.annualRuns} runs/year</p>
                    <p>Hourly rate: ${roiInputs.hourlyRate}/hr</p>
                    <p>
                      Implementation cost: $
                      {roiInputs.implementationCost.toLocaleString()}
                    </p>
                  </div>

                  <div className="roi-assumptions">
                    <strong>Assumptions</strong>
                    <ul>
                      {buildRoiAssumptions(result.roiEstimate, roiInputs).map(
                        (assumption) => (
                          <li key={assumption}>{assumption}</li>
                        )
                      )}
                    </ul>
                  </div>
                </div>
              </section>
            ) : (
              <EmptyState text="Run an analysis to unlock the ROI calculator." />
            )}
          </article>
        </section>
      </main>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}

function SliderControl({
  label,
  value,
  min,
  max,
  step,
  formatValue,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  formatValue: (value: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="slider-control">
      <div className="slider-header">
        <span>{label}</span>
        <strong>{formatValue(value)}</strong>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <div className="slider-scale">
        <span>{formatValue(min)}</span>
        <span>{formatValue(max)}</span>
      </div>
    </label>
  );
}

function calculateRoiEstimate(inputs: RoiInputs): RoiEstimate {
  const minutesSavedPerRun = Math.max(
    0,
    inputs.currentMinutesPerRun - inputs.automatedMinutesPerRun
  );
  const hoursSavedPerYear =
    Math.round(((minutesSavedPerRun * inputs.annualRuns) / 60) * 10) / 10;
  const annualSavings = Math.round(hoursSavedPerYear * inputs.hourlyRate);
  const paybackMonths =
    annualSavings > 0
      ? Math.round(((inputs.implementationCost / annualSavings) * 12) * 10) / 10
      : 0;
  const roiPercentYearOne =
    inputs.implementationCost > 0
      ? Math.round(
          (((annualSavings - inputs.implementationCost) / inputs.implementationCost) * 100) *
            10
        ) / 10
      : 0;

  return {
    annualRuns: inputs.annualRuns,
    currentMinutesPerRun: inputs.currentMinutesPerRun,
    automatedMinutesPerRun: inputs.automatedMinutesPerRun,
    hoursSavedPerYear,
    hourlyRate: inputs.hourlyRate,
    annualSavings,
    implementationCost: inputs.implementationCost,
    paybackMonths,
    roiPercentYearOne,
    assumptions: []
  };
}

function buildRoiAssumptions(baseEstimate: RoiEstimate, inputs: RoiInputs): string[] {
  return [
    `Baseline model recommendation started from ${baseEstimate.annualRuns} runs/year and ${baseEstimate.currentMinutesPerRun} minutes/run.`,
    `Current scenario assumes ${inputs.annualRuns} runs/year at ${inputs.currentMinutesPerRun} minutes per run.`,
    `Automation leaves ${inputs.automatedMinutesPerRun} minutes per run for exceptions, approvals, or review.`,
    `Labor value is set to $${inputs.hourlyRate}/hour.`,
    `Implementation cost is set to $${inputs.implementationCost.toLocaleString()} for delivery and deployment.`
  ];
}
