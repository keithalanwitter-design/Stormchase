"""
WHIRL research pipeline (v0.1) - corrected and runnable version of the Gemini outline.

Run it in Google Colab (free, in the browser) or on any computer with Python 3.10+.
First cell in Colab:
    !pip install -q metpy arm-pyart scikit-learn pandas matplotlib requests

What it does for each case in CASES:
  1. Downloads the radar volume nearest the event time from the free NOAA NEXRAD
     archive on AWS (no account needed) and saves a reflectivity + velocity image.
  2. Downloads the nearest observed balloon sounding from the Iowa Environmental
     Mesonet (IEM) and computes WHIRL ingredients with MetPy.
  3. Writes everything to whirl_cases.csv.
Then, once you have 20+ tornado cases and 20+ busts, it fits a logistic regression
to show which ingredients separate them.
"""

import io
import re
from datetime import datetime, timedelta

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import requests

import metpy.calc as mpcalc
from metpy.units import units

# --------------------------------------------------------------------------
# 1. Your case list. outcome: 1 = tornado (EF1+ recommended), 0 = warned
#    supercell that did NOT produce (a bust). Times are UTC.
#    radar = nearest NEXRAD site, raob = nearest balloon site.
#    Fill this from the SPC Severe Weather Events Archive and NWS DAT.
# --------------------------------------------------------------------------
CASES = [
    # date-time (UTC),      radar,  raob,   lat,    lon,     outcome, label
    # --- Tornado cases (times checked against NWS / sourced write-ups) ---
    ("2011-05-22 22:34", "KSGF", "KSGF", 37.06, -94.56, 1, "Joplin MO EF5"),
    ("2011-04-23 00:59", "KLSX", "KILX", 38.72, -90.45, 1, "St. Louis/Lambert MO EF4"),
    ("2012-02-29 10:51", "KPAH", "KILX", 37.71, -88.55, 1, "Harrisburg IL EF4"),
    ("2013-11-17 16:59", "KILX", "KILX", 40.61, -89.57, 1, "Washington IL EF4"),
    ("2015-04-09 23:39", "KLOT", "KDVN", 41.86, -89.28, 1, "Rochelle-Fairdale IL EF4"),
    ("2017-03-01 01:51", "KPAH", "KILX", 37.72, -89.92, 1, "Perryville MO EF4"),
    ("2018-12-01 23:01", "KILX", "KILX", 39.55, -89.29, 1, "Taylorville IL EF3"),
    ("2019-05-23 03:56", "KLSX", "KSGF", 38.35, -92.58, 1, "Eldon-Jefferson City MO EF3"),
    ("2021-05-03 22:05", "KILX", "KILX", 39.91, -90.21, 1, "Virginia-Pleasant Plains IL weak"),
    ("2021-12-11 02:27", "KLSX", "KILX", 38.79, -89.98, 1, "Edwardsville IL EF3"),
    ("2023-04-01 01:58", "KVWX", "KILX", 38.93, -88.05, 1, "Ste. Marie-Robinson IL EF3"),
    ("2026-06-11 22:08", "KILX", "KILX", 40.88, -89.35, 1, "Woodford-Marshall IL EF3 (verify time)"),
    # --- Bust cases (supercells, no tornado) ---
    ("2012-04-28 20:45", "KLSX", "KILX", 38.63, -90.20, 0, "St. Louis metro hail supercells"),
    ("2020-04-08 22:10", "KILX", "KILX", 39.89, -89.60, 0, "Sherman IL 3in hail supercell"),
    ("2024-03-14 21:00", "KLSX", "KILX", 38.79, -90.70, 0, "St. Charles-Madison hail supercells (verify time)"),
    ("2026-04-17 22:16", "KILX", "KILX", 40.35, -90.32, 0, "Ipava IL afternoon supercell"),
    ("2019-05-27 19:00", "KILX", "KILX", 40.92, -90.02, 0, "Williamsfield-Peoria warned supercell (verify)"),
]

AWS_BUCKET = "https://noaa-nexrad-level2.s3.amazonaws.com"
IEM_RAOB = "https://mesonet.agron.iastate.edu/json/raob.py"


# --------------------------------------------------------------------------
# Radar: list one day's files for a site on AWS, pick the scan closest to time
# --------------------------------------------------------------------------
def nearest_radar_key(site, when):
    prefix = when.strftime(f"%Y/%m/%d/{site}/")
    r = requests.get(AWS_BUCKET, params={"list-type": "2", "prefix": prefix}, timeout=60)
    r.raise_for_status()
    keys = [k for k in re.findall(r"<Key>([^<]+)</Key>", r.text) if not k.endswith("_MDM")]
    best, best_dt = None, None
    for k in keys:
        m = re.search(r"(\d{8}_\d{6})", k)
        if not m:
            continue
        t = datetime.strptime(m.group(1), "%Y%m%d_%H%M%S")
        if best_dt is None or abs(t - when) < abs(best_dt - when):
            best, best_dt = k, t
    return best, best_dt


