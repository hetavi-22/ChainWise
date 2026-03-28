# 🚀 ChainWise: End-to-End Carbon-Aware Supply Chain Planner

## 🌍 Overview
ChainWise is a decision-support system designed for shipping companies like MSC to evaluate the **full-chain carbon impact** of logistics decisions. It models the complete journey of cargo from **factory → port/airport → long-haul transport → destination hub → factory**, integrating **ship, truck, rail, and air transport modes**.

The system uses real-world datasets (WPI, OECD, satellite proxies) and routing APIs to generate **multimodal route options**, compute emissions, and recommend **eco-feasible corridors under a carbon budget**.

---

# 🎯 Problem Statement

Shipping companies like MSC face a major challenge:

- Emissions data is **fragmented across modes** (shipping, trucking, rail, aviation)
- Decisions like **port selection** impact downstream emissions significantly
- Lack of tools to evaluate **end-to-end supply chain emissions**
- Difficulty in participating credibly in **green corridor initiatives**

👉 Current tools optimize for cost/time — not full-chain sustainability.

---

# 💡 Solution

ChainWise provides:

- End-to-end multimodal route construction
- Carbon emissions estimation across all legs
- Satellite-informed environmental context
- Carbon budget feasibility filtering
- Actionable route recommendations

---

# 🧠 Key Features

## 1. End-to-End Chain Modeling
- Factory → First-mile (Truck/Rail)
- → Origin Port/Airport
- → Long-haul (Ship/Air)
- → Destination Port/Airport
- → Last-mile (Truck/Rail)

## 2. Multimodal Transport Support
- 🚚 Truck (ORS routing)
- 🚆 Rail (approximated)
- 🚢 Ship (WPI + distance model)
- ✈️ Air (airport dataset + distance)

## 3. Carbon Budget Planner
- Users define emissions limit
- System filters feasible routes
- Optional **max transit time** applies the same way (hard cap on door-to-door hours)

## 3b. Carbon Tax Exposure
- Users enter a **carbon price** (per tonne CO₂e)
- System reports **tax liability** for each route option for comparison with emissions and time

## 3c. Transit Time
- Each leg has a **duration** (from ORS for road, or implied speed for ship/air/rail approximations)
- **Total journey time** is summed for reporting and optional filtering

## 4. Satellite-Informed Scoring
- NO₂ proxy → pollution intensity
- Night lights → congestion/activity

## 5. Decision Output
- Ranked route options
- Clear recommendation
- Emissions breakdown per segment

---

# 📊 Data Sources

Canonical **processed** files for routing prototypes live in `data/processed/` (`airports.json`, `ports.json`), built via `scripts/fetch_airports.py` and `scripts/fetch_ports.py` (see `data/README.md`). Replace the default ports feed with **NGA Pub 150 / WPI** when you need an official distribution.

## 1. World Port Index (WPI)
- Port coordinates
- Port characteristics
- Used for: maritime nodes, distance calculations

## 2. OpenRouteService (ORS)
- Geocoding (factory locations)
- Road routing (truck legs)
- Distance + duration

## 3. OECD Maritime CO₂ Dataset
- Used to calibrate ship emission factors

## 4. Airport Dataset (Open Data)
- Coordinates of major airports

## 5. Satellite Data (Simplified Use)
- Sentinel-5P NO₂ → pollution proxy
- VIIRS Night Lights → activity proxy

---

# ⚙️ System Architecture

## Input
- Origin factory (address)
- Destination factory (address)
- Cargo weight
- Carbon budget
- **Carbon tax** — price per **metric tonne CO₂e** (currency chosen by the user; used to translate emissions into a comparable monetary exposure)
- **Transit time policy** — optional **maximum door-to-door time** (hours); routes that exceed it are treated as infeasible alongside the carbon budget

## Pipeline
1. Geocode factories (ORS)
2. Find nearest:
   - Ports (WPI)
   - Airports
3. Generate route combinations
4. Compute distances
5. Compute **segment durations** — truck/rail legs from ORS where available; other modes from distance and implied average speeds until finer models exist
6. Compute emissions
7. Apply penalties (congestion, satellite proxies)
8. Compute **carbon tax liability** = (total emissions in t CO₂e) × (tax rate per t CO₂e)
9. Filter by carbon budget **and** optional max transit time
10. Rank and recommend (emissions, time, and tax can all surface in ranking — weights TBD)

---

# 🔄 Route Generation

## Candidate Routes

1. Truck → Ship → Truck
2. Rail → Ship → Rail
3. Truck → Air → Truck
4. Rail → Ship → Truck

---

# 🧮 Emissions Model

## General Formula

Total Emissions = Sum of all segment emissions + penalties

---

## Truck
Emission = distance × weight × truck_factor × congestion_multiplier

## Rail
Emission = distance × weight × rail_factor

## Ship
Emission = distance × weight × ship_factor

## Air
Emission = distance × weight × air_factor

---

## Penalties

- Port congestion → idle emissions
- Satellite NO₂ → pollution penalty
- Night lights → activity multiplier

---

# 📊 Example Emission Factors

| Mode | Factor |
|------|--------|
| Rail | 0.5 |
| Ship | 1.0 |
| Truck | 2.5 |
| Air | 6.0 |

---

# 🧠 Scoring & Recommendation

1. Compute total emissions and **total door-to-door time** (sum of leg durations)
2. Compute **carbon tax cost** from total emissions and user-supplied tax rate
3. Normalize across routes (emissions, time, tax / hybrid score as needed)
4. Apply carbon budget filter **and** optional max-time filter
5. Rank feasible routes
6. Return best route (clear breakdown: kg CO₂e, hours, tax exposure per option)

---

# 🖥️ Frontend

## Components
- Input panel
- Map visualization (Leaflet)
- Route cards
- Emissions breakdown charts
- Budget indicator

---

# 🧑‍💻 Tech Stack

Frontend:
- React
- Tailwind
- Leaflet

Backend:
- FastAPI (Python)

Data:
- JSON / CSV

APIs:
- OpenRouteService

---

# 🌐 MSC Relevance

ChainWise helps MSC:

- Evaluate port selection impact
- Provide customer-facing emissions insights
- Support green corridor initiatives
- Improve Scope 3 emissions estimation

---

# 🌱 Sustainability Impact

Aligned with:
- SDG 9 (Infrastructure)
- SDG 14 (Oceans)

---

# ⚠️ Assumptions & Limitations

- Rail routing is approximated
- Satellite data used as proxy
- Emission factors simplified
- No real-time AIS integration

---

# 🚀 Future Improvements

- Real-time AIS ship tracking
- Live satellite integration (GEE)
- Cost + time optimization
- ML-based route recommendation

---

# 🎤 Demo Narrative

“MSC does not control the entire supply chain — but its decisions shape it. ChainWise provides visibility into the downstream emissions impact of routing choices, enabling smarter, greener logistics planning.”

---

# 🏆 Why ChainWise Wins

- End-to-end supply chain modeling
- Multimodal integration
- Real-world datasets
- Satellite-informed insights
- Clear decision-making output

