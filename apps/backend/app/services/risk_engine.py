"""
Risk Engine — pure scoring function, no I/O, no side effects.

Input:  list[Detection] from YOLO + optional TrackedPerson (velocity / pose)
Output: RiskScore dataclass

═══════════════════════════════════════════════════════════════════════
FORMULA
═══════════════════════════════════════════════════════════════════════

  score = clamp(ppe + proximity + velocity + posture, 0, 100) + fall_boost
  final = clamp(score, 0, 100)

  [1] PPE Violation   (0 – 40 pts)
        no_helmet  →  25 × detection.confidence
        no_vest    →  15 × detection.confidence
        Additive across detections in frame; capped at 40.
        Two workers without helmets → 50 raw → capped at 40.

  [2] Proximity       (0 – 30 pts)
        Person bbox IoU > 0.05 with any machinery bbox → +30 × machinery_conf.
        Excavator bboxes are extracted from the Detection list automatically in
        events.py (POST /api/events/raw) and passed here as machinery_bboxes.

  [3] Velocity Toward (0 – 20 pts)
        Requires TrackedPerson.velocity = [vx, vy] (normalized units/s).
        contribution = clamp(√(vx² + vy²), 0, 1.0) × 20
        Direction-agnostic: any fast movement increases risk.

  [4] Posture         (0 – 10 pts)
        Requires MediaPipe keypoints on TrackedPerson.pose_keypoints.
        shoulder_y > hip_y + 0.10 → 10 pts  (collapsed / critical lean)
        shoulder_y > hip_y - 0.05 → 5 pts   (bent over)
        No keypoints present     → 0

  [5] Fall Boost      (0 or 30, additive after base clamp)
        Triggered when: nose.y > ankle_y - 0.05 AND shoulders below hips.
        Applied after base clamp so fall always pushes into critical band.

Band thresholds:
   0 – 30  → safe
  31 – 55  → caution
  56 – 80  → danger
  81 – 100 → critical

Confidence weighting:
  Every PPE penalty is multiplied by detection.confidence [0–1].
  A 0.4-confidence no_helmet contributes 10 pts, not 25.
  Prevents low-confidence false positives from triggering critical alerts.
═══════════════════════════════════════════════════════════════════════
"""

from __future__ import annotations

from dataclasses import dataclass
from math import sqrt
from typing import Optional

from app.schemas.events import Detection, RiskBreakdown, RiskBand, TrackedPerson

# ---------------------------------------------------------------------------
# Public output type
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class RiskScore:
    score: int          # 0 – 100
    band: RiskBand
    breakdown: RiskBreakdown


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _iou(
    a: tuple[float, float, float, float],
    b: tuple[float, float, float, float],
) -> float:
    """Intersection-over-Union for two [x, y, w, h] normalized bboxes."""
    ax1, ay1, aw, ah = a
    ax2, ay2 = ax1 + aw, ay1 + ah
    bx1, by1, bw, bh = b
    bx2, by2 = bx1 + bw, by1 + bh

    ix1, iy1 = max(ax1, bx1), max(ay1, by1)
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)

    if ix2 <= ix1 or iy2 <= iy1:
        return 0.0

    inter = (ix2 - ix1) * (iy2 - iy1)
    union = aw * ah + bw * bh - inter
    return inter / union if union > 0.0 else 0.0


def _score_to_band(score: int) -> RiskBand:
    if score <= 30:
        return "safe"
    if score <= 55:
        return "caution"
    if score <= 80:
        return "danger"
    return "critical"


def _ppe_score(detections: list[Detection]) -> float:
    """0 – 40: penalise missing helmet and missing vest, confidence-weighted."""
    pts = 0.0
    for d in detections:
        if d.class_ == "no_helmet":
            pts += 25.0 * d.confidence
        elif d.class_ == "no_vest":
            pts += 15.0 * d.confidence
    return min(40.0, pts)


