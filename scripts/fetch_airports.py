#!/usr/bin/env python3
"""Download OurAirports (CC0) and build `data/processed/airports.json`."""

from __future__ import annotations

import argparse
import csv
import io
from pathlib import Path

import httpx

from common import iso_now, repo_root, short_hash, write_json

OURAIRPORTS_CSV = "https://davidmegginson.github.io/ourairports-data/airports.csv"


def fetch_airports_csv(url: str) -> str:
    with httpx.Client(timeout=120.0, follow_redirects=True) as client:
        r = client.get(url)
        r.raise_for_status()
        return r.text


def build_airports(doc: str) -> dict:
    reader = csv.DictReader(io.StringIO(doc))
    rows: list[dict] = []
    for row in reader:
        lat = row.get("latitude_deg") or ""
        lon = row.get("longitude_deg") or ""
        ap_type = (row.get("type") or "").strip()
        if ap_type not in {"large_airport", "medium_airport"}:
            continue
        if not lat or not lon:
            continue
        try:
            lat_f = float(lat)
            lon_f = float(lon)
        except ValueError:
            continue
        ident = (row.get("ident") or "").strip()
        icao = (row.get("icao_code") or "").strip()
        iata = (row.get("iata_code") or "").strip()
        rows.append(
            {
                "id": ident or icao or f"oa-{short_hash(row.get('id', '') + row.get('name', ''))}",
                "ident": ident,
                "icao": icao or None,
                "iata": iata or None,
                "name": (row.get("name") or "").strip(),
                "type": ap_type,
                "lat": lat_f,
                "lon": lon_f,
                "country_iso": (row.get("iso_country") or "").strip(),
                "region_iso": (row.get("iso_region") or "").strip() or None,
                "municipality": (row.get("municipality") or "").strip() or None,
                "scheduled_service": (row.get("scheduled_service") or "").strip() == "yes",
            }
        )
    rows.sort(key=lambda r: (r["country_iso"], r["name"], r.get("iata") or ""))
    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description="Build airports.json from OurAirports.")
    parser.add_argument(
        "--url",
        default=OURAIRPORTS_CSV,
        help="CSV URL (default: official OurAirports mirror).",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=repo_root() / "data" / "processed" / "airports.json",
        help="Output JSON path.",
    )
    args = parser.parse_args()

    doc = fetch_airports_csv(args.url)
    records = build_airports(doc)
    payload = {
        "meta": {
            "generated_at": iso_now(),
            "source": "OurAirports",
            "source_url": args.url,
            "license_note": "OurAirports data is dedicated to the public domain (CC0).",
            "record_count": len(records),
        },
        "airports": records,
    }
    write_json(args.out, payload)
    print(f"Wrote {len(records)} airports → {args.out}")


if __name__ == "__main__":
    main()
