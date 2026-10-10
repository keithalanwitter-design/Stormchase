-- StormChase / WHIRL research schema (PostGIS) — UNTESTED SCAFFOLDING.
-- Reconstructed from Keith's pasted outline (table/column names per that outline);
-- verify against the original before applying. Not used by the web app yet.
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE tornado_ground_truth (
  event_id        BIGSERIAL PRIMARY KEY,
  source          TEXT NOT NULL,              -- 'SPC_actual' | 'NCEI' | 'DAT'
  source_ref      TEXT,                       -- om / event_id / DAT id
  ef_rating       TEXT,                       -- original rating text incl. unknown
  rating_estimated BOOLEAN DEFAULT FALSE,     -- SPC fc=1
  start_time_utc  TIMESTAMPTZ NOT NULL,
  source_time_raw TEXT, source_tz TEXT,
  path_length_mi  REAL, path_width_yd REAL,
  track           GEOMETRY(LineString, 4326),
  start_point     GEOMETRY(Point, 4326),
  release_date    DATE
);
CREATE INDEX ON tornado_ground_truth USING GIST (track);

CREATE TABLE vertical_profiles (
  profile_id      BIGSERIAL PRIMARY KEY,
  source          TEXT NOT NULL,              -- 'HRRR' | 'RAP' | 'RAOB' ...
  model_init_utc  TIMESTAMPTZ, valid_time_utc TIMESTAMPTZ NOT NULL, forecast_lead_h REAL,
  location        GEOMETRY(Point, 4326) NOT NULL,
  srh_0_500m      REAL, srh_0_1km REAL, effective_srh REAL,
  shear_0_1km_kt  REAL, effective_bulk_shear_kt REAL,
  streamwise_vort_fraction_0_500m REAL,
  storm_motion_u  REAL, storm_motion_v REAL, storm_motion_method TEXT,
  mlcape REAL, sbcape REAL, cape_0_3km REAL, mlcin REAL, ml_lcl_m REAL,
  sfc_850_dewpoint_depression REAL,
  stp REAL, whirl_core REAL, whirl_version TEXT
);
CREATE INDEX ON vertical_profiles USING GIST (location);
CREATE INDEX ON vertical_profiles (valid_time_utc);

CREATE TABLE radar_volumes (
  volume_id       BIGSERIAL PRIMARY KEY,
  radar_site      TEXT NOT NULL,
  object_key      TEXT NOT NULL UNIQUE,       -- unidata-nexrad-level2 key
  scan_time_utc   TIMESTAMPTZ NOT NULL,
  vcp             INT, processing_version TEXT
);

CREATE TABLE case_study_samples (
  sample_id       BIGSERIAL PRIMARY KEY,
  event_id        BIGINT REFERENCES tornado_ground_truth(event_id),  -- NULL for matched control
  profile_id      BIGINT REFERENCES vertical_profiles(profile_id),
  volume_id       BIGINT REFERENCES radar_volumes(volume_id),
  is_control      BOOLEAN NOT NULL DEFAULT FALSE,
  pre_onset_lead_min REAL CHECK (pre_onset_lead_min BETWEEN 10 AND 30),
  range_to_radar_km REAL, sweep_elevation_deg REAL,
  notes TEXT
);

-- DuckDB analytical mart (run in DuckDB over exported parquet; shown for reference):
-- CREATE VIEW analytical_mart AS
--   SELECT s.sample_id, s.is_control, t.ef_rating, p.*, r.radar_site, r.scan_time_utc, s.pre_onset_lead_min
--   FROM case_study_samples s
--   LEFT JOIN tornado_ground_truth t USING (event_id)
--   JOIN vertical_profiles p USING (profile_id)
--   LEFT JOIN radar_volumes r USING (volume_id);
