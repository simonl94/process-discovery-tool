import OpenAI from 'openai';
import type { AnalyzeProcessResult } from './types.js';

const model = process.env.OPENAI_MODEL || 'gpt-5.4-mini';

export async function analyzeWithOpenAI(input: string): Promise<AnalyzeProcessResult | null> {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  const response = await client.responses.create({
    model,
    input: [
      {
        role: 'system',
        content: [
          {
            type: 'input_text',
            text:
              'Convert rough business process descriptions into JSON with keys: summary, steps, flow, automationOpportunities, draftWorkflow. Keep output concise and implementation-focused.'
          }
        ]
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: input
          }
        ]
      }
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'process_analysis',
        schema: {
          type: 'object',
          additionalProperties: false,
          required: [
            'summary',
              'steps',
              'flow',
              'automationOpportunities',
              'draftWorkflow',
              'roiEstimate'
          ],
          properties: {
            summary: { type: 'string' },
            steps: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['id', 'title', 'actor', 'system', 'type', 'detail'],
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  actor: { type: 'string' },
                  system: { type: 'string' },
                  type: {
                    type: 'string',
                    enum: ['manual', 'system', 'decision']
                  },
                  detail: { type: 'string' }
                }
              }
            },
            flow: {
              type: 'array',
              items: { type: 'string' }
            },
            automationOpportunities: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['title', 'score', 'rationale', 'implementation'],
                properties: {
                  title: { type: 'string' },
                  score: { type: 'number' },
                  rationale: { type: 'string' },
                  implementation: { type: 'string' }
                }
              }
            },
            draftWorkflow: {
              type: 'object',
              additionalProperties: false,
              required: ['platform', 'platformReason', 'steps'],
              properties: {
                platform: { type: 'string' },
                platformReason: { type: 'string' },
                steps: {
                  type: 'array',
                  items: { type: 'string' }
                }
              }
            },
            roiEstimate: {
              type: 'object',
              additionalProperties: false,
              required: [
                'annualRuns',
                'currentMinutesPerRun',
                'automatedMinutesPerRun',
                'hoursSavedPerYear',
                'hourlyRate',
                'annualSavings',
                'implementationCost',
                'paybackMonths',
                'roiPercentYearOne',
                'assumptions'
              ],
              properties: {
                annualRuns: { type: 'number' },
                currentMinutesPerRun: { type: 'number' },
                automatedMinutesPerRun: { type: 'number' },
                hoursSavedPerYear: { type: 'number' },
                hourlyRate: { type: 'number' },
                annualSavings: { type: 'number' },
                implementationCost: { type: 'number' },
                paybackMonths: { type: 'number' },
                roiPercentYearOne: { type: 'number' },
                assumptions: {
                  type: 'array',
                  items: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  });

  const output = response.output_text;
  return JSON.parse(output) as AnalyzeProcessResult;
}
