"""Shared paths and helpers for data ingest scripts."""

from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path


def repo_root() -> Path:
    return Path(__file__).resolve().parent.parent


def write_json(path: Path, payload: object, *, indent: int | None = 2) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=indent, ensure_ascii=False) + "\n", encoding="utf-8")


def iso_now() -> str:
    return datetime.now(tz=UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def short_hash(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()[:12]
