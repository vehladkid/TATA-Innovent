# Demo-Day Q&A Playbook

Owner: Samarth

Anticipated judge questions and rehearsed answers. Practise until reflexive.
(The demo *sequence* lives in `DEMO_SCRIPT.md`; this file is the *questions*.)

---

## Product & differentiation

| Question | Answer |
|---|---|
| What makes you different from the other PPE-detection teams? | "Most teams detect that something unsafe *has* happened. We *predict* it — a trajectory engine warns 1–2 seconds before a worker enters a hazard zone, in Hindi, on a phone they already own. Detection is table-stakes; prediction and prevention are the product." |
| Why does it run in a browser instead of an app? | "Zero install friction and zero hardware cost. Any MSME owner opens a URL on an old phone and they're live in 60 seconds. ₹0 vs the ₹50-lakh enterprise platforms." |
| Is this actually Tata-deployable? | "Yes — Tata's MSME supplier base is the natural pilot. Zero hardware means no procurement and no capex approval. A regional safety lead could pilot ten suppliers in a week." |

## Privacy

| Question | Answer |
|---|---|
| You're filming workers — what about privacy? | "Faces are blurred on-device, before any frame leaves the phone. We never store biometric data. Dashboards show roles and track IDs, never named individuals." |
| Where does the video go? | "Nowhere. All ML inference runs on the phone. Only small risk *events* — numbers, not images — go to the backend, plus an optional face-blurred snapshot." |

## The AI Copilot (Samarth's area)

| Question | Answer |
|---|---|
| Is the Copilot just ChatGPT wrapped? | "No. It only answers from the live event stream — recent risk events, zones, the shift summary. The system prompt forbids inventing any number not in the data, and every answer cites the exact event IDs it used, so you can verify it on screen." |
| What model is it? | "Groq's Llama 3.3 70B for sub-second answers, with Claude as a fallback if Groq rate-limits. And if both are unavailable, a built-in rule-based summarizer still answers from the same data — the Copilot never goes dark." |
| What if the internet drops during the demo? | "The phone keeps detecting and speaking Hindi alerts — inference is on-device. The Copilot falls back to its offline summarizer. We can prove it: (toggle airplane mode)." |
| How does it avoid hallucinating? | "Three guards: the prompt restricts it to provided data, answers cite event IDs the UI links to, and out-of-window questions get an honest 'I only have current-shift data' instead of a guess." |
| Can it write a report? | "Yes — one click generates a formal PDF incident report: summary, timeline, contributing factors, corrective actions, and a Factories Act 1948 / ILO compliance note. Drafted by the LLM, rendered server-side." |

## Accuracy & ML

| Question | Answer |
|---|---|
| How accurate is the predictive part? | "Trajectory confidence is reported with every prediction; we only fire a critical alert above 0.7 confidence. The PPE model is a fine-tuned YOLOv8 — strong on helmet/vest, honestly weaker on the negative classes, which is why prediction + rules carry the safety-critical path, not the model alone." |
| Why Hindi voice? | "Most teams ship English-only. A worker registers a warning in their own language far faster — and on a noisy plant floor, the right words save the second that matters." |

## Business

| Question | Answer |
|---|---|
| What's the business model? | "Freemium SaaS. Single-zone PWA stays free. Multi-zone, multi-site, audit reports, and integrations are a paid tier — priced for MSMEs." |
| Why not WhatsApp for alerts? | "WhatsApp Business has per-conversation cost and verification overhead. Telegram is free and instant for the demo; production swaps to WhatsApp via the same n8n workflow — a 30-minute change." |

---

## If something breaks live (tie to DEMO_SCRIPT fallbacks)

- Phone glitches → switch to backup phone, same URL, 30s.
- Backend down → "Notice the phone still calls out alerts — inference is on-device." Failure becomes a feature.
- Copilot backend unreachable → it shows "offline mode" and still answers from cached data. Don't apologize; narrate it.
