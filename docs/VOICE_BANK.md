# Hindi Voice Alert Bank

Owner: Samarth

20 pre-recorded Hindi alert phrases the PWA plays on-device via `AudioContext`
(low latency, works offline). The PWA picks a WAV by alert trigger; Web Speech
API (`hi-IN`) is the fallback for any phrase not pre-cached.

- **Audio location (for Dhruv to wire):** `apps/pwa/public/audio/hi/<file>.mp3`
  (the table lists `.wav` names; the generator outputs `.mp3` — browsers decode
  MP3 fine via `AudioContext.decodeAudioData`, so use the `.mp3` files directly.
  Run with `--wav` to convert if you specifically need WAV.)
- **Generate the audio:** `python tools/generate_voice_bank.py` — all 20 clips
  are already generated and committed under `apps/pwa/public/audio/hi/`.
- **Tone column:** how it should be voiced — `calm` for caution-band,
  `urgent` for danger/critical.
- **Romanization** is for non-Hindi-speaking teammates to recognize the clip.

---

## Phrase table

| # | Trigger | Band | Hindi | Romanized | English | WAV file | Tone |
|---|---|---|---|---|---|---|---|
| 1 | No helmet in required zone | caution | सुरक्षा हेलमेट पहनें | Suraksha helmet pehnein | Wear safety helmet | `helmet_required.wav` | calm |
| 2 | No vest in required zone | caution | सुरक्षा जैकेट पहनें | Suraksha jacket pehnein | Wear safety vest | `vest_required.wav` | calm |
| 3 | No gloves | caution | दस्ताने पहनें | Dastaane pehnein | Wear gloves | `gloves_required.wav` | calm |
| 4 | No mask | caution | मास्क पहनें | Mask pehnein | Wear a mask | `mask_required.wav` | calm |
| 5 | Enters a work zone | safe | सावधान, आप कार्य क्षेत्र में हैं | Saavdhaan, aap kaarya kshetra mein hain | Caution, you are in a work zone | `zone_enter.wav` | calm |
| 6 | Approaching hazard zone | danger | रुको! खतरनाक क्षेत्र आगे है | Ruko! Khatarnaak kshetra aage hai | Stop! Hazard zone ahead | `stop_hazard_ahead.wav` | urgent |
| 7 | Predicted entry < 2s | critical | पीछे हटें, खतरा बहुत पास है | Peeche hatein, khatra bahut paas hai | Step back, danger is very close | `step_back_danger.wav` | urgent |
| 8 | Close to machinery | danger | मशीन से दूर रहें | Machine se door rahein | Keep away from the machine | `keep_away_machine.wav` | urgent |
| 9 | Forklift / vehicle near | danger | फोर्कलिफ्ट आ रही है, हटें | Forklift aa rahi hai, hatein | Forklift approaching, move aside | `forklift_warning.wav` | urgent |
| 10 | Restricted zone entry | danger | यह क्षेत्र प्रतिबंधित है | Yeh kshetra pratibandhit hai | This area is restricted | `restricted_area.wav` | urgent |
| 11 | Fall detected | critical | व्यक्ति गिर गया, मदद भेजें | Vyakti gir gaya, madad bhejein | A person has fallen, send help | `fall_detected.wav` | urgent |
| 12 | High velocity toward hazard | caution | धीरे चलें | Dheere chalein | Slow down | `slow_down.wav` | calm |
| 13 | Critical, immediate stop | critical | तुरंत रुकें | Turant rukein | Stop immediately | `stop_now.wav` | urgent |
| 14 | Risk cleared | safe | क्षेत्र सुरक्षित है | Kshetra surakshit hai | The area is safe | `all_clear.wav` | calm |
| 15 | Fatigue / drowsiness | caution | थकान महसूस हो तो विश्राम करें | Thakaan mehsoos ho to vishraam karein | If you feel tired, take rest | `fatigue_rest.wav` | calm |
| 16 | Phone use while working | caution | काम के दौरान फ़ोन का प्रयोग न करें | Kaam ke dauraan phone ka prayog na karein | Do not use phone while working | `no_phone.wav` | calm |
| 17 | PPE missing before entry | danger | प्रवेश से पहले सुरक्षा उपकरण पहनें | Pravesh se pehle suraksha upkaran pehnein | Wear safety gear before entering | `ppe_before_entry.wav` | urgent |
| 18 | Off the safe path | caution | सुरक्षित रास्ते पर लौटें | Surakshit raaste par lautein | Return to the safe path | `return_safe_path.wav` | calm |
| 19 | Supervisor alerted | critical | पर्यवेक्षक को सूचित किया गया | Paryavekshak ko soochit kiya gaya | Supervisor has been notified | `supervisor_notified.wav` | calm |
| 20 | System boot / shift start | safe | सुरक्षा प्रणाली सक्रिय है, सुरक्षित कार्य करें | Suraksha pranaali sakriya hai, surakshit kaarya karein | Safety system active, work safely | `system_active.wav` | calm |

---

## Demo-critical clips (Section 16 killer sequence)

The 30-second killer demo uses exactly three of these in order — verify they are
crisp and pre-cached before judging:

1. `helmet_required.wav` (#1) — fires when the presenter removes the helmet.
2. `stop_hazard_ahead.wav` (#6) — fires as they approach the taped zone.
3. `step_back_danger.wav` (#7) — fires on the predicted-entry countdown.

> The blueprint quotes "Helmet zaroori hai" and "Ruko! Khatra zone aage hai!".
> Those exact lines are kept as alternates below in case the team prefers the
> punchier wording for the demo:
>
> | Alt for | Hindi | Romanized |
> |---|---|---|
> | #1 | हेलमेट ज़रूरी है | Helmet zaroori hai |
> | #6 | रुको! खतरा ज़ोन आगे है | Ruko! Khatra zone aage hai |

---

## Recording notes

- Voice: `hi-IN` female, neutral north-Indian accent (clearest on phone speakers
  in a noisy plant). A single consistent voice across all 20 clips.
- Keep each clip under ~2 seconds. Workers must register the alert instantly.
- Normalize loudness so urgent and calm clips sit at a similar peak — the phone
  speaker is the only output, often in a loud environment.
- Free generation options (no paid TTS — preserves the zero-cost story):
  `edge-tts` (best Hindi quality) > `gTTS` > offline `pyttsx3`. Stage 4 script
  defaults to `edge-tts` with a `gTTS` fallback.
