# TradeMind AI Deployment

TradeMind AI is educational analysis only. Not financial advice. No broker execution or real-money trading is included.

This guide deploys the FastAPI backend to Render and the Next.js frontend to Vercel.

## Backend: Render

Create a new Render web service connected to the GitHub repository.

Recommended settings:

```text
Service type: Web Service
Root directory: backend
Runtime: Python
Build command: pip install -r requirements.txt
Start command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
Health check path: /health
API docs path: /docs
```

Required environment variables:

```env
FRONTEND_URL=https://your-vercel-frontend-url.vercel.app
AI_PROVIDER=rule_based
```

Optional environment variables:

```env
GEMINI_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:8b
OLLAMA_FAST_MODEL=gemma3:4b
```

Notes:

- `FRONTEND_URL` is used by backend CORS. Set it to the deployed Vercel frontend origin, without a trailing path.
- `GEMINI_API_KEY` is optional. Without it, the backend keeps using rule-based educational analysis.
- `AI_PROVIDER` defaults to `rule_based`. Supported values are `rule_based`, `gemini`, `ollama`, and `cloud`.
- `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, and `OLLAMA_FAST_MODEL` are optional local-development settings. If Ollama is unavailable, the backend falls back safely.
- `cloud` is registered as a future provider stub and currently falls back safely.
- Do not add real `.env` files or secret values to Git.
- The backend module path is `app.main:app`.

After deploy, check:

```text
https://your-render-backend-url.onrender.com/health
https://your-render-backend-url.onrender.com/docs
```

## Frontend: Vercel

Create a new Vercel project connected to the GitHub repository.

Recommended settings:

```text
Root directory: frontend
Install command: npm install
Build command: npm run build
Output directory: .next
```

Required environment variable:

```env
NEXT_PUBLIC_API_BASE_URL=https://your-render-backend-url.onrender.com
```

Notes:

- Set `NEXT_PUBLIC_API_BASE_URL` to the Render backend URL, without a trailing slash.
- After Vercel gives you a production frontend URL, add that URL to Render as `FRONTEND_URL`.
- Redeploy the backend after adding or changing `FRONTEND_URL`.

## Local Development

Backend:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

Frontend:

```powershell
cd frontend
npm run dev
```

Optional local Ollama setup:

```powershell
ollama pull qwen3:8b
ollama pull gemma3:4b
ollama pull deepseek-r1:8b
```

Validation from the project root:

```powershell
.\validate.ps1
```

If PowerShell blocks the validation script:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
.\validate.ps1
```

## Pre-Deploy Checklist

- `.\validate.ps1` passes locally.
- Backend `FRONTEND_URL` is set to the Vercel frontend origin.
- Frontend `NEXT_PUBLIC_API_BASE_URL` is set to the Render backend origin.
- Real `.env` files, virtual environments, `node_modules`, `.next`, logs, reports, and caches are not committed.
- The app still presents analysis as educational only and does not offer broker execution, order placement, automated trading, or guaranteed predictions.
