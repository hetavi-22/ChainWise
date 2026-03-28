#!/usr/bin/env python3
"""
Fetch industry-standard port data (UN/LOCODE or NGA WPI) and normalize to `data/processed/ports.json`.

Default URL points to a UN/LOCODE-based ports CSV.
Also supports the official NGA Pub 150 (UpdatedPub150.csv) format via --from-file.
"""

from __future__ import annotations

import argparse
import csv
import io
import json
from pathlib import Path

import httpx

from common import iso_now, repo_root, short_hash, write_json

# Industry-standard UN/LOCODE ports with coordinates
DEFAULT_UNLOCODE_PORTS_URL = "https://raw.githubusercontent.com/tadziqusky/unlocode-ports/master/unlocode_ports.csv"


def load_ports_csv(url: str | None, path: Path | None) -> str:
    if path is not None:
        return path.read_text(encoding="utf-8")
    elif url is not None:
        with httpx.Client(timeout=120.0, follow_redirects=True) as client:
            r = client.get(url)
            r.raise_for_status()
            return r.text
    else:
        raise ValueError("Provide --url or --from-file")


def normalize_unlocode_row(row: dict, index: int) -> dict | None:
    """Normalize row from tadziqusky/unlocode-ports CSV."""
    name = str(row.get("name") or row.get("name_wo_diacritics") or "").strip()
    country = str(row.get("country_name") or row.get("country") or "").strip()
    locode_suffix = str(row.get("location") or "").strip()
    country_iso = str(row.get("country") or "").strip().upper()
    
    unlocode = f"{country_iso}{locode_suffix}" if (country_iso and locode_suffix) else None
    
    try:
        lat = float(row.get("latitude", 0))
        lon = float(row.get("longitude", 0))
    except (TypeError, ValueError):
        return None

    if lat == 0 and lon == 0:
        return None

    key = f"unlocode|{unlocode or index}|{lat:.4f}|{lon:.4f}"
    return {
        "id": f"port-{short_hash(key)}",
        "name": name,
        "unlocode": unlocode,
        "country": country,
        "lat": lat,
        "lon": lon,
        "source": "UN/LOCODE"
    }


def normalize_nga_row(row: dict, index: int) -> dict | None:
    """Normalize row from official NGA Pub 150 (UpdatedPub150.csv)."""
    name = str(row.get("main_port_name") or row.get("MAIN_PORT_NAME") or row.get("port_name") or "").strip()
    country = str(row.get("country_name") or row.get("COUNTRY_NAME") or row.get("country") or "").strip()
    unlocode = str(row.get("unlocode") or row.get("UNLOCODE") or "").strip() or None
    wpi_num = str(row.get("wpinumber") or row.get("WPINUMBER") or "").strip() or None
    
    try:
        # NGA CSV sometimes uses 'latitude' and 'longitude' or 'lat_deg'/'long_deg'
        lat = float(row.get("latitude") or row.get("LATITUDE") or 0)
        lon = float(row.get("longitude") or row.get("LONGITUDE") or 0)
    except (TypeError, ValueError):
        return None

    if lat == 0 and lon == 0:
        return None

    key = f"nga|{wpi_num or unlocode or index}|{lat:.4f}|{lon:.4f}"
    return {
        "id": f"port-{short_hash(key)}",
        "name": name,
        "unlocode": unlocode,
        "country": country,
        "lat": lat,
        "lon": lon,
        "wpi_number": wpi_num,
        "source": "NGA Pub 150"
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Build ports.json from industry-standard feeds.")
    parser.add_argument(
        "--url",
        default=DEFAULT_UNLOCODE_PORTS_URL,
        help="CSV URL (default: UN/LOCODE-based feed).",
    )
    parser.add_argument(
        "--from-file",
        type=Path,
        default=None,
        help="Read raw ports CSV (UN/LOCODE or NGA) from disk.",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=repo_root() / "data" / "processed" / "ports.json",
        help="Output JSON path.",
    )
    args = parser.parse_args()

    content = load_ports_csv(args.url if not args.from_file else None, args.from_file)
    reader = csv.DictReader(io.StringIO(content))
    
    # Detect format based on headers
    headers = reader.fieldnames or []
    is_nga = any(h.lower() in {"wpinumber", "main_port_name"} for h in headers)
    
    records: list[dict] = []
    for i, row in enumerate(reader):
        if is_nga:
            rec = normalize_nga_row(row, i)
        else:
            rec = normalize_unlocode_row(row, i)
            
        if rec:
            records.append(rec)

    records.sort(key=lambda r: (r["country"], r["name"]))
    
    payload = {
        "meta": {
            "generated_at": iso_now(),
            "source": "NGA Pub 150" if is_nga else "UN/LOCODE via tadziqusky",
            "source_url": str(args.url) if not args.from_file else None,
            "license_note": "Ensure compliance with NGA or UNECE redistribution terms.",
            "record_count": len(records),
        },
        "ports": records,
    }
    
    write_json(args.out, payload)
    print(f"Wrote {len(records)} ports (Format: {'NGA' if is_nga else 'UN/LOCODE'}) → {args.out}")


if __name__ == "__main__":
    main()