def _proximity_score(
    detections: list[Detection],
    machinery_bboxes: list[tuple[float, float, float, float]],
) -> float:
    """0 – 30: person bbox IoU > 0.05 with any machinery bbox."""
    if not machinery_bboxes:
        return 0.0

    person_bboxes = [d.bbox for d in detections if d.class_ == "person"]
    pts = 0.0
    for pbbox in person_bboxes:
        for mbbox in machinery_bboxes:
            if _iou(pbbox, mbbox) > 0.05:
                pts = 30.0   # binary: contact/near-contact → full weight
                break
        if pts:
            break
    return pts


def _velocity_score(tracked_person: Optional[TrackedPerson]) -> float:
    """0 – 20: any fast movement elevates risk (direction-agnostic)."""
    if tracked_person is None:
        return 0.0
    vx, vy = tracked_person.velocity
    magnitude = min(1.0, sqrt(vx ** 2 + vy ** 2))
    return magnitude * 20.0


def _posture_and_fall(
    tracked_person: Optional[TrackedPerson],
) -> tuple[float, bool]:
    """Returns (posture_pts 0-10, fall_detected bool)."""
    if tracked_person is None or not tracked_person.pose_keypoints:
        return 0.0, False

    kps = {kp.name: kp for kp in tracked_person.pose_keypoints}

    left_hip = kps.get("left_hip")
    right_hip = kps.get("right_hip")
    left_shoulder = kps.get("left_shoulder")
    right_shoulder = kps.get("right_shoulder")

    if not (left_hip and right_hip and left_shoulder and right_shoulder):
        return 0.0, False

    hip_y = (left_hip.y + right_hip.y) / 2.0
    shoulder_y = (left_shoulder.y + right_shoulder.y) / 2.0

    # In normalized coords larger y = lower in frame.
    # shoulders well below hips → collapsed or critical lean
    if shoulder_y > hip_y + 0.10:
        posture_pts = 10.0
        nose = kps.get("nose")
        left_ankle = kps.get("left_ankle")
        right_ankle = kps.get("right_ankle")
        fall = False
        if nose and left_ankle and right_ankle:
            ankle_y = (left_ankle.y + right_ankle.y) / 2.0
            fall = nose.y > ankle_y - 0.05
        return posture_pts, fall

    # shoulders at or below hip level → bent over
    if shoulder_y > hip_y - 0.05:
        return 5.0, False

    return 0.0, False


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def compute_risk(
    detections: list[Detection],
    tracked_person: Optional[TrackedPerson] = None,
    machinery_bboxes: Optional[list[tuple[float, float, float, float]]] = None,
) -> RiskScore:
    """Compute a RiskScore from YOLO detections and optional enrichment data.

    Parameters
    ----------
    detections:
        YOLO detections for the current frame.
    tracked_person:
        SORT tracker output for the subject; supplies velocity and pose keypoints.
    machinery_bboxes:
        Normalized [x, y, w, h] bboxes for heavy machinery (excavator, crane, etc.)
        in the same frame.  The router extracts excavator detections automatically
        and merges them with any explicit machinery_bboxes from the payload.
    """
    if machinery_bboxes is None:
        machinery_bboxes = []

    ppe = _ppe_score(detections)
    proximity = _proximity_score(detections, machinery_bboxes)
    velocity = _velocity_score(tracked_person)
    posture_pts, fall = _posture_and_fall(tracked_person)

    base = min(100.0, ppe + proximity + velocity + posture_pts)
    fall_boost = 30 if fall else 0
    score = min(100, round(base) + fall_boost)

    breakdown = RiskBreakdown(
        ppe_violation=round(min(40, ppe)),
        proximity_to_zone=round(proximity),
        velocity_toward=round(velocity),
        posture=round(posture_pts),
        fall_detected=fall_boost,
    )

    return RiskScore(score=score, band=_score_to_band(score), breakdown=breakdown)
