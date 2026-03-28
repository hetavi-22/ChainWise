from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from pydantic import ValidationError

from app.core.config import settings
from app.schemas.data_assets import AirportsDataset, PortsDataset


def _processed_dir() -> Path:
    raw = (settings.chainwise_data_dir or "").strip()
    if raw:
        return Path(raw).expanduser().resolve()
    return Path(__file__).resolve().parents[3] / "data" / "processed"


@lru_cache(maxsize=1)
def load_airports_dataset() -> AirportsDataset | None:
    path = _processed_dir() / "airports.json"
    if not path.is_file():
        return None
    try:
        return AirportsDataset.model_validate(json.loads(path.read_text(encoding="utf-8")))
    except (json.JSONDecodeError, OSError, ValidationError):
        return None


@lru_cache(maxsize=1)
def load_ports_dataset() -> PortsDataset | None:
    path = _processed_dir() / "ports.json"
    if not path.is_file():
        return None
    try:
        return PortsDataset.model_validate(json.loads(path.read_text(encoding="utf-8")))
    except (json.JSONDecodeError, OSError, ValidationError):
        return None


def clear_dataset_cache() -> None:
    load_airports_dataset.cache_clear()
    load_ports_dataset.cache_clear()
