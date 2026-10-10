"""
NEXRAD pre-onset volume fetcher — UNTESTED SCAFFOLDING (reconstructed from Keith's outline).

Selects the Level II volume 10–30 min before tornado onset from the public
`unidata-nexrad-level2` S3 bucket (anonymous) and opens it with Py-ART.
Requires: pip install boto3 arm-pyart
"""
from datetime import datetime, timedelta
import boto3
from botocore import UNSIGNED
from botocore.config import Config

BUCKET = "unidata-nexrad-level2"

def list_volumes(site: str, day: datetime):
    s3 = boto3.client("s3", config=Config(signature_version=UNSIGNED))
    prefix = f"{day:%Y/%m/%d}/{site}/"
    for page in s3.get_paginator("list_objects_v2").paginate(Bucket=BUCKET, Prefix=prefix):
        for o in page.get("Contents", []):
            key = o["Key"]
            if key.endswith("_MDM"):
                continue
            try:
                t = datetime.strptime(key.split("/")[-1][4:19], "%Y%m%d_%H%M%S")
            except ValueError:
                continue
            yield key, t

def pre_onset_volume(site: str, onset_utc: datetime, min_lead=10, max_lead=30):
    """Latest volume with scan time in [onset - max_lead, onset - min_lead]."""
    lo, hi = onset_utc - timedelta(minutes=max_lead), onset_utc - timedelta(minutes=min_lead)
    cands = [(k, t) for k, t in list_volumes(site, onset_utc) if lo <= t <= hi]
    return max(cands, key=lambda kt: kt[1]) if cands else None

def open_volume(key: str):
    import pyart  # noqa: WPS433
    return pyart.io.read_nexrad_archive(f"s3://{BUCKET}/{key}", storage_options={"anon": True})

if __name__ == "__main__":
    print(pre_onset_volume("KSGF", datetime(2011, 5, 22, 22, 34)))
