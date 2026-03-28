from __future__ import annotations

import csv
import json
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
WPI_INPUT = ROOT / "data/raw/wpi/UpdatedPub150.csv"
OECD_INPUT = ROOT / "data/raw/oecd_maritime/OECD_Maritime_Transport_CO2.csv"

PROCESSED_DIR = ROOT / "data/processed/frontend"
FRONTEND_DATA_DIR = ROOT / "frontend/src/data"

PORTS_JSON_OUTPUT = PROCESSED_DIR / "ports.min.json"
OECD_JSON_OUTPUT = PROCESSED_DIR / "oecd_maritime_summary.json"

PORTS_TS_OUTPUT = FRONTEND_DATA_DIR / "ports.generated.ts"
OECD_TS_OUTPUT = FRONTEND_DATA_DIR / "oecdSummary.generated.ts"

FACILITY_FIELDS = [
    ("Facilities - Container", "Container"),
    ("Facilities - Ro-Ro", "Ro-Ro"),
    ("Facilities - Breakbulk", "Breakbulk"),
    ("Facilities - Solid Bulk", "Solid Bulk"),
    ("Facilities - Liquid Bulk", "Liquid Bulk"),
    ("Facilities - Oil Terminal", "Oil Terminal"),
    ("Facilities - LNG Terminal", "LNG Terminal"),
]

SIZE_SCORES = {
    "": 0.0,
    "Very Small": 0.2,
    "Small": 0.8,
    "Medium": 1.5,
    "Large": 2.3,
    "Very Large": 3.0,
}


def main() -> None:
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    FRONTEND_DATA_DIR.mkdir(parents=True, exist_ok=True)

    ports_payload = build_ports_payload()
    oecd_payload = build_oecd_summary()

    write_json(PORTS_JSON_OUTPUT, ports_payload)
    write_json(OECD_JSON_OUTPUT, oecd_payload)
    write_ts_module(
        PORTS_TS_OUTPUT,
        "ProcessedPort",
        "PORT_DATASET_SUMMARY",
        ports_payload["summary"],
        "PROCESSED_PORTS",
        ports_payload["ports"],
        ports_type_definition(),
    )
    write_ts_module(
        OECD_TS_OUTPUT,
        "OecdMaritimeSummary",
        "OECD_MARITIME_SUMMARY",
        oecd_payload,
        None,
        None,
        oecd_type_definition(),
    )

    print(f"Wrote {PORTS_JSON_OUTPUT.relative_to(ROOT)}")
    print(f"Wrote {OECD_JSON_OUTPUT.relative_to(ROOT)}")
    print(f"Wrote {PORTS_TS_OUTPUT.relative_to(ROOT)}")
    print(f"Wrote {OECD_TS_OUTPUT.relative_to(ROOT)}")


def build_ports_payload() -> dict[str, Any]:
    ports: list[dict[str, Any]] = []
    total_rows = 0
    country_counter: Counter[str] = Counter()

    with WPI_INPUT.open(newline="", encoding="utf-8-sig") as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            total_rows += 1
            port = build_port_record(row)
            if port is None:
                continue
            ports.append(port)
            country_counter[port["country"]] += 1

    ports.sort(key=lambda item: (item["country"], item["name"], item["wpiNumber"]))

    summary = {
        "source": "World Port Index (NGA)",
        "sourceFile": str(WPI_INPUT.relative_to(ROOT)),
        "generatedAt": datetime.now(UTC).isoformat(),
        "rawPortCount": total_rows,
        "commercialPortCount": len(ports),
        "countriesCovered": len(country_counter),
        "selectionRule": "Ports are scored from harbor size, cargo-capable facilities, and operating depth. Only ports with cargoScore >= 1.5 are included in the frontend-ready subset.",
    }

    return {
        "summary": summary,
        "ports": ports,
    }


