# ChainWise

End-to-end **carbon-aware multimodal supply chain planner** — factory to factory across truck, rail, ship, and air, with routing, emissions estimation, carbon budget filtering, and satellite-informed scoring.

Product context and architecture live in [chain_wise_project_specification.md](chain_wise_project_specification.md).

## Repository layout

| Path | Purpose |
|------|---------|
| `backend/` | FastAPI API, routing/emissions pipeline, integrations (e.g. OpenRouteService) |
| `frontend/` | React UI — map (Leaflet), inputs, route cards, emissions breakdown |
| `data/` | Small CSV/JSON samples; large datasets documented, not committed |
| `scripts/` | One-off ingestion, preprocessing, or data validation |
| `docs/` | ADRs, API notes, teammate onboarding (optional) |

## Quick start

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Set API base URL in `frontend` as needed (e.g. proxy or `VITE_API_URL`).

### Configuration

Copy `.env.example` to `.env` in the repo root and/or to `backend/.env` (FastAPI loads the nearest `.env` from the process working directory — use `backend/.env` if you always run `uvicorn` from `backend/`). Never commit real API keys.

## Collaboration

- Track feature work in issues/PRs; keep `chain_wise_project_specification.md` as the source of truth for scope until the app stabilizes.
- Prefer small PRs: backend API contracts, frontend UI slices, or data pipeline scripts separately when possible.

## Publish to GitHub

```bash
git init
git add .
git commit -m "Initial ChainWise repo layout"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

## License

Add a `LICENSE` file when your team chooses one.