def radar_image(site, when, lat, lon, out_png):
    import pyart

    key, scan_time = nearest_radar_key(site, when)
    if key is None:
        print(f"  no radar files for {site} on {when:%Y-%m-%d}")
        return None
    raw = requests.get(f"{AWS_BUCKET}/{key}", timeout=120).content
    fname = out_png.replace(".png", ".ar2v")
    with open(fname, "wb") as f:
        f.write(raw)
    radar = pyart.io.read_nexrad_archive(fname)
    display = pyart.graph.RadarDisplay(radar)
    # colormap names differ between Py-ART versions
    ref_cmap = "NWSRef" if "NWSRef" in matplotlib.colormaps else "pyart_NWSRef"
    vel_cmap = "NWSVel" if "NWSVel" in matplotlib.colormaps else "pyart_NWSVel"
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))
    # sweep 0 = reflectivity at 0.5 deg; velocity usually lives in sweep 1
    display.plot_ppi("reflectivity", 0, ax=axes[0], vmin=-10, vmax=70,
                     cmap=ref_cmap, title=f"{site} reflectivity {scan_time:%Y-%m-%d %H:%MZ}")
    vel_sweep = 1 if radar.nsweeps > 1 else 0
    display.plot_ppi("velocity", vel_sweep, ax=axes[1], vmin=-40, vmax=40,
                     cmap=vel_cmap, title=f"{site} velocity {scan_time:%H:%MZ}")
    for ax in axes:
        ax.set_xlim(-150, 150)
        ax.set_ylim(-150, 150)
    fig.tight_layout()
    fig.savefig(out_png, dpi=110)
    plt.close(fig)
    return scan_time


# --------------------------------------------------------------------------
# Sounding: nearest 00Z or 12Z balloon from IEM, then compute ingredients
# --------------------------------------------------------------------------
def nearest_raob_time(when):
    # afternoon events -> the 00Z launch that evening is closest to storm time
    cands = [when.replace(hour=0, minute=0) + timedelta(days=d) for d in (0, 1)]
    cands += [when.replace(hour=12, minute=0)]
    return min(cands, key=lambda t: abs(t - when))


def get_raob(station, when):
    t = nearest_raob_time(when)
    r = requests.get(IEM_RAOB, params={"ts": t.strftime("%Y%m%d%H%M"), "station": station}, timeout=60)
    r.raise_for_status()
    profiles = r.json().get("profiles", [])
    if not profiles:
        return None, t
    df = pd.DataFrame(profiles[0]["profile"])
    df = df.dropna(subset=["pres", "hght", "tmpc", "dwpc", "drct", "sknt"])
    df = df.sort_values("pres", ascending=False).drop_duplicates("pres")
    return df, t