def build_port_record(row: dict[str, str]) -> dict[str, Any] | None:
    harbor_size = clean_text(row.get("Harbor Size"))
    harbor_type = clean_text(row.get("Harbor Type"))
    harbor_use = clean_text(row.get("Harbor Use"))
    facilities = [
        label
        for field, label in FACILITY_FIELDS
        if clean_text(row.get(field)) == "Yes"
    ]

    max_depth = max(
        parse_float(row.get("Channel Depth (m)")),
        parse_float(row.get("Cargo Pier Depth (m)")),
        parse_float(row.get("Oil Terminal Depth (m)")),
        parse_float(row.get("Anchorage Depth (m)")),
    )

    cargo_score = (
        SIZE_SCORES.get(harbor_size, 0.0)
        + (len(facilities) * 0.9)
        + (min(max_depth, 18.0) / 18.0 * 1.2)
    )
    if cargo_score < 1.5:
        return None

    road_bias = 0.95
    if harbor_size in {"Medium", "Large", "Very Large"}:
        road_bias += 0.03
    if harbor_type.startswith("River"):
        road_bias += 0.05
    elif "Canal" in harbor_type:
        road_bias += 0.03
    road_bias = round(clamp(road_bias, 0.94, 1.08), 2)

    if cargo_score >= 3.5:
        proxy_confidence = "high"
    elif cargo_score >= 2.3:
        proxy_confidence = "medium"
    else:
        proxy_confidence = "low"

    name = clean_text(row.get("Main Port Name"))
    country = clean_text(row.get("Country Code"))
    wpi_number = int(parse_float(row.get("World Port Index Number")))

    return {
        "id": slugify(f"{country}-{name}-{wpi_number}"),
        "wpiNumber": wpi_number,
        "name": name,
        "country": country,
        "unlocode": clean_optional_text(row.get("UN/LOCODE")),
        "waterBody": clean_text(row.get("World Water Body")),
        "lat": round(parse_float(row.get("Latitude")), 5),
        "lng": round(parse_float(row.get("Longitude")), 5),
        "harborSize": harbor_size or "Unknown",
        "harborType": harbor_type or "Unknown",
        "harborUse": harbor_use or "Unknown",
        "channelDepthM": round(parse_float(row.get("Channel Depth (m)")), 1),
        "maxVesselDraftM": round(parse_float(row.get("Maximum Vessel Draft (m)")), 1),
        "maxVesselLengthM": round(parse_float(row.get("Maximum Vessel Length (m)")), 1),
        "cargoScore": round(cargo_score, 2),
        "activityScore": round(clamp(cargo_score / 6.0, 0.15, 1.0), 2),
        "roadBias": road_bias,
        "proxyConfidence": proxy_confidence,
        "facilities": facilities,
    }


def build_oecd_summary() -> dict[str, Any]:
    observation_count = 0
    ref_areas: set[str] = set()
    vessel_categories: set[str] = set()
    frequency_counts: Counter[str] = Counter()
    latest_month = ""
    latest_annual = ""

    latest_month_total = 0.0
    latest_annual_total = 0.0

    with OECD_INPUT.open(newline="", encoding="utf-8") as csvfile:
        reader = csv.DictReader(csvfile)
        rows = list(reader)

    for row in rows:
        observation_count += 1
        ref_areas.add(row["REF_AREA"])
        vessel_categories.add(row["VESSEL"])
        frequency_counts[row["FREQ"]] += 1

        if row["FREQ"] == "M":
            latest_month = max(latest_month, row["TIME_PERIOD"])
        if row["FREQ"] == "A":
            latest_annual = max(latest_annual, row["TIME_PERIOD"])

    for row in rows:
        if not is_latest_all_vessels_estimated(row, "M", latest_month):
            continue
        latest_month_total += parse_float(row["OBS_VALUE"])

    for row in rows:
        if not is_latest_all_vessels_estimated(row, "A", latest_annual):
            continue
        latest_annual_total += parse_float(row["OBS_VALUE"])

    return {
        "source": "OECD Maritime Transport CO2 Emissions",
        "sourceFile": str(OECD_INPUT.relative_to(ROOT)),
        "generatedAt": datetime.now(UTC).isoformat(),
        "observationCount": observation_count,
        "areasCovered": len(ref_areas),
        "vesselCategoryCount": len(vessel_categories),
        "latestMonthlyPeriod": latest_month,
        "latestAnnualPeriod": latest_annual,
        "latestMonthlyAllVesselsEstimatedTonnes": round(latest_month_total, 2),
        "latestAnnualAllVesselsEstimatedTonnes": round(latest_annual_total, 2),
        "frequencyCounts": dict(sorted(frequency_counts.items())),
    }


