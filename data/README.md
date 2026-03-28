# ChainWise reference data

Generated files live in `data/processed/` (gitignored). Rebuild them locally or in CI with the scripts below.

## Build steps

From the repository root:

```bash
python3 -m pip install -r scripts/requirements.txt
python3 scripts/fetch_airports.py
python3 scripts/fetch_ports.py
```

Optional: `python3 scripts/fetch_ports.py --from-file path/to/ports.json` if you export from NGA WPI manually.

## Outputs

| File | Source | Notes |
|------|--------|--------|
| `airports.json` | [OurAirports](https://ourairports.com/data/) | CC0; large + medium airports with coordinates. |
| `ports.json` | Default: community JSON feed (overridable) | **Validate licensing** for production; prefer NGA Pub 150 / WPI for official use. |

Each file includes a `meta` block (`generated_at`, `source_url`, `record_count`).

## Backend consumption

Set `CHAINWISE_DATA_DIR` to an absolute path of a folder containing `airports.json` and `ports.json`, or rely on the default (`<repo>/data/processed`). See `GET /api/data/status`.
