import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { analyzeProcess } from './analyze.js';
import { analyzeWithOpenAI } from './openai.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 8787);

app.use(cors());
app.use(express.json());

app.get('/health', (_request, response) => {
  response.json({ ok: true });
});

app.post('/analyze-process', async (request, response) => {
  const input = request.body?.input;

  if (typeof input !== 'string' || !input.trim()) {
    response.status(400).json({ error: 'input must be a non-empty string' });
    return;
  }

  try {
    const aiResult = await analyzeWithOpenAI(input);
    response.json(aiResult ?? analyzeProcess(input));
  } catch (error) {
    const fallback = analyzeProcess(input);
    response.json({
      ...fallback,
      summary: `${fallback.summary} OpenAI was unavailable, so this result uses the local fallback analyzer.`
    });
  }
});

app.listen(port, () => {
  console.log(`Process discovery API listening on http://localhost:${port}`);
});