def is_latest_all_vessels_estimated(
    row: dict[str, str], frequency: str, period: str
) -> bool:
    return (
        row["FREQ"] == frequency
        and row["TIME_PERIOD"] == period
        and row["MEASURE"] == "EMISSIONS"
        and row["POLLUTANT"] == "CO2"
        and row["SOURCE"] == "ESTIMATED"
        and row["VESSEL"] == "ALL_VESSELS"
    )


def ports_type_definition() -> str:
    return """export type ProcessedPort = {
  id: string
  wpiNumber: number
  name: string
  country: string
  unlocode: string | null
  waterBody: string
  lat: number
  lng: number
  harborSize: string
  harborType: string
  harborUse: string
  channelDepthM: number
  maxVesselDraftM: number
  maxVesselLengthM: number
  cargoScore: number
  activityScore: number
  roadBias: number
  proxyConfidence: 'high' | 'medium' | 'low'
  facilities: string[]
}

export type PortDatasetSummary = {
  source: string
  sourceFile: string
  generatedAt: string
  rawPortCount: number
  commercialPortCount: number
  countriesCovered: number
  selectionRule: string
}
"""


def oecd_type_definition() -> str:
    return """export type OecdMaritimeSummary = {
  source: string
  sourceFile: string
  generatedAt: string
  observationCount: number
  areasCovered: number
  vesselCategoryCount: number
  latestMonthlyPeriod: string
  latestAnnualPeriod: string
  latestMonthlyAllVesselsEstimatedTonnes: number
  latestAnnualAllVesselsEstimatedTonnes: number
  frequencyCounts: Record<string, number>
}
"""


def write_ts_module(
    path: Path,
    primary_type_name: str,
    summary_const_name: str,
    summary_value: dict[str, Any],
    collection_const_name: str | None,
    collection_value: list[dict[str, Any]] | None,
    type_definition: str,
) -> None:
    lines = [
        "// This file is auto-generated by scripts/process_supply_chain_data.py",
        "// Do not edit it manually.",
        "",
        type_definition.strip(),
        "",
        f"export const {summary_const_name}: {primary_type_name if primary_type_name == 'OecdMaritimeSummary' else 'PortDatasetSummary'} = {json.dumps(summary_value, indent=2)}",
    ]

    if collection_const_name and collection_value is not None:
        lines.extend(
            [
                "",
                f"export const {collection_const_name}: {primary_type_name}[] = {json.dumps(collection_value, indent=2)}",
            ]
        )

    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def clean_text(value: str | None) -> str:
    if value is None:
        return ""
    return value.strip()


def clean_optional_text(value: str | None) -> str | None:
    text = clean_text(value)
    return text or None


def parse_float(value: str | None) -> float:
    text = clean_text(value)
    if not text:
        return 0.0
    try:
        return float(text)
    except ValueError:
        return 0.0


def slugify(value: str) -> str:
    cleaned = []
    prev_dash = False
    for char in value.lower():
        if char.isalnum():
            cleaned.append(char)
            prev_dash = False
        else:
            if not prev_dash:
                cleaned.append("-")
            prev_dash = True
    return "".join(cleaned).strip("-")


def clamp(value: float, minimum: float, maximum: float) -> float:
    return min(max(value, minimum), maximum)


if __name__ == "__main__":
    main()
