# Process Discovery Tool

Turn rough process descriptions into:

- Structured steps
- BPMN-style flow output
- Automation candidates
- Draft workflow actions

## Stack

- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express + TypeScript
- AI layer: heuristic by default, optional OpenAI integration via env vars

## Run tasks steps

Install dependencies:

```bash
npm run install:all
```

Start the backend:

```bash
npm run dev:server
```

Start the frontend in a second terminal:

```bash
npm run dev:client
```

Frontend default URL: `http://localhost:5173`

Backend default URL: `http://localhost:8787`

## OpenAI functionality

To enable live model-backed analysis, create a `.env` file inside `server/`:

```bash
OPENAI_API_KEY=your_key
OPENAI_MODEL=gpt-5.4-mini
```

Without an API key, the backend falls back to local process-analysis heuristics so the demo still works offline.
