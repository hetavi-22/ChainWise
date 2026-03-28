# ChainWise Hackathon Execution Notes

## What judges need to see quickly

1. **End-to-end decarbonization**  
   The planner evaluates complete routes from origin facility to destination facility (not isolated sea legs), with emissions, transit time, and carbon-tax exposure surfaced together.

2. **Credible datasets in-product**  
   - World Port Index (processed subset) drives maritime hub selection.
   - OECD maritime emissions dataset is used as the reference context in the UI.
   - API responses include data-source provenance (`source`, `count`, `generated_at`) for transparency.

3. **Decision clarity over dashboard noise**  
   The frontend now centers on:
   - inputs/constraints,
   - route options,
   - map geometry,
   - selected-route leg breakdown,
   - provenance and methodology.

## Suggested live demo flow (3-4 minutes)

1. Enter origin, destination, cargo, budget, and time policy.
2. Toggle sea/air and truck/rail mode inclusion.
3. Run planning and compare route options.
4. Select the top route and inspect leg-level emissions and durations on the map.
5. Call out data provenance cards to establish trust and reproducibility.

## Next extension for the track

- Plug in EO hotspot layers:
  - Sentinel-5P NO2 (`COPERNICUS/S5P/OFFL/L3_NO2`)
  - VIIRS night lights (`NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG`)
- Feed those as route penalty multipliers in backend scoring so route ranking reflects observed corridor activity and pollution.
