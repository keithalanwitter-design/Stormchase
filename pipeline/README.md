# pipeline/ — UNTESTED SCAFFOLDING

Not run, not wired into the web app, not covered by CI.

- `whirl_research_pipeline.py` — Keith's NEXRAD + IEM sounding + MetPy case pipeline (as provided).
- `nexrad_preonset_fetcher.py` — pre-onset (10–30 min) Level II volume picker from `unidata-nexrad-level2` (reconstructed from outline).
- Schema: `../db/schema.sql` (PostGIS, reconstructed from outline; DuckDB `analytical_mart` view in comments).

Next: HRRR extraction with Herbie + MetPy (profiles → `vertical_profiles`), see BACKLOG M5.