def ingredients(df):
    p = df["pres"].values * units.hPa
    z = df["hght"].values * units.m
    T = df["tmpc"].values * units.degC
    Td = df["dwpc"].values * units.degC
    u, v = mpcalc.wind_components(df["sknt"].values * units.knot, df["drct"].values * units.deg)
    z_agl = z - z[0]

    # Storm motion (Bunkers right mover). Replace with radar-observed motion when you have it.
    rm, lm, mean = mpcalc.bunkers_storm_motion(p, u, v, z)

    def srh(depth_m):
        pos, neg, total = mpcalc.storm_relative_helicity(
            z, u, v, depth=depth_m * units.m, storm_u=rm[0], storm_v=rm[1])
        return total.to("m^2/s^2").m

    # Mixed-layer (lowest 100 hPa) parcel
    ml_p, ml_t, ml_td = mpcalc.mixed_parcel(p, T, Td, depth=100 * units.hPa)
    ml_lcl_p, _ = mpcalc.lcl(ml_p, ml_t, ml_td)
    ml_lcl_m = np.interp(ml_lcl_p.m, p.m[::-1], z_agl.m[::-1])
    mlcape, mlcin = mpcalc.mixed_layer_cape_cin(p, T, Td, depth=100 * units.hPa)
    sbcape, sbcin = mpcalc.surface_based_cape_cin(p, T, Td)

    # 0-3 km CAPE: surface parcel, buoyancy integrated only below 3 km AGL
    prof = mpcalc.parcel_profile(p, T[0], Td[0])
    below3 = z_agl.m <= 3000
    cape3, _ = mpcalc.cape_cin(p[below3], T[below3], Td[below3], prof[below3])

    ubs, vbs = mpcalc.bulk_shear(p, u, v, height=z, depth=6000 * units.m)
    shear06 = mpcalc.wind_speed(ubs, vbs).to("knot").m
    ub1, vb1 = mpcalc.bulk_shear(p, u, v, height=z, depth=1000 * units.m)
    shear01 = mpcalc.wind_speed(ub1, vb1).to("knot").m

    srh500, srh1 = srh(500), srh(1000)
    stp_fixed = mpcalc.significant_tornado(
        sbcape, ml_lcl_m * units.m, srh1 * units("m^2/s^2"),
        mpcalc.wind_speed(ubs, vbs)).to("dimensionless").m
    stp_fixed = float(np.atleast_1d(stp_fixed)[0])

    # WHIRL v0.1 environmental core (mode and boundary multipliers are set by hand)
    s_shear = np.clip(shear06 / 40, 0, 1.5) if shear06 >= 25 else 0.0
    s_cape = np.clip(mlcape.m / 1500, 0, 1.25)
    s_lcl = np.clip((2000 - ml_lcl_m) / 1000, 0, 1)
    s_cin = np.clip((250 + mlcin.m) / 150, 0, 1)
    whirl_core = (srh500 / 75) * s_shear * s_cape * s_lcl * s_cin

    return {
        "srh_0_500": round(srh500), "srh_0_1km": round(srh1),
        "mlcape": round(mlcape.m), "mlcin": round(mlcin.m),
        "sbcape": round(sbcape.m), "cape_0_3km": round(cape3.m),
        "ml_lcl_m": round(ml_lcl_m), "sfc_t_td_spread_c": round(float((T[0] - Td[0]).m), 1),
        "shear_0_1km_kt": round(shear01), "shear_0_6km_kt": round(shear06),
        "stp_fixed": round(stp_fixed, 2), "whirl_core": round(float(whirl_core), 2),
    }


# --------------------------------------------------------------------------
# Run every case
# --------------------------------------------------------------------------
def build_library():
    rows = []
    for when_s, radar, raob, lat, lon, outcome, label in CASES:
        when = datetime.strptime(when_s, "%Y-%m-%d %H:%M")
        print(f"{when_s}  {label}")
        row = {"time_utc": when_s, "radar": radar, "raob": raob, "outcome": outcome, "label": label}
        try:
            scan = radar_image(radar, when, lat, lon, f"radar_{radar}_{when:%Y%m%d_%H%M}.png")
            row["radar_scan"] = f"{scan:%H:%MZ}" if scan else ""
        except Exception as e:
            print("  radar failed:", e)
        try:
            df, t = get_raob(raob, when)
            row["sounding"] = f"{raob} {t:%Y-%m-%d %HZ}"
            if df is not None and len(df) > 10:
                row.update(ingredients(df))
            else:
                print("  no sounding found")
        except Exception as e:
            print("  sounding failed:", e)
        rows.append(row)
    out = pd.DataFrame(rows)
    out.to_csv("whirl_cases.csv", index=False)
    print(out.to_string())
    return out


# --------------------------------------------------------------------------
# Which ingredients separate tornadoes from busts?
# Logistic regression, not random forest: with ~60 cases a random forest
# memorizes the cases and its "feature importances" are unreliable.
# --------------------------------------------------------------------------
def rank_ingredients(df):
    from sklearn.linear_model import LogisticRegression
    from sklearn.model_selection import LeaveOneOut, cross_val_score
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import StandardScaler

    feats = ["srh_0_500", "srh_0_1km", "mlcape", "cape_0_3km", "ml_lcl_m",
             "mlcin", "shear_0_1km_kt", "shear_0_6km_kt"]
    d = df.dropna(subset=feats + ["outcome"])
    if d["outcome"].nunique() < 2 or d["outcome"].value_counts().min() < 10:
        print("Need at least 10 tornado cases and 10 busts before this is meaningful.")
        return
    X, y = d[feats].values, d["outcome"].values
    model = make_pipeline(StandardScaler(), LogisticRegression(C=0.5, max_iter=1000))
    acc = cross_val_score(model, X, y, cv=LeaveOneOut()).mean()
    model.fit(X, y)
    coefs = pd.Series(model[-1].coef_[0], index=feats).sort_values(key=abs, ascending=False)
    print(f"\nLeave-one-out accuracy: {acc:.0%} (coin flip = 50%)")
    print("Standardized weights (bigger = stronger signal; sign = direction):")
    print(coefs.round(2).to_string())
    for f in ["stp_fixed", "whirl_core"]:
        if f in d:
            print(f"Mean {f}: tornado {d[d.outcome == 1][f].mean():.2f} vs bust {d[d.outcome == 0][f].mean():.2f}")


if __name__ == "__main__":
    lib = build_library()
    rank_ingredients(lib)
