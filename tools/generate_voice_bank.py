"""Generate the 20 Hindi voice-alert clips for Suraksha AI.

These are the on-device alert sounds the PWA plays via AudioContext. Browsers
decode MP3 through AudioContext.decodeAudioData, so MP3 output is demo-ready;
pass --wav to also convert to WAV (needs pydub + ffmpeg).

The phrase list here is the source of truth and matches docs/VOICE_BANK.md.

Setup (one-time, needs internet for the TTS voices — preserves zero-cost story):
    pip install edge-tts            # best Hindi voice, recommended
    pip install gTTS                # fallback if edge-tts is unavailable
    # optional, only for --wav:
    pip install pydub               # plus ffmpeg on PATH

Run:
    python tools/generate_voice_bank.py
    python tools/generate_voice_bank.py --wav

Output: apps/pwa/public/audio/hi/<name>.mp3  (or .wav with --wav)
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys

OUT_DIR = os.path.join("apps", "pwa", "public", "audio", "hi")

# (filename stem, Hindi text, tone)  -- tone 'urgent' is spoken slightly faster.
PHRASES: list[tuple[str, str, str]] = [
    ("helmet_required",     "सुरक्षा हेलमेट पहनें",                         "calm"),
    ("vest_required",       "सुरक्षा जैकेट पहनें",                          "calm"),
    ("gloves_required",     "दस्ताने पहनें",                                "calm"),
    ("mask_required",       "मास्क पहनें",                                  "calm"),
    ("zone_enter",          "सावधान, आप कार्य क्षेत्र में हैं",              "calm"),
    ("stop_hazard_ahead",   "रुको! खतरनाक क्षेत्र आगे है",                   "urgent"),
    ("step_back_danger",    "पीछे हटें, खतरा बहुत पास है",                   "urgent"),
    ("keep_away_machine",   "मशीन से दूर रहें",                              "urgent"),
    ("forklift_warning",    "फोर्कलिफ्ट आ रही है, हटें",                     "urgent"),
    ("restricted_area",     "यह क्षेत्र प्रतिबंधित है",                      "urgent"),
    ("fall_detected",       "व्यक्ति गिर गया, मदद भेजें",                    "urgent"),
    ("slow_down",           "धीरे चलें",                                    "calm"),
    ("stop_now",            "तुरंत रुकें",                                   "urgent"),
    ("all_clear",           "क्षेत्र सुरक्षित है",                           "calm"),
    ("fatigue_rest",        "थकान महसूस हो तो विश्राम करें",                 "calm"),
    ("no_phone",            "काम के दौरान फ़ोन का प्रयोग न करें",            "calm"),
    ("ppe_before_entry",    "प्रवेश से पहले सुरक्षा उपकरण पहनें",            "urgent"),
    ("return_safe_path",    "सुरक्षित रास्ते पर लौटें",                      "calm"),
    ("supervisor_notified", "पर्यवेक्षक को सूचित किया गया",                  "calm"),
    ("system_active",       "सुरक्षा प्रणाली सक्रिय है, सुरक्षित कार्य करें", "calm"),
]

EDGE_VOICE = "hi-IN-SwaraNeural"  # clear female hi-IN voice


async def _gen_edge(out_ext: str) -> bool:
    try:
        import edge_tts  # type: ignore
    except ImportError:
        return False
    os.makedirs(OUT_DIR, exist_ok=True)
    for stem, text, tone in PHRASES:
        rate = "+12%" if tone == "urgent" else "+0%"
        mp3_path = os.path.join(OUT_DIR, f"{stem}.mp3")
        await edge_tts.Communicate(text, EDGE_VOICE, rate=rate).save(mp3_path)
        _maybe_wav(mp3_path, out_ext)
        print(f"  ok  {stem}{out_ext}")
    return True


def _gen_gtts(out_ext: str) -> bool:
    try:
        from gtts import gTTS  # type: ignore
    except ImportError:
        return False
    os.makedirs(OUT_DIR, exist_ok=True)
    for stem, text, _tone in PHRASES:
        mp3_path = os.path.join(OUT_DIR, f"{stem}.mp3")
        gTTS(text=text, lang="hi").save(mp3_path)
        _maybe_wav(mp3_path, out_ext)
        print(f"  ok  {stem}{out_ext}")
    return True


def _maybe_wav(mp3_path: str, out_ext: str) -> None:
    if out_ext != ".wav":
        return
    from pydub import AudioSegment  # type: ignore

    wav_path = mp3_path[:-4] + ".wav"
    AudioSegment.from_mp3(mp3_path).export(wav_path, format="wav")
    os.remove(mp3_path)


def main() -> int:
    ap = argparse.ArgumentParser(description="Generate Suraksha AI Hindi voice bank")
    ap.add_argument("--wav", action="store_true", help="convert to WAV (needs pydub + ffmpeg)")
    args = ap.parse_args()
    out_ext = ".wav" if args.wav else ".mp3"

    print(f"Generating {len(PHRASES)} Hindi alerts -> {OUT_DIR}/*{out_ext}")
    try:
        if asyncio.run(_gen_edge(out_ext)):
            print("Done (edge-tts).")
            return 0
    except Exception as exc:  # network / runtime error -> try gTTS
        print(f"edge-tts failed ({exc}); trying gTTS…")

    try:
        if _gen_gtts(out_ext):
            print("Done (gTTS).")
            return 0
    except Exception as exc:
        print(f"gTTS failed ({exc}).")

    print("No TTS engine available. Run: pip install edge-tts  (or gTTS)")
    return 1


if __name__ == "__main__":
    sys.exit(main())
