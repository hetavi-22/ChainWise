import json

import pytest
from fastapi.testclient import TestClient

from app.core import config
from app.main import app
from app.services import dataset_loader

client = TestClient(app)


@pytest.fixture(autouse=True)
def clear_data_cache():
    dataset_loader.clear_dataset_cache()
    yield
    dataset_loader.clear_dataset_cache()


def test_data_status_empty_when_no_files(monkeypatch, tmp_path):
    monkeypatch.setattr(config.settings, "chainwise_data_dir", str(tmp_path))
    dataset_loader.clear_dataset_cache()
    r = client.get("/api/data/status")
    assert r.status_code == 200
    body = r.json()
    assert body["airports"] is None
    assert body["ports"] is None


def test_data_status_with_airports(monkeypatch, tmp_path):
    (tmp_path / "airports.json").write_text(
        json.dumps(
            {
                "meta": {"source": "t", "generated_at": "x", "record_count": 1},
                "airports": [
                    {
                        "id": "a",
                        "ident": "a",
                        "name": "A",
                        "type": "large_airport",
                        "lat": 0,
                        "lon": 0,
                        "country_iso": "US",
                    }
                ],
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr(config.settings, "chainwise_data_dir", str(tmp_path))
    dataset_loader.clear_dataset_cache()
    r = client.get("/api/data/status")
    assert r.status_code == 200
    assert r.json()["airports"]["count"] == 1


def test_loader_parses_sample_files(tmp_path):
    dataset_loader.clear_dataset_cache()
    airports_path = tmp_path / "airports.json"
    airports_path.write_text(
        json.dumps(
            {
                "meta": {"source": "test", "record_count": 1},
                "airports": [
                    {
                        "id": "t1",
                        "ident": "T1",
                        "icao": "TEST",
                        "iata": "TT",
                        "name": "Testport Airport",
                        "type": "large_airport",
                        "lat": 1.0,
                        "lon": 2.0,
                        "country_iso": "US",
                        "scheduled_service": True,
                    }
                ],
            }
        ),
        encoding="utf-8",
    )
    prev = config.settings.chainwise_data_dir
    config.settings.chainwise_data_dir = str(tmp_path)
    dataset_loader.clear_dataset_cache()
    try:
        ds = dataset_loader.load_airports_dataset()
        assert ds is not None
        assert len(ds.airports) == 1
        assert ds.airports[0].iata == "TT"
    finally:
        config.settings.chainwise_data_dir = prev
        dataset_loader.clear_dataset_cache()
