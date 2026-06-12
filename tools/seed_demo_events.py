"""Seed the backend with believable risk events for a demo / recording.

Run AFTER the backend is up. Posts a realistic mix of events so the Copilot
has something to talk about and the incident PDF has a full timeline.

Usage:
    python tools/seed_demo_events.py
    python tools/seed_demo_events.py --url http://localhost:8000
"""

from __future__ import annotations

import argparse
import json
import time
import urllib.request

# (trackId, score, band, zoneId, ppe, prox, velo, posture, fall, predictedEntryMs)
_EVENTS = [
    (1, 18, "safe",     "zone-admin-d",       0,  0, 12,  0,  0, None),
    (2, 44, "caution",  "zone-loading-c",     15, 0, 18, 10,  0, None),
    (3, 86, "critical", "zone-machinery-b",   25, 30, 15, 0,  0, 1100),
    (4, 63, "danger",   "zone-excavation-a",  15, 0, 18, 10,  0, 2400),
    (3, 91, "critical", "zone-machinery-b",   25, 30, 18, 8,  0, 800),
    (5, 30, "safe",     "zone-loading-c",     0,  0, 10,  0,  0, None),
]


def _post(url: str, body: dict) -> int:
    data = json.dumps(body).encode()
    req = urllib.request.Request(
        url, data=data, headers={"Content-Type": "application/json"}, method="POST"
    )
    with urllib.request.urlopen(req, timeout=10) as r:
        return r.status


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://localhost:8000")
    args = ap.parse_args()

    now = int(time.time() * 1000)
    posted = 0
    for i, (track, score, band, zone, ppe, prox, velo, post, fall, pred) in enumerate(_EVENTS):
        body = {
            "eventId": f"demo-{i+1:02d}",
            "trackId": track,
            "riskScore": score,
            "band": band,
            "breakdown": {
                "ppeViolation": ppe,
                "proximityToZone": prox,
                "velocityToward": velo,
                "posture": post,
                "fallDetected": fall,
            },
            "predictedEntryMs": pred,
            "zoneId": zone,
            "timestamp": now - (len(_EVENTS) - i) * 30_000,  # 30s apart, oldest first
        }
        try:
            _post(f"{args.url}/api/events", body)
            posted += 1
            print(f"  seeded demo-{i+1:02d}  {band:8s} score {score:3d}  {zone}")
        except Exception as exc:
            print(f"  FAILED demo-{i+1:02d}: {exc}  (is the backend running at {args.url}?)")
            return 1

    print(f"\nSeeded {posted} events. Now ask the Copilot 'what just happened?' "
          "or generate an incident report.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
