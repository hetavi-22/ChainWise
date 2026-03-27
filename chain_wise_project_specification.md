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

## 4. Satellite-Informed Scoring
- NO₂ proxy → pollution intensity
- Night lights → congestion/activity

## 5. Decision Output
- Ranked route options
- Clear recommendation
- Emissions breakdown per segment

---

# 📊 Data Sources

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

## Pipeline
1. Geocode factories (ORS)
2. Find nearest:
   - Ports (WPI)
   - Airports
3. Generate route combinations
4. Compute distances
5. Compute emissions
6. Apply penalties (congestion, satellite proxies)
7. Filter by carbon budget
8. Rank and recommend

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

1. Compute total emissions
2. Normalize across routes
3. Apply carbon budget filter
4. Rank feasible routes
5. Return best route

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

