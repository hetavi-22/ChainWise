# ChainWise

End-to-end **carbon-aware multimodal supply chain planner** — factory to factory across truck, rail, ship, and air, with routing, emissions estimation, carbon budget filtering, and satellite-informed scoring.

Product context and architecture live in [chain_wise_project_specification.md](chain_wise_project_specification.md).

**Maintenance:** When you merge meaningful changes (API, UI, data pipeline, routing), update the [Implementation status](#implementation-status) section below so the repo stays the single place for “what works today.”

## Implementation status

Last README update: **2026-03-27** (industry-standard multimodal baseline).

### Done so far

| Area | What works |
|------|------------|
| **Backend** | FastAPI app with `GET /health`, `POST /api/routes/evaluate`, and **`POST /api/routes/plan/multimodal`** (geocoding, hub discovery, candidate chain evaluation). |
| **Backend** | `GET /api/data/status` — reports counts for ports/airports. |
| **Backend** | Industry-standard **GLEC-aligned emission factors** (kg CO2e per tonne-km) for all modes. |
| **Frontend** | React UI with **ChainWise Planner**; supports address-to-address multimodal searching with ranked candidates; best-option recommendation logic. |
| **Data** | Scripts `scripts/fetch_ports.py` (UN/LOCODE or NGA Pub 150) and `scripts/fetch_airports.py` (OurAirports); writes to `data/processed/`. |
| **Routing** | **Multimodal Engine**: Resolves nearest seafreight/air hubs via Haversine and assembles Truck-Ship-Truck or Truck-Air-Truck chains. |

### Not started yet (high level)

- OpenRouteService **road routing** (network directions and real duration estimates beyond Haversine).
- Satellite / congestion penalties (Sentinel-5P / VIIRS) to adjust hub scores.
- Real-time AIS / scheduling integration for seafreight legs.
- Advanced rail/sea “exact” corridor routing.

### Local reference data (JSON)

These files are produced locally (gitignored) when you run the fetch scripts. **Current copies on disk** (from each file’s `meta`):

| File | Records | Last generated (`meta.generated_at`) |
|------|---------|----------------------------------------|
| `data/processed/airports.json` | **5,264** | 2026-03-27 |
| `data/processed/ports.json` | **18,027** | 2026-03-27 (UN/LOCODE source) |

After re-running `fetch_airports.py` / `fetch_ports.py`, update the table above *or* rely on `GET /api/data/status` for live counts.

## Repository layout

| Path | Purpose |
|------|---------|
| `backend/` | FastAPI API, routing/emissions pipeline, integrations (e.g. OpenRouteService) |
| `frontend/` | React UI — map (Leaflet), inputs, route cards, emissions breakdown |
| `data/` | See [data/README.md](data/README.md) — processed `airports.json` / `ports.json` (local build, gitignored) |
| `scripts/` | Ingestion: `fetch_airports.py`, `fetch_ports.py` |
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

### Reference data (airports & ports)

```bash
python3 -m pip install -r scripts/requirements.txt
python3 scripts/fetch_airports.py
python3 scripts/fetch_ports.py
```

Then open `GET http://localhost:8000/api/data/status` (or `/api/data/status` via the Vite proxy) to confirm record counts.

### Configuration

Copy `.env.example` to `.env` in the repo root and/or to `backend/.env` (FastAPI loads the nearest `.env` from the process working directory — use `backend/.env` if you always run `uvicorn` from `backend/`). Never commit real API keys. Optional: `CHAINWISE_DATA_DIR` points at the folder that contains `airports.json` and `ports.json`.

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
